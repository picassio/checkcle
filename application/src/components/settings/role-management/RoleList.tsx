/**
 * RoleList Component
 *
 * Displays a list of roles with clean card-based layout.
 * Optimized for both light and dark modes.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Lock,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Role } from '@/services/permissionService';

interface RoleListProps {
  roles: Role[];
  loading: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onRefresh: () => void;
}

export function RoleList({ roles, loading, onEdit, onDelete, onRefresh }: RoleListProps) {
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleDelete = () => {
    if (deleteRole) {
      onDelete(deleteRole);
      setDeleteRole(null);
    }
  };

  // Priority styling
  const getPriorityConfig = (priority: number) => {
    if (priority >= 100) return {
      className: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    };
    if (priority >= 40) return {
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    };
    if (priority >= 20) return {
      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    };
    return {
      className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Loading roles...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {roles.length} {roles.length === 1 ? 'role' : 'roles'}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Empty State */}
      {roles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">No roles configured</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Create your first role to start managing access permissions.
            </p>
          </div>
        </div>
      ) : (
        /* Role Cards Grid */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const priorityConfig = getPriorityConfig(role.priority);

            return (
              <div
                key={role.id}
                onClick={() => onEdit(role)}
                className={`
                  group rounded-lg border bg-card p-4 transition-all duration-200
                  hover:shadow-md hover:border-border cursor-pointer
                  ${role.is_system
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50'
                    : 'border-border hover:border-primary/30'
                  }
                `}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Role Icon */}
                    <div className={`
                      shrink-0 p-2 rounded-lg
                      ${role.is_system
                        ? 'bg-slate-200 dark:bg-slate-700'
                        : 'bg-primary/10'
                      }
                    `}>
                      {role.is_system ? (
                        <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      ) : (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>

                    {/* Role Name */}
                    <div className="min-w-0">
                      <h3 className="font-medium text-foreground truncate">
                        {role.display_name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {role.name}
                      </p>
                    </div>
                  </div>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => onEdit(role)}>
                        {role.is_system ? (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            View Permissions
                          </>
                        ) : (
                          <>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Role
                          </>
                        )}
                      </DropdownMenuItem>
                      {!role.is_system && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteRole(role)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Role
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                  {role.description || 'No description provided'}
                </p>

                {/* Footer Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Priority Badge */}
                  <Badge
                    variant="outline"
                    className={`text-xs font-medium ${priorityConfig.className}`}
                  >
                    Priority: {role.priority}
                  </Badge>

                  {/* Type Badge */}
                  {role.is_system ? (
                    <Badge variant="secondary" className="text-xs">
                      System
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRole?.display_name}"?
              This action cannot be undone. Users with this role will lose these permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
