package performancemonitoring

import "time"

// PerformanceTest represents a scheduled performance test configuration
type PerformanceTest struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	URL              string                 `json:"url"`
	Status           string                 `json:"status"` // active, paused, running, error
	ScheduleInterval int                    `json:"schedule_interval"` // seconds (min 3600 = 1 hour)
	LastRun          string                 `json:"last_run"`
	NextRun          string                 `json:"next_run"`
	NotificationID   string                 `json:"notification_id"`
	BudgetID         string                 `json:"budget_id"`
	Browser          string                 `json:"browser"` // chrome, firefox, edge
	Connectivity     string                 `json:"connectivity"` // native, 3g, 4g, cable
	Runs             int                    `json:"runs"` // iterations per test (1-10)
	VisualMetrics    bool                   `json:"visual_metrics"` // Enable visual metrics (SpeedIndex, video)
	SitespeedOptions map[string]interface{} `json:"sitespeed_options"`
	Created          string                 `json:"created"`
	Updated          string                 `json:"updated"`
}

// PerformanceTestsResponse represents the response from PocketBase
type PerformanceTestsResponse struct {
	Page       int               `json:"page"`
	PerPage    int               `json:"perPage"`
	TotalItems int               `json:"totalItems"`
	TotalPages int               `json:"totalPages"`
	Items      []PerformanceTest `json:"items"`
}

// PerformanceBudget represents budget limits for performance metrics
type PerformanceBudget struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	LCPLimit          int    `json:"lcp_limit"`           // ms (good: 2500, poor: 4000)
	FCPLimit          int    `json:"fcp_limit"`           // ms (good: 1800, poor: 3000)
	CLSLimit          float64 `json:"cls_limit"`           // (good: 0.1, poor: 0.25)
	TBTLimit          int    `json:"tbt_limit"`           // ms (good: 200, poor: 600)
	TTFBLimit         int    `json:"ttfb_limit"`          // ms
	SpeedIndexLimit   int    `json:"speed_index_limit"`   // ms
	RequestsLimit     int    `json:"requests_limit"`
	TransferSizeLimit int64  `json:"transfer_size_limit"` // bytes
	Created           string `json:"created"`
	Updated           string `json:"updated"`
}

// PerformanceMetrics represents the results of a performance test
type PerformanceMetrics struct {
	ID               string                 `json:"id,omitempty"`
	TestID           string                 `json:"test_id"`
	Timestamp        time.Time              `json:"timestamp"`
	URL              string                 `json:"url"`

	// Core Web Vitals
	LCP              float64                `json:"lcp"`  // Largest Contentful Paint (ms)
	FCP              float64                `json:"fcp"`  // First Contentful Paint (ms)
	CLS              float64                `json:"cls"`  // Cumulative Layout Shift
	TBT              float64                `json:"tbt"`  // Total Blocking Time (ms)

	// Performance Metrics
	TTFB             float64                `json:"ttfb"` // Time to First Byte (ms)
	SpeedIndex       float64                `json:"speed_index"`
	FirstVisualChange float64               `json:"first_visual_change"`
	LastVisualChange float64                `json:"last_visual_change"`

	// Page Metrics
	Requests         int                    `json:"requests"`
	TransferSize     int64                  `json:"transfer_size"`
	DOMElements      int                    `json:"dom_elements"`

	// Content Size Breakdown (bytes)
	HTMLSize         int64                  `json:"html_size"`
	CSSSize          int64                  `json:"css_size"`
	JSSize           int64                  `json:"js_size"`
	ImageSize        int64                  `json:"image_size"`
	FontSize         int64                  `json:"font_size"`
	OtherSize        int64                  `json:"other_size"`

	// Navigation Timings (ms)
	DNSTime          float64                `json:"dns_time"`
	ConnectTime      float64                `json:"connect_time"`
	SSLTime          float64                `json:"ssl_time"`
	BackendTime      float64                `json:"backend_time"`
	FrontendTime     float64                `json:"frontend_time"`
	FullyLoaded      float64                `json:"fully_loaded"`

	// Coach Score (0-100)
	CoachScore       float64                `json:"coach_score"`
	CoachPerformance float64                `json:"coach_performance"`
	CoachAccessibility float64              `json:"coach_accessibility"`
	CoachBestPractice float64               `json:"coach_best_practice"`

	// CPU Metrics
	CPULongTasks     int                    `json:"cpu_long_tasks"`
	CPULongTasksTime float64                `json:"cpu_long_tasks_time"`
	MaxLongTaskTime  float64                `json:"max_long_task_time"`

	// Request Breakdown
	RequestsHTML     int                    `json:"requests_html"`
	RequestsCSS      int                    `json:"requests_css"`
	RequestsJS       int                    `json:"requests_js"`
	RequestsImage    int                    `json:"requests_image"`
	RequestsFont     int                    `json:"requests_font"`
	RequestsOther    int                    `json:"requests_other"`
	ThirdPartyRequests int                  `json:"third_party_requests"`

	// Budget Results
	BudgetPassed     bool                   `json:"budget_passed"`
	BudgetResults    map[string]interface{} `json:"budget_results,omitempty"`

	// Storage
	ReportPath       string                 `json:"report_path"`
	RawData          map[string]interface{} `json:"raw_data,omitempty"`

	Created          string                 `json:"created,omitempty"`
}

// BudgetCheckResult represents the result of checking a metric against its budget
type BudgetCheckResult struct {
	Metric   string  `json:"metric"`
	Value    float64 `json:"value"`
	Limit    float64 `json:"limit"`
	Passed   bool    `json:"passed"`
	Severity string  `json:"severity"` // good, needs-improvement, poor
}

// SitespeedResult represents the parsed result from sitespeed.io JSON output
type SitespeedResult struct {
	URL        string                 `json:"url"`
	Statistics SitespeedStatistics    `json:"statistics"`
	RawData    map[string]interface{} `json:"raw_data"`
	ReportPath string                 `json:"report_path"`
}

// SitespeedStatistics contains the statistical data from sitespeed.io
type SitespeedStatistics struct {
	VisualMetrics   VisualMetrics    `json:"visualMetrics"`
	GoogleWebVitals GoogleWebVitals  `json:"googleWebVitals"`
	Timings         Timings          `json:"timings"`
	PageInfo        PageInfo         `json:"pageInfo"`
	ContentSize     ContentSize      `json:"contentSize"`
	Coach           CoachScore       `json:"coach"`
	CPU             CPUMetrics       `json:"cpu"`
	Requests        RequestBreakdown `json:"requests"`
}

// VisualMetrics contains visual timing metrics
type VisualMetrics struct {
	SpeedIndex        StatValue `json:"SpeedIndex"`
	FirstVisualChange StatValue `json:"FirstVisualChange"`
	LastVisualChange  StatValue `json:"LastVisualChange"`
	LCP               StatValue `json:"LargestContentfulPaint"`
}

// GoogleWebVitals contains Core Web Vitals
type GoogleWebVitals struct {
	LCP StatValue `json:"largestContentfulPaint"`
	FCP StatValue `json:"firstContentfulPaint"`
	CLS StatValue `json:"cumulativeLayoutShift"`
	TBT StatValue `json:"totalBlockingTime"`
}

// Timings contains general timing metrics
type Timings struct {
	TTFB         StatValue `json:"timeToFirstByte"`
	DNS          StatValue `json:"dns"`
	Connect      StatValue `json:"connect"`
	SSL          StatValue `json:"ssl"`
	BackendTime  StatValue `json:"backendTime"`
	FrontendTime StatValue `json:"frontendTime"`
	FullyLoaded  StatValue `json:"fullyLoaded"`
}

// PageInfo contains page metrics
type PageInfo struct {
	Requests     StatValue `json:"requests"`
	TransferSize StatValue `json:"transferSize"`
	DOMElements  StatValue `json:"domElements"`
}

// StatValue represents a statistical value with median, mean, etc.
type StatValue struct {
	Median float64 `json:"median"`
	Mean   float64 `json:"mean"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	P90    float64 `json:"p90"`
	P99    float64 `json:"p99"`
}

// ContentSize contains content size breakdown by type
type ContentSize struct {
	HTML   StatValue `json:"html"`
	CSS    StatValue `json:"css"`
	JS     StatValue `json:"javascript"`
	Image  StatValue `json:"image"`
	Font   StatValue `json:"font"`
	Other  StatValue `json:"other"`
	Total  StatValue `json:"total"`
}

// CoachScore contains performance coach scoring
type CoachScore struct {
	Score         StatValue `json:"score"`
	Performance   StatValue `json:"performance"`
	Accessibility StatValue `json:"accessibility"`
	BestPractice  StatValue `json:"bestPractice"`
}

// CPUMetrics contains CPU timing information
type CPUMetrics struct {
	LongTasks       StatValue `json:"longTasks"`
	LongTasksTime   StatValue `json:"longTasksTime"`
	MaxLongTaskTime StatValue `json:"maxPotentialFid"`
}

// RequestBreakdown contains request counts by type
type RequestBreakdown struct {
	HTML       StatValue `json:"html"`
	CSS        StatValue `json:"css"`
	JavaScript StatValue `json:"javascript"`
	Image      StatValue `json:"image"`
	Font       StatValue `json:"font"`
	Other      StatValue `json:"other"`
	ThirdParty StatValue `json:"thirdParty"`
}

// TestRunStatus represents the status of a running test
type TestRunStatus struct {
	TestID    string    `json:"test_id"`
	Status    string    `json:"status"` // pending, running, completed, failed
	StartedAt time.Time `json:"started_at"`
	Error     string    `json:"error,omitempty"`
}
