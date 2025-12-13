package performancemonitoring

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"service-operation/pocketbase"
)

// PerformanceNotifier handles budget alert notifications
type PerformanceNotifier struct {
	pbClient *pocketbase.PocketBaseClient
}

// NewPerformanceNotifier creates a new performance notifier
func NewPerformanceNotifier(pbClient *pocketbase.PocketBaseClient) *PerformanceNotifier {
	return &PerformanceNotifier{
		pbClient: pbClient,
	}
}

// AlertConfiguration represents notification settings
type AlertConfiguration struct {
	ID           string `json:"id"`
	ChannelType  string `json:"channel_type"`
	Token        string `json:"token"`
	ChatID       string `json:"chat_id"`
	WebhookURL   string `json:"webhook_url"`
	EmailFrom    string `json:"email_from"`
	EmailTo      string `json:"email_to"`
	SMTPHost     string `json:"smtp_host"`
	SMTPPort     int    `json:"smtp_port"`
	SMTPUsername string `json:"smtp_username"`
	SMTPPassword string `json:"smtp_password"`
}

// SendBudgetAlert sends a notification when budget limits are exceeded
func (pn *PerformanceNotifier) SendBudgetAlert(test PerformanceTest, metrics *PerformanceMetrics, failedBudgets []BudgetCheckResult) error {
	if test.NotificationID == "" {
		return nil
	}

	// Get alert configuration
	alertConfigs, err := pn.getAlertConfigurations(test.NotificationID)
	if err != nil {
		return fmt.Errorf("failed to get alert configurations: %w", err)
	}

	if len(alertConfigs) == 0 {
		log.Printf("[PERFORMANCE-NOTIFY] No alert configurations found for ID: %s", test.NotificationID)
		return nil
	}

	// Build message
	message := pn.buildAlertMessage(test, metrics, failedBudgets)

	// Send to all configured channels
	for _, config := range alertConfigs {
		var err error
		switch config.ChannelType {
		case "telegram":
			err = pn.sendTelegramAlert(config, message)
		case "discord":
			err = pn.sendDiscordAlert(config, message)
		case "slack":
			err = pn.sendSlackAlert(config, message)
		default:
			log.Printf("[PERFORMANCE-NOTIFY] Unsupported channel type: %s", config.ChannelType)
			continue
		}

		if err != nil {
			log.Printf("[PERFORMANCE-NOTIFY] Failed to send alert via %s: %v", config.ChannelType, err)
		} else {
			log.Printf("[PERFORMANCE-NOTIFY] Alert sent via %s for test: %s", config.ChannelType, test.Name)
		}
	}

	return nil
}

// getAlertConfigurations fetches notification configurations
func (pn *PerformanceNotifier) getAlertConfigurations(notificationID string) ([]AlertConfiguration, error) {
	// Parse comma-separated IDs
	ids := strings.Split(notificationID, ",")
	var configs []AlertConfiguration

	for _, id := range ids {
		id = strings.TrimSpace(id)
		if id == "" {
			continue
		}

		reqURL := fmt.Sprintf("%s/api/collections/alert_configurations/records/%s",
			pn.pbClient.GetBaseURL(), id)

		resp, err := http.Get(reqURL)
		if err != nil {
			log.Printf("[PERFORMANCE-NOTIFY] Warning: Failed to fetch config %s: %v", id, err)
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("[PERFORMANCE-NOTIFY] Warning: Failed to fetch config %s, status: %d", id, resp.StatusCode)
			continue
		}

		var config AlertConfiguration
		if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
			log.Printf("[PERFORMANCE-NOTIFY] Warning: Failed to parse config %s: %v", id, err)
			continue
		}

		configs = append(configs, config)
	}

	return configs, nil
}

// buildAlertMessage creates the alert message content
func (pn *PerformanceNotifier) buildAlertMessage(test PerformanceTest, metrics *PerformanceMetrics, failedBudgets []BudgetCheckResult) string {
	var sb strings.Builder

	sb.WriteString("🔴 *Performance Budget Exceeded*\n\n")
	sb.WriteString(fmt.Sprintf("*Test:* %s\n", test.Name))
	sb.WriteString(fmt.Sprintf("*URL:* %s\n", test.URL))
	sb.WriteString(fmt.Sprintf("*Time:* %s\n\n", metrics.Timestamp.Format("2006-01-02 15:04:05")))

	sb.WriteString("*Failed Budget Checks:*\n")
	for _, budget := range failedBudgets {
		emoji := pn.getSeverityEmoji(budget.Severity)
		sb.WriteString(fmt.Sprintf("%s %s: %.2f (limit: %.2f)\n",
			emoji, pn.formatMetricName(budget.Metric), budget.Value, budget.Limit))
	}

	sb.WriteString("\n*Current Metrics:*\n")
	sb.WriteString(fmt.Sprintf("• LCP: %.0fms %s\n", metrics.LCP, pn.getStatusIndicator("lcp", metrics.LCP)))
	sb.WriteString(fmt.Sprintf("• FCP: %.0fms %s\n", metrics.FCP, pn.getStatusIndicator("fcp", metrics.FCP)))
	sb.WriteString(fmt.Sprintf("• CLS: %.3f %s\n", metrics.CLS, pn.getStatusIndicator("cls", metrics.CLS)))
	sb.WriteString(fmt.Sprintf("• TBT: %.0fms %s\n", metrics.TBT, pn.getStatusIndicator("tbt", metrics.TBT)))
	sb.WriteString(fmt.Sprintf("• Speed Index: %.0fms\n", metrics.SpeedIndex))

	return sb.String()
}

// formatMetricName converts metric key to human-readable name
func (pn *PerformanceNotifier) formatMetricName(metric string) string {
	names := map[string]string{
		"lcp":           "Largest Contentful Paint",
		"fcp":           "First Contentful Paint",
		"cls":           "Cumulative Layout Shift",
		"tbt":           "Total Blocking Time",
		"ttfb":          "Time to First Byte",
		"speed_index":   "Speed Index",
		"requests":      "Total Requests",
		"transfer_size": "Transfer Size",
	}

	if name, ok := names[metric]; ok {
		return name
	}
	return metric
}

// getSeverityEmoji returns an emoji based on severity
func (pn *PerformanceNotifier) getSeverityEmoji(severity string) string {
	switch severity {
	case "good":
		return "🟢"
	case "needs-improvement":
		return "🟡"
	case "poor":
		return "🔴"
	default:
		return "⚪"
	}
}

// getStatusIndicator returns a status emoji based on metric value
func (pn *PerformanceNotifier) getStatusIndicator(metric string, value float64) string {
	checker := NewBudgetChecker()
	severity := checker.getSeverity(metric, value)
	return pn.getSeverityEmoji(severity)
}

// sendTelegramAlert sends an alert via Telegram
func (pn *PerformanceNotifier) sendTelegramAlert(config AlertConfiguration, message string) error {
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", config.Token)

	payload := map[string]interface{}{
		"chat_id":    config.ChatID,
		"text":       message,
		"parse_mode": "Markdown",
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API returned status: %d", resp.StatusCode)
	}

	return nil
}

// sendDiscordAlert sends an alert via Discord webhook
func (pn *PerformanceNotifier) sendDiscordAlert(config AlertConfiguration, message string) error {
	// Convert Markdown to Discord format
	discordMessage := strings.ReplaceAll(message, "*", "**")

	payload := map[string]interface{}{
		"content": discordMessage,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(config.WebhookURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("discord webhook returned status: %d", resp.StatusCode)
	}

	return nil
}

// sendSlackAlert sends an alert via Slack webhook
func (pn *PerformanceNotifier) sendSlackAlert(config AlertConfiguration, message string) error {
	payload := map[string]interface{}{
		"text": message,
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(config.WebhookURL, "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack webhook returned status: %d", resp.StatusCode)
	}

	return nil
}
