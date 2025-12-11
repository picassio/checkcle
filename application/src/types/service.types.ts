export interface Service {
  id: string;
  name: string;
  url?: string;
  host?: string; // Make host optional since it's not always required
  port?: number;
  domain?: string; // Add domain field for DNS services
  type: "http" | "https" | "tcp" | "ping" | "icmp" | "dns";
  status: "up" | "down" | "paused" | "warning";
  responseTime: number;
  uptime?: number;
  lastChecked: string;
  interval: number;
  timeout?: number;
  retries: number;
  created?: string;
  updated?: string;
  notification_channel?: string;
  notificationChannel?: string; // Keep for backward compatibility
  notification_status?: "enabled" | "disabled"; // Add notification_status field
  alertTemplate?: string;
  alerts?: "muted" | "unmuted"; // Make sure alerts is properly typed as union
  muteAlerts?: boolean; // Keep this to avoid breaking existing code
  muteChangedAt?: string;
  follow_redirects?: boolean;
  verify_ssl?: boolean;
  // Content validation fields
  expected_status_code?: number;
  keyword_check?: string;
  keyword_check_type?: "contains" | "not_contains";
  json_path_checks?: JSONPathCheck[];
  header_checks?: HeaderCheck[];
  // DNS fields
  dns_record_type?: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
  dns_expected_value?: string;
  headers?: string;
  body?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
  // Regional monitoring fields
  region_name?: string;
  agent_id?: string;
  regional_status?: "enabled" | "disabled"; // Add regional_status field
  regional_monitoring_enabled?: boolean;
}

// Content validation types
export interface JSONPathCheck {
  path: string;
  operator: "equals" | "not_equals" | "contains" | "exists" | "not_exists";
  expected_value: string;
}

export interface HeaderCheck {
  header_name: string;
  operator: "equals" | "contains" | "exists";
  expected_value: string;
}

// Validation results for display
export interface ValidationResult {
  passed: boolean;
  status_code_result?: StatusCodeValidation;
  keyword_result?: KeywordValidation;
  json_path_results?: JSONPathValidation[];
  header_results?: HeaderValidation[];
  failure_reason?: string;
}

export interface StatusCodeValidation {
  expected: number;
  actual: number;
  passed: boolean;
  message?: string;
}

export interface KeywordValidation {
  keyword: string;
  check_type: string;
  found: boolean;
  passed: boolean;
  message?: string;
}

export interface JSONPathValidation {
  path: string;
  operator: string;
  expected_value: string;
  actual_value?: string;
  passed: boolean;
  message?: string;
}

export interface HeaderValidation {
  header_name: string;
  operator: string;
  expected_value: string;
  actual_value?: string;
  passed: boolean;
  message?: string;
}

export interface CreateServiceParams {
  name: string;
  url?: string;
  host?: string; // Add host field for PING and TCP services
  port?: number; // Add port field for TCP services
  domain?: string; // Add domain field for DNS services
  type: string;
  interval: number;
  retries: number;
  notificationChannel?: string;
  alertTemplate?: string;
  // Regional monitoring params
  regionalMonitoringEnabled?: boolean;
  regionalStatus?: "enabled" | "disabled"; // Add regionalStatus field
  regionName?: string;
  agentId?: string;
}

export interface UptimeData {
  id?: string;
  service_id?: string; // Make service_id optional for backward compatibility
  serviceId?: string; // Keep for backward compatibility
  timestamp: string;
  status: "up" | "down" | "paused" | "warning";
  responseTime: number;
  error_message?: string;
  details?: string;
  created?: string;
  updated?: string;
  date?: string; // Keep for backward compatibility
  uptime?: number; // Keep for backward compatibility
  // Regional monitoring fields
  region_name?: string;
  agent_id?: string | number;
  // Source identifier for multi-source display
  source?: string;
  // Content validation results
  validation_results?: ValidationResult;
}

export interface PingData {
  id?: string;
  service_id: string;
  timestamp: string;
  status: "up" | "down" | "paused" | "warning";
  responseTime: number;
  packet_loss?: number;
  error_message?: string;
  details?: string;
  created?: string;
  updated?: string;
}

export interface DNSData {
  id?: string;
  service_id: string;
  timestamp: string;
  status: "up" | "down" | "paused" | "warning";
  responseTime: number;
  resolved_ip?: string;
  error_message?: string;
  details?: string;
  created?: string;
  updated?: string;
}

export interface TCPData {
  id?: string;
  service_id: string;
  timestamp: string;
  status: "up" | "down" | "paused" | "warning";
  responseTime: number;
  error_message?: string;
  details?: string;
  created?: string;
  updated?: string;
}