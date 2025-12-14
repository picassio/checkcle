// Scan mode types
export type ScanMode = 'single' | 'crawl' | 'automatic' | 'headless' | 'dast';

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
  // Deep scanning options
  scan_mode: ScanMode;          // single, crawl, automatic, headless, dast
  crawl_enabled: boolean;       // Enable Katana crawling before scan
  crawl_depth: number;          // Max crawl depth (default 3)
  crawl_max_pages: number;      // Max pages to crawl (default 100)
  headless_enabled: boolean;    // Enable headless browser for JS-heavy sites
  automatic_scan: boolean;      // Use Wappalyzer tech detection
  dast_enabled: boolean;        // Enable DAST/fuzzing mode
  scan_all_ips: boolean;        // Scan all IPs associated with DNS
  // Request customization
  user_agent: string;           // Custom user-agent string
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
  // Deep scanning options
  scan_mode?: ScanMode;
  crawl_enabled?: boolean;
  crawl_depth?: number;
  crawl_max_pages?: number;
  headless_enabled?: boolean;
  automatic_scan?: boolean;
  dast_enabled?: boolean;
  scan_all_ips?: boolean;
  // Request customization
  user_agent?: string;
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
  // Deep scanning options
  scan_mode?: ScanMode;
  crawl_enabled?: boolean;
  crawl_depth?: number;
  crawl_max_pages?: number;
  headless_enabled?: boolean;
  automatic_scan?: boolean;
  dast_enabled?: boolean;
  scan_all_ips?: boolean;
  // Request customization
  user_agent?: string;
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

// Template tag categories for organized display
export const templateTagCategories = {
  'Vulnerabilities': [
    'cve',
    'xss',
    'sqli',
    'rce',
    'lfi',
    'rfi',
    'ssrf',
    'ssti',
    'xxe',
    'idor',
    'injection',
    'traversal',
    'deserialization',
    'command-injection',
    'code-injection',
    'header-injection',
    'ldap-injection',
    'xpath-injection',
    'nosql-injection',
    'log4j',
    'jndi',
    'prototype-pollution',
    'cors',
    'csrf',
    'crlf',
    'open-redirect',
    'redirect',
    'auth-bypass',
    'authentication-bypass',
    'bypass',
    'sqli-error-based',
    'sqli-time-based',
    'sqli-blind',
  ],
  'Exposure & Leaks': [
    'exposure',
    'creds-exposure',
    'token-exposure',
    'api-key',
    'secret',
    'secrets',
    'sensitive',
    'disclosure',
    'information-disclosure',
    'debug',
    'debug-mode',
    'env-file',
    'config',
    'config-exposure',
    'backup',
    'backup-file',
    'database',
    'db-exposure',
    'git',
    'git-exposure',
    'svn',
    'hg',
    'ds-store',
    'logs',
    'log-file',
    'error',
    'error-message',
    'stack-trace',
    'phpinfo',
    'server-status',
    'swagger',
    'graphql',
    'introspection',
  ],
  'Panels & Admin': [
    'panel',
    'exposed-panels',
    'admin',
    'admin-panel',
    'login',
    'login-panel',
    'dashboard',
    'console',
    'webshell',
    'backdoor',
    'phpmyadmin',
    'adminer',
    'wp-admin',
    'cpanel',
    'plesk',
    'webmin',
    'jenkins',
    'grafana',
    'kibana',
    'prometheus',
    'sonarqube',
    'gitlab',
    'jira',
    'confluence',
    'bitbucket',
    'artifactory',
    'nexus',
    'harbor',
    'portainer',
    'rancher',
    'kubernetes',
    'k8s',
    'docker',
  ],
  'Misconfigurations': [
    'misconfig',
    'misconfiguration',
    'default-login',
    'default-credentials',
    'default-password',
    'weak-password',
    'hardcoded-credentials',
    'unauth',
    'unauthenticated',
    'anonymous',
    'anonymous-access',
    'permissions',
    'acl',
    'insecure',
    'insecure-config',
    'open-proxy',
    'proxy-misconfig',
    'bucket',
    's3-bucket',
    'azure-blob',
    'gcp-bucket',
    'firebase',
    'firestore',
    'mongodb',
    'elasticsearch',
    'redis',
    'memcached',
    'rabbitmq',
    'kafka',
    'mqtt',
    'ftp',
    'smb',
    'nfs',
    'rsync',
  ],
  'Technology Detection': [
    'tech',
    'tech-detect',
    'detect',
    'fingerprint',
    'version',
    'version-detect',
    'cms',
    'wordpress',
    'joomla',
    'drupal',
    'magento',
    'shopify',
    'prestashop',
    'woocommerce',
    'typo3',
    'laravel',
    'symfony',
    'django',
    'flask',
    'rails',
    'spring',
    'struts',
    'nodejs',
    'express',
    'angular',
    'react',
    'vue',
    'nginx',
    'apache',
    'iis',
    'tomcat',
    'weblogic',
    'websphere',
    'jboss',
    'wildfly',
    'glassfish',
  ],
  'Network & Services': [
    'network',
    'tcp',
    'udp',
    'dns',
    'http',
    'https',
    'ssl',
    'tls',
    'ssh',
    'telnet',
    'rdp',
    'vnc',
    'snmp',
    'ldap',
    'kerberos',
    'smtp',
    'pop3',
    'imap',
    'mysql',
    'postgresql',
    'mssql',
    'oracle',
    'cassandra',
    'couchdb',
    'influxdb',
  ],
  'Cloud & DevOps': [
    'cloud',
    'aws',
    'azure',
    'gcp',
    'digitalocean',
    'cloudflare',
    'alibaba',
    'oracle-cloud',
    'ibm-cloud',
    'terraform',
    'ansible',
    'puppet',
    'chef',
    'saltstack',
    'vault',
    'consul',
    'nomad',
    'ecs',
    'eks',
    'aks',
    'gke',
    'lambda',
    'api-gateway',
    'cloudformation',
    'serverless',
    'ci',
    'cd',
    'cicd',
    'github-actions',
    'gitlab-ci',
    'circleci',
    'travis',
    'drone',
    'argocd',
  ],
  'File Operations': [
    'file',
    'file-upload',
    'file-inclusion',
    'file-read',
    'file-write',
    'arbitrary-file-read',
    'arbitrary-file-write',
    'path-traversal',
    'directory-listing',
    'directory-traversal',
    'zip-slip',
  ],
  'Takeover': [
    'takeover',
    'subdomain-takeover',
    'account-takeover',
    'cname',
    'dangling',
    'orphan',
  ],
  'IoT & Hardware': [
    'iot',
    'router',
    'modem',
    'camera',
    'printer',
    'scada',
    'ics',
    'plc',
    'hmi',
    'firmware',
    'embedded',
    'mikrotik',
    'ubiquiti',
    'cisco',
    'juniper',
    'fortinet',
    'paloalto',
    'sonicwall',
    'watchguard',
    'zyxel',
    'dlink',
    'netgear',
    'tplink',
    'linksys',
    'asus',
    'hikvision',
    'dahua',
  ],
  'Dangerous (Use with caution)': [
    'dos',
    'fuzz',
    'fuzzing',
    'intrusive',
    'brute',
    'bruteforce',
    'spray',
    'exploit',
    'poc',
    'weaponized',
  ],
};

// Flattened list of all common template tags (for backward compatibility)
export const commonTemplateTags = Object.values(templateTagCategories).flat();

// Recommended exclude tags (potentially dangerous)
export const recommendedExcludeTags = [
  'dos',
  'fuzz',
  'fuzzing',
  'intrusive',
  'brute',
  'bruteforce',
  'exploit',
  'weaponized',
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

// Scan mode options for deep scanning
export const scanModeOptions: { value: ScanMode; label: string; description: string; notice?: string }[] = [
  {
    value: 'single',
    label: 'Single URL',
    description: 'Scan only the specified URL (fastest)',
    notice: 'For thorough scanning, select template tags in Basic tab. Without tags, scans all ~9000 templates (slower but comprehensive).',
  },
  {
    value: 'crawl',
    label: 'Crawl & Scan',
    description: 'Crawl the website to discover URLs, then scan all discovered pages',
    notice: 'Requires template tags to be selected in Basic tab. Do not combine with Automatic Detection.',
  },
  {
    value: 'automatic',
    label: 'Automatic Detection',
    description: 'Detect technologies using Wappalyzer and select relevant templates automatically',
    notice: 'Fast but may find fewer vulnerabilities. Works best when technologies can be detected. May return 0 findings on sites behind CDNs (Cloudflare, etc.) or if tech stack cannot be identified.',
  },
  {
    value: 'headless',
    label: 'Headless Browser',
    description: 'Use headless browser to scan JavaScript-heavy/SPA applications',
  },
  {
    value: 'dast',
    label: 'DAST/Fuzzing',
    description: 'Enable dynamic application security testing with fuzzing (thorough but slower)',
    notice: 'May generate many requests. Use with caution on production systems.',
  },
];

// Crawl depth presets
export const crawlDepthPresets = [
  { value: 1, label: '1 level (Links on homepage only)' },
  { value: 2, label: '2 levels (Shallow)' },
  { value: 3, label: '3 levels (Default)' },
  { value: 5, label: '5 levels (Deep)' },
  { value: 10, label: '10 levels (Very Deep)' },
];

// Crawl max pages presets
export const crawlMaxPagesPresets = [
  { value: 25, label: '25 pages (Quick)' },
  { value: 50, label: '50 pages' },
  { value: 100, label: '100 pages (Default)' },
  { value: 250, label: '250 pages' },
  { value: 500, label: '500 pages (Comprehensive)' },
  { value: 1000, label: '1000 pages (Full site)' },
];

// Default user-agent to mimic a real browser (Chrome on Windows)
export const defaultUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// User-agent presets for common browsers
export const userAgentPresets = [
  {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    label: 'Chrome (Windows)',
    description: 'Google Chrome on Windows 10/11',
  },
  {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    label: 'Chrome (macOS)',
    description: 'Google Chrome on macOS',
  },
  {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    label: 'Firefox (Windows)',
    description: 'Mozilla Firefox on Windows',
  },
  {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    label: 'Safari (macOS)',
    description: 'Apple Safari on macOS',
  },
  {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    label: 'Edge (Windows)',
    description: 'Microsoft Edge on Windows',
  },
  {
    value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    label: 'Chrome (Android)',
    description: 'Google Chrome on Android mobile',
  },
  {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    label: 'Safari (iOS)',
    description: 'Apple Safari on iPhone',
  },
  {
    value: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
    label: 'Googlebot',
    description: 'Google search crawler (may bypass some restrictions)',
  },
];
