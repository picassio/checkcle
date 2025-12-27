/**
 * RoleDialog Component
 *
 * Dialog for creating and editing roles with permission selection.
 * Responsive design for mobile and desktop.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, Shield, Key } from 'lucide-react';
import { Role, Permission, permissionService, RESOURCES } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSave: (roleData: Partial<Role>) => void;
}

const RESOURCE_LABELS: Record<string, string> = {
  services: 'Services',
  servers: 'Servers',
  users: 'Users',
  roles: 'Roles',
  settings: 'Settings',
  ssl_certificates: 'SSL Certificates',
  alerts: 'Alerts',
  incidents: 'Incidents',
  maintenance: 'Maintenance',
  reports: 'Reports',
  security_scans: 'Security Scans',
  performance_tests: 'Performance Tests',
  operational_pages: 'Operational Pages',
  service_groups: 'Service Groups',
};

export function RoleDialog({ open, onOpenChange, role, onSave }: RoleDialogProps) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(50);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isEditing = !!role;
  const isSystemRole = role?.is_system || false;

  useEffect(() => {
    if (open) {
      loadPermissions();
      if (role) {
        setName(role.name);
        setDisplayName(role.display_name);
        setDescription(role.description || '');
        setPriority(role.priority);
        loadRolePermissions(role.id);
      } else {
        resetForm();
      }
    }
  }, [open, role]);

  const resetForm = () => {
    setName('');
    setDisplayName('');
    setDescription('');
    setPriority(50);
    setSelectedPermissions(new Set());
  };

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const allPermissions = await permissionService.getAllPermissions();
      setPermissions(allPermissions);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load permissions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const rolePerms = await permissionService.getRolePermissions(roleId);
      setSelectedPermissions(new Set(rolePerms.map(p => p.id)));
    } catch (error) {
      console.error('Failed to load role permissions:', error);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (isSystemRole) return;

    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSelectAllForResource = (resource: string) => {
    if (isSystemRole) return;

    const resourcePerms = permissions.filter(p => p.resource === resource);
    const allSelected = resourcePerms.every(p => selectedPermissions.has(p.id));

    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      resourcePerms.forEach(p => newSelected.delete(p.id));
    } else {
      resourcePerms.forEach(p => newSelected.add(p.id));
    }
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    if (!name || !displayName) {
      toast({
        title: 'Validation Error',
        description: 'Name and display name are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      await onSave({
        name,
        display_name: displayName,
        description,
        priority,
        is_system: false
      });

      if (role && !isSystemRole) {
        await permissionService.setRolePermissions(role.id, Array.from(selectedPermissions));
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save role',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by resource
  const permissionsByResource = RESOURCES.reduce((acc, resource) => {
    acc[resource] = permissions.filter(p => p.resource === resource);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            {isEditing ? (isSystemRole ? 'View Role' : 'Edit Role') : 'Create Role'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isSystemRole
              ? 'System roles cannot be modified. You can view the permissions assigned to this role.'
              : 'Configure role details and assign permissions.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 sm:px-6">
            <div className="space-y-6 py-4">
              {/* Role Details */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Role Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-medium">
                      Name (slug)
                    </Label>
                    <Input
                      id="name"
                      placeholder="custom_role"
                      value={name}
                      onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
                      disabled={isSystemRole}
                      className="h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Lowercase letters and underscores only
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-xs font-medium">
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="Custom Role"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isSystemRole}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this role is for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSystemRole}
                    className="resize-none h-20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-xs font-medium">
                    Priority
                  </Label>
                  <Input
                    id="priority"
                    type="number"
                    min={1}
                    max={99}
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value) || 50)}
                    disabled={isSystemRole}
                    className="h-9 w-24"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Higher priority roles take precedence (1-99)
                  </p>
                </div>
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Permissions
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {selectedPermissions.size} selected
                  </Badge>
                </div>

                {/* Desktop Grid View */}
                <div className="hidden sm:block space-y-3">
                  {Object.entries(permissionsByResource).map(([resource, perms]) => {
                    if (perms.length === 0) return null;

                    const allSelected = perms.every(p => selectedPermissions.has(p.id));
                    const someSelected = perms.some(p => selectedPermissions.has(p.id));
                    const selectedCount = perms.filter(p => selectedPermissions.has(p.id)).length;

                    return (
                      <div key={resource} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={() => handleSelectAllForResource(resource)}
                              disabled={isSystemRole}
                              className={someSelected && !allSelected ? 'opacity-50' : ''}
                            />
                            <span className="font-medium text-sm">
                              {RESOURCE_LABELS[resource] || resource}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {selectedCount}/{perms.length}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-6">
                          {perms.map((perm) => (
                            <div key={perm.id} className="flex items-center gap-2">
                              <Checkbox
                                id={perm.id}
                                checked={selectedPermissions.has(perm.id)}
                                onCheckedChange={() => handlePermissionToggle(perm.id)}
                                disabled={isSystemRole}
                              />
                              <Label
                                htmlFor={perm.id}
                                className="text-xs cursor-pointer capitalize"
                              >
                                {perm.action}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Accordion View */}
                <Accordion type="multiple" className="sm:hidden space-y-2">
                  {Object.entries(permissionsByResource).map(([resource, perms]) => {
                    if (perms.length === 0) return null;

                    const allSelected = perms.every(p => selectedPermissions.has(p.id));
                    const someSelected = perms.some(p => selectedPermissions.has(p.id));
                    const selectedCount = perms.filter(p => selectedPermissions.has(p.id)).length;

                    return (
                      <AccordionItem
                        key={resource}
                        value={resource}
                        className="border rounded-lg px-3"
                      >
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={(e) => {
                                  e.stopPropagation?.();
                                  handleSelectAllForResource(resource);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={isSystemRole}
                                className={someSelected && !allSelected ? 'opacity-50' : ''}
                              />
                              <span className="font-medium text-sm">
                                {RESOURCE_LABELS[resource] || resource}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs mr-2">
                              {selectedCount}/{perms.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <div className="grid grid-cols-2 gap-2 pl-6 pt-1">
                            {perms.map((perm) => (
                              <div key={perm.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`mobile-${perm.id}`}
                                  checked={selectedPermissions.has(perm.id)}
                                  onCheckedChange={() => handlePermissionToggle(perm.id)}
                                  disabled={isSystemRole}
                                />
                                <Label
                                  htmlFor={`mobile-${perm.id}`}
                                  className="text-xs cursor-pointer capitalize"
                                >
                                  {perm.action}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="px-4 sm:px-6 py-4 border-t shrink-0 flex-col gap-2 sm:flex-row sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            {isSystemRole ? 'Close' : 'Cancel'}
          </Button>
          {!isSystemRole && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
