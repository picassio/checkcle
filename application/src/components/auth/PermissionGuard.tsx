/**
 * PermissionGuard Component
 *
 * A component that conditionally renders its children based on user permissions.
 * Use this to hide/show UI elements based on RBAC permissions.
 *
 * SECURITY NOTE: This guard is for UI purposes only (hiding buttons, menus, etc.).
 * All API calls and data mutations MUST be protected by server-side authorization.
 * Never assume that hiding a UI element prevents unauthorized access.
 *
 * @example
 * ```tsx
 * // Show button only if user can create services
 * <PermissionGuard resource="services" action="create">
 *   <Button>Add Service</Button>
 * </PermissionGuard>
 *
 * // Show with fallback for unauthorized users
 * <PermissionGuard resource="settings" action="update" fallback={<span>Read only</span>}>
 *   <Button>Save Settings</Button>
 * </PermissionGuard>
 *
 * // Multiple permission check (any)
 * <PermissionGuard
 *   permissions={[['services', 'manage'], ['servers', 'manage']]}
 *   requireAll={false}
 * >
 *   <AdminPanel />
 * </PermissionGuard>
 * ```
 */

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Resource, Action } from '@/contexts/PermissionContext';

interface SinglePermissionProps {
  resource: Resource | string;
  action: Action | string;
  permissions?: never;
  requireAll?: never;
}

interface MultiplePermissionProps {
  resource?: never;
  action?: never;
  permissions: Array<[Resource | string, Action | string]>;
  requireAll?: boolean;
}

type PermissionGuardProps = (SinglePermissionProps | MultiplePermissionProps) & {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
};

export const PermissionGuard = ({
  resource,
  action,
  permissions,
  requireAll = false,
  children,
  fallback = null,
  loading: loadingFallback = null
}: PermissionGuardProps) => {
  const { can, canAny, canAll, loading } = usePermission();

  // Show loading fallback while permissions are being loaded
  if (loading) {
    return <>{loadingFallback}</>;
  }

  let hasPermission = false;

  if (permissions) {
    // Multiple permission check
    hasPermission = requireAll ? canAll(permissions) : canAny(permissions);
  } else if (resource && action) {
    // Single permission check
    hasPermission = can(resource, action);
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * ResourceGuard Component
 *
 * Guards access to specific resource instances.
 * Use this when you need to check if the user has access to a specific resource ID.
 *
 * @example
 * ```tsx
 * <ResourceGuard resourceType="services" resourceId={service.id}>
 *   <ServiceEditor service={service} />
 * </ResourceGuard>
 * ```
 */
interface ResourceGuardProps {
  resourceType: string;
  resourceId: string;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export const ResourceGuard = ({
  resourceType,
  resourceId,
  children,
  fallback = null,
  loading: loadingFallback = null
}: ResourceGuardProps) => {
  const { canAccess, loading } = usePermission();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!canAccess(resourceType, resourceId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * RoleGuard Component
 *
 * Guards access based on user roles.
 *
 * @example
 * ```tsx
 * <RoleGuard roles={['admin', 'superadmin']}>
 *   <AdminDashboard />
 * </RoleGuard>
 * ```
 */
interface RoleGuardProps {
  roles: string[];
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export const RoleGuard = ({
  roles,
  requireAll = false,
  children,
  fallback = null,
  loading: loadingFallback = null
}: RoleGuardProps) => {
  const permission = usePermission();

  if (permission.loading) {
    return <>{loadingFallback}</>;
  }

  let hasRole = false;

  if (requireAll) {
    hasRole = roles.every(role => {
      switch (role) {
        case 'viewer':
          return permission.isViewer;
        case 'operator':
          return permission.isOperator;
        case 'service_manager':
          return permission.isServiceManager;
        case 'admin':
          return permission.isAdmin;
        case 'superadmin':
          return permission.isSuperAdmin;
        default:
          return false;
      }
    });
  } else {
    hasRole = roles.some(role => {
      switch (role) {
        case 'viewer':
          return permission.isViewer;
        case 'operator':
          return permission.isOperator;
        case 'service_manager':
          return permission.isServiceManager;
        case 'admin':
          return permission.isAdmin;
        case 'superadmin':
          return permission.isSuperAdmin;
        default:
          return false;
      }
    });
  }

  if (!hasRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * SuperAdminGuard Component
 *
 * Shortcut for guarding superadmin-only content.
 *
 * @example
 * ```tsx
 * <SuperAdminGuard>
 *   <UserManagement />
 * </SuperAdminGuard>
 * ```
 */
interface SuperAdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export const SuperAdminGuard = ({
  children,
  fallback = null,
  loading: loadingFallback = null
}: SuperAdminGuardProps) => {
  const { isSuperAdmin, loading } = usePermission();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * AdminGuard Component
 *
 * Shortcut for guarding admin-only content.
 *
 * @example
 * ```tsx
 * <AdminGuard>
 *   <SettingsPanel />
 * </AdminGuard>
 * ```
 */
interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  loading?: ReactNode;
}

export const AdminGuard = ({
  children,
  fallback = null,
  loading: loadingFallback = null
}: AdminGuardProps) => {
  const { isAdmin, loading } = usePermission();

  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default PermissionGuard;
