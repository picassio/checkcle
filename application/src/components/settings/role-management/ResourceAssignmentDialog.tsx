/**
 * ResourceAssignmentDialog Component
 *
 * Dialog for assigning specific resources (services, servers, SSL certificates, etc.)
 * to users with configurable access levels (view/manage).
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { permissionService, ResourceAssignment } from '@/services/permissionService';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [accessLevel, setAccessLevel] = useState<'view' | 'manage'>('view');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

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
      setSelectedResources(new Set());
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
    const newSelected = new Set(selectedResources);
    if (newSelected.has(resourceId)) {
      newSelected.delete(resourceId);
    } else {
      newSelected.add(resourceId);
    }
    setSelectedResources(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedResources.size === filteredResources.length) {
      setSelectedResources(new Set());
    } else {
      setSelectedResources(new Set(filteredResources.map((r) => r.id)));
    }
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

      // Assign each selected resource
      for (const resourceId of selectedResources) {
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
  const filteredResources = resources.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className={`p-1.5 rounded-md ${currentTypeConfig?.bgColor}`}>
              <Icon className={`h-4 w-4 ${currentTypeConfig?.color}`} />
            </div>
            Assign Resources
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {userName ? (
              <>
                Assign resources to <span className="font-medium text-foreground">{userName}</span>
              </>
            ) : (
              'Select resources to assign to this user'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
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

            {/* Resource List */}
            <div>
              <div className="flex items-center justify-between mb-2">
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
                  className="border rounded-lg overflow-y-auto overscroll-contain"
                  style={{ maxHeight: 'min(240px, 35vh)', WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="p-2 space-y-1">
                    {filteredResources.map((resource) => (
                      <label
                        key={resource.id}
                        className={`
                          flex items-start gap-3 p-2.5 rounded-md cursor-pointer
                          transition-colors hover:bg-muted/50 active:bg-muted
                          ${selectedResources.has(resource.id) ? 'bg-muted' : ''}
                        `}
                      >
                        <Checkbox
                          checked={selectedResources.has(resource.id)}
                          onCheckedChange={() => handleToggleResource(resource.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{resource.name}</p>
                          {resource.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {resource.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Access Level */}
            <div className="space-y-2 sm:space-y-3 pt-3 border-t">
              <Label className="text-sm font-medium">Access Level</Label>
              <RadioGroup
                value={accessLevel}
                onValueChange={(v) => setAccessLevel(v as 'view' | 'manage')}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3"
              >
                <label
                  className={`
                    relative flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer
                    transition-all hover:border-primary/50 active:scale-[0.98]
                    ${accessLevel === 'view' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-muted'}
                  `}
                >
                  <RadioGroupItem value="view" id="view" className="sr-only" />
                  <div className="p-1.5 rounded-md bg-blue-500/10">
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">View</p>
                    <p className="text-xs text-muted-foreground">Read-only access</p>
                  </div>
                </label>

                <label
                  className={`
                    relative flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border cursor-pointer
                    transition-all hover:border-primary/50 active:scale-[0.98]
                    ${accessLevel === 'manage' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-muted'}
                  `}
                >
                  <RadioGroupItem value="manage" id="manage" className="sr-only" />
                  <div className="p-1.5 rounded-md bg-amber-500/10">
                    <Settings2 className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Manage</p>
                    <p className="text-xs text-muted-foreground">Full control</p>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-4 border-t flex-col-reverse gap-2 sm:flex-row sm:gap-2">
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
            Assign {selectedResources.size > 0 && `(${selectedResources.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
