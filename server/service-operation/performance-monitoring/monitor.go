package performancemonitoring

import (
	"log"
	"sync"
	"time"

	"service-operation/pocketbase"
)

// PerformanceMonitor orchestrates performance testing
type PerformanceMonitor struct {
	client         *PerformanceClient
	runner         *DockerRunner
	parser         *ResultParser
	budgetChecker  *BudgetChecker
	notifier       *PerformanceNotifier
	checkInterval  time.Duration
	stopChan       chan bool
	isRunning      bool
	runningTests   map[string]bool
	runningMu      sync.Mutex
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(pbClient *pocketbase.PocketBaseClient) *PerformanceMonitor {
	client := NewPerformanceClient(pbClient)
	runner := NewDockerRunner()
	parser := NewResultParser()
	budgetChecker := NewBudgetChecker()
	notifier := NewPerformanceNotifier(pbClient)

	return &PerformanceMonitor{
		client:        client,
		runner:        runner,
		parser:        parser,
		budgetChecker: budgetChecker,
		notifier:      notifier,
		checkInterval: 1 * time.Minute, // Check for due tests every minute
		stopChan:      make(chan bool, 1),
		isRunning:     false,
		runningTests:  make(map[string]bool),
	}
}

// Start begins the performance monitoring service
func (pm *PerformanceMonitor) Start() {
	if pm.isRunning {
		return
	}

	pm.isRunning = true
	log.Printf("[PERFORMANCE] Starting performance monitoring service")

	// Run initial check
	pm.checkAndRunTests()

	// Set up periodic checking
	ticker := time.NewTicker(pm.checkInterval)
	defer ticker.Stop()

	// Clean up old results daily
	cleanupTicker := time.NewTicker(24 * time.Hour)
	defer cleanupTicker.Stop()

	for {
		select {
		case <-ticker.C:
			pm.checkAndRunTests()
		case <-cleanupTicker.C:
			pm.cleanupOldResults()
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

// checkAndRunTests checks for tests that are due and runs them
func (pm *PerformanceMonitor) checkAndRunTests() {
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
		// Skip if test is already running
		pm.runningMu.Lock()
		if pm.runningTests[test.ID] {
			pm.runningMu.Unlock()
			continue
		}
		pm.runningTests[test.ID] = true
		pm.runningMu.Unlock()

		// Run test in goroutine
		go pm.runTest(test)
	}
}

// runTest executes a single performance test
func (pm *PerformanceMonitor) runTest(test PerformanceTest) {
	defer func() {
		pm.runningMu.Lock()
		delete(pm.runningTests, test.ID)
		pm.runningMu.Unlock()
	}()

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
		return
	}

	// Parse results
	result, err := pm.parser.ParseResults(resultDir, test.URL)
	if err != nil {
		log.Printf("[PERFORMANCE] Failed to parse results for %s: %v", test.Name, err)

		// Update status to error
		nextRun := pm.calculateNextRun(test)
		pm.client.UpdateTestStatus(test.ID, "error", &now, &nextRun)
		return
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
	if err := pm.client.SaveMetrics(metrics); err != nil {
		log.Printf("[PERFORMANCE] Failed to save metrics for %s: %v", test.Name, err)
	}

	// Calculate next run and update status
	nextRun := pm.calculateNextRun(test)
	if err := pm.client.UpdateTestStatus(test.ID, "active", &now, &nextRun); err != nil {
		log.Printf("[PERFORMANCE] Error updating test status: %v", err)
	}

	log.Printf("[PERFORMANCE] Test completed: %s - LCP: %.0fms, FCP: %.0fms, CLS: %.3f, SpeedIndex: %.0f",
		test.Name, metrics.LCP, metrics.FCP, metrics.CLS, metrics.SpeedIndex)
}

// RunTestNow immediately runs a specific test (for API calls)
func (pm *PerformanceMonitor) RunTestNow(testID string) (*PerformanceMetrics, error) {
	test, err := pm.client.GetTest(testID)
	if err != nil {
		return nil, err
	}

	// Check if already running
	pm.runningMu.Lock()
	if pm.runningTests[test.ID] {
		pm.runningMu.Unlock()
		return nil, ErrTestAlreadyRunning
	}
	pm.runningTests[test.ID] = true
	pm.runningMu.Unlock()

	defer func() {
		pm.runningMu.Lock()
		delete(pm.runningTests, test.ID)
		pm.runningMu.Unlock()
	}()

	log.Printf("[PERFORMANCE] Running test on demand: %s", test.Name)

	// Update status to running
	now := time.Now()
	pm.client.UpdateTestStatus(test.ID, "running", nil, nil)

	// Get budget
	var budget *PerformanceBudget
	if test.BudgetID != "" {
		budget, _ = pm.client.GetBudget(test.BudgetID)
	}

	// Run test
	resultDir, err := pm.runner.RunSitespeed(*test, budget)
	if err != nil {
		nextRun := pm.calculateNextRun(*test)
		pm.client.UpdateTestStatus(test.ID, "error", &now, &nextRun)
		return nil, err
	}

	// Parse results
	result, err := pm.parser.ParseResults(resultDir, test.URL)
	if err != nil {
		nextRun := pm.calculateNextRun(*test)
		pm.client.UpdateTestStatus(test.ID, "error", &now, &nextRun)
		return nil, err
	}

	// Convert to metrics
	metrics := pm.parser.ConvertToMetrics(result, test.ID)
	metrics.Timestamp = now

	// Check budget
	if budget != nil {
		passed, budgetResults := pm.budgetChecker.CheckBudget(metrics, budget)
		metrics.BudgetPassed = passed
		metrics.BudgetResults = budgetResults
	} else {
		metrics.BudgetPassed = true
	}

	// Save metrics
	pm.client.SaveMetrics(metrics)

	// Update status
	nextRun := pm.calculateNextRun(*test)
	pm.client.UpdateTestStatus(test.ID, "active", &now, &nextRun)

	return metrics, nil
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

// GetRunner returns the Docker runner (for API use)
func (pm *PerformanceMonitor) GetRunner() *DockerRunner {
	return pm.runner
}

// Custom error types
type Error string

func (e Error) Error() string { return string(e) }

const (
	ErrTestAlreadyRunning = Error("test is already running")
	ErrTestNotFound       = Error("test not found")
)
