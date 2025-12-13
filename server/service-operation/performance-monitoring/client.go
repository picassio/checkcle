package performancemonitoring

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"service-operation/pocketbase"
	"time"
)

// PerformanceClient handles PocketBase operations for performance monitoring
type PerformanceClient struct {
	pbClient *pocketbase.PocketBaseClient
}

// NewPerformanceClient creates a new performance client
func NewPerformanceClient(pbClient *pocketbase.PocketBaseClient) *PerformanceClient {
	return &PerformanceClient{
		pbClient: pbClient,
	}
}

// GetActiveTests fetches all active performance tests from PocketBase
func (c *PerformanceClient) GetActiveTests() ([]PerformanceTest, error) {
	reqURL := fmt.Sprintf("%s/api/collections/performance_tests/records?filter=%s",
		c.pbClient.GetBaseURL(),
		url.QueryEscape("(status='active')"))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch performance tests: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch performance tests, status: %d", resp.StatusCode)
	}

	var response PerformanceTestsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse performance tests response: %w", err)
	}

	return response.Items, nil
}

// GetTest fetches a single performance test by ID
func (c *PerformanceClient) GetTest(testID string) (*PerformanceTest, error) {
	reqURL := fmt.Sprintf("%s/api/collections/performance_tests/records/%s",
		c.pbClient.GetBaseURL(), testID)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch performance test: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch performance test, status: %d", resp.StatusCode)
	}

	var test PerformanceTest
	if err := json.NewDecoder(resp.Body).Decode(&test); err != nil {
		return nil, fmt.Errorf("failed to parse performance test: %w", err)
	}

	return &test, nil
}

// GetBudget fetches a performance budget by ID
func (c *PerformanceClient) GetBudget(budgetID string) (*PerformanceBudget, error) {
	if budgetID == "" {
		return nil, nil
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_budgets/records/%s",
		c.pbClient.GetBaseURL(), budgetID)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch performance budget: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch performance budget, status: %d", resp.StatusCode)
	}

	var budget PerformanceBudget
	if err := json.NewDecoder(resp.Body).Decode(&budget); err != nil {
		return nil, fmt.Errorf("failed to parse performance budget: %w", err)
	}

	return &budget, nil
}

// UpdateTestStatus updates the status of a performance test
func (c *PerformanceClient) UpdateTestStatus(testID string, status string, lastRun, nextRun *time.Time) error {
	data := map[string]interface{}{
		"status": status,
	}

	if lastRun != nil {
		data["last_run"] = lastRun.Format(time.RFC3339)
	}

	if nextRun != nil {
		data["next_run"] = nextRun.Format(time.RFC3339)
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal update data: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_tests/records/%s",
		c.pbClient.GetBaseURL(), testID)

	req, err := http.NewRequest("PATCH", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create PATCH request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to update test status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update test status, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// SaveMetrics saves performance metrics to PocketBase
func (c *PerformanceClient) SaveMetrics(metrics *PerformanceMetrics) error {
	data := map[string]interface{}{
		"test_id":             metrics.TestID,
		"timestamp":           metrics.Timestamp.Format(time.RFC3339),
		"url":                 metrics.URL,
		"lcp":                 metrics.LCP,
		"fcp":                 metrics.FCP,
		"cls":                 metrics.CLS,
		"tbt":                 metrics.TBT,
		"ttfb":                metrics.TTFB,
		"speed_index":         metrics.SpeedIndex,
		"first_visual_change": metrics.FirstVisualChange,
		"last_visual_change":  metrics.LastVisualChange,
		"requests":            metrics.Requests,
		"transfer_size":       metrics.TransferSize,
		"dom_elements":        metrics.DOMElements,
		// Content Size Breakdown
		"html_size":  metrics.HTMLSize,
		"css_size":   metrics.CSSSize,
		"js_size":    metrics.JSSize,
		"image_size": metrics.ImageSize,
		"font_size":  metrics.FontSize,
		"other_size": metrics.OtherSize,
		// Navigation Timings
		"dns_time":     metrics.DNSTime,
		"connect_time": metrics.ConnectTime,
		"ssl_time":     metrics.SSLTime,
		"backend_time": metrics.BackendTime,
		"frontend_time": metrics.FrontendTime,
		"fully_loaded": metrics.FullyLoaded,
		// Coach Scores
		"coach_score":         metrics.CoachScore,
		"coach_performance":   metrics.CoachPerformance,
		"coach_accessibility": metrics.CoachAccessibility,
		"coach_best_practice": metrics.CoachBestPractice,
		// CPU Metrics
		"cpu_long_tasks":      metrics.CPULongTasks,
		"cpu_long_tasks_time": metrics.CPULongTasksTime,
		"max_long_task_time":  metrics.MaxLongTaskTime,
		// Request Breakdown
		"requests_html":        metrics.RequestsHTML,
		"requests_css":         metrics.RequestsCSS,
		"requests_js":          metrics.RequestsJS,
		"requests_image":       metrics.RequestsImage,
		"requests_font":        metrics.RequestsFont,
		"requests_other":       metrics.RequestsOther,
		"third_party_requests": metrics.ThirdPartyRequests,
		// Budget and Report
		"budget_passed":  metrics.BudgetPassed,
		"budget_results": metrics.BudgetResults,
		"report_path":    metrics.ReportPath,
		"raw_data":       metrics.RawData,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal metrics: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_metrics/records", c.pbClient.GetBaseURL())

	req, err := http.NewRequest("POST", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create POST request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to save metrics: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to save metrics, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// GetTestsDueForRun fetches tests that are due for execution
func (c *PerformanceClient) GetTestsDueForRun() ([]PerformanceTest, error) {
	now := time.Now().Format(time.RFC3339)
	filter := fmt.Sprintf("(status='active' && (next_run='' || next_run<='%s'))", now)

	reqURL := fmt.Sprintf("%s/api/collections/performance_tests/records?filter=%s",
		c.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tests due for run: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch tests due for run, status: %d", resp.StatusCode)
	}

	var response PerformanceTestsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse tests response: %w", err)
	}

	return response.Items, nil
}
