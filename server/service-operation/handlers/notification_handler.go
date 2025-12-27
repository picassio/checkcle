package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"service-operation/notification"
	"service-operation/pocketbase"
)

// TestNotificationRequest represents the request body for testing a notification
type TestNotificationRequest struct {
	NotificationID string `json:"notification_id"`
}

// TestNotificationResponse represents the response for a test notification
type TestNotificationResponse struct {
	Success     bool   `json:"success"`
	Message     string `json:"message,omitempty"`
	Error       string `json:"error,omitempty"`
	ChannelName string `json:"channel_name"`
	ChannelType string `json:"channel_type"`
}

// NotificationHandler handles notification-related HTTP requests
type NotificationHandler struct {
	pbClient            *pocketbase.PocketBaseClient
	notificationManager *notification.NotificationManager
}

// NewNotificationHandler creates a new notification handler
func NewNotificationHandler(pbClient *pocketbase.PocketBaseClient, notificationManager *notification.NotificationManager) *NotificationHandler {
	return &NotificationHandler{
		pbClient:            pbClient,
		notificationManager: notificationManager,
	}
}

// HandleTestNotification handles POST /notification/test
func (h *NotificationHandler) HandleTestNotification(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TestNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if req.NotificationID == "" {
		http.Error(w, "notification_id is required", http.StatusBadRequest)
		return
	}

	// Fetch alert configuration from PocketBase
	config, err := h.getAlertConfiguration(req.NotificationID)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(TestNotificationResponse{
			Success: false,
			Error:   "Notification channel not found: " + err.Error(),
		})
		return
	}

	// Check if notification manager is available
	if h.notificationManager == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		json.NewEncoder(w).Encode(TestNotificationResponse{
			Success:     false,
			Error:       "Notification service is not available",
			ChannelName: config.NotifyName,
			ChannelType: config.NotificationType,
		})
		return
	}

	// Check if notification type is webhook (not supported for testing)
	if config.NotificationType == "webhook" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(TestNotificationResponse{
			Success:     false,
			Error:       "Webhook channels cannot be tested directly",
			ChannelName: config.NotifyName,
			ChannelType: config.NotificationType,
		})
		return
	}

	// Generate test message
	testMessage := h.generateTestMessage(config)

	// Get the appropriate notification service
	services := h.notificationManager.GetServices()
	service, exists := services[config.NotificationType]
	if !exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(TestNotificationResponse{
			Success:     false,
			Error:       fmt.Sprintf("Unsupported notification type: %s", config.NotificationType),
			ChannelName: config.NotifyName,
			ChannelType: config.NotificationType,
		})
		return
	}

	// Send the test notification
	err = service.SendNotification(config, testMessage)

	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusOK) // Return 200 even for notification errors
		json.NewEncoder(w).Encode(TestNotificationResponse{
			Success:     false,
			Error:       err.Error(),
			ChannelName: config.NotifyName,
			ChannelType: config.NotificationType,
		})
		return
	}

	json.NewEncoder(w).Encode(TestNotificationResponse{
		Success:     true,
		Message:     "Test notification sent successfully",
		ChannelName: config.NotifyName,
		ChannelType: config.NotificationType,
	})
}

// getAlertConfiguration fetches alert configuration from PocketBase
func (h *NotificationHandler) getAlertConfiguration(notificationID string) (*notification.AlertConfiguration, error) {
	if h.pbClient == nil {
		return nil, fmt.Errorf("PocketBase client is not available")
	}

	url := fmt.Sprintf("%s/api/collections/alert_configurations/records/%s", h.pbClient.GetBaseURL(), notificationID)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to fetch alert configuration, status: %d, body: %s", resp.StatusCode, string(body))
	}

	var config notification.AlertConfiguration
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return nil, err
	}

	return &config, nil
}

// generateTestMessage creates a test notification message
func (h *NotificationHandler) generateTestMessage(config *notification.AlertConfiguration) string {
	timestamp := time.Now().Format("2006-01-02 15:04:05")

	return fmt.Sprintf(`Test Notification from CheckCle

This is a test notification to verify your %s notification channel "%s" is configured correctly.

If you received this message, your notification channel is working properly.

Sent at: %s`, config.NotificationType, config.NotifyName, timestamp)
}
