package performancemonitoring

import (
	"fmt"
	"log"
	"sync"
	"time"

	"service-operation/pocketbase"
)

// PerformanceMonitor orchestrates performance testing using a queue system
type PerformanceMonitor struct {
	client          *PerformanceClient
	runner          *DockerRunner
	parser          *ResultParser
	budgetChecker   *BudgetChecker
	notifier        *PerformanceNotifier
	queueClient     *QueueClient
	checkInterval   time.Duration
	queueInterval   time.Duration // How often to check queue for processing
	stopChan        chan bool
	isRunning       bool
	currentItem     *QueueItem // Single item being processed
	currentMu       sync.Mutex
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(pbClient *pocketbase.PocketBaseClient) *PerformanceMonitor {
	client := NewPerformanceClient(pbClient)
	runner := NewDockerRunner()
	parser := NewResultParser()
	budgetChecker := NewBudgetChecker()
	notifier := NewPerformanceNotifier(pbClient)
	queueClient := NewQueueClient(pbClient)

	return &PerformanceMonitor{
		client:        client,
		runner:        runner,
		parser:        parser,
		budgetChecker: budgetChecker,
		notifier:      notifier,
		queueClient:   queueClient,
		checkInterval: 1 * time.Minute,  // Check for due tests every minute
		queueInterval: 30 * time.Second, // Check queue for processing every 30 seconds
		stopChan:      make(chan bool, 1),
		isRunning:     false,
		currentItem:   nil,
	}
}

// Start begins the performance monitoring service
func (pm *PerformanceMonitor) Start() {
	if pm.isRunning {
		return
	}

	pm.isRunning = true
	log.Printf("[PERFORMANCE] Starting performance monitoring service with queue system")

	// Reset any items stuck in processing state from previous run
	if err := pm.queueClient.ResetProcessingItemsOnStartup(); err != nil {
		log.Printf("[PERFORMANCE] Warning: Failed to reset stuck items: %v", err)
	}

	// Run initial check to enqueue due tests
	pm.checkAndEnqueueTests()

	// Set up periodic checking for due tests (enqueue them)
	schedulerTicker := time.NewTicker(pm.checkInterval)
	defer schedulerTicker.Stop()

	// Set up queue processing ticker (process one at a time)
	queueTicker := time.NewTicker(pm.queueInterval)
	defer queueTicker.Stop()

	// Clean up old results and queue items hourly
	cleanupTicker := time.NewTicker(1 * time.Hour)
	defer cleanupTicker.Stop()

	// Timeout stuck items every 5 minutes
	timeoutTicker := time.NewTicker(5 * time.Minute)
	defer timeoutTicker.Stop()

	for {
		select {
		case <-schedulerTicker.C:
			pm.checkAndEnqueueTests()
		case <-queueTicker.C:
			pm.processQueue()
		case <-cleanupTicker.C:
			pm.cleanupOldResults()
			pm.cleanupOldQueueItems()
		case <-timeoutTicker.C:
			pm.handleStuckItems()
		case <-pm.stopChan:
			log.Printf("[PERFORMANCE] Performance monitoring stopped")
			pm.isRunning = false
			return
		}
	}
}

// Stop gracefully stops the performance monitoring
func (pm *PerformanceMonitor) Stop() {
	log.Printf("[PERFORMANCE] Stopping performance monitoring...")
	select {
	case pm.stopChan <- true:
	default:
	}
}

// checkAndEnqueueTests checks for tests that are due and adds them to the queue
func (pm *PerformanceMonitor) checkAndEnqueueTests() {
	tests, err := pm.client.GetTestsDueForRun()
	if err != nil {
		log.Printf("[PERFORMANCE] Error fetching due tests: %v", err)
		return
	}

	if len(tests) == 0 {
		return
	}

	log.Printf("[PERFORMANCE] Found %d tests due for execution", len(tests))

	for _, test := range tests {
		// Skip if test is already queued or processing
		alreadyQueued, err := pm.queueClient.IsTestAlreadyQueued(test.ID)
		if err != nil {
			log.Printf("[PERFORMANCE] Error checking queue status for %s: %v", test.Name, err)
			continue
		}
		if alreadyQueued {
			log.Printf("[PERFORMANCE] Test %s already in queue, skipping", test.Name)
			continue
		}

		// Add to queue with scheduled priority
		if _, err := pm.queueClient.EnqueueTest(test.ID, PriorityScheduled, "scheduled"); err != nil {
			log.Printf("[PERFORMANCE] Error enqueueing test %s: %v", test.Name, err)
			continue
		}

		log.Printf("[PERFORMANCE] Enqueued test: %s", test.Name)
	}
}

// processQueue processes the next item in the queue (one at a time)
func (pm *PerformanceMonitor) processQueue() {
	pm.currentMu.Lock()
	if pm.currentItem != nil {
		pm.currentMu.Unlock()
		return // Already processing
	}
	pm.currentMu.Unlock()

	// Get next pending item
	item, err := pm.queueClient.GetNextPendingItem()
	if err != nil {
		log.Printf("[PERFORMANCE] Error fetching next queue item: %v", err)
		return
	}
	if item == nil {
		return // Nothing to process
	}

	// Get the test details
	test, err := pm.client.GetTest(item.TestID)
	if err != nil {
		log.Printf("[PERFORMANCE] Error fetching test %s: %v", item.TestID, err)
		pm.queueClient.FailItem(item.ID, fmt.Sprintf("test not found: %v", err))
		return
	}

	// Set as current item
	pm.currentMu.Lock()
	pm.currentItem = item
	pm.currentMu.Unlock()

	// Mark as processing
	if err := pm.queueClient.MarkItemProcessing(item.ID); err != nil {
		log.Printf("[PERFORMANCE] Error marking item as processing: %v", err)
	}

	log.Printf("[PERFORMANCE] Processing queue item for test: %s (source: %s, priority: %d)",
		test.Name, item.Source, item.Priority)

	// Run the test synchronously (blocking)
	metricsID, runErr := pm.runTestFromQueue(*test)

	// Update queue item based on result
	if runErr != nil {
		pm.queueClient.FailItem(item.ID, runErr.Error())
	} else {
		pm.queueClient.CompleteItem(item.ID, metricsID)
	}

	// Clear current item
	pm.currentMu.Lock()
	pm.currentItem = nil
	pm.currentMu.Unlock()
}

// runTestFromQueue executes a single performance test from the queue and returns metrics ID
func (pm *PerformanceMonitor) runTestFromQueue(test PerformanceTest) (string, error) {
	log.Printf("[PERFORMANCE] Starting test: %s (%s)", test.Name, test.URL)

	// Update status to running
	now := time.Now()
	if err := pm.client.UpdateTestStatus(test.ID, "running", nil, nil); err != nil {
		log.Printf("[PERFORMANCE] Error updating test status to running: %v", err)
	}

	// Get budget if configured
	var budget *PerformanceBudget
	if test.BudgetID != "" {
		var err error
		budget, err = pm.client.GetBudget(test.BudgetID)
		if err != nil {
			log.Printf("[PERFORMANCE] Warning: Failed to get budget: %v", err)
		}
	}

	// Run sitespeed.io test
	resultDir, err := pm.runner.RunSitespeed(test, budget)
	if err != nil {
		log.Printf("[PERFORMANCE] Test failed for %s: %v", test.Name, err)

		// Update status to error
		nextRun := pm.calculateNextRun(test)
		pm.client.UpdateTestStatus(test.ID, "error", &now, &nextRun)
		return "", fmt.Errorf("sitespeed.io run failed: %w", err)
	}

	// Parse results
	result, err := pm.parser.ParseResults(resultDir, test.URL)
	if err != nil {
		log.Printf("[PERFORMANCE] Failed to parse results for %s: %v", test.Name, err)

		// Update status to error
		nextRun := pm.calculateNextRun(test)
		pm.client.UpdateTestStatus(test.ID, "error", &now, &nextRun)
		return "", fmt.Errorf("failed to parse results: %w", err)
	}

	// Convert to metrics
	metrics := pm.parser.ConvertToMetrics(result, test.ID)
	metrics.Timestamp = now

	// Check budget
	if budget != nil {
		passed, budgetResults := pm.budgetChecker.CheckBudget(metrics, budget)
		metrics.BudgetPassed = passed
		metrics.BudgetResults = budgetResults

		// Send notification if budget exceeded
		if !passed && test.NotificationID != "" {
			failedBudgets := pm.budgetChecker.GetFailedBudgets(budgetResults)
			if err := pm.notifier.SendBudgetAlert(test, metrics, failedBudgets); err != nil {
				log.Printf("[PERFORMANCE] Failed to send budget alert: %v", err)
			}
		}
	} else {
		metrics.BudgetPassed = true
	}

	// Save metrics
	metricsID, err := pm.client.SaveMetricsWithID(metrics)
	if err != nil {
		log.Printf("[PERFORMANCE] Failed to save metrics for %s: %v", test.Name, err)
		return "", fmt.Errorf("failed to save metrics: %w", err)
	}

	// Calculate next run and update status
	nextRun := pm.calculateNextRun(test)
	if err := pm.client.UpdateTestStatus(test.ID, "active", &now, &nextRun); err != nil {
		log.Printf("[PERFORMANCE] Error updating test status: %v", err)
	}

	log.Printf("[PERFORMANCE] Test completed: %s - LCP: %.0fms, FCP: %.0fms, CLS: %.3f, SpeedIndex: %.0f",
		test.Name, metrics.LCP, metrics.FCP, metrics.CLS, metrics.SpeedIndex)

	return metricsID, nil
}

// RunTestNow adds a test to the queue with high priority (for "Run Now" API calls)
// Returns the queue item instead of waiting for completion
func (pm *PerformanceMonitor) RunTestNow(testID string) (*QueueItem, error) {
	// Check if test exists
	test, err := pm.client.GetTest(testID)
	if err != nil {
		return nil, err
	}

	// Check if already queued
	alreadyQueued, err := pm.queueClient.IsTestAlreadyQueued(testID)
	if err != nil {
		return nil, fmt.Errorf("failed to check queue status: %w", err)
	}
	if alreadyQueued {
		return nil, ErrTestAlreadyQueued
	}

	log.Printf("[PERFORMANCE] Adding test to queue with high priority: %s", test.Name)

	// Add to queue with manual (high) priority
	item, err := pm.queueClient.EnqueueTest(testID, PriorityManual, "manual")
	if err != nil {
		return nil, fmt.Errorf("failed to enqueue test: %w", err)
	}

	return item, nil
}

// GetQueueStatus returns the current queue status
func (pm *PerformanceMonitor) GetQueueStatus() (*QueueStatus, error) {
	return pm.queueClient.GetQueueStatus()
}

// GetQueuePositionForTest returns the queue position for a specific test
func (pm *PerformanceMonitor) GetQueuePositionForTest(testID string) (int, error) {
	return pm.queueClient.GetQueuePositionForTest(testID)
}

// CancelQueueItem cancels a pending queue item
func (pm *PerformanceMonitor) CancelQueueItem(itemID string) error {
	// Get the item first to check status
	item, err := pm.queueClient.GetQueueItemByID(itemID)
	if err != nil {
		return err
	}

	if item.Status != "pending" {
		return ErrCannotCancelNonPending
	}

	return pm.queueClient.CancelPendingItem(itemID)
}

// GetQueueClient returns the queue client for external use
func (pm *PerformanceMonitor) GetQueueClient() *QueueClient {
	return pm.queueClient
}

// calculateNextRun calculates the next scheduled run time
func (pm *PerformanceMonitor) calculateNextRun(test PerformanceTest) time.Time {
	interval := test.ScheduleInterval
	if interval < 3600 {
		interval = 3600 // Minimum 1 hour
	}
	return time.Now().Add(time.Duration(interval) * time.Second)
}

// cleanupOldResults removes old result directories
func (pm *PerformanceMonitor) cleanupOldResults() {
	log.Printf("[PERFORMANCE] Running cleanup of old results...")
	if err := pm.runner.CleanupOldResults(7 * 24 * time.Hour); err != nil {
		log.Printf("[PERFORMANCE] Error during cleanup: %v", err)
	}
}

// cleanupOldQueueItems removes old completed/failed queue items
func (pm *PerformanceMonitor) cleanupOldQueueItems() {
	log.Printf("[PERFORMANCE] Running cleanup of old queue items...")
	if err := pm.queueClient.CleanupOldQueueItems(7 * 24 * time.Hour); err != nil {
		log.Printf("[PERFORMANCE] Error during queue cleanup: %v", err)
	}
}

// handleStuckItems marks items stuck in processing as timeout
func (pm *PerformanceMonitor) handleStuckItems() {
	// Mark items stuck for more than 15 minutes as timeout
	if err := pm.queueClient.ResetStuckProcessingItems(15 * time.Minute); err != nil {
		log.Printf("[PERFORMANCE] Error handling stuck items: %v", err)
	}
}

// GetRunner returns the Docker runner (for API use)
func (pm *PerformanceMonitor) GetRunner() *DockerRunner {
	return pm.runner
}

// IsProcessing returns whether a test is currently being processed
func (pm *PerformanceMonitor) IsProcessing() bool {
	pm.currentMu.Lock()
	defer pm.currentMu.Unlock()
	return pm.currentItem != nil
}

// GetCurrentItem returns the currently processing queue item (or nil)
func (pm *PerformanceMonitor) GetCurrentItem() *QueueItem {
	pm.currentMu.Lock()
	defer pm.currentMu.Unlock()
	return pm.currentItem
}

// Custom error types
type Error string

func (e Error) Error() string { return string(e) }

const (
	ErrTestAlreadyRunning     = Error("test is already running")
	ErrTestAlreadyQueued      = Error("test is already queued")
	ErrTestNotFound           = Error("test not found")
	ErrCannotCancelNonPending = Error("can only cancel pending items")
)
