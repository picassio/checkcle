package performancemonitoring

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"service-operation/pocketbase"
)

// Queue priority constants
const (
	PriorityManual    = 1  // "Run Now" requests (highest priority)
	PriorityScheduled = 10 // Scheduled runs (lower priority)
)

// QueueItem represents a single item in the performance test queue
type QueueItem struct {
	ID          string `json:"id"`
	TestID      string `json:"test_id"`
	Status      string `json:"status"`   // pending, processing, completed, failed, cancelled, timeout
	Priority    int    `json:"priority"` // 1 = highest, 10 = lowest
	Source      string `json:"source"`   // scheduled, manual
	QueuedAt    string `json:"queued_at"`
	StartedAt   string `json:"started_at,omitempty"`
	CompletedAt string `json:"completed_at,omitempty"`
	Error       string `json:"error,omitempty"`
	MetricsID   string `json:"metrics_id,omitempty"`
	Created     string `json:"created,omitempty"`
	Updated     string `json:"updated,omitempty"`
}

// QueueStatus represents the current state of the queue
type QueueStatus struct {
	CurrentlyRunning *QueueItem  `json:"currently_running"`
	PendingItems     []QueueItem `json:"pending_items"`
	TotalPending     int         `json:"total_pending"`
}

// QueueItemResponse represents the PocketBase response for queue items
type QueueItemResponse struct {
	Page       int         `json:"page"`
	PerPage    int         `json:"perPage"`
	TotalItems int         `json:"totalItems"`
	TotalPages int         `json:"totalPages"`
	Items      []QueueItem `json:"items"`
}

// QueueClient handles queue operations with PocketBase
type QueueClient struct {
	pbClient *pocketbase.PocketBaseClient
}

// NewQueueClient creates a new queue client
func NewQueueClient(pbClient *pocketbase.PocketBaseClient) *QueueClient {
	return &QueueClient{
		pbClient: pbClient,
	}
}

// EnqueueTest adds a test to the queue
func (qc *QueueClient) EnqueueTest(testID string, priority int, source string) (*QueueItem, error) {
	now := time.Now()
	data := map[string]interface{}{
		"test_id":   testID,
		"status":    "pending",
		"priority":  priority,
		"source":    source,
		"queued_at": now.Format(time.RFC3339),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal queue item: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records", qc.pbClient.GetBaseURL())

	req, err := http.NewRequest("POST", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create POST request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := qc.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to enqueue test: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to enqueue test, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	var item QueueItem
	if err := json.NewDecoder(resp.Body).Decode(&item); err != nil {
		return nil, fmt.Errorf("failed to parse enqueue response: %w", err)
	}

	return &item, nil
}

// GetNextPendingItem fetches the next item to process (ordered by priority ASC, queued_at ASC)
func (qc *QueueClient) GetNextPendingItem() (*QueueItem, error) {
	filter := "(status='pending')"
	sort := "priority,queued_at"

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&sort=%s&perPage=1",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(filter),
		url.QueryEscape(sort))

	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create GET request: %w", err)
	}

	resp, err := qc.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch next pending item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch next pending item, status: %d", resp.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse queue response: %w", err)
	}

	if len(response.Items) == 0 {
		return nil, nil
	}

	return &response.Items[0], nil
}

// MarkItemProcessing updates the queue item status to processing
func (qc *QueueClient) MarkItemProcessing(itemID string) error {
	now := time.Now()
	data := map[string]interface{}{
		"status":     "processing",
		"started_at": now.Format(time.RFC3339),
	}

	return qc.updateQueueItem(itemID, data)
}

// CompleteItem marks the queue item as completed with the metrics ID
func (qc *QueueClient) CompleteItem(itemID, metricsID string) error {
	now := time.Now()
	data := map[string]interface{}{
		"status":       "completed",
		"completed_at": now.Format(time.RFC3339),
		"metrics_id":   metricsID,
	}

	return qc.updateQueueItem(itemID, data)
}

// FailItem marks the queue item as failed with an error message
func (qc *QueueClient) FailItem(itemID, errorMsg string) error {
	now := time.Now()
	data := map[string]interface{}{
		"status":       "failed",
		"completed_at": now.Format(time.RFC3339),
		"error":        errorMsg,
	}

	return qc.updateQueueItem(itemID, data)
}

// CancelPendingItem cancels a pending queue item
func (qc *QueueClient) CancelPendingItem(itemID string) error {
	now := time.Now()
	data := map[string]interface{}{
		"status":       "cancelled",
		"completed_at": now.Format(time.RFC3339),
	}

	return qc.updateQueueItem(itemID, data)
}

// TimeoutItem marks a stuck item as timed out
func (qc *QueueClient) TimeoutItem(itemID string) error {
	now := time.Now()
	data := map[string]interface{}{
		"status":       "timeout",
		"completed_at": now.Format(time.RFC3339),
		"error":        "test execution timed out",
	}

	return qc.updateQueueItem(itemID, data)
}

// updateQueueItem is a helper to update queue item fields
func (qc *QueueClient) updateQueueItem(itemID string, data map[string]interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal update data: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records/%s",
		qc.pbClient.GetBaseURL(), itemID)

	req, err := http.NewRequest("PATCH", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create PATCH request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := qc.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to update queue item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update queue item, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// doGet is a helper to perform authenticated GET requests
func (qc *QueueClient) doGet(reqURL string) (*http.Response, error) {
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, err
	}
	return qc.pbClient.GetHTTPClient().Do(req)
}

// IsTestAlreadyQueued checks if a test is already pending or processing in the queue
func (qc *QueueClient) IsTestAlreadyQueued(testID string) (bool, error) {
	filter := fmt.Sprintf("(test_id='%s' && (status='pending' || status='processing'))", testID)

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=1",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := qc.doGet(reqURL)
	if err != nil {
		return false, fmt.Errorf("failed to check queued status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return false, fmt.Errorf("failed to check queued status, status: %d", resp.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return false, fmt.Errorf("failed to parse queue response: %w", err)
	}

	return response.TotalItems > 0, nil
}

// GetQueueStatus returns the current queue status
func (qc *QueueClient) GetQueueStatus() (*QueueStatus, error) {
	status := &QueueStatus{}

	// Get currently processing item
	processingFilter := "(status='processing')"
	processingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=1",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(processingFilter))

	resp, err := qc.doGet(processingURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch processing item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var response QueueItemResponse
		if err := json.NewDecoder(resp.Body).Decode(&response); err == nil && len(response.Items) > 0 {
			status.CurrentlyRunning = &response.Items[0]
		}
	}

	// Get pending items
	pendingFilter := "(status='pending')"
	pendingSort := "priority,queued_at"
	pendingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&sort=%s&perPage=50",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(pendingFilter),
		url.QueryEscape(pendingSort))

	resp2, err := qc.doGet(pendingURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pending items: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode == http.StatusOK {
		var response QueueItemResponse
		if err := json.NewDecoder(resp2.Body).Decode(&response); err == nil {
			status.PendingItems = response.Items
			status.TotalPending = response.TotalItems
		}
	}

	return status, nil
}

// GetQueuePositionForTest returns the position in queue for a specific test (1-based, 0 if not in queue)
func (qc *QueueClient) GetQueuePositionForTest(testID string) (int, error) {
	// First check if the test is currently processing
	processingFilter := fmt.Sprintf("(test_id='%s' && status='processing')", testID)
	processingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=1",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(processingFilter))

	resp, err := qc.doGet(processingURL)
	if err != nil {
		return 0, fmt.Errorf("failed to check processing status: %w", err)
	}
	resp.Body.Close()

	// Get all pending items ordered by priority
	pendingFilter := "(status='pending')"
	pendingSort := "priority,queued_at"
	pendingURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&sort=%s&perPage=100",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(pendingFilter),
		url.QueryEscape(pendingSort))

	resp2, err := qc.doGet(pendingURL)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch pending items: %w", err)
	}
	defer resp2.Body.Close()

	if resp2.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("failed to fetch pending items, status: %d", resp2.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp2.Body).Decode(&response); err != nil {
		return 0, fmt.Errorf("failed to parse queue response: %w", err)
	}

	// Find position of the test
	for i, item := range response.Items {
		if item.TestID == testID {
			return i + 1, nil // 1-based position
		}
	}

	return 0, nil // Not in queue
}

// GetQueueItemByID fetches a specific queue item by ID
func (qc *QueueClient) GetQueueItemByID(itemID string) (*QueueItem, error) {
	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records/%s",
		qc.pbClient.GetBaseURL(), itemID)

	resp, err := qc.doGet(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch queue item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("queue item not found, status: %d", resp.StatusCode)
	}

	var item QueueItem
	if err := json.NewDecoder(resp.Body).Decode(&item); err != nil {
		return nil, fmt.Errorf("failed to parse queue item: %w", err)
	}

	return &item, nil
}

// GetPendingItemForTest gets the pending queue item for a specific test
func (qc *QueueClient) GetPendingItemForTest(testID string) (*QueueItem, error) {
	filter := fmt.Sprintf("(test_id='%s' && status='pending')", testID)

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=1",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := qc.doGet(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pending item: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch pending item, status: %d", resp.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse queue response: %w", err)
	}

	if len(response.Items) == 0 {
		return nil, nil
	}

	return &response.Items[0], nil
}

// CleanupOldQueueItems removes completed/failed/cancelled items older than the specified duration
func (qc *QueueClient) CleanupOldQueueItems(maxAge time.Duration) error {
	cutoff := time.Now().Add(-maxAge).Format(time.RFC3339)
	filter := fmt.Sprintf("((status='completed' || status='failed' || status='cancelled' || status='timeout') && completed_at<'%s')", cutoff)

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=100",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := qc.doGet(reqURL)
	if err != nil {
		return fmt.Errorf("failed to fetch old queue items: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch old queue items, status: %d", resp.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return fmt.Errorf("failed to parse queue response: %w", err)
	}

	// Delete each old item
	for _, item := range response.Items {
		deleteURL := fmt.Sprintf("%s/api/collections/performance_queue/records/%s",
			qc.pbClient.GetBaseURL(), item.ID)

		req, err := http.NewRequest("DELETE", deleteURL, nil)
		if err != nil {
			continue
		}

		resp, err := qc.pbClient.GetHTTPClient().Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()
	}

	return nil
}

// ResetStuckProcessingItems marks items stuck in processing state as timeout
func (qc *QueueClient) ResetStuckProcessingItems(maxProcessingTime time.Duration) error {
	cutoff := time.Now().Add(-maxProcessingTime).Format(time.RFC3339)
	filter := fmt.Sprintf("(status='processing' && started_at<'%s')", cutoff)

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=100",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := qc.doGet(reqURL)
	if err != nil {
		return fmt.Errorf("failed to fetch stuck items: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch stuck items, status: %d", resp.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return fmt.Errorf("failed to parse queue response: %w", err)
	}

	// Mark each stuck item as timeout
	for _, item := range response.Items {
		if err := qc.TimeoutItem(item.ID); err != nil {
			continue // Log error but continue with others
		}
	}

	return nil
}

// ResetProcessingItemsOnStartup resets any items stuck in processing state on service restart
func (qc *QueueClient) ResetProcessingItemsOnStartup() error {
	filter := "(status='processing')"

	reqURL := fmt.Sprintf("%s/api/collections/performance_queue/records?filter=%s&perPage=100",
		qc.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := qc.doGet(reqURL)
	if err != nil {
		return fmt.Errorf("failed to fetch processing items: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch processing items, status: %d", resp.StatusCode)
	}

	var response QueueItemResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return fmt.Errorf("failed to parse queue response: %w", err)
	}

	// Reset each processing item back to pending
	for _, item := range response.Items {
		data := map[string]interface{}{
			"status":     "pending",
			"started_at": nil,
		}
		if err := qc.updateQueueItem(item.ID, data); err != nil {
			continue // Log error but continue with others
		}
	}

	return nil
}
