package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// AuthMiddleware validates PocketBase authentication tokens
type AuthMiddleware struct {
	pbURL      string
	httpClient *http.Client
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(pocketbaseURL string) *AuthMiddleware {
	return &AuthMiddleware{
		pbURL: pocketbaseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Authenticate wraps an http.Handler with authentication
func (a *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for public endpoints (static report files)
		if strings.HasPrefix(r.URL.Path, "/performance/report/") {
			next.ServeHTTP(w, r)
			return
		}

		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, `{"error": "Missing Authorization header"}`, http.StatusUnauthorized)
			return
		}

		// Expect "Bearer <token>" format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, `{"error": "Invalid Authorization header format. Expected 'Bearer <token>'"}`, http.StatusUnauthorized)
			return
		}

		token := parts[1]
		if token == "" {
			http.Error(w, `{"error": "Empty token"}`, http.StatusUnauthorized)
			return
		}

		// Validate token against PocketBase
		valid, err := a.validateToken(token)
		if err != nil {
			// Security: Don't expose internal error details to client
			http.Error(w, `{"error": "Authentication service unavailable"}`, http.StatusServiceUnavailable)
			return
		}

		if !valid {
			http.Error(w, `{"error": "Invalid or expired token"}`, http.StatusUnauthorized)
			return
		}

		// Token is valid, proceed to next handler
		next.ServeHTTP(w, r)
	})
}

// validateToken checks if the token is valid by calling PocketBase auth-refresh
func (a *AuthMiddleware) validateToken(token string) (bool, error) {
	if a.pbURL == "" {
		// If PocketBase URL is not configured, skip authentication
		// This allows the service to run in standalone mode for development
		return true, nil
	}

	// Try to validate against users collection first
	if valid, _ := a.validateTokenAgainstCollection(token, "users"); valid {
		return true, nil
	}

	// Try superusers collection
	if valid, _ := a.validateTokenAgainstCollection(token, "_superusers"); valid {
		return true, nil
	}

	return false, nil
}

// validateTokenAgainstCollection validates token against a specific collection
func (a *AuthMiddleware) validateTokenAgainstCollection(token, collection string) (bool, error) {
	// Use auth-refresh endpoint to validate the token
	reqURL := fmt.Sprintf("%s/api/collections/%s/auth-refresh", a.pbURL, collection)

	req, err := http.NewRequest("POST", reqURL, nil)
	if err != nil {
		return false, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	// If we get 200, the token is valid
	if resp.StatusCode == http.StatusOK {
		return true, nil
	}

	// Read error response for debugging
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return false, nil
	}

	return false, fmt.Errorf("unexpected response: %d - %s", resp.StatusCode, string(body))
}

// AuthenticateFunc wraps an http.HandlerFunc with authentication
func (a *AuthMiddleware) AuthenticateFunc(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		a.Authenticate(http.HandlerFunc(next)).ServeHTTP(w, r)
	}
}

// PocketBaseAuthResponse represents PocketBase auth response structure
type PocketBaseAuthResponse struct {
	Token  string          `json:"token"`
	Record json.RawMessage `json:"record"`
}
