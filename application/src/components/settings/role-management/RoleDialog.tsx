/**
 * RoleDialog Component
 *
 * Dialog for creating and editing roles with permission selection.
 * Clean design optimized for both light and dark modes.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  Plus,
  Pencil,
  Trash2,
  Settings,
  CheckCircle2,
  Lock,
  Globe,
  Server,
  Users,
  Bell,
  FileText,
  Wrench,
  BarChart3,
  Zap,
  FolderTree,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Role, Permission, permissionService, RESOURCES } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onSave: (roleData: Partial<Role>) => void;
}

// Resource categories for logical grouping
const RESOURCE_CATEGORIES = {
  core: {
    label: 'Core System',
    icon: Settings,
    resources: ['users', 'roles', 'settings'],
  },
  monitoring: {
    label: 'Monitoring',
    icon: Globe,
    resources: ['services', 'servers', 'ssl_certificates', 'service_groups'],
  },
  operations: {
    label: 'Operations',
    icon: Wrench,
    resources: ['incidents', 'maintenance', 'alerts'],
  },
  advanced: {
    label: 'Advanced',
    icon: Zap,
    resources: ['security_scans', 'performance_tests', 'operational_pages', 'reports'],
  },
};

// Resource metadata
const RESOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  services: { label: 'Services', icon: Globe },
  servers: { label: 'Servers', icon: Server },
  users: { label: 'Users', icon: Users },
  roles: { label: 'Roles', icon: Shield },
  settings: { label: 'Settings', icon: Settings },
  ssl_certificates: { label: 'SSL Certs', icon: Lock },
  alerts: { label: 'Alerts', icon: Bell },
  incidents: { label: 'Incidents', icon: AlertTriangle },
  maintenance: { label: 'Maintenance', icon: Wrench },
  reports: { label: 'Reports', icon: BarChart3 },
  security_scans: { label: 'Security', icon: ShieldCheck },
  performance_tests: { label: 'Performance', icon: Zap },
  operational_pages: { label: 'Status Pages', icon: FileText },
  service_groups: { label: 'Groups', icon: FolderTree },
};

// Action styling - works in both light and dark modes
const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  selectedClass: string;
  unselectedClass: string;
}> = {
  view: {
    label: 'View',
    icon: Eye,
    selectedClass: 'bg-blue-600 text-white border-blue-600',
    unselectedClass: 'text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-950',
  },
  create: {
    label: 'Create',
    icon: Plus,
    selectedClass: 'bg-emerald-600 text-white border-emerald-600',
    unselectedClass: 'text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950',
  },
  update: {
    label: 'Update',
    icon: Pencil,
    selectedClass: 'bg-amber-600 text-white border-amber-600',
    unselectedClass: 'text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-700 dark:hover:bg-amber-950',
  },
  delete: {
    label: 'Delete',
    icon: Trash2,
    selectedClass: 'bg-rose-600 text-white border-rose-600',
    unselectedClass: 'text-rose-600 border-rose-300 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-700 dark:hover:bg-rose-950',
  },
  manage: {
    label: 'Manage',
    icon: Settings,
    selectedClass: 'bg-violet-600 text-white border-violet-600',
    unselectedClass: 'text-violet-600 border-violet-300 hover:bg-violet-50 dark:text-violet-400 dark:border-violet-700 dark:hover:bg-violet-950',
  },
  acknowledge: {
    label: 'Ack',
    icon: CheckCircle2,
    selectedClass: 'bg-cyan-600 text-white border-cyan-600',
    unselectedClass: 'text-cyan-600 border-cyan-300 hover:bg-cyan-50 dark:text-cyan-400 dark:border-cyan-700 dark:hover:bg-cyan-950',
  },
  export: {
    label: 'Export',
    icon: Download,
    selectedClass: 'bg-slate-600 text-white border-slate-600',
    unselectedClass: 'text-slate-600 border-slate-300 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-800',
  },
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
  const [showRoleDetails, setShowRoleDetails] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core', 'monitoring', 'operations', 'advanced']));
  const { toast } = useToast();

  const isMobile = useMediaQuery('(max-width: 640px)');
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
    setExpandedCategories(new Set(['core', 'monitoring', 'operations', 'advanced']));
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
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const rolePerms = await permissionService.getRolePermissions(roleId);
      setSelectedPermissions(new Set(rolePerms.map((p) => p.id)));
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

  const handleSelectAllForResource = (resource: string, selected: boolean) => {
    if (isSystemRole) return;
    const resourcePerms = permissions.filter((p) => p.resource === resource);
    const newSelected = new Set(selectedPermissions);
    if (selected) {
      resourcePerms.forEach((p) => newSelected.add(p.id));
    } else {
      resourcePerms.forEach((p) => newSelected.delete(p.id));
    }
    setSelectedPermissions(newSelected);
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleSave = async () => {
    if (!name || !displayName) {
      toast({
        title: 'Validation Error',
        description: 'Name and display name are required',
        variant: 'destructive',
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
        is_system: false,
      });

      if (role && !isSystemRole) {
        await permissionService.setRolePermissions(role.id, Array.from(selectedPermissions));
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by resource
  const permissionsByResource = useMemo(() => {
    return RESOURCES.reduce((acc, resource) => {
      acc[resource] = permissions.filter((p) => p.resource === resource);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  const totalPermissions = permissions.length;
  const selectedCount = selectedPermissions.size;

  // Calculate category stats
  const getCategoryStats = (categoryKey: string) => {
    const category = RESOURCE_CATEGORIES[categoryKey as keyof typeof RESOURCE_CATEGORIES];
    let total = 0;
    let selected = 0;
    category.resources.forEach(resource => {
      const perms = permissionsByResource[resource] || [];
      total += perms.length;
      selected += perms.filter(p => selectedPermissions.has(p.id)).length;
    });
    return { total, selected };
  };

  // Dialog content
  const dialogContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${isSystemRole ? 'bg-slate-200 dark:bg-slate-700' : 'bg-primary/10'}`}>
            {isSystemRole ? (
              <Lock className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">
                {isEditing ? (isSystemRole ? 'View Role' : 'Edit Role') : 'Create Role'}
              </h2>
              {isSystemRole && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Read-only
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedCount} of {totalPermissions} permissions selected
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Loading permissions...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Role Details Section */}
            <div className="rounded-lg border bg-card">
              <button
                type="button"
                onClick={() => setShowRoleDetails(!showRoleDetails)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Role Details</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showRoleDetails ? 'rotate-180' : ''}`} />
              </button>

              {showRoleDetails && (
                <div className="p-4 pt-0 space-y-4 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role-name" className="text-sm">Identifier</Label>
                      <Input
                        id="role-name"
                        placeholder="custom_role"
                        value={name}
                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
                        disabled={isSystemRole || isEditing}
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role-display-name" className="text-sm">Display Name</Label>
                      <Input
                        id="role-display-name"
                        placeholder="Custom Role"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={isSystemRole}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description" className="text-sm">Description</Label>
                    <Textarea
                      id="role-description"
                      placeholder="Role description..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isSystemRole}
                      className="resize-none h-16"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-priority" className="text-sm">Priority</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="role-priority"
                        type="number"
                        min={1}
                        max={99}
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value) || 50)}
                        disabled={isSystemRole}
                        className="w-20 text-center"
                      />
                      <span className="text-sm text-muted-foreground">(1-99, higher = more priority)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Permissions Header */}
            <div className="flex items-center gap-2 pt-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium text-sm">Permissions</h3>
            </div>

            {/* Permission Categories */}
            <div className="space-y-3">
              {Object.entries(RESOURCE_CATEGORIES).map(([categoryKey, category]) => {
                const CategoryIcon = category.icon;
                const isExpanded = expandedCategories.has(categoryKey);
                const stats = getCategoryStats(categoryKey);

                return (
                  <div key={categoryKey} className="rounded-lg border bg-card overflow-hidden">
                    {/* Category Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(categoryKey)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{category.label}</span>
                        <Badge variant="outline" className="text-xs ml-1">
                          {stats.selected}/{stats.total}
                        </Badge>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Category Resources */}
                    {isExpanded && (
                      <div className="border-t p-3 space-y-3">
                        {category.resources.map((resource) => {
                          const perms = permissionsByResource[resource] || [];
                          if (perms.length === 0) return null;

                          const config = RESOURCE_CONFIG[resource] || { label: resource, icon: Layers };
                          const ResourceIcon = config.icon;
                          const allSelected = perms.every((p) => selectedPermissions.has(p.id));
                          const someSelected = perms.some((p) => selectedPermissions.has(p.id));
                          const selectedForResource = perms.filter((p) => selectedPermissions.has(p.id)).length;

                          return (
                            <div
                              key={resource}
                              className={`rounded-lg border p-3 ${someSelected ? 'border-primary/30 bg-primary/5' : 'bg-muted/30'}`}
                            >
                              {/* Resource Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <ResourceIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{config.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({selectedForResource}/{perms.length})
                                  </span>
                                </div>
                                {!isSystemRole && (
                                  <Switch
                                    checked={allSelected}
                                    onCheckedChange={(checked) => handleSelectAllForResource(resource, checked)}
                                    className="scale-90"
                                  />
                                )}
                              </div>

                              {/* Permission Chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {perms.map((perm) => {
                                  const actionConfig = ACTION_CONFIG[perm.action] || ACTION_CONFIG.view;
                                  const ActionIcon = actionConfig.icon;
                                  const isSelected = selectedPermissions.has(perm.id);

                                  return (
                                    <button
                                      key={perm.id}
                                      type="button"
                                      onClick={() => handlePermissionToggle(perm.id)}
                                      disabled={isSystemRole}
                                      className={`
                                        inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                                        border transition-colors
                                        ${isSystemRole ? 'cursor-default' : 'cursor-pointer'}
                                        ${isSelected ? actionConfig.selectedClass : actionConfig.unselectedClass}
                                      `}
                                    >
                                      <ActionIcon className="h-3 w-3" />
                                      <span>{actionConfig.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t bg-muted/30">
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isSystemRole ? 'Close' : 'Cancel'}
          </Button>
          {!isSystemRole && (
            <Button onClick={handleSave} disabled={saving || !name || !displayName}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col rounded-t-xl">
          <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          {dialogContent}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col gap-0">
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
