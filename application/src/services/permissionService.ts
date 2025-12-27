/**
 * Permission Service for RBAC System
 *
 * This service handles loading and checking user permissions from PocketBase.
 * Permissions are cached locally for performance and refreshed periodically.
 */

import { pb } from '@/lib/pocketbase';

/**
 * Security: Sanitize input for PocketBase filter queries
 * Prevents NoSQL injection by validating input format
 */
const sanitizeId = (id: string): string => {
  // PocketBase IDs are alphanumeric with underscores, max 15 chars
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ID format');
  }
  // Only allow alphanumeric and underscores
  const sanitized = id.replace(/[^a-zA-Z0-9_]/g, '');
  if (sanitized !== id || sanitized.length === 0 || sanitized.length > 50) {
    throw new Error('Invalid ID format');
  }
  return sanitized;
};

const sanitizeCollectionName = (name: string): string => {
  // Collection names are alphanumeric with underscores
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid collection name');
  }
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  if (sanitized !== name || sanitized.length === 0 || sanitized.length > 50) {
    throw new Error('Invalid collection name');
  }
  return sanitized;
};

// Types
export interface Role {
  id: string;
  name: string;
  display_name: string;
  description: string;
  is_system: boolean;
  priority: number;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  user_collection: string;
  role_id: string;
  expand?: {
    role_id?: Role;
  };
}

export interface UserPermission {
  id: string;
  user_id: string;
  user_collection: string;
  permission_id: string;
  granted: boolean;
  expand?: {
    permission_id?: Permission;
  };
}

export interface ResourceAssignment {
  id: string;
  user_id: string;
  user_collection: string;
  resource_type: string;
  resource_id: string;
  access_level: 'view' | 'manage';
}

export interface UserPermissions {
  roles: Role[];
  permissions: Set<string>; // "resource:action" format
  resourceAssignments: Map<string, Map<string, 'view' | 'manage'>>; // resource_type -> {resource_id -> access_level}
  loaded: boolean;
}

// Resources available in the system
export const RESOURCES = [
  'services',
  'servers',
  'users',
  'roles',
  'settings',
  'ssl_certificates',
  'alerts',
  'incidents',
  'maintenance',
  'reports',
  'security_scans',
  'performance_tests',
  'operational_pages',
  'service_groups'
] as const;

export type Resource = typeof RESOURCES[number];

// Actions available in the system
export const ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'manage',
  'acknowledge',
  'export'
] as const;

export type Action = typeof ACTIONS[number];

// Cache for user permissions
let permissionCache: UserPermissions | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get current user info
const getCurrentUserInfo = (): { id: string; collection: string } | null => {
  if (!pb.authStore.isValid || !pb.authStore.model) {
    return null;
  }

  const model = pb.authStore.model as any;
  return {
    id: model.id,
    collection: model.collectionName || 'users'
  };
};

export const permissionService = {
  /**
   * Load user permissions from PocketBase
   * This fetches all roles, permissions, and resource assignments for the current user
   */
  async loadUserPermissions(): Promise<UserPermissions> {
    const userInfo = getCurrentUserInfo();

    if (!userInfo) {
      return {
        roles: [],
        permissions: new Set(),
        resourceAssignments: new Map(),
        loaded: false
      };
    }

    // Check if superuser - they have all permissions
    if (userInfo.collection === '_superusers') {
      const allPermissions = new Set<string>();
      RESOURCES.forEach(resource => {
        ACTIONS.forEach(action => {
          allPermissions.add(`${resource}:${action}`);
        });
      });

      permissionCache = {
        roles: [{
          id: 'superadmin',
          name: 'superadmin',
          display_name: 'Super Admin',
          description: 'Full system access',
          is_system: true,
          priority: 100
        }],
        permissions: allPermissions,
        resourceAssignments: new Map(), // Superadmins have access to all resources
        loaded: true
      };
      cacheTimestamp = Date.now();
      return permissionCache;
    }

    try {
      // 1. Get user's roles (with sanitized inputs)
      const safeUserId = sanitizeId(userInfo.id);
      const safeCollection = sanitizeCollectionName(userInfo.collection);

      const userRoles = await pb.collection('user_roles').getFullList<UserRole>({
        filter: `user_id = '${safeUserId}' && user_collection = '${safeCollection}'`,
        expand: 'role_id'
      });

      const roles: Role[] = userRoles
        .map(ur => ur.expand?.role_id)
        .filter((r): r is Role => r !== undefined);

      // 2. Get permissions from roles
      const permissions = new Set<string>();

      for (const userRole of userRoles) {
        const safeRoleId = sanitizeId(userRole.role_id);
        const rolePermissions = await pb.collection('role_permissions').getFullList({
          filter: `role_id = '${safeRoleId}'`,
          expand: 'permission_id'
        });

        for (const rp of rolePermissions) {
          const perm = (rp as any).expand?.permission_id;
          if (perm) {
            permissions.add(`${perm.resource}:${perm.action}`);
          }
        }
      }

      // 3. Get user-specific permission overrides
      const userPermissions = await pb.collection('user_permissions').getFullList<UserPermission>({
        filter: `user_id = '${safeUserId}' && user_collection = '${safeCollection}'`,
        expand: 'permission_id'
      });

      for (const up of userPermissions) {
        const perm = up.expand?.permission_id;
        if (perm) {
          const permKey = `${perm.resource}:${perm.action}`;
          if (up.granted) {
            permissions.add(permKey);
          } else {
            permissions.delete(permKey);
          }
        }
      }

      // 4. Get resource assignments (with access_level)
      const assignments = await pb.collection('resource_assignments').getFullList<ResourceAssignment>({
        filter: `user_id = '${safeUserId}' && user_collection = '${safeCollection}'`
      });

      const resourceAssignments = new Map<string, Map<string, 'view' | 'manage'>>();
      for (const assignment of assignments) {
        if (!resourceAssignments.has(assignment.resource_type)) {
          resourceAssignments.set(assignment.resource_type, new Map());
        }
        resourceAssignments.get(assignment.resource_type)!.set(assignment.resource_id, assignment.access_level || 'view');
      }

      permissionCache = {
        roles,
        permissions,
        resourceAssignments,
        loaded: true
      };
      cacheTimestamp = Date.now();

      return permissionCache;
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Return empty permissions on error
      return {
        roles: [],
        permissions: new Set(),
        resourceAssignments: new Map(),
        loaded: false
      };
    }
  },

  /**
   * Get cached permissions or load fresh if cache is stale
   */
  async getPermissions(): Promise<UserPermissions> {
    const now = Date.now();

    if (permissionCache && (now - cacheTimestamp) < CACHE_TTL) {
      return permissionCache;
    }

    return this.loadUserPermissions();
  },

  /**
   * Check if user has a specific permission
   * @param resource - The resource type (e.g., 'services', 'servers')
   * @param action - The action (e.g., 'view', 'create', 'update', 'delete')
   */
  hasPermission(resource: Resource | string, action: Action | string): boolean {
    if (!permissionCache?.loaded) {
      return false;
    }

    // Superusers have all permissions
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers') {
      return true;
    }

    // Check if user has explicit permission from role
    if (permissionCache.permissions.has(`${resource}:${action}`)) {
      return true;
    }

    // For 'view' actions, also check if user has any resource assignments for this type
    // Resource assignments imply at least 'view' access to those specific resources
    if (action === 'view') {
      const assignments = permissionCache.resourceAssignments.get(resource as string);
      if (assignments && assignments.size > 0) {
        return true;
      }
    }

    // For 'manage' actions (create/update/delete), check if user has 'manage' level on any resource
    if (['create', 'update', 'delete', 'manage'].includes(action as string)) {
      const assignments = permissionCache.resourceAssignments.get(resource as string);
      if (assignments) {
        for (const [_, level] of assignments) {
          if (level === 'manage') {
            return true;
          }
        }
      }
    }

    return false;
  },

  /**
   * Original permission check without resource assignment consideration
   * Use this when you need strict role-based permission check only
   */
  hasRolePermission(resource: Resource | string, action: Action | string): boolean {
    if (!permissionCache?.loaded) {
      return false;
    }

    // Superusers have all permissions
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers') {
      return true;
    }

    return permissionCache.permissions.has(`${resource}:${action}`);
  },

  /**
   * Get the access level for a specific resource assignment
   * @param resourceType - The type of resource (e.g., 'services', 'servers')
   * @param resourceId - The specific resource ID
   * @returns 'view' | 'manage' | null (null if not assigned)
   */
  getResourceAccessLevel(resourceType: string, resourceId: string): 'view' | 'manage' | null {
    if (!permissionCache?.loaded) {
      return null;
    }

    const assignments = permissionCache.resourceAssignments.get(resourceType);
    if (!assignments) {
      return null;
    }

    return assignments.get(resourceId) || null;
  },

  /**
   * Get the effective access level for a resource (combines role + resource assignment)
   * Uses "most permissive wins" logic
   * @param resourceType - The type of resource
   * @param resourceId - The specific resource ID
   * @returns 'view' | 'manage' | null (null = no access)
   */
  getEffectiveAccessLevel(resourceType: string, resourceId: string): 'view' | 'manage' | null {
    if (!permissionCache?.loaded) {
      return null;
    }

    // Superusers always have manage access
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers') {
      return 'manage';
    }

    // Admins with manage permission have manage access to all resources
    if (this.hasPermission(resourceType as Resource, 'manage')) {
      const isAdmin = permissionCache.roles.some(r =>
        r.name === 'admin' || r.name === 'superadmin'
      );
      if (isAdmin) {
        return 'manage';
      }
    }

    // Must have resource assigned for non-admin users
    const resourceLevel = this.getResourceAccessLevel(resourceType, resourceId);

    // Get role permission level
    const hasManagePermission = this.hasPermission(resourceType as Resource, 'manage');
    const hasViewPermission = this.hasPermission(resourceType as Resource, 'view');
    const roleLevel = hasManagePermission ? 'manage' : hasViewPermission ? 'view' : null;

    // Service managers need explicit resource assignments
    const isServiceManager = permissionCache.roles.some(r => r.name === 'service_manager');
    if (isServiceManager) {
      if (!resourceLevel) {
        return null; // Not assigned = no access
      }
      // Most permissive wins between role and resource level
      if (roleLevel === 'manage' || resourceLevel === 'manage') {
        return 'manage';
      }
      return 'view';
    }

    // Viewers and operators without assignments can still view if they have view permission
    if (!resourceLevel && roleLevel) {
      return roleLevel;
    }

    // Most permissive wins
    if (roleLevel === 'manage' || resourceLevel === 'manage') {
      return 'manage';
    }
    if (roleLevel || resourceLevel) {
      return 'view';
    }

    return null;
  },

  /**
   * Check if user can manage (not just view) a specific resource
   * @param resourceType - The type of resource
   * @param resourceId - The specific resource ID
   */
  canManageResource(resourceType: string, resourceId: string): boolean {
    return this.getEffectiveAccessLevel(resourceType, resourceId) === 'manage';
  },

  /**
   * Check if user has access to a specific resource instance
   * Service Managers may only have access to assigned resources
   * @param resourceType - The type of resource (e.g., 'services', 'servers')
   * @param resourceId - The specific resource ID
   */
  hasResourceAccess(resourceType: string, resourceId: string): boolean {
    return this.getEffectiveAccessLevel(resourceType, resourceId) !== null;
  },

  /**
   * Check if user has a specific role
   * @param roleName - The role name to check
   */
  hasRole(roleName: string): boolean {
    if (!permissionCache?.loaded) {
      return false;
    }

    // Superusers are always superadmin
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers' && roleName === 'superadmin') {
      return true;
    }

    return permissionCache.roles.some(r => r.name === roleName);
  },

  /**
   * Check if user has any of the specified roles
   * @param roleNames - Array of role names to check
   */
  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some(role => this.hasRole(role));
  },

  /**
   * Get the highest priority role for the user
   */
  getHighestRole(): Role | null {
    if (!permissionCache?.loaded || permissionCache.roles.length === 0) {
      return null;
    }

    return permissionCache.roles.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    );
  },

  /**
   * Get all assigned resource IDs for a specific resource type
   * @param resourceType - The type of resource (e.g., 'services', 'servers')
   * @returns Array of resource IDs that the user has access to, or null if no filtering needed
   */
  getAssignedResourceIds(resourceType: string): string[] | null {
    if (!permissionCache?.loaded) {
      return []; // No permissions loaded = no access
    }

    // Superusers have access to all resources - no filtering needed
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers') {
      return null; // null means no filtering needed
    }

    // Admins with manage permission have access to all resources - no filtering needed
    if (this.hasRole('admin') || this.hasRole('superadmin')) {
      return null;
    }

    // Get assigned resources for this type
    const assignments = permissionCache.resourceAssignments.get(resourceType);
    if (!assignments || assignments.size === 0) {
      return []; // No assignments = no access to any resources of this type
    }

    return Array.from(assignments.keys());
  },

  /**
   * Check if user requires resource-level filtering
   * Returns true if user is NOT a superuser/admin and needs filtered data
   */
  requiresResourceFiltering(): boolean {
    if (!permissionCache?.loaded) {
      return true; // Not loaded = assume filtering needed
    }

    // Superusers don't need filtering
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers') {
      return false;
    }

    // Admins don't need filtering
    if (this.hasRole('admin') || this.hasRole('superadmin')) {
      return false;
    }

    return true;
  },

  /**
   * Check role helpers
   */
  get isViewer(): boolean {
    return this.hasRole('viewer');
  },

  get isOperator(): boolean {
    return this.hasRole('operator') || this.hasAnyRole(['service_manager', 'admin', 'superadmin']);
  },

  get isServiceManager(): boolean {
    return this.hasRole('service_manager') || this.hasAnyRole(['admin', 'superadmin']);
  },

  get isAdmin(): boolean {
    return this.hasRole('admin') || this.hasRole('superadmin');
  },

  get isSuperAdmin(): boolean {
    const userInfo = getCurrentUserInfo();
    return userInfo?.collection === '_superusers' || this.hasRole('superadmin');
  },

  /**
   * Clear the permission cache
   * Call this when user logs out or when permissions are updated
   */
  clearCache(): void {
    permissionCache = null;
    cacheTimestamp = 0;
  },

  /**
   * Force refresh permissions from server
   */
  async refreshPermissions(): Promise<UserPermissions> {
    this.clearCache();
    return this.loadUserPermissions();
  },

  /**
   * Get all available roles (for role management UI)
   */
  async getAllRoles(): Promise<Role[]> {
    try {
      const roles = await pb.collection('roles').getFullList<Role>({
        sort: 'priority'
      });
      return roles;
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      return [];
    }
  },

  /**
   * Get all available permissions (for role management UI)
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const permissions = await pb.collection('permissions').getFullList<Permission>({
        sort: 'resource,action'
      });
      return permissions;
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      return [];
    }
  },

  /**
   * Assign a role to a user (superadmin only)
   */
  async assignRole(userId: string, userCollection: string, roleId: string): Promise<void> {
    await pb.collection('user_roles').create({
      user_id: userId,
      user_collection: userCollection,
      role_id: roleId,
      assigned_by: getCurrentUserInfo()?.id
    });
  },

  /**
   * Remove a role from a user (superadmin only)
   */
  async removeRole(userRoleId: string): Promise<void> {
    await pb.collection('user_roles').delete(userRoleId);
  },

  /**
   * Assign a specific resource to a user (superadmin only)
   */
  async assignResource(
    userId: string,
    userCollection: string,
    resourceType: string,
    resourceId: string,
    accessLevel: 'view' | 'manage'
  ): Promise<void> {
    await pb.collection('resource_assignments').create({
      user_id: userId,
      user_collection: userCollection,
      resource_type: resourceType,
      resource_id: resourceId,
      access_level: accessLevel,
      assigned_by: getCurrentUserInfo()?.id
    });
  },

  /**
   * Remove a resource assignment (superadmin only)
   */
  async removeResourceAssignment(assignmentId: string): Promise<void> {
    await pb.collection('resource_assignments').delete(assignmentId);
  },

  /**
   * Update access level of an existing resource assignment (superadmin only)
   */
  async updateResourceAccessLevel(assignmentId: string, accessLevel: 'view' | 'manage'): Promise<void> {
    await pb.collection('resource_assignments').update(assignmentId, {
      access_level: accessLevel
    });
  },

  /**
   * Get all resource assignments for a specific user
   */
  async getUserResourceAssignments(userId: string, userCollection: string): Promise<ResourceAssignment[]> {
    try {
      const safeUserId = sanitizeId(userId);
      const safeCollection = sanitizeCollectionName(userCollection);

      return await pb.collection('resource_assignments').getFullList<ResourceAssignment>({
        filter: `user_id = '${safeUserId}' && user_collection = '${safeCollection}'`,
        sort: 'resource_type,created'
      });
    } catch (error) {
      console.error('Failed to fetch user resource assignments:', error);
      return [];
    }
  },

  /**
   * Create a custom role (superadmin only)
   */
  async createRole(role: Omit<Role, 'id'>): Promise<Role> {
    return await pb.collection('roles').create({
      ...role,
      is_system: false // Custom roles are not system roles
    });
  },

  /**
   * Update a custom role (superadmin only)
   */
  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    return await pb.collection('roles').update(roleId, updates);
  },

  /**
   * Delete a custom role (superadmin only)
   */
  async deleteRole(roleId: string): Promise<void> {
    await pb.collection('roles').delete(roleId);
  },

  /**
   * Get permissions for a specific role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const rolePermissions = await pb.collection('role_permissions').getFullList({
        filter: `role_id = '${roleId}'`,
        expand: 'permission_id'
      });

      return rolePermissions
        .map(rp => (rp as any).expand?.permission_id)
        .filter((p): p is Permission => p !== undefined);
    } catch (error) {
      console.error('Failed to fetch role permissions:', error);
      return [];
    }
  },

  /**
   * Set permissions for a role (superadmin only)
   */
  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Get existing role permissions
    const existing = await pb.collection('role_permissions').getFullList({
      filter: `role_id = '${roleId}'`
    });

    const existingIds = new Set(existing.map((rp: any) => rp.permission_id));
    const newIds = new Set(permissionIds);

    // Delete removed permissions
    for (const rp of existing) {
      if (!newIds.has((rp as any).permission_id)) {
        await pb.collection('role_permissions').delete(rp.id);
      }
    }

    // Add new permissions
    for (const permId of permissionIds) {
      if (!existingIds.has(permId)) {
        await pb.collection('role_permissions').create({
          role_id: roleId,
          permission_id: permId
        });
      }
    }
  }
};

export default permissionService;
