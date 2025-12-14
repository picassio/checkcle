import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { securityService } from '@/services/securityService';
import { SecurityScan, ScanMode, templateTagCategories, recommendedExcludeTags, severityOptions, scanIntervalPresets, rateLimitPresets, scanModeOptions, crawlDepthPresets, crawlMaxPagesPresets, userAgentPresets, defaultUserAgent } from '@/types/security.types';
import { alertConfigService, AlertConfiguration } from '@/services/alertConfigService';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { X, Plus, Shield, Bell, Zap, Radar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
    target_urls_text: '', // Textarea input for multiple URLs (one per line)
    template_tags: [] as string[],
    exclude_tags: [] as string[],
    severity_filter: [] as string[],
    scan_interval: 86400,
    status: 'active' as 'active' | 'paused',
    // Notification settings
    notification_enabled: false,
    notification_channels: [] as string[],
    // Rate limit settings
    rate_limit: 150,
    bulk_size: 25,
    concurrency: 25,
    timeout: 3600,
    // Deep scan settings
    scan_mode: 'single' as ScanMode,
    crawl_enabled: false,
    crawl_depth: 3,
    crawl_max_pages: 100,
    headless_enabled: false,
    automatic_scan: false,
    dast_enabled: false,
    scan_all_ips: false,
    // Request customization
    user_agent: '',
  });

  const [customTag, setCustomTag] = useState('');

  // Fetch alert configurations for notification channels
  const { data: alertConfigsData } = useQuery({
    queryKey: ['alertConfigs'],
    queryFn: () => alertConfigService.getAlertConfigurations(),
  });

  const alertConfigs = (alertConfigsData || []).filter((config: AlertConfiguration) => config.enabled);

  useEffect(() => {
    if (editScan) {
      // Parse notification_id to get channels array
      const notificationChannels = editScan.notification_id
        ? editScan.notification_id.split(',').filter(Boolean)
        : [];

      // Convert target_urls array to text (one URL per line)
      const targetUrlsText = editScan.target_urls?.join('\n') || '';

      setFormData({
        name: editScan.name,
        target_url: editScan.target_url,
        target_urls_text: targetUrlsText,
        template_tags: editScan.template_tags || [],
        exclude_tags: editScan.exclude_tags || [],
        severity_filter: editScan.severity_filter || [],
        scan_interval: editScan.scan_interval,
        status: editScan.status === 'running' ? 'active' : editScan.status as 'active' | 'paused',
        // Notification settings
        notification_enabled: notificationChannels.length > 0,
        notification_channels: notificationChannels,
        // Rate limit settings
        rate_limit: editScan.rate_limit || 150,
        bulk_size: editScan.bulk_size || 25,
        concurrency: editScan.concurrency || 25,
        timeout: editScan.timeout || 3600,
        // Deep scan settings
        scan_mode: editScan.scan_mode || 'single',
        crawl_enabled: editScan.crawl_enabled || false,
        crawl_depth: editScan.crawl_depth || 3,
        crawl_max_pages: editScan.crawl_max_pages || 100,
        headless_enabled: editScan.headless_enabled || false,
        automatic_scan: editScan.automatic_scan || false,
        dast_enabled: editScan.dast_enabled || false,
        scan_all_ips: editScan.scan_all_ips || false,
        // Request customization
        user_agent: editScan.user_agent || '',
      });
    } else {
      setFormData({
        name: '',
        target_url: '',
        target_urls_text: '',
        template_tags: [],
        exclude_tags: [],
        severity_filter: ['critical', 'high'],
        scan_interval: 86400,
        status: 'active',
        notification_enabled: false,
        notification_channels: [],
        rate_limit: 150,
        bulk_size: 25,
        concurrency: 25,
        timeout: 3600,
        scan_mode: 'single',
        crawl_enabled: false,
        crawl_depth: 3,
        crawl_max_pages: 100,
        headless_enabled: false,
        automatic_scan: false,
        dast_enabled: false,
        scan_all_ips: false,
        user_agent: '',
      });
    }
  }, [editScan, open]);

  // Transform form data to API format
  const transformFormData = (data: typeof formData) => {
    // Parse URL list from textarea (one URL per line)
    const targetUrls = data.scan_mode === 'url_list' && data.target_urls_text
      ? data.target_urls_text
          .split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')))
      : [];

    return {
      name: data.name,
      target_url: data.target_url,
      target_urls: targetUrls,
      template_tags: data.template_tags,
      exclude_tags: data.exclude_tags,
      severity_filter: data.severity_filter,
      scan_interval: data.scan_interval,
      status: data.status,
      // Convert notification channels array to comma-separated string
      notification_id: data.notification_enabled ? data.notification_channels.join(',') : '',
      // Rate limit settings
      rate_limit: data.rate_limit,
      bulk_size: data.bulk_size,
      concurrency: data.concurrency,
      timeout: data.timeout,
      // Deep scan settings
      scan_mode: data.scan_mode,
      crawl_enabled: data.crawl_enabled,
      crawl_depth: data.crawl_depth,
      crawl_max_pages: data.crawl_max_pages,
      headless_enabled: data.headless_enabled,
      automatic_scan: data.automatic_scan,
      dast_enabled: data.dast_enabled,
      scan_all_ips: data.scan_all_ips,
      // Request customization
      user_agent: data.user_agent,
    };
  };

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => securityService.createScan(transformFormData(data)),
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
      securityService.updateScan(editScan!.id, transformFormData(data)),
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

  // Notification channel handlers
  const handleChannelAdd = (channelId: string) => {
    if (!formData.notification_channels.includes(channelId)) {
      setFormData((prev) => ({
        ...prev,
        notification_channels: [...prev.notification_channels, channelId],
      }));
    }
  };

  const handleChannelRemove = (channelId: string) => {
    setFormData((prev) => ({
      ...prev,
      notification_channels: prev.notification_channels.filter((id) => id !== channelId),
    }));
  };

  const getChannelName = (channelId: string) => {
    const config = alertConfigs.find((c: AlertConfiguration) => c.id === channelId);
    return config ? `${config.notify_name} (${config.notification_type})` : channelId;
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Basic</span>
              </TabsTrigger>
              <TabsTrigger value="deepscan" className="flex items-center gap-1">
                <Radar className="h-4 w-4" />
                <span className="hidden sm:inline">Deep Scan</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-1">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Speed</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
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
                  Select vulnerability categories to scan for. Leave empty to scan all templates.
                </p>

                {/* Warning when automatic scan is enabled */}
                {(formData.automatic_scan || formData.scan_mode === 'automatic') && (
                  <div className="p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">
                      ⚠ Technology Detection is enabled. Template tags below will be ignored - templates will be auto-selected based on detected technologies.
                    </p>
                  </div>
                )}

                {/* Warning when crawl mode is enabled without tags */}
                {formData.scan_mode === 'crawl' && formData.template_tags.length === 0 && !formData.automatic_scan && (
                  <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      💡 Tip: Select template tags for Crawl & Scan mode to specify which vulnerabilities to check on discovered pages.
                    </p>
                  </div>
                )}

                {/* Selected tags display */}
                {formData.template_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30">
                    <span className="text-xs text-muted-foreground mr-2">Selected ({formData.template_tags.length}):</span>
                    {formData.template_tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => toggleTag(tag, 'template_tags')}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tags by category in scrollable container */}
                <div className="max-h-64 overflow-y-auto border rounded-md p-3 space-y-3">
                  {Object.entries(templateTagCategories).map(([category, tags]) => (
                    <div key={category} className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">{category}</Label>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={formData.template_tags.includes(tag) ? 'default' : 'outline'}
                            className="cursor-pointer text-xs"
                            onClick={() => toggleTag(tag, 'template_tags')}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom tag input */}
                <div className="flex gap-2">
                  <Input
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="Add custom tag..."
                    className="text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Exclude Tags */}
              <div className="space-y-2">
                <Label>Exclude Tags</Label>
                <p className="text-sm text-muted-foreground">
                  Skip templates with these tags (recommended to exclude dangerous tags)
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {recommendedExcludeTags.map((tag) => (
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
            </TabsContent>

            {/* Deep Scan Tab */}
            <TabsContent value="deepscan" className="space-y-4 mt-4">
              <div className="rounded-lg border p-4 bg-muted/50 mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure deep scanning options to discover and scan more endpoints. Enable crawling to automatically find and scan all pages on the target website.
                </p>
              </div>

              {/* Scan Mode */}
              <div className="space-y-3">
                <Label>Scan Mode</Label>
                <RadioGroup
                  value={formData.scan_mode}
                  onValueChange={(value: ScanMode) => {
                    setFormData((prev) => ({
                      ...prev,
                      scan_mode: value,
                      // Auto-enable related options based on mode
                      crawl_enabled: value === 'crawl',
                      headless_enabled: value === 'headless' || value === 'crawl',
                      automatic_scan: value === 'automatic',
                      dast_enabled: value === 'dast',
                    }));
                  }}
                  className="space-y-2"
                >
                  {scanModeOptions.map((option) => (
                    <div key={option.value} className={`flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 ${formData.scan_mode === option.value ? 'border-primary bg-muted/30' : ''}`}>
                      <RadioGroupItem value={option.value} id={`mode-${option.value}`} className="mt-1" />
                      <Label htmlFor={`mode-${option.value}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{option.label}</div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                        {option.notice && formData.scan_mode === option.value && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 flex items-center gap-1">
                            <span>⚠</span> {option.notice}
                          </p>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* URL List Input - shown when url_list mode is selected */}
              {formData.scan_mode === 'url_list' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-base font-semibold">URL List</Label>
                  <p className="text-sm text-muted-foreground">
                    Enter URLs to scan, one per line. Each URL must start with http:// or https://
                  </p>
                  <Textarea
                    placeholder={`https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/api/endpoint`}
                    value={formData.target_urls_text}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, target_urls_text: e.target.value }))
                    }
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formData.target_urls_text
                        ? formData.target_urls_text
                            .split('\n')
                            .filter(url => url.trim() && (url.trim().startsWith('http://') || url.trim().startsWith('https://')))
                            .length
                        : 0} valid URLs
                    </span>
                    <span>
                      The main Target URL above will also be included
                    </span>
                  </div>
                </div>
              )}

              {/* Crawl Settings - shown when crawl mode is selected */}
              {formData.scan_mode === 'crawl' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-base font-semibold">Crawl Settings</Label>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crawl_depth">Crawl Depth</Label>
                      <Select
                        value={formData.crawl_depth.toString()}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, crawl_depth: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select depth" />
                        </SelectTrigger>
                        <SelectContent>
                          {crawlDepthPresets.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        How many levels deep to follow links
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="crawl_max_pages">Max Pages</Label>
                      <Select
                        value={formData.crawl_max_pages.toString()}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, crawl_max_pages: parseInt(value) }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select max pages" />
                        </SelectTrigger>
                        <SelectContent>
                          {crawlMaxPagesPresets.map((preset) => (
                            <SelectItem key={preset.value} value={preset.value.toString()}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Maximum pages to crawl and scan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="headless_crawl"
                      checked={formData.headless_enabled}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, headless_enabled: checked }))
                      }
                    />
                    <Label htmlFor="headless_crawl" className="cursor-pointer">
                      Use headless browser for crawling (recommended for JavaScript-heavy sites)
                    </Label>
                  </div>
                </div>
              )}

              {/* Additional Options */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Additional Options</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label htmlFor="scan_all_ips" className="cursor-pointer">Scan All IPs</Label>
                      <p className="text-sm text-muted-foreground">
                        Scan all IP addresses associated with the target DNS record
                      </p>
                    </div>
                    <Switch
                      id="scan_all_ips"
                      checked={formData.scan_all_ips}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({ ...prev, scan_all_ips: checked }))
                      }
                    />
                  </div>

                  {formData.scan_mode !== 'automatic' && (
                    <div className={`flex items-center justify-between p-3 border rounded-lg ${formData.automatic_scan && formData.scan_mode === 'crawl' ? 'border-yellow-500' : ''}`}>
                      <div>
                        <Label htmlFor="automatic_scan_opt" className="cursor-pointer">Technology Detection</Label>
                        <p className="text-sm text-muted-foreground">
                          Auto-detect technologies and select relevant templates
                        </p>
                        {formData.automatic_scan && formData.scan_mode === 'crawl' && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                            ⚠ Not recommended with Crawl mode. May fail on static assets (JS/CSS files).
                          </p>
                        )}
                        {formData.automatic_scan && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Note: Template tags selection will be ignored when enabled.
                          </p>
                        )}
                      </div>
                      <Switch
                        id="automatic_scan_opt"
                        checked={formData.automatic_scan}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, automatic_scan: checked }))
                        }
                      />
                    </div>
                  )}

                  {formData.scan_mode !== 'headless' && formData.scan_mode !== 'crawl' && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="headless_opt" className="cursor-pointer">Headless Browser</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable for JavaScript-rendered content detection
                        </p>
                      </div>
                      <Switch
                        id="headless_opt"
                        checked={formData.headless_enabled}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, headless_enabled: checked }))
                        }
                      />
                    </div>
                  )}

                  {formData.scan_mode !== 'dast' && (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label htmlFor="dast_opt" className="cursor-pointer">DAST/Fuzzing</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable dynamic testing with fuzzing (thorough but slower)
                        </p>
                      </div>
                      <Switch
                        id="dast_opt"
                        checked={formData.dast_enabled}
                        onCheckedChange={(checked) =>
                          setFormData((prev) => ({ ...prev, dast_enabled: checked }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* User-Agent Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Request Customization</Label>

                <div className="space-y-2">
                  <Label htmlFor="user_agent">User-Agent</Label>
                  <p className="text-sm text-muted-foreground">
                    Custom browser user-agent to avoid WAF/bot detection blocking. Leave empty to use default Chrome user-agent.
                  </p>
                  <Select
                    value={formData.user_agent || 'default'}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        user_agent: value === 'default' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select user-agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        <div className="flex flex-col">
                          <span>Default (Chrome Windows)</span>
                        </div>
                      </SelectItem>
                      {userAgentPresets.map((preset) => (
                        <SelectItem key={preset.label} value={preset.value}>
                          <div className="flex flex-col">
                            <span>{preset.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Custom...</SelectItem>
                    </SelectContent>
                  </Select>

                  {formData.user_agent === 'custom' && (
                    <Input
                      id="custom_user_agent"
                      value={formData.user_agent === 'custom' ? '' : formData.user_agent}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, user_agent: e.target.value }))
                      }
                      placeholder="Enter custom user-agent string..."
                      className="mt-2"
                    />
                  )}

                  {formData.user_agent && formData.user_agent !== 'custom' && (
                    <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                      {formData.user_agent}
                    </div>
                  )}

                  {!formData.user_agent && (
                    <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                      {defaultUserAgent}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4 mt-4">
              {/* Enable Notifications Toggle */}
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when critical or high severity vulnerabilities are found
                  </p>
                </div>
                <Switch
                  checked={formData.notification_enabled}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      notification_enabled: checked,
                      notification_channels: checked ? prev.notification_channels : [],
                    }));
                  }}
                />
              </div>

              {/* Notification Channels */}
              <div className="space-y-2">
                <Label>Notification Channels</Label>
                <p className="text-sm text-muted-foreground">
                  {formData.notification_enabled
                    ? 'Select channels to receive security alerts'
                    : 'Enable notifications first to select channels'}
                </p>

                {/* Display selected channels as badges */}
                {formData.notification_channels.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.notification_channels.map((channelId) => (
                      <Badge key={channelId} variant="secondary" className="flex items-center gap-1">
                        {getChannelName(channelId)}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleChannelRemove(channelId)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                <Select
                  onValueChange={handleChannelAdd}
                  disabled={!formData.notification_enabled}
                  value=""
                >
                  <SelectTrigger className={!formData.notification_enabled ? 'opacity-50' : ''}>
                    <SelectValue placeholder="Add a notification channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {alertConfigs
                      .filter((config: AlertConfiguration) => !formData.notification_channels.includes(config.id || ''))
                      .map((config: AlertConfiguration) => (
                        <SelectItem key={config.id} value={config.id || ''}>
                          {config.notify_name} ({config.notification_type})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {formData.notification_enabled && alertConfigs.length === 0 && (
                  <p className="text-sm text-yellow-600">
                    No notification channels configured. Go to Settings &gt; Notifications to add channels.
                  </p>
                )}
              </div>

              <div className="rounded-lg border p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Notifications are sent after a scan completes when critical or high severity vulnerabilities are detected.
                  You'll receive a summary notification with the count of findings by severity.
                </p>
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-4 mt-4">
              <div className="rounded-lg border p-4 bg-muted/50 mb-4">
                <p className="text-sm text-muted-foreground">
                  Adjust these settings to control scan speed. Higher values scan faster but may overwhelm targets or get rate-limited.
                </p>
              </div>

              {/* Rate Limit */}
              <div className="space-y-2">
                <Label htmlFor="rate_limit">Rate Limit (requests/second)</Label>
                <Select
                  value={formData.rate_limit.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, rate_limit: parseInt(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select rate limit" />
                  </SelectTrigger>
                  <SelectContent>
                    {rateLimitPresets.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value.toString()}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Maximum number of HTTP requests per second
                </p>
              </div>

              {/* Bulk Size */}
              <div className="space-y-2">
                <Label htmlFor="bulk_size">Bulk Size</Label>
                <Input
                  id="bulk_size"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.bulk_size}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bulk_size: parseInt(e.target.value) || 25 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Number of templates to run per target (default: 25)
                </p>
              </div>

              {/* Concurrency */}
              <div className="space-y-2">
                <Label htmlFor="concurrency">Concurrency</Label>
                <Input
                  id="concurrency"
                  type="number"
                  min={1}
                  max={100}
                  value={formData.concurrency}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, concurrency: parseInt(e.target.value) || 25 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Number of concurrent hosts to scan (default: 25)
                </p>
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={60}
                  max={7200}
                  value={formData.timeout}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, timeout: parseInt(e.target.value) || 3600 }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Maximum scan duration (60-7200 seconds)
                </p>
              </div>
            </TabsContent>
          </Tabs>

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
