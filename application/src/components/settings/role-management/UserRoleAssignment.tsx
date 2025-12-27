/**
 * UserRoleAssignment Component
 *
 * Allows superadmins to assign roles to users.
 * Card-based layout matching the Modern Professional design system.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  X,
  Search,
  RefreshCw,
  User,
  Shield,
  MoreHorizontal,
  UserPlus,
  Crown,
} from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { Role, permissionService } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';

interface UserRoleAssignmentProps {
  roles: Role[];
  onRefresh: () => void;
}

interface UserWithRoles {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  collection: string;
  roles: Array<{
    assignmentId: string;
    role: Role;
  }>;
}

export function UserRoleAssignment({ roles, onRefresh }: UserRoleAssignmentProps) {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');

  useEffect(() => {
    loadUsersWithRoles();
  }, []);

  const loadUsersWithRoles = async () => {
    try {
      setLoading(true);

      // Load regular users
      const regularUsers = await pb.collection('users').getFullList({
        sort: 'email'
      });

      // Load superusers
      let superusers: any[] = [];
      try {
        superusers = await pb.collection('_superusers').getFullList({
          sort: 'email'
        });
      } catch (e) {
        // Superusers collection may not be accessible
      }

      // Load all user role assignments
      const assignments = await pb.collection('user_roles').getFullList({
        expand: 'role_id'
      });

      // Build user list with roles
      const usersWithRoles: UserWithRoles[] = [];

      // Process regular users
      for (const user of regularUsers) {
        const userAssignments = assignments.filter(
          (a: any) => a.user_id === user.id && a.user_collection === 'users'
        );

        usersWithRoles.push({
          id: user.id,
          email: user.email,
          name: (user as any).full_name || (user as any).name,
          avatar: (user as any).avatar,
          collection: 'users',
          roles: userAssignments.map((a: any) => ({
            assignmentId: a.id,
            role: a.expand?.role_id as Role
          })).filter((r: any) => r.role)
        });
      }

      // Process superusers
      for (const user of superusers) {
        const userAssignments = assignments.filter(
          (a: any) => a.user_id === user.id && a.user_collection === '_superusers'
        );

        usersWithRoles.push({
          id: user.id,
          email: user.email,
          name: user.full_name || user.name,
          avatar: user.avatar,
          collection: '_superusers',
          roles: userAssignments.map((a: any) => ({
            assignmentId: a.id,
            role: a.expand?.role_id as Role
          })).filter((r: any) => r.role)
        });
      }

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadUsersWithRoles();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleOpenDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRole('');
    setDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive'
      });
      return;
    }

    // Check if user already has this role
    if (selectedUser.roles.some(r => r.role.id === selectedRole)) {
      toast({
        title: 'Error',
        description: 'User already has this role',
        variant: 'destructive'
      });
      return;
    }

    try {
      await permissionService.assignRole(selectedUser.id, selectedUser.collection, selectedRole);
      toast({
        title: 'Success',
        description: 'Role assigned successfully'
      });
      setSelectedRole('');
      loadUsersWithRoles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveRole = async (e: React.MouseEvent, assignmentId: string) => {
    e.stopPropagation();
    try {
      await permissionService.removeRole(assignmentId);
      toast({
        title: 'Success',
        description: 'Role removed successfully'
      });
      loadUsersWithRoles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove role',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || 'U';
  };

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'superadmin':
        return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800';
      case 'admin':
        return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      case 'service_manager':
        return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
      case 'operator':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
      case 'viewer':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      default:
        return 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800';
    }
  };

  // Dialog content
  const dialogContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-muted/30">
        {selectedUser && (
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={selectedUser.avatar} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {getInitials(selectedUser.name, selectedUser.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold truncate">
                  {selectedUser.name || selectedUser.email}
                </h2>
                {selectedUser.collection === '_superusers' && (
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Superuser
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {selectedUser.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 sm:p-6 space-y-6">
          {/* Current Roles */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Current Roles
            </h3>
            {selectedUser?.roles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No roles assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedUser?.roles.map((r) => (
                  <Badge
                    key={r.assignmentId}
                    variant="outline"
                    className={`${getRoleColor(r.role.name)} flex items-center gap-1.5 px-3 py-1.5`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {r.role.display_name}
                    <button
                      onClick={(e) => handleRemoveRole(e, r.assignmentId)}
                      className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add Role */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Add New Role
            </h3>
            <div className="flex gap-2">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => {
                    const isAssigned = selectedUser?.roles.some(r => r.role.id === role.id);
                    return (
                      <SelectItem
                        key={role.id}
                        value={role.id}
                        disabled={isAssigned}
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          <span>{role.display_name}</span>
                          {isAssigned && (
                            <span className="text-xs text-muted-foreground">(Assigned)</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignRole} disabled={!selectedRole}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t bg-muted/30">
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-10 w-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
        <p className="mt-4 text-sm text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header with search and refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 px-4">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium text-foreground">No users found</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              {search ? 'Try adjusting your search query' : 'No users available'}
            </p>
          </div>
        </div>
      ) : (
        /* User Cards Grid */
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <div
              key={`${user.collection}-${user.id}`}
              onClick={() => handleOpenDialog(user)}
              className={`
                group rounded-lg border bg-card p-4 cursor-pointer
                transition-all duration-200 hover:shadow-md
                ${user.roles.length === 0
                  ? 'border-dashed border-muted-foreground/30'
                  : 'border-border hover:border-primary/30'
                }
              `}
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>

                  {/* User Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">
                        {user.name || user.email.split('@')[0]}
                      </h3>
                      {user.collection === '_superusers' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                          Super
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
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
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onClick={() => handleOpenDialog(user)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Manage Roles
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Roles */}
              <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
                {user.roles.length === 0 ? (
                  <span className="text-sm text-muted-foreground italic">
                    No roles assigned
                  </span>
                ) : (
                  user.roles.slice(0, 3).map((r) => (
                    <Badge
                      key={r.assignmentId}
                      variant="outline"
                      className={`${getRoleColor(r.role.name)} flex items-center gap-1 text-xs`}
                    >
                      <Shield className="h-3 w-3" />
                      {r.role.display_name}
                    </Badge>
                  ))
                )}
                {user.roles.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.roles.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Role Assignment Dialog */}
      {isMobile ? (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-xl">
            <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {dialogContent}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md h-[60vh] p-0 flex flex-col gap-0">
            {dialogContent}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
