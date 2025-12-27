/**
 * Permission Service for RBAC System
 *
 * This service handles loading and checking user permissions from PocketBase.
 * Permissions are cached locally for performance and refreshed periodically.
 */

import { pb } from '@/lib/pocketbase';

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
  resourceAssignments: Map<string, Set<string>>; // resource_type -> Set of resource_ids
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
      // 1. Get user's roles
      const userRoles = await pb.collection('user_roles').getFullList<UserRole>({
        filter: `user_id = '${userInfo.id}' && user_collection = '${userInfo.collection}'`,
        expand: 'role_id'
      });

      const roles: Role[] = userRoles
        .map(ur => ur.expand?.role_id)
        .filter((r): r is Role => r !== undefined);

      // 2. Get permissions from roles
      const permissions = new Set<string>();

      for (const userRole of userRoles) {
        const rolePermissions = await pb.collection('role_permissions').getFullList({
          filter: `role_id = '${userRole.role_id}'`,
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
        filter: `user_id = '${userInfo.id}' && user_collection = '${userInfo.collection}'`,
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

      // 4. Get resource assignments
      const assignments = await pb.collection('resource_assignments').getFullList<ResourceAssignment>({
        filter: `user_id = '${userInfo.id}' && user_collection = '${userInfo.collection}'`
      });

      const resourceAssignments = new Map<string, Set<string>>();
      for (const assignment of assignments) {
        if (!resourceAssignments.has(assignment.resource_type)) {
          resourceAssignments.set(assignment.resource_type, new Set());
        }
        resourceAssignments.get(assignment.resource_type)!.add(assignment.resource_id);
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

    return permissionCache.permissions.has(`${resource}:${action}`);
  },

  /**
   * Check if user has access to a specific resource instance
   * Service Managers may only have access to assigned resources
   * @param resourceType - The type of resource (e.g., 'services', 'servers')
   * @param resourceId - The specific resource ID
   */
  hasResourceAccess(resourceType: string, resourceId: string): boolean {
    if (!permissionCache?.loaded) {
      return false;
    }

    // Superusers have access to all resources
    const userInfo = getCurrentUserInfo();
    if (userInfo?.collection === '_superusers') {
      return true;
    }

    // Check if user has manage permission for the resource type (full access)
    if (this.hasPermission(resourceType as Resource, 'manage')) {
      // Admins with manage permission have access to all resources of that type
      const isAdmin = permissionCache.roles.some(r =>
        r.name === 'admin' || r.name === 'superadmin'
      );
      if (isAdmin) {
        return true;
      }
    }

    // Check resource assignments for service managers
    const assignments = permissionCache.resourceAssignments.get(resourceType);
    if (assignments && assignments.has(resourceId)) {
      return true;
    }

    // Check if user has view permission without resource restrictions
    // (viewers and operators can view all without specific assignments)
    if (this.hasPermission(resourceType as Resource, 'view')) {
      const isServiceManager = permissionCache.roles.some(r => r.name === 'service_manager');
      // Service managers need explicit assignments
      if (isServiceManager) {
        return assignments?.has(resourceId) || false;
      }
      return true; // Other roles with view permission can see all
    }

    return false;
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
