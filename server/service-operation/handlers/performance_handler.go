package handlers

import (
	"bytes"
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

// HandlePerformanceQueueStatus returns the current queue status
func (h *OperationHandler) HandlePerformanceQueueStatus(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	// Get currently processing item
	processingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=1",
		h.pbClient.GetBaseURL(), url.QueryEscape("(status='processing')"))

	processingResp, err := http.Get(processingURL)
	if err != nil {
		http.Error(w, "Failed to fetch processing item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer processingResp.Body.Close()

	var processingResponse struct {
		Items []interface{} `json:"items"`
	}
	if processingResp.StatusCode == http.StatusOK {
		processingBody, _ := io.ReadAll(processingResp.Body)
		json.Unmarshal(processingBody, &processingResponse)
	}

	// Get pending items
	pendingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&sort=%s&perPage=50",
		h.pbClient.GetBaseURL(),
		url.QueryEscape("(status='pending')"),
		url.QueryEscape("priority,queued_at"))

	pendingResp, err := http.Get(pendingURL)
	if err != nil {
		http.Error(w, "Failed to fetch pending items: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer pendingResp.Body.Close()

	var pendingResponse struct {
		Items      []interface{} `json:"items"`
		TotalItems int           `json:"totalItems"`
	}
	if pendingResp.StatusCode == http.StatusOK {
		pendingBody, _ := io.ReadAll(pendingResp.Body)
		json.Unmarshal(pendingBody, &pendingResponse)
	}

	// Build response
	var currentlyRunning interface{}
	if len(processingResponse.Items) > 0 {
		currentlyRunning = processingResponse.Items[0]
	}

	result := map[string]interface{}{
		"currently_running": currentlyRunning,
		"pending_items":     pendingResponse.Items,
		"total_pending":     pendingResponse.TotalItems,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HandlePerformanceQueuePosition returns the queue position for a specific test
func (h *OperationHandler) HandlePerformanceQueuePosition(w http.ResponseWriter, r *http.Request) {
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

	// Check if the test is currently processing
	processingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=1",
		h.pbClient.GetBaseURL(),
		url.QueryEscape(fmt.Sprintf("(test_id='%s' && status='processing')", testID)))

	processingResp, err := http.Get(processingURL)
	if err != nil {
		http.Error(w, "Failed to check processing status: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer processingResp.Body.Close()

	var processingResponse struct {
		TotalItems int           `json:"totalItems"`
		Items      []interface{} `json:"items"`
	}
	if processingResp.StatusCode == http.StatusOK {
		processingBody, _ := io.ReadAll(processingResp.Body)
		json.Unmarshal(processingBody, &processingResponse)
	}

	if processingResponse.TotalItems > 0 {
		// Test is currently processing
		result := map[string]interface{}{
			"position":   0, // 0 means currently running
			"status":     "processing",
			"queue_item": processingResponse.Items[0],
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// Get all pending items ordered by priority
	pendingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&sort=%s&perPage=100",
		h.pbClient.GetBaseURL(),
		url.QueryEscape("(status='pending')"),
		url.QueryEscape("priority,queued_at"))

	pendingResp, err := http.Get(pendingURL)
	if err != nil {
		http.Error(w, "Failed to fetch pending items: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer pendingResp.Body.Close()

	var pendingResponse struct {
		Items []struct {
			ID     string `json:"id"`
			TestID string `json:"test_id"`
		} `json:"items"`
	}
	if pendingResp.StatusCode == http.StatusOK {
		pendingBody, _ := io.ReadAll(pendingResp.Body)
		json.Unmarshal(pendingBody, &pendingResponse)
	}

	// Find position of the test
	position := 0
	var queueItem interface{}
	for i, item := range pendingResponse.Items {
		if item.TestID == testID {
			position = i + 1 // 1-based position
			// Fetch full item details
			itemURL := fmt.Sprintf("%s/api/collections/performance_queue/records/%s",
				h.pbClient.GetBaseURL(), item.ID)
			itemResp, _ := http.Get(itemURL)
			if itemResp != nil && itemResp.StatusCode == http.StatusOK {
				itemBody, _ := io.ReadAll(itemResp.Body)
				json.Unmarshal(itemBody, &queueItem)
				itemResp.Body.Close()
			}
			break
		}
	}

	result := map[string]interface{}{
		"position":   position,
		"status":     "pending",
		"queue_item": queueItem,
	}
	if position == 0 {
		result["status"] = "not_queued"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HandlePerformanceCancelQueue cancels a pending queue item
func (h *OperationHandler) HandlePerformanceCancelQueue(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	itemID := vars["itemId"]

	if itemID == "" {
		http.Error(w, "Missing itemId", http.StatusBadRequest)
		return
	}

	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	// Get the queue item first to check its status
	itemURL := fmt.Sprintf("%s/api/collections/performance_queue/records/%s",
		h.pbClient.GetBaseURL(), itemID)

	itemResp, err := http.Get(itemURL)
	if err != nil {
		http.Error(w, "Failed to fetch queue item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer itemResp.Body.Close()

	if itemResp.StatusCode == http.StatusNotFound {
		http.Error(w, "Queue item not found", http.StatusNotFound)
		return
	}

	if itemResp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch queue item, status: %d", itemResp.StatusCode), http.StatusInternalServerError)
		return
	}

	var queueItem struct {
		Status string `json:"status"`
	}
	itemBody, _ := io.ReadAll(itemResp.Body)
	if err := json.Unmarshal(itemBody, &queueItem); err != nil {
		http.Error(w, "Failed to parse queue item: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if queueItem.Status != "pending" {
		http.Error(w, "Can only cancel pending items", http.StatusBadRequest)
		return
	}

	// Update the item to cancelled
	updateData := map[string]interface{}{
		"status":       "cancelled",
		"completed_at": nil,
	}
	updateBody, _ := json.Marshal(updateData)

	req, err := http.NewRequest("PATCH", itemURL, bytes.NewBuffer(updateBody))
	if err != nil {
		http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	client := h.pbClient.GetHTTPClient()
	updateResp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to update queue item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer updateResp.Body.Close()

	if updateResp.StatusCode != http.StatusOK {
		updateRespBody, _ := io.ReadAll(updateResp.Body)
		http.Error(w, fmt.Sprintf("Failed to cancel queue item: %s", string(updateRespBody)), http.StatusInternalServerError)
		return
	}

	result := map[string]interface{}{
		"success": true,
		"message": "Queue item cancelled",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
