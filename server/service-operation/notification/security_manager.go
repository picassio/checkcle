package notification

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"service-operation/pocketbase"
)

// SecurityNotificationTemplate represents a security notification template
type SecurityNotificationTemplate struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Critical string `json:"critical"`
	High     string `json:"high"`
	Medium   string `json:"medium"`
	Low      string `json:"low"`
	Info     string `json:"info"`
}

// SecurityFinding represents a vulnerability finding for notification
type SecurityFinding struct {
	ScanName     string
	TargetURL    string
	TemplateID   string
	TemplateName string
	Severity     string
	Host         string
	MatchedURL   string
	Description  string
	Solution     string
	CVEIDs       []string
	Timestamp    time.Time
}

// SecurityNotificationManager handles security vulnerability notifications
type SecurityNotificationManager struct {
	pbClient *pocketbase.PocketBaseClient
	services map[string]NotificationService
}

// NewSecurityNotificationManager creates a new security notification manager
func NewSecurityNotificationManager(pbClient *pocketbase.PocketBaseClient, services map[string]NotificationService) *SecurityNotificationManager {
	return &SecurityNotificationManager{
		pbClient: pbClient,
		services: services,
	}
}

// SendSecurityNotification sends notification for a security vulnerability finding
func (snm *SecurityNotificationManager) SendSecurityNotification(finding *SecurityFinding, notificationID, templateID string) error {
	if notificationID == "" {
		return fmt.Errorf("notification ID required for security finding: %s", finding.TemplateName)
	}

	// Parse notification IDs
	notificationIDs := parseNotificationIDs(notificationID)
	if len(notificationIDs) == 0 {
		return fmt.Errorf("no valid notification IDs for security finding: %s", finding.TemplateName)
	}

	var errors []string
	successCount := 0

	// Send to each notification channel
	for _, id := range notificationIDs {
		// Check if enabled
		if !isNotificationEnabled(snm.pbClient, id) {
			continue
		}

		// Get alert configuration
		alertConfig, err := getAlertConfiguration(snm.pbClient, id)
		if err != nil {
			errors = append(errors, fmt.Sprintf("config error %s: %v", id, err))
			continue
		}

		// Get security template
		var securityTemplate *SecurityNotificationTemplate
		if templateID != "" {
			securityTemplate, err = snm.getSecurityNotificationTemplate(templateID)
			if err != nil {
				// Use default template if not found
				_ = err
			}
		}

		// Generate message
		message := snm.generateSecurityMessage(finding, securityTemplate)

		// Get notification service
		service, exists := snm.services[alertConfig.NotificationType]
		if !exists {
			errors = append(errors, fmt.Sprintf("unsupported type %s", alertConfig.NotificationType))
			continue
		}

		// Send notification
		err = service.SendNotification(alertConfig, message)
		if err != nil {
			errors = append(errors, fmt.Sprintf("send failed %s: %v", alertConfig.NotificationType, err))
		} else {
			successCount++
		}
	}

	if len(errors) > 0 && successCount == 0 {
		return fmt.Errorf("all security notifications failed for %s: %v", finding.TemplateName, errors)
	}

	return nil
}

// SendSecuritySummary sends a summary notification for multiple findings
func (snm *SecurityNotificationManager) SendSecuritySummary(scanName, targetURL string, findings []*SecurityFinding, notificationID string) error {
	if notificationID == "" || len(findings) == 0 {
		return nil
	}

	// Count findings by severity
	severityCounts := make(map[string]int)
	for _, f := range findings {
		severityCounts[strings.ToLower(f.Severity)]++
	}

	// Parse notification IDs
	notificationIDs := parseNotificationIDs(notificationID)
	if len(notificationIDs) == 0 {
		return nil
	}

	var errors []string
	successCount := 0

	// Build summary message
	message := snm.generateSummaryMessage(scanName, targetURL, severityCounts, len(findings))

	for _, id := range notificationIDs {
		if !isNotificationEnabled(snm.pbClient, id) {
			continue
		}

		alertConfig, err := getAlertConfiguration(snm.pbClient, id)
		if err != nil {
			errors = append(errors, fmt.Sprintf("config error %s: %v", id, err))
			continue
		}

		service, exists := snm.services[alertConfig.NotificationType]
		if !exists {
			errors = append(errors, fmt.Sprintf("unsupported type %s", alertConfig.NotificationType))
			continue
		}

		err = service.SendNotification(alertConfig, message)
		if err != nil {
			errors = append(errors, fmt.Sprintf("send failed %s: %v", alertConfig.NotificationType, err))
		} else {
			successCount++
		}
	}

	if len(errors) > 0 && successCount == 0 {
		return fmt.Errorf("all security summary notifications failed: %v", errors)
	}

	return nil
}

// getSecurityNotificationTemplate fetches security notification template from PocketBase
func (snm *SecurityNotificationManager) getSecurityNotificationTemplate(templateID string) (*SecurityNotificationTemplate, error) {
	url := fmt.Sprintf("%s/api/collections/security_notification_templates/records/%s", snm.pbClient.GetBaseURL(), templateID)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch security notification template, status: %d", resp.StatusCode)
	}

	var template SecurityNotificationTemplate
	if err := json.NewDecoder(resp.Body).Decode(&template); err != nil {
		return nil, err
	}

	return &template, nil
}

// generateSecurityMessage creates notification message for security findings
func (snm *SecurityNotificationManager) generateSecurityMessage(finding *SecurityFinding, template *SecurityNotificationTemplate) string {
	var baseMessage string

	// Use template if available
	if template != nil {
		switch strings.ToLower(finding.Severity) {
		case "critical":
			baseMessage = template.Critical
		case "high":
			baseMessage = template.High
		case "medium":
			baseMessage = template.Medium
		case "low":
			baseMessage = template.Low
		case "info":
			baseMessage = template.Info
		default:
			baseMessage = template.High
		}
	}

	// Use default if no template or template message is empty
	if baseMessage == "" {
		baseMessage = snm.getDefaultSecurityMessage(finding)
	}

	// Replace placeholders
	message := snm.replaceSecurityPlaceholders(baseMessage, finding)

	return message
}

// replaceSecurityPlaceholders replaces all placeholders in the security message
func (snm *SecurityNotificationManager) replaceSecurityPlaceholders(message string, finding *SecurityFinding) string {
	// Security specific placeholders
	message = strings.ReplaceAll(message, "${scan_name}", snm.safeString(finding.ScanName))
	message = strings.ReplaceAll(message, "${target_url}", snm.safeString(finding.TargetURL))
	message = strings.ReplaceAll(message, "${template_id}", snm.safeString(finding.TemplateID))
	message = strings.ReplaceAll(message, "${template_name}", snm.safeString(finding.TemplateName))
	message = strings.ReplaceAll(message, "${severity}", strings.ToUpper(finding.Severity))
	message = strings.ReplaceAll(message, "${host}", snm.safeString(finding.Host))
	message = strings.ReplaceAll(message, "${matched_url}", snm.safeString(finding.MatchedURL))
	message = strings.ReplaceAll(message, "${description}", snm.safeString(finding.Description))
	message = strings.ReplaceAll(message, "${solution}", snm.safeString(finding.Solution))

	// CVE IDs
	cveStr := "N/A"
	if len(finding.CVEIDs) > 0 {
		cveStr = strings.Join(finding.CVEIDs, ", ")
	}
	message = strings.ReplaceAll(message, "${cve_ids}", cveStr)

	// Time placeholders
	message = strings.ReplaceAll(message, "${timestamp}", finding.Timestamp.Format("2006-01-02 15:04:05"))
	message = strings.ReplaceAll(message, "${time}", finding.Timestamp.Format("15:04:05"))
	message = strings.ReplaceAll(message, "${date}", finding.Timestamp.Format("2006-01-02"))

	return message
}

// safeString returns the string value or "N/A" if empty
func (snm *SecurityNotificationManager) safeString(value string) string {
	if value == "" {
		return "N/A"
	}
	return value
}

// getDefaultSecurityMessage provides a default notification message for security findings
func (snm *SecurityNotificationManager) getDefaultSecurityMessage(finding *SecurityFinding) string {
	severityEmoji := "🔵"
	switch strings.ToLower(finding.Severity) {
	case "critical":
		severityEmoji = "🚨"
	case "high":
		severityEmoji = "🟠"
	case "medium":
		severityEmoji = "🟡"
	case "low":
		severityEmoji = "🔵"
	case "info":
		severityEmoji = "⚪"
	}

	message := fmt.Sprintf("%s [%s] Security Vulnerability Found\n", severityEmoji, strings.ToUpper(finding.Severity))
	message += fmt.Sprintf("• Scan: %s\n", finding.ScanName)
	message += fmt.Sprintf("• Target: %s\n", finding.TargetURL)
	message += fmt.Sprintf("• Finding: %s\n", finding.TemplateName)

	if finding.Host != "" {
		message += fmt.Sprintf("• Host: %s\n", finding.Host)
	}

	if finding.MatchedURL != "" && finding.MatchedURL != finding.TargetURL {
		message += fmt.Sprintf("• Matched URL: %s\n", finding.MatchedURL)
	}

	if len(finding.CVEIDs) > 0 {
		message += fmt.Sprintf("• CVEs: %s\n", strings.Join(finding.CVEIDs, ", "))
	}

	if finding.Description != "" {
		desc := finding.Description
		if len(desc) > 200 {
			desc = desc[:200] + "..."
		}
		message += fmt.Sprintf("• Description: %s\n", desc)
	}

	if finding.Solution != "" {
		sol := finding.Solution
		if len(sol) > 150 {
			sol = sol[:150] + "..."
		}
		message += fmt.Sprintf("• Solution: %s\n", sol)
	}

	message += fmt.Sprintf("• Time: %s", finding.Timestamp.Format("2006-01-02 15:04:05"))

	return message
}

// generateSummaryMessage creates a summary notification message
func (snm *SecurityNotificationManager) generateSummaryMessage(scanName, targetURL string, severityCounts map[string]int, total int) string {
	message := fmt.Sprintf("🛡️ Security Scan Complete: %s\n", scanName)
	message += fmt.Sprintf("• Target: %s\n", targetURL)
	message += fmt.Sprintf("• Total Findings: %d\n\n", total)

	if severityCounts["critical"] > 0 {
		message += fmt.Sprintf("🚨 Critical: %d\n", severityCounts["critical"])
	}
	if severityCounts["high"] > 0 {
		message += fmt.Sprintf("🟠 High: %d\n", severityCounts["high"])
	}
	if severityCounts["medium"] > 0 {
		message += fmt.Sprintf("🟡 Medium: %d\n", severityCounts["medium"])
	}
	if severityCounts["low"] > 0 {
		message += fmt.Sprintf("🔵 Low: %d\n", severityCounts["low"])
	}
	if severityCounts["info"] > 0 {
		message += fmt.Sprintf("⚪ Info: %d\n", severityCounts["info"])
	}

	message += fmt.Sprintf("\n🕐 Time: %s", time.Now().Format("2006-01-02 15:04:05"))

	return message
}
