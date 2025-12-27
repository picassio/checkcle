/**
 * ProtectedRoute Component
 *
 * Protects routes from unauthenticated users and optionally
 * enforces permission/role requirements.
 *
 * SECURITY NOTE: These client-side checks are for UI/UX purposes only.
 * All sensitive operations MUST be protected by server-side authorization
 * via PocketBase collection rules and the RBAC middleware.
 * Client-side checks can be bypassed - never rely on them for security.
 */

import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '@/services/authService';
import { usePermission } from '@/hooks/usePermission';
import { Resource, Action } from '@/contexts/PermissionContext';

interface ProtectedRouteProps {
  children: ReactNode;
  // Optional permission requirement
  requiredPermission?: {
    resource: Resource | string;
    action: Action | string;
  };
  // Optional multiple permissions (any or all)
  requiredPermissions?: {
    permissions: Array<[Resource | string, Action | string]>;
    requireAll?: boolean;
  };
  // Optional role requirement
  requiredRole?: string | string[];
  // Optional resource access check
  resourceAccess?: {
    resourceType: string;
    resourceId: string;
  };
  // Where to redirect if unauthorized (default: /dashboard)
  redirectTo?: string;
  // Custom unauthorized component
  unauthorizedComponent?: ReactNode;
}

export const ProtectedRoute = ({
  children,
  requiredPermission,
  requiredPermissions,
  requiredRole,
  resourceAccess,
  redirectTo = '/dashboard',
  unauthorizedComponent
}: ProtectedRouteProps) => {
  const location = useLocation();
  const { can, canAny, canAll, canAccess, isViewer, isOperator, isServiceManager, isAdmin, isSuperAdmin, loading } = usePermission();

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for permissions to load
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check single permission
  if (requiredPermission) {
    if (!can(requiredPermission.resource, requiredPermission.action)) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check multiple permissions
  if (requiredPermissions) {
    const hasPermission = requiredPermissions.requireAll
      ? canAll(requiredPermissions.permissions)
      : canAny(requiredPermissions.permissions);

    if (!hasPermission) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check role requirement
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = roles.some(role => {
      switch (role) {
        case 'viewer':
          return isViewer;
        case 'operator':
          return isOperator;
        case 'service_manager':
          return isServiceManager;
        case 'admin':
          return isAdmin;
        case 'superadmin':
          return isSuperAdmin;
        default:
          return false;
      }
    });

    if (!hasRole) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  // Check resource access
  if (resourceAccess) {
    if (!canAccess(resourceAccess.resourceType, resourceAccess.resourceId)) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

/**
 * AccessDenied Component
 *
 * A default component to show when access is denied.
 */
export const AccessDenied = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">403</div>
      <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground max-w-md">
        You don't have permission to access this page.
        Please contact your administrator if you believe this is an error.
      </p>
    </div>
  );
};
