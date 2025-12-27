package securityscanning

import "time"

// SecurityScan represents a security scan configuration
type SecurityScan struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	TargetURL      string   `json:"target_url"`
	TargetURLs     []string `json:"target_urls"`     // Multiple URLs to scan (alternative to single target_url)
	TemplateTags   []string `json:"template_tags"`   // e.g., ["cve", "xss", "sqli"]
	ExcludeTags    []string `json:"exclude_tags"`    // Templates to exclude
	SeverityFilter []string `json:"severity_filter"` // e.g., ["critical", "high"]
	ScanInterval   int      `json:"scan_interval"`   // seconds (0 = manual only, default 86400 = 24h)
	Status         string   `json:"status"`          // active, paused, running, error
	LastScan       string   `json:"last_scan"`
	NextScan       string   `json:"next_scan"`
	NotificationID string   `json:"notification_id"`
	FindingsCount  int      `json:"findings_count"`
	CriticalCount  int      `json:"critical_count"`
	HighCount      int      `json:"high_count"`
	// Rate limiting settings
	RateLimit   int `json:"rate_limit"`   // requests per second (default 50)
	BulkSize    int `json:"bulk_size"`    // templates per target (default 10)
	Concurrency int `json:"concurrency"`  // concurrent hosts (default 10)
	Timeout     int `json:"timeout"`      // scan timeout in seconds (default 3600)
	// Deep scanning options
	ScanMode        string `json:"scan_mode"`         // single, crawl, automatic, headless, dast, url_list
	CrawlEnabled    bool   `json:"crawl_enabled"`     // Enable Katana crawling before scan
	CrawlDepth      int    `json:"crawl_depth"`       // Max crawl depth (default 3)
	CrawlMaxPages   int    `json:"crawl_max_pages"`   // Max pages to crawl (default 100)
	HeadlessEnabled bool   `json:"headless_enabled"`  // Enable headless browser for JS-heavy sites
	AutomaticScan   bool   `json:"automatic_scan"`    // Use Wappalyzer tech detection
	DastEnabled     bool   `json:"dast_enabled"`      // Enable DAST/fuzzing mode
	ScanAllIPs      bool   `json:"scan_all_ips"`      // Scan all IPs associated with DNS
	// Request customization
	UserAgent       string `json:"user_agent"`        // Custom user-agent string (default: Chrome)
	// Additional settings
	Created string `json:"created"`
	Updated string `json:"updated"`
}

// SecurityScansResponse represents the response from PocketBase
type SecurityScansResponse struct {
	Page       int            `json:"page"`
	PerPage    int            `json:"perPage"`
	TotalItems int            `json:"totalItems"`
	TotalPages int            `json:"totalPages"`
	Items      []SecurityScan `json:"items"`
}

// SecurityResult represents a vulnerability finding
type SecurityResult struct {
	ID               string                 `json:"id,omitempty"`
	ScanID           string                 `json:"scan_id"`
	QueueID          string                 `json:"queue_id,omitempty"` // Links result to specific scan run
	TemplateID       string                 `json:"template_id"`
	TemplateName     string                 `json:"template_name"`
	Severity         string                 `json:"severity"` // critical, high, medium, low, info, unknown
	Host             string                 `json:"host"`
	MatchedURL       string                 `json:"matched_url"`
	MatchedAt        time.Time              `json:"matched_at"`
	Description      string                 `json:"description"`
	Solution         string                 `json:"solution"`
	CVEIDs           []string               `json:"cve_ids"`
	References       []string               `json:"references"`
	Tags             []string               `json:"tags"`
	CurlCommand      string                 `json:"curl_command"`
	ExtractedResults string                 `json:"extracted_results"`
	RawData          map[string]interface{} `json:"raw_data,omitempty"`
	Created          string                 `json:"created,omitempty"`
}

// SecurityResultsResponse represents the response from PocketBase
type SecurityResultsResponse struct {
	Page       int              `json:"page"`
	PerPage    int              `json:"perPage"`
	TotalItems int              `json:"totalItems"`
	TotalPages int              `json:"totalPages"`
	Items      []SecurityResult `json:"items"`
}

// SecurityQueueItem represents a scan in the queue
type SecurityQueueItem struct {
	ID                string   `json:"id,omitempty"`
	ScanID            string   `json:"scan_id"`
	Status            string   `json:"status"` // pending, processing, completed, failed, cancelled, timeout
	Priority          int      `json:"priority"`
	Source            string   `json:"source"` // scheduled, manual
	QueuedAt          string   `json:"queued_at"`
	StartedAt         string   `json:"started_at,omitempty"`
	CompletedAt       string   `json:"completed_at,omitempty"`
	Error             string   `json:"error,omitempty"`
	FindingsCount     int      `json:"findings_count"`
	ScannedURLsCount  int      `json:"scanned_urls_count"`
	ScannedURLsSample []string `json:"scanned_urls_sample"`
	ScanModeUsed      string   `json:"scan_mode_used"`
	Created           string   `json:"created,omitempty"`
	Updated           string   `json:"updated,omitempty"`
}

// SecurityQueueResponse represents the response from PocketBase
type SecurityQueueResponse struct {
	Page       int                 `json:"page"`
	PerPage    int                 `json:"perPage"`
	TotalItems int                 `json:"totalItems"`
	TotalPages int                 `json:"totalPages"`
	Items      []SecurityQueueItem `json:"items"`
}

// QueueStatus represents the current queue status
type QueueStatus struct {
	TotalItems      int                 `json:"total_items"`
	PendingCount    int                 `json:"pending_count"`
	ProcessingCount int                 `json:"processing_count"`
	CompletedCount  int                 `json:"completed_count"`
	FailedCount     int                 `json:"failed_count"`
	CurrentItem     *SecurityQueueItem  `json:"current_item,omitempty"`
	RecentItems     []SecurityQueueItem `json:"recent_items"`
}

// NucleiOutput represents the JSON output from nuclei scanner
type NucleiOutput struct {
	TemplateID   string        `json:"template-id"`
	Info         NucleiInfo    `json:"info"`
	Type         string        `json:"type"`
	Host         string        `json:"host"`
	MatchedAt    string        `json:"matched-at"`
	Timestamp    string        `json:"timestamp"`
	CurlCommand  string        `json:"curl-command,omitempty"`
	MatcherName  string        `json:"matcher-name,omitempty"`
	ExtractorName string       `json:"extractor-name,omitempty"`
	ExtractedResults []string  `json:"extracted-results,omitempty"`
	Request      string        `json:"request,omitempty"`
	Response     string        `json:"response,omitempty"`
	IP           string        `json:"ip,omitempty"`
}

// NucleiInfo contains template metadata
type NucleiInfo struct {
	Name           string            `json:"name"`
	Author         []string          `json:"author"`
	Tags           []string          `json:"tags"`
	Description    string            `json:"description"`
	Severity       string            `json:"severity"`
	Reference      []string          `json:"reference"`
	Classification NucleiClassification `json:"classification,omitempty"`
	Remediation    string            `json:"remediation,omitempty"`
}

// NucleiClassification contains CVE and vulnerability classification
type NucleiClassification struct {
	CVEIDs      []string    `json:"cve-id,omitempty"`
	CWEID       []string    `json:"cwe-id,omitempty"`
	CVSS        interface{} `json:"cvss-score,omitempty"` // Can be string or number
	CVSSMetrics string      `json:"cvss-metrics,omitempty"`
}

// ScanRunStatus represents the status of a running scan
type ScanRunStatus struct {
	ScanID    string    `json:"scan_id"`
	Status    string    `json:"status"` // pending, running, completed, failed
	StartedAt time.Time `json:"started_at"`
	Error     string    `json:"error,omitempty"`
}

// SeverityCount represents count of findings by severity
type SeverityCount struct {
	Critical int `json:"critical"`
	High     int `json:"high"`
	Medium   int `json:"medium"`
	Low      int `json:"low"`
	Info     int `json:"info"`
	Unknown  int `json:"unknown"`
}

// ScanSummary represents a summary of scan results
type ScanSummary struct {
	ScanID         string        `json:"scan_id"`
	ScanName       string        `json:"scan_name"`
	TargetURL      string        `json:"target_url"`
	TotalFindings  int           `json:"total_findings"`
	SeverityCounts SeverityCount `json:"severity_counts"`
	ScanDuration   int64         `json:"scan_duration_ms"`
	ScannedAt      time.Time     `json:"scanned_at"`
}
