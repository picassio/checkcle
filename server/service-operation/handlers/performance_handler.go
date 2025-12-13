package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
)

// HandlePerformanceRunTest triggers an immediate test run
// This handler will be set up by main.go with the actual PerformanceMonitor
type PerformanceRunTestHandler func(w http.ResponseWriter, r *http.Request)

// HandlePerformanceReport serves HTML reports from sitespeed.io
func (h *OperationHandler) HandlePerformanceReport(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	testID := vars["testId"]
	timestamp := vars["timestamp"]
	file := vars["file"]

	if testID == "" || timestamp == "" {
		http.Error(w, "Missing testId or timestamp", http.StatusBadRequest)
		return
	}

	// Get results directory from environment
	resultsDir := os.Getenv("SITESPEED_RESULTS_DIR")
	if resultsDir == "" {
		resultsDir = "/opt/sitespeed-results"
	}

	// Build file path
	var filePath string
	if file != "" {
		filePath = filepath.Join(resultsDir, testID, timestamp, file)
	} else {
		filePath = filepath.Join(resultsDir, testID, timestamp, "index.html")
	}

	// Security: ensure the path is within the results directory
	cleanPath := filepath.Clean(filePath)
	if !filepath.HasPrefix(cleanPath, resultsDir) {
		http.Error(w, "Invalid path", http.StatusForbidden)
		return
	}

	// Check if file exists
	if _, err := os.Stat(cleanPath); os.IsNotExist(err) {
		http.Error(w, "Report not found", http.StatusNotFound)
		return
	}

	// Serve the file
	http.ServeFile(w, r, cleanPath)
}

// HandlePerformanceMetrics returns metrics for a test
func (h *OperationHandler) HandlePerformanceMetrics(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	testID := vars["testId"]

	if testID == "" {
		http.Error(w, "Missing testId", http.StatusBadRequest)
		return
	}

	// Query parameters for filtering
	timeRange := r.URL.Query().Get("range") // e.g., "24h", "7d", "30d"
	limit := r.URL.Query().Get("limit")

	// Build filter
	filter := "test_id='" + testID + "'"
	if timeRange != "" {
		// TODO: Add time range filtering
		_ = timeRange
	}

	// Forward request to PocketBase
	reqURL := fmt.Sprintf("%s/api/collections/performance_metrics/records?filter=%s&sort=-timestamp",
		h.pbClient.GetBaseURL(), url.QueryEscape(filter))
	if limit != "" {
		reqURL += "&perPage=" + limit
	}

	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch metrics: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch metrics, status: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// HandlePerformanceTestStatus returns the status of a performance test
func (h *OperationHandler) HandlePerformanceTestStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	testID := vars["testId"]

	if testID == "" {
		http.Error(w, "Missing testId", http.StatusBadRequest)
		return
	}

	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_tests/records/%s",
		h.pbClient.GetBaseURL(), testID)

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch test: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch test, status: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// HandlePerformanceTests lists all performance tests
func (h *OperationHandler) HandlePerformanceTests(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	status := r.URL.Query().Get("status")
	reqURL := fmt.Sprintf("%s/api/collections/performance_tests/records?sort=-created",
		h.pbClient.GetBaseURL())
	if status != "" {
		reqURL += "&filter=" + url.QueryEscape("(status='"+status+"')")
	}

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch tests: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch tests, status: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// HandlePerformanceBudgets lists all performance budgets
func (h *OperationHandler) HandlePerformanceBudgets(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_budgets/records?sort=-created",
		h.pbClient.GetBaseURL())

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch budgets: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch budgets, status: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(body)
}

// HandlePerformanceLatestMetrics returns the latest metrics for all tests
func (h *OperationHandler) HandlePerformanceLatestMetrics(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	// Get all active tests
	testsURL := fmt.Sprintf("%s/api/collections/performance_tests/records?filter=%s",
		h.pbClient.GetBaseURL(), url.QueryEscape("(status='active')"))

	testsResp, err := http.Get(testsURL)
	if err != nil {
		http.Error(w, "Failed to fetch tests: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer testsResp.Body.Close()

	if testsResp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch tests, status: %d", testsResp.StatusCode), http.StatusInternalServerError)
		return
	}

	testsBody, err := io.ReadAll(testsResp.Body)
	if err != nil {
		http.Error(w, "Failed to read tests response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var testsResponse struct {
		Items []struct {
			ID   string `json:"id"`
			Name string `json:"name"`
			URL  string `json:"url"`
		} `json:"items"`
	}
	if err := json.Unmarshal(testsBody, &testsResponse); err != nil {
		http.Error(w, "Failed to parse tests: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get latest metrics for each test
	type TestWithMetrics struct {
		TestID        string      `json:"test_id"`
		TestName      string      `json:"test_name"`
		TestURL       string      `json:"test_url"`
		LatestMetrics interface{} `json:"latest_metrics"`
	}

	results := make([]TestWithMetrics, 0)

	for _, test := range testsResponse.Items {
		metricsURL := fmt.Sprintf("%s/api/collections/performance_metrics/records?filter=%s&sort=-timestamp&perPage=1",
			h.pbClient.GetBaseURL(), url.QueryEscape("(test_id='"+test.ID+"')"))

		metricsResp, err := http.Get(metricsURL)
		if err != nil {
			continue
		}
		defer metricsResp.Body.Close()

		if metricsResp.StatusCode != http.StatusOK {
			continue
		}

		metricsBody, err := io.ReadAll(metricsResp.Body)
		if err != nil {
			continue
		}

		var metricsResponse struct {
			Items []interface{} `json:"items"`
		}
		if err := json.Unmarshal(metricsBody, &metricsResponse); err != nil {
			continue
		}

		var latestMetrics interface{}
		if len(metricsResponse.Items) > 0 {
			latestMetrics = metricsResponse.Items[0]
		}

		results = append(results, TestWithMetrics{
			TestID:        test.ID,
			TestName:      test.Name,
			TestURL:       test.URL,
			LatestMetrics: latestMetrics,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}
