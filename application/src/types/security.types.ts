// Security scan configuration
export interface SecurityScan {
  id: string;
  name: string;
  target_url: string;
  template_tags: string[];
  exclude_tags: string[];
  severity_filter: string[];
  scan_interval: number; // seconds (0 = manual only, default 86400 = 24h)
  status: 'active' | 'paused' | 'running' | 'error';
  last_scan: string;
  next_scan: string;
  notification_id: string;
  findings_count: number;
  critical_count: number;
  high_count: number;
  // Rate limiting settings
  rate_limit: number;   // requests per second (default 150)
  bulk_size: number;    // templates per host (default 25)
  concurrency: number;  // concurrent hosts (default 25)
  timeout: number;      // scan timeout in seconds (default 3600)
  created: string;
  updated: string;
}

// Security scan result (vulnerability finding)
export interface SecurityResult {
  id: string;
  scan_id: string;
  template_id: string;
  template_name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | 'unknown';
  host: string;
  matched_url: string;
  matched_at: string;
  description: string;
  solution: string;
  cve_ids: string[];
  references: string[];
  tags: string[];
  curl_command: string;
  extracted_results: string;
  raw_data: Record<string, unknown>;
  created: string;
}

// Security queue item
export interface SecurityQueueItem {
  id: string;
  scan_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  priority: number;
  source: 'scheduled' | 'manual';
  queued_at: string;
  started_at: string;
  completed_at: string;
  error: string;
  findings_count: number;
  created: string;
  updated: string;
}

// Queue status response
export interface SecurityQueueStatus {
  currently_running: SecurityQueueItem | null;
  pending_items: SecurityQueueItem[];
  total_pending: number;
  recent_items: SecurityQueueItem[];
}

// Summary response
export interface SecuritySummary {
  total_scans: number;
  total_findings: number;
  total_critical: number;
  total_high: number;
  scans: SecurityScan[];
}

// Severity counts
export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  unknown: number;
}

// Create/update scan request
export interface CreateSecurityScanRequest {
  name: string;
  target_url: string;
  template_tags?: string[];
  exclude_tags?: string[];
  severity_filter?: string[];
  scan_interval?: number;
  status?: 'active' | 'paused';
  notification_id?: string;
  // Rate limiting settings
  rate_limit?: number;
  bulk_size?: number;
  concurrency?: number;
  timeout?: number;
}

export interface UpdateSecurityScanRequest {
  name?: string;
  target_url?: string;
  template_tags?: string[];
  exclude_tags?: string[];
  severity_filter?: string[];
  scan_interval?: number;
  status?: 'active' | 'paused';
  notification_id?: string;
  // Rate limiting settings
  rate_limit?: number;
  bulk_size?: number;
  concurrency?: number;
  timeout?: number;
}

// PocketBase response format
export interface SecurityScansResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: SecurityScan[];
}

export interface SecurityResultsResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: SecurityResult[];
}

// Severity color mapping
export const severityColors: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-blue-500 text-white',
  info: 'bg-gray-500 text-white',
  unknown: 'bg-gray-400 text-white',
};

// Severity badge variants for shadcn/ui
export const severityVariants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
  info: 'outline',
  unknown: 'outline',
};

// Common template tags for filtering
export const commonTemplateTags = [
  'cve',
  'xss',
  'sqli',
  'rce',
  'lfi',
  'ssrf',
  'exposed-panels',
  'misconfig',
  'default-login',
  'tech-detect',
  'creds-exposure',
  'file-upload',
  'redirect',
  'injection',
];

// Severity options
export const severityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
];

// Scan interval presets
export const scanIntervalPresets = [
  { value: 0, label: 'Manual only' },
  { value: 3600, label: 'Every hour' },
  { value: 21600, label: 'Every 6 hours' },
  { value: 43200, label: 'Every 12 hours' },
  { value: 86400, label: 'Daily (24h)' },
  { value: 604800, label: 'Weekly' },
];

// Rate limit presets (requests per second)
export const rateLimitPresets = [
  { value: 50, label: 'Slow (50 req/s)' },
  { value: 100, label: 'Moderate (100 req/s)' },
  { value: 150, label: 'Default (150 req/s)' },
  { value: 250, label: 'Fast (250 req/s)' },
  { value: 500, label: 'Very Fast (500 req/s)' },
];

// Scan profile presets
export const scanProfilePresets = [
  {
    name: 'Quick Scan',
    description: 'Fast scan focusing on critical vulnerabilities',
    rate_limit: 200,
    bulk_size: 50,
    concurrency: 50,
    timeout: 1800,
    severity_filter: ['critical', 'high'],
  },
  {
    name: 'Standard Scan',
    description: 'Balanced scan with moderate speed',
    rate_limit: 150,
    bulk_size: 25,
    concurrency: 25,
    timeout: 3600,
    severity_filter: ['critical', 'high', 'medium'],
  },
  {
    name: 'Thorough Scan',
    description: 'Comprehensive scan including all severities',
    rate_limit: 100,
    bulk_size: 15,
    concurrency: 15,
    timeout: 7200,
    severity_filter: ['critical', 'high', 'medium', 'low', 'info'],
  },
];
