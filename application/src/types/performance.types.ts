// Performance monitoring types

export interface PerformanceTest {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'paused' | 'running' | 'error';
  schedule_interval: number; // seconds (min 3600 = 1 hour)
  last_run?: string;
  next_run?: string;
  notification_id?: string;
  budget_id?: string;
  browser: 'chrome' | 'firefox' | 'edge';
  connectivity: 'native' | '3g' | '4g' | 'cable';
  runs: number; // iterations per test (1-10)
  visual_metrics: boolean; // Enable visual metrics (SpeedIndex, video recording)
  sitespeed_options?: Record<string, unknown>;
  created: string;
  updated: string;
}

export interface PerformanceBudget {
  id: string;
  name: string;
  lcp_limit?: number;          // ms (good: 2500, poor: 4000)
  fcp_limit?: number;          // ms (good: 1800, poor: 3000)
  cls_limit?: number;          // (good: 0.1, poor: 0.25)
  tbt_limit?: number;          // ms (good: 200, poor: 600)
  ttfb_limit?: number;         // ms
  speed_index_limit?: number;  // ms
  requests_limit?: number;
  transfer_size_limit?: number; // bytes
  created: string;
  updated: string;
}

export interface PerformanceMetrics {
  id: string;
  test_id: string;
  timestamp: string;
  url: string;

  // Core Web Vitals
  lcp: number;           // Largest Contentful Paint (ms)
  fcp: number;           // First Contentful Paint (ms)
  cls: number;           // Cumulative Layout Shift
  tbt: number;           // Total Blocking Time (ms)

  // Performance Metrics
  ttfb: number;          // Time to First Byte (ms)
  speed_index: number;   // Speed Index (ms)
  first_visual_change: number;
  last_visual_change: number;

  // Page Metrics
  requests: number;
  transfer_size: number; // bytes
  dom_elements: number;

  // Content Size Breakdown (bytes)
  html_size: number;
  css_size: number;
  js_size: number;
  image_size: number;
  font_size: number;
  other_size: number;

  // Navigation Timings (ms)
  dns_time: number;
  connect_time: number;
  ssl_time: number;
  backend_time: number;
  frontend_time: number;
  fully_loaded: number;

  // Coach Score (0-100)
  coach_score: number;
  coach_performance: number;
  coach_accessibility: number;
  coach_best_practice: number;

  // CPU Metrics
  cpu_long_tasks: number;
  cpu_long_tasks_time: number;
  max_long_task_time: number;

  // Request Breakdown
  requests_html: number;
  requests_css: number;
  requests_js: number;
  requests_image: number;
  requests_font: number;
  requests_other: number;
  third_party_requests: number;

  // Budget Results
  budget_passed: boolean;
  budget_results?: BudgetResults;

  // Storage
  report_path?: string;
  raw_data?: Record<string, unknown>;

  created: string;
}

export interface BudgetResults {
  lcp?: BudgetCheckResult;
  fcp?: BudgetCheckResult;
  cls?: BudgetCheckResult;
  tbt?: BudgetCheckResult;
  ttfb?: BudgetCheckResult;
  speed_index?: BudgetCheckResult;
  requests?: BudgetCheckResult;
  transfer_size?: BudgetCheckResult;
}

export interface BudgetCheckResult {
  metric: string;
  value: number;
  limit: number;
  passed: boolean;
  severity: 'good' | 'needs-improvement' | 'poor';
}

// Web Vitals thresholds based on Google's guidelines
export const WEB_VITALS_THRESHOLDS = {
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  cls: { good: 0.1, poor: 0.25 },
  tbt: { good: 200, poor: 600 },
  ttfb: { good: 800, poor: 1800 },
  speedIndex: { good: 3400, poor: 5800 },
} as const;

// Helper function to get status based on value and thresholds
export function getWebVitalStatus(
  metric: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[metric];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// Get color for status
export function getStatusColor(status: 'good' | 'needs-improvement' | 'poor'): string {
  switch (status) {
    case 'good':
      return 'green';
    case 'needs-improvement':
      return 'yellow';
    case 'poor':
      return 'red';
    default:
      return 'gray';
  }
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format milliseconds to human readable
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Schedule interval options
export const SCHEDULE_INTERVALS = [
  { value: 3600, label: 'Every hour' },
  { value: 7200, label: 'Every 2 hours' },
  { value: 14400, label: 'Every 4 hours' },
  { value: 21600, label: 'Every 6 hours' },
  { value: 43200, label: 'Every 12 hours' },
  { value: 86400, label: 'Every day' },
  { value: 604800, label: 'Every week' },
] as const;

// Browser options
export const BROWSER_OPTIONS = [
  { value: 'chrome', label: 'Chrome' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'edge', label: 'Edge' },
] as const;

// Connectivity options
export const CONNECTIVITY_OPTIONS = [
  { value: 'native', label: 'Native (No throttling)' },
  { value: 'cable', label: 'Cable (5Mbps)' },
  { value: '4g', label: '4G Mobile' },
  { value: '3g', label: '3G Mobile' },
] as const;

// Test with latest metrics (for dashboard)
export interface PerformanceTestWithMetrics {
  test_id: string;
  test_name: string;
  test_url: string;
  latest_metrics: PerformanceMetrics | null;
}

// PocketBase list response
export interface PerformanceTestsResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: PerformanceTest[];
}

export interface PerformanceMetricsResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: PerformanceMetrics[];
}

export interface PerformanceBudgetsResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: PerformanceBudget[];
}

// Queue types for sequential test execution
export interface QueueItem {
  id: string;
  test_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  priority: number; // 1 = manual (high), 10 = scheduled (low)
  source: 'scheduled' | 'manual';
  queued_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  metrics_id?: string;
  created?: string;
  updated?: string;
}

export interface QueueStatus {
  currently_running: QueueItem | null;
  pending_items: QueueItem[];
  total_pending: number;
}

export interface QueuePositionResponse {
  position: number; // 0 = currently running, 1+ = position in queue, 0 with status="not_queued" = not in queue
  status: 'processing' | 'pending' | 'not_queued';
  queue_item: QueueItem | null;
}
