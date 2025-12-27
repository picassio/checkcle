/**
 * usePermission Hook
 *
 * Provides easy access to permission checking functionality.
 * This is a convenience wrapper around the PermissionContext.
 */

import { useCallback, useMemo } from 'react';
import { usePermissionContext, Resource, Action } from '@/contexts/PermissionContext';

interface UsePermissionReturn {
  // Loading state
  loading: boolean;
  error: string | null;

  // Permission check methods
  can: (resource: Resource | string, action: Action | string) => boolean;
  canAccess: (resourceType: string, resourceId: string) => boolean;
  canAny: (permissions: Array<[Resource | string, Action | string]>) => boolean;
  canAll: (permissions: Array<[Resource | string, Action | string]>) => boolean;

  // Resource filtering methods
  getAssignedResourceIds: (resourceType: string) => string[] | null;
  requiresResourceFiltering: () => boolean;

  // Role checks
  isViewer: boolean;
  isOperator: boolean;
  isServiceManager: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;

  // Utility
  refresh: () => Promise<void>;
}

/**
 * Hook for checking permissions in components
 *
 * @example
 * ```tsx
 * const { can, isAdmin } = usePermission();
 *
 * if (can('services', 'create')) {
 *   // Show create button
 * }
 *
 * if (isAdmin) {
 *   // Show admin features
 * }
 * ```
 */
export function usePermission(): UsePermissionReturn {
  const context = usePermissionContext();

  const can = useCallback(
    (resource: Resource | string, action: Action | string): boolean => {
      return context.hasPermission(resource, action);
    },
    [context]
  );

  const canAccess = useCallback(
    (resourceType: string, resourceId: string): boolean => {
      return context.hasResourceAccess(resourceType, resourceId);
    },
    [context]
  );

  const canAny = useCallback(
    (permissions: Array<[Resource | string, Action | string]>): boolean => {
      return permissions.some(([resource, action]) => context.hasPermission(resource, action));
    },
    [context]
  );

  const canAll = useCallback(
    (permissions: Array<[Resource | string, Action | string]>): boolean => {
      return permissions.every(([resource, action]) => context.hasPermission(resource, action));
    },
    [context]
  );

  const getAssignedResourceIds = useCallback(
    (resourceType: string): string[] | null => {
      return context.getAssignedResourceIds(resourceType);
    },
    [context]
  );

  const requiresResourceFiltering = useCallback(
    (): boolean => {
      return context.requiresResourceFiltering();
    },
    [context]
  );

  return useMemo(
    () => ({
      loading: context.loading,
      error: context.error,
      can,
      canAccess,
      canAny,
      canAll,
      getAssignedResourceIds,
      requiresResourceFiltering,
      isViewer: context.isViewer,
      isOperator: context.isOperator,
      isServiceManager: context.isServiceManager,
      isAdmin: context.isAdmin,
      isSuperAdmin: context.isSuperAdmin,
      refresh: context.refreshPermissions
    }),
    [context, can, canAccess, canAny, canAll, getAssignedResourceIds, requiresResourceFiltering]
  );
}

/**
 * Hook for checking a specific permission
 *
 * @example
 * ```tsx
 * const canCreateServices = useCanPermission('services', 'create');
 *
 * if (canCreateServices) {
 *   // Show create button
 * }
 * ```
 */
export function useCanPermission(
  resource: Resource | string,
  action: Action | string
): boolean {
  const { hasPermission } = usePermissionContext();
  return hasPermission(resource, action);
}

/**
 * Hook for checking resource access
 *
 * @example
 * ```tsx
 * const canAccessService = useCanAccessResource('services', serviceId);
 *
 * if (!canAccessService) {
 *   return <AccessDenied />;
 * }
 * ```
 */
export function useCanAccessResource(
  resourceType: string,
  resourceId: string
): boolean {
  const { hasResourceAccess } = usePermissionContext();
  return hasResourceAccess(resourceType, resourceId);
}

/**
 * Hook for checking if user has a specific role
 *
 * @example
 * ```tsx
 * const isAdmin = useHasRole('admin');
 * ```
 */
export function useHasRole(roleName: string): boolean {
  const { hasRole } = usePermissionContext();
  return hasRole(roleName);
}

export default usePermission;
