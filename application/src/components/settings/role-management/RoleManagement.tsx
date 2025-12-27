/**
 * Role Management Component
 *
 * Main component for managing roles and permissions.
 * Allows superadmins to view roles, create custom roles, and manage permissions.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Shield, Users, Key, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { SuperAdminGuard } from '@/components/auth/PermissionGuard';
import { RoleList } from './RoleList';
import { RoleDialog } from './RoleDialog';
import { UserRoleAssignment } from './UserRoleAssignment';
import { ResourceAssignment } from './ResourceAssignment';
import { permissionService, Role } from '@/services/permissionService';
import { useLanguage } from '@/contexts/LanguageContext';

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { toast } = useToast();
  const { isSuperAdmin } = usePermission();
  const { t } = useLanguage();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const fetchedRoles = await permissionService.getAllRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load roles',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setDialogOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setDialogOpen(true);
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.is_system) {
      toast({
        title: 'Error',
        description: 'System roles cannot be deleted',
        variant: 'destructive'
      });
      return;
    }

    try {
      await permissionService.deleteRole(role.id);
      toast({
        title: 'Success',
        description: 'Role deleted successfully'
      });
      loadRoles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete role',
        variant: 'destructive'
      });
    }
  };

  const handleSaveRole = async (roleData: Partial<Role>) => {
    try {
      if (editingRole) {
        await permissionService.updateRole(editingRole.id, roleData);
        toast({
          title: 'Success',
          description: 'Role updated successfully'
        });
      } else {
        await permissionService.createRole(roleData as Omit<Role, 'id'>);
        toast({
          title: 'Success',
          description: 'Role created successfully'
        });
      }
      setDialogOpen(false);
      loadRoles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save role',
        variant: 'destructive'
      });
    }
  };

  return (
    <SuperAdminGuard
      fallback={
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only superadmins can manage roles and permissions.
            </p>
          </CardContent>
        </Card>
      }
    >
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                Role Management
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Manage user roles, permissions, and access control
              </CardDescription>
            </div>
            <Button onClick={handleCreateRole} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="w-full h-auto p-1 grid grid-cols-3 gap-1">
              <TabsTrigger
                value="roles"
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
              >
                <Key className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden xs:inline sm:hidden">Roles</span>
                <span className="xs:hidden">Roles</span>
                <span className="hidden sm:inline">Roles & Permissions</span>
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden sm:inline">User Roles</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="resources"
                className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm data-[state=active]:bg-background"
              >
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden sm:inline">Resources</span>
                <span className="sm:hidden">Res.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="mt-4">
              <RoleList
                roles={roles}
                loading={loading}
                onEdit={handleEditRole}
                onDelete={handleDeleteRole}
                onRefresh={loadRoles}
              />
            </TabsContent>

            <TabsContent value="assignments" className="mt-4">
              <UserRoleAssignment roles={roles} onRefresh={loadRoles} />
            </TabsContent>

            <TabsContent value="resources" className="mt-4">
              <ResourceAssignment roles={roles} onRefresh={loadRoles} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <RoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editingRole}
        onSave={handleSaveRole}
      />
    </SuperAdminGuard>
  );
}

export default RoleManagement;
