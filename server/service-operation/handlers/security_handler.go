package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/gorilla/mux"
)

// SecurityRunScanHandler is a function type for triggering immediate scans
type SecurityRunScanHandler func(w http.ResponseWriter, r *http.Request)

// HandleSecurityScans lists all security scans or creates a new one
func (h *OperationHandler) HandleSecurityScans(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.listSecurityScans(w, r)
	case http.MethodPost:
		h.createSecurityScan(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *OperationHandler) listSecurityScans(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records?sort=-created",
		h.pbClient.GetBaseURL())
	if status != "" {
		reqURL += "&filter=" + url.QueryEscape("(status='"+status+"')")
	}

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch scans: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("Failed to fetch scans, status: %d", resp.StatusCode), http.StatusInternalServerError)
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

func (h *OperationHandler) createSecurityScan(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body: "+err.Error(), http.StatusBadRequest)
		return
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records", h.pbClient.GetBaseURL())

	req, err := http.NewRequest("POST", reqURL, bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		http.Error(w, "Failed to create scan: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "Failed to read response: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(respBody)
}

// HandleSecurityScan handles single scan operations (GET, PATCH, DELETE)
func (h *OperationHandler) HandleSecurityScan(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	scanID := vars["scanId"]

	if scanID == "" {
		http.Error(w, "Missing scanId", http.StatusBadRequest)
		return
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records/%s",
		h.pbClient.GetBaseURL(), scanID)

	switch r.Method {
	case http.MethodGet:
		resp, err := http.Get(reqURL)
		if err != nil {
			http.Error(w, "Failed to fetch scan: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, _ := io.ReadAll(resp.Body)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)

	case http.MethodPatch:
		body, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		req, err := http.NewRequest("PATCH", reqURL, bytes.NewBuffer(body))
		if err != nil {
			http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
			return
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := h.pbClient.GetHTTPClient().Do(req)
		if err != nil {
			http.Error(w, "Failed to update scan: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		respBody, _ := io.ReadAll(resp.Body)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(respBody)

	case http.MethodDelete:
		req, err := http.NewRequest("DELETE", reqURL, nil)
		if err != nil {
			http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
			return
		}

		resp, err := h.pbClient.GetHTTPClient().Do(req)
		if err != nil {
			http.Error(w, "Failed to delete scan: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		w.WriteHeader(resp.StatusCode)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// HandleSecurityResults returns results for a scan
func (h *OperationHandler) HandleSecurityResults(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	scanID := vars["scanId"]

	if scanID == "" {
		http.Error(w, "Missing scanId", http.StatusBadRequest)
		return
	}

	// Query parameters
	severity := r.URL.Query().Get("severity")
	limit := r.URL.Query().Get("limit")
	if limit == "" {
		limit = "100"
	}

	filter := fmt.Sprintf("(scan_id='%s')", scanID)
	if severity != "" {
		filter = fmt.Sprintf("(scan_id='%s' && severity='%s')", scanID, severity)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_results/records?filter=%s&sort=-created&perPage=%s",
		h.pbClient.GetBaseURL(), url.QueryEscape(filter), limit)

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch results: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// HandleSecurityResult returns a single result
func (h *OperationHandler) HandleSecurityResult(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	vars := mux.Vars(r)
	resultID := vars["resultId"]

	if resultID == "" {
		http.Error(w, "Missing resultId", http.StatusBadRequest)
		return
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_results/records/%s",
		h.pbClient.GetBaseURL(), resultID)

	resp, err := http.Get(reqURL)
	if err != nil {
		http.Error(w, "Failed to fetch result: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	w.Write(body)
}

// HandleSecurityQueueStatus returns the current queue status
func (h *OperationHandler) HandleSecurityQueueStatus(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	// Get currently processing item
	processingURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&perPage=1",
		h.pbClient.GetBaseURL(), url.QueryEscape("(status='processing')"))

	processingResp, err := http.Get(processingURL)
	if err != nil {
		http.Error(w, "Failed to fetch processing item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer processingResp.Body.Close()

	var processingResponse struct {
		Items      []interface{} `json:"items"`
		TotalItems int           `json:"totalItems"`
	}
	if processingResp.StatusCode == http.StatusOK {
		processingBody, _ := io.ReadAll(processingResp.Body)
		json.Unmarshal(processingBody, &processingResponse)
	}

	// Get pending items
	pendingURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&sort=%s&perPage=50",
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

	// Get recent completed/failed items
	recentURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&sort=-completed_at&perPage=10",
		h.pbClient.GetBaseURL(),
		url.QueryEscape("(status='completed' || status='failed')"))

	recentResp, err := http.Get(recentURL)
	if err != nil {
		http.Error(w, "Failed to fetch recent items: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer recentResp.Body.Close()

	var recentResponse struct {
		Items []interface{} `json:"items"`
	}
	if recentResp.StatusCode == http.StatusOK {
		recentBody, _ := io.ReadAll(recentResp.Body)
		json.Unmarshal(recentBody, &recentResponse)
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
		"recent_items":      recentResponse.Items,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HandleSecurityCancelQueue cancels a pending queue item
func (h *OperationHandler) HandleSecurityCancelQueue(w http.ResponseWriter, r *http.Request) {
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

	// Get the queue item first
	itemURL := fmt.Sprintf("%s/api/collections/security_queue/records/%s",
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

	var queueItem struct {
		Status string `json:"status"`
		ScanID string `json:"scan_id"`
	}
	itemBody, _ := io.ReadAll(itemResp.Body)
	json.Unmarshal(itemBody, &queueItem)

	// Allow cancelling both pending and processing items
	if queueItem.Status != "pending" && queueItem.Status != "processing" {
		http.Error(w, "Can only cancel pending or processing items", http.StatusBadRequest)
		return
	}

	// Update to cancelled with error message and completion time
	updateData := map[string]interface{}{
		"status":       "cancelled",
		"error":        "Manually cancelled by user",
		"completed_at": time.Now().UTC().Format("2006-01-02 15:04:05.000Z"),
	}
	updateBody, _ := json.Marshal(updateData)

	req, err := http.NewRequest("PATCH", itemURL, bytes.NewBuffer(updateBody))
	if err != nil {
		http.Error(w, "Failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	updateResp, err := h.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		http.Error(w, "Failed to cancel queue item: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer updateResp.Body.Close()

	// If the item was processing, also reset the scan status back to active
	if queueItem.Status == "processing" && queueItem.ScanID != "" {
		scanURL := fmt.Sprintf("%s/api/collections/security_scans/records/%s",
			h.pbClient.GetBaseURL(), queueItem.ScanID)
		scanUpdateData := map[string]interface{}{
			"status": "active",
		}
		scanUpdateBody, _ := json.Marshal(scanUpdateData)
		scanReq, err := http.NewRequest("PATCH", scanURL, bytes.NewBuffer(scanUpdateBody))
		if err == nil {
			scanReq.Header.Set("Content-Type", "application/json")
			h.pbClient.GetHTTPClient().Do(scanReq)
		}
	}

	result := map[string]interface{}{
		"success": true,
		"message": "Queue item cancelled",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// HandleSecuritySummary returns a summary of all security scans
func (h *OperationHandler) HandleSecuritySummary(w http.ResponseWriter, r *http.Request) {
	if h.pbClient == nil {
		http.Error(w, "PocketBase not configured", http.StatusInternalServerError)
		return
	}

	// Get all scans
	scansURL := fmt.Sprintf("%s/api/collections/security_scans/records?perPage=100",
		h.pbClient.GetBaseURL())

	scansResp, err := http.Get(scansURL)
	if err != nil {
		http.Error(w, "Failed to fetch scans: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer scansResp.Body.Close()

	var scansResponse struct {
		Items      []map[string]interface{} `json:"items"`
		TotalItems int                      `json:"totalItems"`
	}
	if scansResp.StatusCode == http.StatusOK {
		scansBody, _ := io.ReadAll(scansResp.Body)
		json.Unmarshal(scansBody, &scansResponse)
	}

	// Calculate totals
	var totalCritical, totalHigh, totalFindings int
	for _, scan := range scansResponse.Items {
		if critical, ok := scan["critical_count"].(float64); ok {
			totalCritical += int(critical)
		}
		if high, ok := scan["high_count"].(float64); ok {
			totalHigh += int(high)
		}
		if findings, ok := scan["findings_count"].(float64); ok {
			totalFindings += int(findings)
		}
	}

	result := map[string]interface{}{
		"total_scans":    scansResponse.TotalItems,
		"total_findings": totalFindings,
		"total_critical": totalCritical,
		"total_high":     totalHigh,
		"scans":          scansResponse.Items,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
