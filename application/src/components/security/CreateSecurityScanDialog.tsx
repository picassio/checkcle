import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityScan, commonTemplateTags, severityOptions, scanIntervalPresets } from '@/types/security.types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { X, Plus, Shield } from 'lucide-react';

interface CreateSecurityScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editScan?: SecurityScan | null;
}

export function CreateSecurityScanDialog({
  open,
  onOpenChange,
  editScan,
}: CreateSecurityScanDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!editScan;

  const [formData, setFormData] = useState({
    name: '',
    target_url: '',
    template_tags: [] as string[],
    exclude_tags: [] as string[],
    severity_filter: [] as string[],
    scan_interval: 86400,
    status: 'active' as 'active' | 'paused',
  });

  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    if (editScan) {
      setFormData({
        name: editScan.name,
        target_url: editScan.target_url,
        template_tags: editScan.template_tags || [],
        exclude_tags: editScan.exclude_tags || [],
        severity_filter: editScan.severity_filter || [],
        scan_interval: editScan.scan_interval,
        status: editScan.status === 'running' ? 'active' : editScan.status as 'active' | 'paused',
      });
    } else {
      setFormData({
        name: '',
        target_url: '',
        template_tags: [],
        exclude_tags: [],
        severity_filter: ['critical', 'high'],
        scan_interval: 86400,
        status: 'active',
      });
    }
  }, [editScan, open]);

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => securityService.createScan(data),
    onSuccess: () => {
      toast.success('Security scan created successfully');
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create scan: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      securityService.updateScan(editScan!.id, data),
    onSuccess: () => {
      toast.success('Security scan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update scan: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.target_url) {
      toast.error('Name and Target URL are required');
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const toggleTag = (tag: string, field: 'template_tags' | 'exclude_tags') => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(tag)
        ? prev[field].filter((t) => t !== tag)
        : [...prev[field], tag],
    }));
  };

  const toggleSeverity = (severity: string) => {
    setFormData((prev) => ({
      ...prev,
      severity_filter: prev.severity_filter.includes(severity)
        ? prev.severity_filter.filter((s) => s !== severity)
        : [...prev.severity_filter, severity],
    }));
  };

  const addCustomTag = () => {
    if (customTag && !formData.template_tags.includes(customTag)) {
      setFormData((prev) => ({
        ...prev,
        template_tags: [...prev.template_tags, customTag],
      }));
      setCustomTag('');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? 'Edit Security Scan' : 'Create Security Scan'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the security scan configuration'
              : 'Configure a new vulnerability scan using Nuclei'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Scan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Production API Security Scan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_url">Target URL *</Label>
              <Input
                id="target_url"
                value={formData.target_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, target_url: e.target.value }))
                }
                placeholder="https://example.com"
              />
            </div>
          </div>

          {/* Template Tags */}
          <div className="space-y-2">
            <Label>Template Tags (Include)</Label>
            <p className="text-sm text-muted-foreground">
              Select vulnerability categories to scan for
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {commonTemplateTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.template_tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag, 'template_tags')}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.template_tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.template_tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => toggleTag(tag, 'template_tags')}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Exclude Tags */}
          <div className="space-y-2">
            <Label>Exclude Tags</Label>
            <p className="text-sm text-muted-foreground">
              Skip templates with these tags
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {['dos', 'fuzz', 'intrusive'].map((tag) => (
                <Badge
                  key={tag}
                  variant={formData.exclude_tags.includes(tag) ? 'destructive' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag, 'exclude_tags')}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Severity Filter */}
          <div className="space-y-2">
            <Label>Severity Filter</Label>
            <p className="text-sm text-muted-foreground">
              Only report vulnerabilities of selected severities
            </p>
            <div className="flex flex-wrap gap-3 mt-2">
              {severityOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`severity-${option.value}`}
                    checked={formData.severity_filter.includes(option.value)}
                    onCheckedChange={() => toggleSeverity(option.value)}
                  />
                  <Label htmlFor={`severity-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Scan Interval */}
          <div className="space-y-2">
            <Label htmlFor="scan_interval">Scan Schedule</Label>
            <Select
              value={formData.scan_interval.toString()}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, scan_interval: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select schedule" />
              </SelectTrigger>
              <SelectContent>
                {scanIntervalPresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Initial Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'active' | 'paused') =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                ? 'Update Scan'
                : 'Create Scan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateSecurityScanDialog;
