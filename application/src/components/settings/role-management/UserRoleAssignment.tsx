/**
 * UserRoleAssignment Component
 *
 * Allows superadmins to assign roles to users.
 * Responsive design with table on desktop and cards on mobile.
 */

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, X, Search, RefreshCw, User, Shield } from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { Role, permissionService } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
      setDialogOpen(false);
      loadUsersWithRoles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveRole = async (assignmentId: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search and Refresh */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadUsersWithRoles} className="shrink-0">
            <RefreshCw className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[280px]">User</TableHead>
                <TableHead>Assigned Roles</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10">
                    <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={`${user.collection}-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{user.name || user.email}</div>
                          <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                            {user.email}
                            {user.collection === '_superusers' && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Super
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground italic">No roles assigned</span>
                        ) : (
                          user.roles.map((r) => (
                            <Badge
                              key={r.assignmentId}
                              variant="outline"
                              className={`${getRoleColor(r.role.name)} flex items-center gap-1 pr-1`}
                            >
                              <Shield className="h-3 w-3" />
                              {r.role.display_name}
                              <button
                                onClick={() => handleRemoveRole(r.assignmentId)}
                                className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(user)}
                        className="h-8"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 border rounded-lg">
              <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div
                key={`${user.collection}-${user.id}`}
                className="border rounded-lg p-4 space-y-3 bg-card"
              >
                {/* User Info */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>
                        {getInitials(user.name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{user.name || user.email}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        {user.email}
                        {user.collection === '_superusers' && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Super
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(user)}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-1.5">
                  {user.roles.length === 0 ? (
                    <span className="text-sm text-muted-foreground italic">No roles assigned</span>
                  ) : (
                    user.roles.map((r) => (
                      <Badge
                        key={r.assignmentId}
                        variant="outline"
                        className={`${getRoleColor(r.role.name)} flex items-center gap-1 pr-1 text-xs`}
                      >
                        <Shield className="h-3 w-3" />
                        {r.role.display_name}
                        <button
                          onClick={() => handleRemoveRole(r.assignmentId)}
                          className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assign Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              Assign Role
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? (
                <>
                  Assign a role to{' '}
                  <span className="font-medium text-foreground">
                    {selectedUser.name || selectedUser.email}
                  </span>
                </>
              ) : (
                'Select a role to assign to this user'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-full">
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
                      className="py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <div>
                          <span className="font-medium">{role.display_name}</span>
                          {isAssigned && (
                            <span className="ml-2 text-xs text-muted-foreground">(Assigned)</span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedRole}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
