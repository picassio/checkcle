/**
 * ResourceAssignmentDialog Component
 *
 * Dialog for assigning specific resources (services, servers, SSL certificates, etc.)
 * to users with per-resource access levels (view/manage).
 *
 * Redesigned with:
 * - Per-resource access level selection (not global batch)
 * - Sheet on mobile, Dialog on desktop
 * - Clean visual design with inline toggles
 * - Batch actions for "Set all to View/Manage"
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Globe,
  Server,
  ShieldCheck,
  Zap,
  Lock,
  FolderTree,
  Search,
  Eye,
  Settings2,
  ChevronDown,
  CheckCircle2,
  X,
} from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { permissionService, ResourceAssignment } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';

// Resource type configuration with icons and collection mappings
const RESOURCE_TYPES = [
  {
    value: 'services',
    label: 'Uptime Monitors',
    collection: 'services',
    icon: Globe,
    nameField: 'name',
    descField: 'url',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    value: 'servers',
    label: 'Servers',
    collection: 'servers',
    icon: Server,
    nameField: 'name',
    descField: 'host',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    value: 'ssl_certificates',
    label: 'SSL Certificates',
    collection: 'ssl_certificates',
    icon: Lock,
    nameField: 'domain',
    descField: 'issuer',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    value: 'security_scans',
    label: 'Security Scans',
    collection: 'security_scans',
    icon: ShieldCheck,
    nameField: 'name',
    descField: 'target_url',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  {
    value: 'performance_tests',
    label: 'Performance Tests',
    collection: 'performance_tests',
    icon: Zap,
    nameField: 'name',
    descField: 'url',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    value: 'service_groups',
    label: 'Service Groups',
    collection: 'service_group',
    icon: FolderTree,
    nameField: 'name',
    descField: 'description',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
] as const;

interface ResourceItem {
  id: string;
  name: string;
  description?: string;
}

interface SelectedResource {
  id: string;
  accessLevel: 'view' | 'manage';
}

interface ResourceAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userCollection: string;
  userName?: string;
  existingAssignments: ResourceAssignment[];
  onSuccess: () => void;
}

export function ResourceAssignmentDialog({
  open,
  onOpenChange,
  userId,
  userCollection,
  userName,
  existingAssignments,
  onSuccess,
}: ResourceAssignmentDialogProps) {
  const [resourceType, setResourceType] = useState<string>('services');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  // Per-resource selection with access level
  const [selectedResources, setSelectedResources] = useState<Map<string, 'view' | 'manage'>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');

  const currentTypeConfig = RESOURCE_TYPES.find((t) => t.value === resourceType);
  const Icon = currentTypeConfig?.icon || Globe;

  // Load resources when type changes
  useEffect(() => {
    if (open && resourceType) {
      loadResources();
    }
  }, [open, resourceType]);

  // Reset selection when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedResources(new Map());
      setSearch('');
    }
  }, [open]);

  const loadResources = async () => {
    const typeConfig = RESOURCE_TYPES.find((t) => t.value === resourceType);
    if (!typeConfig) return;

    try {
      setLoading(true);
      const items = await pb.collection(typeConfig.collection).getFullList({
        sort: typeConfig.nameField,
      });

      // Get already assigned resource IDs for this type
      const assignedIds = new Set(
        existingAssignments
          .filter((a) => a.resource_type === resourceType)
          .map((a) => a.resource_id)
      );

      // Filter out already assigned resources and map to ResourceItem
      const availableItems: ResourceItem[] = items
        .filter((item) => !assignedIds.has(item.id))
        .map((item) => ({
          id: item.id,
          name: (item as any)[typeConfig.nameField] || item.id,
          description: (item as any)[typeConfig.descField] || undefined,
        }));

      setResources(availableItems);
    } catch (error) {
      console.error('Failed to load resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive',
      });
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleResource = (resourceId: string) => {
    const newSelected = new Map(selectedResources);
    if (newSelected.has(resourceId)) {
      newSelected.delete(resourceId);
    } else {
      // Default to 'view' when selecting
      newSelected.set(resourceId, 'view');
    }
    setSelectedResources(newSelected);
  };

  const handleChangeAccessLevel = (resourceId: string, level: 'view' | 'manage') => {
    const newSelected = new Map(selectedResources);
    if (newSelected.has(resourceId)) {
      newSelected.set(resourceId, level);
      setSelectedResources(newSelected);
    }
  };

  const handleSelectAll = () => {
    if (selectedResources.size === filteredResources.length) {
      setSelectedResources(new Map());
    } else {
      const newSelected = new Map<string, 'view' | 'manage'>();
      filteredResources.forEach((r) => newSelected.set(r.id, 'view'));
      setSelectedResources(newSelected);
    }
  };

  const handleSetAllAccessLevel = (level: 'view' | 'manage') => {
    const newSelected = new Map<string, 'view' | 'manage'>();
    selectedResources.forEach((_, id) => {
      newSelected.set(id, level);
    });
    setSelectedResources(newSelected);
  };

  const handleAssign = async () => {
    if (selectedResources.size === 0) {
      toast({
        title: 'No resources selected',
        description: 'Please select at least one resource to assign',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Assign each selected resource with its specific access level
      for (const [resourceId, accessLevel] of selectedResources) {
        await permissionService.assignResource(
          userId,
          userCollection,
          resourceType,
          resourceId,
          accessLevel
        );
      }

      toast({
        title: 'Resources assigned',
        description: `Successfully assigned ${selectedResources.size} resource(s)`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign one or more resources',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter resources by search term
  const filteredResources = useMemo(() => {
    return resources.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [resources, search]);

  // Count selected by access level
  const selectedCounts = useMemo(() => {
    let view = 0;
    let manage = 0;
    selectedResources.forEach((level) => {
      if (level === 'view') view++;
      else manage++;
    });
    return { view, manage, total: view + manage };
  }, [selectedResources]);

  // Shared content for both Dialog and Sheet
  const dialogContent = (
    <>
      {/* Resource Type Selector */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label htmlFor="resourceType" className="text-sm font-medium">
          Resource Type
        </Label>
        <Select value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger id="resourceType" className="w-full">
            <SelectValue placeholder="Select resource type" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((type) => {
              const TypeIcon = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <TypeIcon className={`h-4 w-4 ${type.color}`} />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search resources..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Resource List Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Available Resources ({filteredResources.length})
        </Label>
        {filteredResources.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-7 text-xs"
          >
            {selectedResources.size === filteredResources.length
              ? 'Deselect All'
              : 'Select All'}
          </Button>
        )}
      </div>

      {/* Resource List */}
      {loading ? (
        <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-muted/20">
          <Icon className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {resources.length === 0
              ? 'No available resources of this type'
              : 'No resources match your search'}
          </p>
        </div>
      ) : (
        <div
          className="border rounded-lg overflow-hidden"
          style={{ maxHeight: isMobile ? '40vh' : '280px' }}
        >
          <div className="overflow-y-auto h-full overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="divide-y divide-border">
              {filteredResources.map((resource) => {
                const isSelected = selectedResources.has(resource.id);
                const accessLevel = selectedResources.get(resource.id) || 'view';

                return (
                  <div
                    key={resource.id}
                    className={`
                      flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 transition-colors
                      ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'}
                    `}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleResource(resource.id)}
                      className="shrink-0"
                    />

                    {/* Resource Info */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleToggleResource(resource.id)}>
                      <p className="text-sm font-medium truncate">{resource.name}</p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {resource.description}
                        </p>
                      )}
                    </div>

                    {/* Per-Resource Access Level Toggle */}
                    {isSelected && (
                      <div className="shrink-0">
                        <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/50 border">
                          <button
                            type="button"
                            onClick={() => handleChangeAccessLevel(resource.id, 'view')}
                            className={`
                              flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
                              ${accessLevel === 'view'
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }
                            `}
                          >
                            <Eye className="h-3 w-3" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChangeAccessLevel(resource.id, 'manage')}
                            className={`
                              flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
                              ${accessLevel === 'manage'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }
                            `}
                          >
                            <Settings2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Manage</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Batch Actions & Summary */}
      {selectedCounts.total > 0 && (
        <div className="pt-3 border-t space-y-3">
          {/* Batch Access Level Actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Set all selected to:
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetAllAccessLevel('view')}
                className="h-7 text-xs gap-1"
              >
                <Eye className="h-3 w-3 text-blue-500" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetAllAccessLevel('manage')}
                className="h-7 text-xs gap-1"
              >
                <Settings2 className="h-3 w-3 text-amber-500" />
                Manage
              </Button>
            </div>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 border">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span className="text-sm">
              <span className="font-medium">{selectedCounts.total}</span> selected:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedCounts.view > 0 && (
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  <Eye className="h-3 w-3 mr-1" />
                  {selectedCounts.view} view
                </Badge>
              )}
              {selectedCounts.manage > 0 && (
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  <Settings2 className="h-3 w-3 mr-1" />
                  {selectedCounts.manage} manage
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Footer content shared between Dialog and Sheet
  const footerContent = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="w-full sm:w-auto"
      >
        Cancel
      </Button>
      <Button
        onClick={handleAssign}
        disabled={saving || selectedResources.size === 0}
        className="w-full sm:w-auto"
      >
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Assign {selectedCounts.total > 0 && `(${selectedCounts.total})`}
      </Button>
    </>
  );

  // Header title and description
  const headerTitle = (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-md ${currentTypeConfig?.bgColor}`}>
        <Icon className={`h-4 w-4 ${currentTypeConfig?.color}`} />
      </div>
      Assign Resources
    </div>
  );

  const headerDescription = userName ? (
    <>
      Assign resources to <span className="font-medium text-foreground">{userName}</span>
    </>
  ) : (
    'Select resources to assign to this user'
  );

  // Mobile: Use Sheet for full-screen experience
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] flex flex-col p-0 rounded-t-2xl">
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-4 pb-4 border-b text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              {headerTitle}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {headerDescription}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {dialogContent}
          </div>

          <SheetFooter className="px-4 py-4 border-t flex-col gap-2">
            {footerContent}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {headerTitle}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {headerDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {dialogContent}
        </div>

        <DialogFooter className="px-6 py-4 border-t gap-2">
          {footerContent}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
