package securityscanning

import (
	"log"
	"os"
	"service-operation/notification"
	"service-operation/pocketbase"
	"sync"
	"time"
)

// SecurityMonitor orchestrates security scanning operations
type SecurityMonitor struct {
	client                      *SecurityClient
	queue                       *SecurityQueue
	runner                      *NucleiRunner
	notificationManager         *notification.NotificationManager
	securityNotificationManager *notification.SecurityNotificationManager
	stopChan                    chan bool
	wg                          sync.WaitGroup
	processing                  bool
	processingMux               sync.Mutex
}

// NewSecurityMonitor creates a new security monitor
func NewSecurityMonitor(pbClient *pocketbase.PocketBaseClient, notificationManager *notification.NotificationManager) *SecurityMonitor {
	resultsDir := os.Getenv("NUCLEI_RESULTS_DIR")
	if resultsDir == "" {
		resultsDir = "/opt/nuclei-results"
	}

	// Ensure results directory exists
	if err := os.MkdirAll(resultsDir, 0755); err != nil {
		log.Printf("[SecurityMonitor] Warning: Failed to create results directory: %v", err)
	}

	// Get notification services from the notification manager
	var secNotificationManager *notification.SecurityNotificationManager
	if notificationManager != nil {
		secNotificationManager = notification.NewSecurityNotificationManager(pbClient, notificationManager.GetServices())
	}

	return &SecurityMonitor{
		client:                      NewSecurityClient(pbClient),
		queue:                       NewSecurityQueue(pbClient),
		runner:                      NewNucleiRunner(resultsDir),
		notificationManager:         notificationManager,
		securityNotificationManager: secNotificationManager,
		stopChan:                    make(chan bool),
	}
}

// Start begins the security monitoring service
func (m *SecurityMonitor) Start() {
	log.Printf("[SecurityMonitor] Starting security scanning service...")

	// Check nuclei installation
	if err := m.runner.CheckNucleiInstallation(); err != nil {
		log.Printf("[SecurityMonitor] Warning: %v", err)
	}

	// Start the queue processor
	m.wg.Add(1)
	go m.processQueue()

	// Start the scheduler
	m.wg.Add(1)
	go m.scheduleScans()

	// Start cleanup routine
	m.wg.Add(1)
	go m.cleanupRoutine()

	log.Printf("[SecurityMonitor] Security scanning service started")
}

// Stop stops the security monitoring service
func (m *SecurityMonitor) Stop() {
	log.Printf("[SecurityMonitor] Stopping security scanning service...")
	close(m.stopChan)
	m.wg.Wait()
	log.Printf("[SecurityMonitor] Security scanning service stopped")
}

// processQueue continuously processes queue items
func (m *SecurityMonitor) processQueue() {
	defer m.wg.Done()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			m.processNextItem()
		}
	}
}

// processNextItem processes the next item in the queue
func (m *SecurityMonitor) processNextItem() {
	m.processingMux.Lock()
	if m.processing {
		m.processingMux.Unlock()
		return
	}
	m.processing = true
	m.processingMux.Unlock()

	defer func() {
		m.processingMux.Lock()
		m.processing = false
		m.processingMux.Unlock()
	}()

	// Get next pending item
	item, err := m.queue.GetNextPending()
	if err != nil {
		log.Printf("[SecurityMonitor] Error getting next queue item: %v", err)
		return
	}

	if item == nil {
		return
	}

	// Get the scan details
	scan, err := m.client.GetScan(item.ScanID)
	if err != nil {
		log.Printf("[SecurityMonitor] Error getting scan %s: %v", item.ScanID, err)
		m.queue.UpdateStatus(item.ID, "failed", err.Error())
		return
	}

	// Update queue item to processing
	if err := m.queue.UpdateStatus(item.ID, "processing", ""); err != nil {
		log.Printf("[SecurityMonitor] Error updating queue status: %v", err)
		return
	}

	// Update scan status to running
	m.client.UpdateScanStatus(scan.ID, "running", nil, nil)

	// Execute the scan with metadata
	startTime := time.Now()
	results, metadata, err := m.runner.ExecuteScanWithMetadata(*scan)
	duration := time.Since(startTime)

	if err != nil {
		log.Printf("[SecurityMonitor] Scan failed for %s: %v", scan.Name, err)
		m.queue.UpdateStatus(item.ID, "failed", err.Error())
		m.client.UpdateScanStatus(scan.ID, "error", &startTime, nil)
		return
	}

	// Save results with queue_id to link them to this specific run
	severityCounts := SeverityCount{}
	for i := range results {
		results[i].QueueID = item.ID // Link result to this specific scan run
		_, saveErr := m.client.SaveResult(&results[i])
		if saveErr != nil {
			log.Printf("[SecurityMonitor] Error saving result: %v", saveErr)
			continue
		}

		// Count by severity
		switch results[i].Severity {
		case "critical":
			severityCounts.Critical++
		case "high":
			severityCounts.High++
		case "medium":
			severityCounts.Medium++
		case "low":
			severityCounts.Low++
		case "info":
			severityCounts.Info++
		default:
			severityCounts.Unknown++
		}
	}

	// Update queue item with status and metadata
	m.queue.UpdateStatus(item.ID, "completed", "")
	m.queue.UpdateFindingsCount(item.ID, len(results))
	if metadata != nil {
		if err := m.queue.UpdateScanMetadata(item.ID, metadata); err != nil {
			log.Printf("[SecurityMonitor] Error updating scan metadata: %v", err)
		}
	}

	// Calculate next scan time
	var nextScan *time.Time
	if scan.ScanInterval > 0 {
		next := time.Now().Add(time.Duration(scan.ScanInterval) * time.Second)
		nextScan = &next
	}

	// Update scan with results
	m.client.UpdateScanStatus(scan.ID, "active", &startTime, nextScan)
	m.client.UpdateScanFindings(scan.ID, len(results), severityCounts.Critical, severityCounts.High)

	log.Printf("[SecurityMonitor] Scan completed for %s: %d findings (critical: %d, high: %d) in %v",
		scan.Name, len(results), severityCounts.Critical, severityCounts.High, duration)

	// Send notifications for critical/high findings
	if severityCounts.Critical > 0 || severityCounts.High > 0 {
		m.sendNotifications(scan, results, severityCounts)
	}
}

// scheduleScans adds due scans to the queue
func (m *SecurityMonitor) scheduleScans() {
	defer m.wg.Done()

	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			m.addDueScansToQueue()
		}
	}
}

// addDueScansToQueue finds scans that are due and adds them to the queue
func (m *SecurityMonitor) addDueScansToQueue() {
	scans, err := m.client.GetScansDueForRun()
	if err != nil {
		log.Printf("[SecurityMonitor] Error getting scans due for run: %v", err)
		return
	}

	for _, scan := range scans {
		_, err := m.queue.AddToQueue(scan.ID, "scheduled", 50)
		if err != nil {
			log.Printf("[SecurityMonitor] Error adding scan %s to queue: %v", scan.ID, err)
			continue
		}
		log.Printf("[SecurityMonitor] Added scheduled scan %s to queue", scan.Name)
	}
}

// cleanupRoutine periodically cleans up old queue items
func (m *SecurityMonitor) cleanupRoutine() {
	defer m.wg.Done()

	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			if err := m.queue.CleanupOldItems(7 * 24 * time.Hour); err != nil {
				log.Printf("[SecurityMonitor] Error cleaning up old queue items: %v", err)
			}
		}
	}
}

// sendNotifications sends alerts for critical/high findings
func (m *SecurityMonitor) sendNotifications(scan *SecurityScan, results []SecurityResult, counts SeverityCount) {
	if m.securityNotificationManager == nil || scan.NotificationID == "" {
		return
	}

	// Filter critical and high findings
	var criticalHighResults []SecurityResult
	for _, r := range results {
		if r.Severity == "critical" || r.Severity == "high" {
			criticalHighResults = append(criticalHighResults, r)
		}
	}

	if len(criticalHighResults) == 0 {
		return
	}

	// Convert results to security findings for notification
	var findings []*notification.SecurityFinding
	for _, r := range criticalHighResults {
		finding := &notification.SecurityFinding{
			ScanName:     scan.Name,
			TargetURL:    scan.TargetURL,
			TemplateID:   r.TemplateID,
			TemplateName: r.TemplateName,
			Severity:     r.Severity,
			Host:         r.Host,
			MatchedURL:   r.MatchedURL,
			Description:  r.Description,
			Solution:     r.Solution,
			CVEIDs:       r.CVEIDs,
			Timestamp:    time.Now(),
		}
		findings = append(findings, finding)
	}

	// Send summary notification
	if err := m.securityNotificationManager.SendSecuritySummary(
		scan.Name,
		scan.TargetURL,
		findings,
		scan.NotificationID,
	); err != nil {
		log.Printf("[SecurityMonitor] Failed to send security summary notification: %v", err)
	} else {
		log.Printf("[SecurityMonitor] Security notification sent for scan %s", scan.Name)
	}
}

// RunScanNow triggers an immediate scan
func (m *SecurityMonitor) RunScanNow(scanID string) (*SecurityQueueItem, error) {
	// Verify scan exists
	_, err := m.client.GetScan(scanID)
	if err != nil {
		return nil, err
	}

	// Add to queue with high priority
	return m.queue.AddToQueue(scanID, "manual", 100)
}

// GetClient returns the security client
func (m *SecurityMonitor) GetClient() *SecurityClient {
	return m.client
}

// GetQueue returns the security queue
func (m *SecurityMonitor) GetQueue() *SecurityQueue {
	return m.queue
}

// GetRunner returns the nuclei runner
func (m *SecurityMonitor) GetRunner() *NucleiRunner {
	return m.runner
}
