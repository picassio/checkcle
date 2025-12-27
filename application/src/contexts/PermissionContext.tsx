/**
 * Permission Context for RBAC System
 *
 * Provides permission state to the entire application.
 * Wraps the permission service to provide React-friendly access.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { pb } from '@/lib/pocketbase';
import {
  permissionService,
  UserPermissions,
  Role,
  Resource,
  Action,
  RESOURCES,
  ACTIONS
} from '@/services/permissionService';

interface PermissionContextType {
  // Permission state
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;

  // Permission check methods
  hasPermission: (resource: Resource | string, action: Action | string) => boolean;
  hasResourceAccess: (resourceType: string, resourceId: string) => boolean;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;

  // Role check helpers
  isViewer: boolean;
  isOperator: boolean;
  isServiceManager: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Utility methods
  refreshPermissions: () => Promise<void>;
  getHighestRole: () => Role | null;
}

const defaultPermissionContext: PermissionContextType = {
  permissions: null,
  loading: true,
  error: null,
  hasPermission: () => false,
  hasResourceAccess: () => false,
  hasRole: () => false,
  hasAnyRole: () => false,
  isViewer: false,
  isOperator: false,
  isServiceManager: false,
  isAdmin: false,
  isSuperAdmin: false,
  refreshPermissions: async () => {},
  getHighestRole: () => null
};

const PermissionContext = createContext<PermissionContextType>(defaultPermissionContext);

export const PermissionProvider = ({ children }: { children: React.ReactNode }) => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load permissions on mount and when auth state changes
  const loadPermissions = useCallback(async () => {
    if (!pb.authStore.isValid) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const perms = await permissionService.loadUserPermissions();
      setPermissions(perms);
    } catch (err) {
      console.error('Failed to load permissions:', err);
      setError('Failed to load permissions');
      setPermissions({
        roles: [],
        permissions: new Set(),
        resourceAssignments: new Map(),
        loaded: false
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Listen for auth store changes
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      if (pb.authStore.isValid) {
        loadPermissions();
      } else {
        permissionService.clearCache();
        setPermissions(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadPermissions]);

  // Permission check methods
  const hasPermission = useCallback((resource: Resource | string, action: Action | string): boolean => {
    return permissionService.hasPermission(resource, action);
  }, [permissions]);

  const hasResourceAccess = useCallback((resourceType: string, resourceId: string): boolean => {
    return permissionService.hasResourceAccess(resourceType, resourceId);
  }, [permissions]);

  const hasRole = useCallback((roleName: string): boolean => {
    return permissionService.hasRole(roleName);
  }, [permissions]);

  const hasAnyRole = useCallback((roleNames: string[]): boolean => {
    return permissionService.hasAnyRole(roleNames);
  }, [permissions]);

  const refreshPermissions = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  const getHighestRole = useCallback((): Role | null => {
    return permissionService.getHighestRole();
  }, [permissions]);

  // Memoized role checks
  const roleChecks = useMemo(() => ({
    isViewer: permissionService.isViewer,
    isOperator: permissionService.isOperator,
    isServiceManager: permissionService.isServiceManager,
    isAdmin: permissionService.isAdmin,
    isSuperAdmin: permissionService.isSuperAdmin
  }), [permissions]);

  const contextValue = useMemo<PermissionContextType>(() => ({
    permissions,
    loading,
    error,
    hasPermission,
    hasResourceAccess,
    hasRole,
    hasAnyRole,
    ...roleChecks,
    refreshPermissions,
    getHighestRole
  }), [
    permissions,
    loading,
    error,
    hasPermission,
    hasResourceAccess,
    hasRole,
    hasAnyRole,
    roleChecks,
    refreshPermissions,
    getHighestRole
  ]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Hook to access permission context
 */
export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext must be used within a PermissionProvider');
  }
  return context;
};

/**
 * Export resources and actions for use in components
 */
export { RESOURCES, ACTIONS };
export type { Resource, Action };
