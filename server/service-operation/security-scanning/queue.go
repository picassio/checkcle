package securityscanning

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

// SecurityQueue handles queue operations for security scanning
type SecurityQueue struct {
	pbClient *pocketbase.PocketBaseClient
}

// NewSecurityQueue creates a new security queue
func NewSecurityQueue(pbClient *pocketbase.PocketBaseClient) *SecurityQueue {
	return &SecurityQueue{
		pbClient: pbClient,
	}
}

// AddToQueue adds a scan to the queue
func (q *SecurityQueue) AddToQueue(scanID string, source string, priority int) (*SecurityQueueItem, error) {
	// Check if scan is already in queue (pending or processing)
	existing, err := q.GetPendingForScan(scanID)
	if err == nil && existing != nil {
		return existing, nil
	}

	data := map[string]interface{}{
		"scan_id":   scanID,
		"status":    "pending",
		"priority":  priority,
		"source":    source,
		"queued_at": time.Now().Format(time.RFC3339),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal queue item: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records", q.pbClient.GetBaseURL())

	req, err := http.NewRequest("POST", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create POST request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to add to queue: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to add to queue, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	var item SecurityQueueItem
	if err := json.NewDecoder(resp.Body).Decode(&item); err != nil {
		return nil, fmt.Errorf("failed to parse queue item: %w", err)
	}

	return &item, nil
}

// GetNextPending gets the next pending item from the queue
func (q *SecurityQueue) GetNextPending() (*SecurityQueueItem, error) {
	filter := "(status='pending')"
	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&sort=priority,-queued_at&perPage=1",
		q.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch next pending item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch next pending item, status: %d", resp.StatusCode)
	}

	var response SecurityQueueResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse queue response: %w", err)
	}

	if len(response.Items) == 0 {
		return nil, nil
	}

	return &response.Items[0], nil
}

// GetPendingForScan gets pending queue item for a specific scan
func (q *SecurityQueue) GetPendingForScan(scanID string) (*SecurityQueueItem, error) {
	filter := fmt.Sprintf("(scan_id='%s' && (status='pending' || status='processing'))", scanID)
	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&perPage=1",
		q.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pending item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch pending item, status: %d", resp.StatusCode)
	}

	var response SecurityQueueResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse queue response: %w", err)
	}

	if len(response.Items) == 0 {
		return nil, nil
	}

	return &response.Items[0], nil
}

// UpdateStatus updates the status of a queue item
func (q *SecurityQueue) UpdateStatus(itemID, status string, errorMsg string) error {
	data := map[string]interface{}{
		"status": status,
	}

	if errorMsg != "" {
		data["error"] = errorMsg
	}

	now := time.Now().Format(time.RFC3339)
	switch status {
	case "processing":
		data["started_at"] = now
	case "completed", "failed", "cancelled", "timeout":
		data["completed_at"] = now
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal update data: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records/%s",
		q.pbClient.GetBaseURL(), itemID)

	req, err := http.NewRequest("PATCH", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create PATCH request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to update status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update status, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// UpdateFindingsCount updates the findings count for a queue item
func (q *SecurityQueue) UpdateFindingsCount(itemID string, count int) error {
	data := map[string]interface{}{
		"findings_count": count,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal update data: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records/%s",
		q.pbClient.GetBaseURL(), itemID)

	req, err := http.NewRequest("PATCH", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create PATCH request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := q.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to update findings count: %w", err)
	}
	defer resp.Body.Close()

	return nil
}

// CancelItem cancels a queue item
func (q *SecurityQueue) CancelItem(itemID string) error {
	return q.UpdateStatus(itemID, "cancelled", "Cancelled by user")
}

// GetQueueStatus returns the current queue status
func (q *SecurityQueue) GetQueueStatus() (*QueueStatus, error) {
	status := &QueueStatus{}

	// Get counts by status
	statuses := []string{"pending", "processing", "completed", "failed"}
	for _, s := range statuses {
		filter := fmt.Sprintf("(status='%s')", s)
		reqURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&perPage=1",
			q.pbClient.GetBaseURL(),
			url.QueryEscape(filter))

		resp, err := http.Get(reqURL)
		if err != nil {
			continue
		}

		var response SecurityQueueResponse
		if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
			resp.Body.Close()
			continue
		}
		resp.Body.Close()

		switch s {
		case "pending":
			status.PendingCount = response.TotalItems
		case "processing":
			status.ProcessingCount = response.TotalItems
		case "completed":
			status.CompletedCount = response.TotalItems
		case "failed":
			status.FailedCount = response.TotalItems
		}
	}

	status.TotalItems = status.PendingCount + status.ProcessingCount + status.CompletedCount + status.FailedCount

	// Get current processing item
	current, err := q.GetCurrentProcessing()
	if err == nil && current != nil {
		status.CurrentItem = current
	}

	// Get recent items
	recent, err := q.GetRecentItems(10)
	if err == nil {
		status.RecentItems = recent
	}

	return status, nil
}

// GetCurrentProcessing gets the currently processing item
func (q *SecurityQueue) GetCurrentProcessing() (*SecurityQueueItem, error) {
	filter := "(status='processing')"
	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&perPage=1",
		q.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch processing item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch processing item, status: %d", resp.StatusCode)
	}

	var response SecurityQueueResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse queue response: %w", err)
	}

	if len(response.Items) == 0 {
		return nil, nil
	}

	return &response.Items[0], nil
}

// GetRecentItems gets recent queue items
func (q *SecurityQueue) GetRecentItems(limit int) ([]SecurityQueueItem, error) {
	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records?sort=-created&perPage=%d",
		q.pbClient.GetBaseURL(), limit)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch recent items: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch recent items, status: %d", resp.StatusCode)
	}

	var response SecurityQueueResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse queue response: %w", err)
	}

	return response.Items, nil
}

// GetQueueItem gets a queue item by ID
func (q *SecurityQueue) GetQueueItem(itemID string) (*SecurityQueueItem, error) {
	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records/%s",
		q.pbClient.GetBaseURL(), itemID)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch queue item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch queue item, status: %d", resp.StatusCode)
	}

	var item SecurityQueueItem
	if err := json.NewDecoder(resp.Body).Decode(&item); err != nil {
		return nil, fmt.Errorf("failed to parse queue item: %w", err)
	}

	return &item, nil
}

// CleanupOldItems removes old completed/failed items
func (q *SecurityQueue) CleanupOldItems(olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan).Format(time.RFC3339)
	filter := fmt.Sprintf("((status='completed' || status='failed' || status='cancelled') && created<='%s')", cutoff)

	reqURL := fmt.Sprintf("%s/api/collections/security_queue/records?filter=%s&perPage=100",
		q.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return fmt.Errorf("failed to fetch old items: %w", err)
	}
	defer resp.Body.Close()

	var response SecurityQueueResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return fmt.Errorf("failed to parse queue response: %w", err)
	}

	for _, item := range response.Items {
		deleteURL := fmt.Sprintf("%s/api/collections/security_queue/records/%s",
			q.pbClient.GetBaseURL(), item.ID)

		req, err := http.NewRequest("DELETE", deleteURL, nil)
		if err != nil {
			continue
		}

		deleteResp, err := q.pbClient.GetHTTPClient().Do(req)
		if err != nil {
			continue
		}
		deleteResp.Body.Close()
	}

	return nil
}

// IsProcessing checks if any scan is currently processing
func (q *SecurityQueue) IsProcessing() bool {
	current, err := q.GetCurrentProcessing()
	return err == nil && current != nil
}
