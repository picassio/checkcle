
package operations

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"service-operation/middleware"
	"service-operation/types"
)

// MaxResponseBodySize limits response body to 10MB to prevent memory exhaustion
const MaxResponseBodySize = 10 * 1024 * 1024

type HTTPOperation struct {
	timeout         time.Duration
	client          *http.Client
	ssrfValidator   *middleware.SSRFValidator
	allowPrivateIPs bool
}

func NewHTTPOperation(timeout time.Duration) *HTTPOperation {
	return NewHTTPOperationWithSSRF(timeout, true) // Default allow private IPs for internal monitoring
}

func NewHTTPOperationWithSSRF(timeout time.Duration, allowPrivateIPs bool) *HTTPOperation {
	return &HTTPOperation{
		timeout:         timeout,
		client:          &http.Client{Timeout: timeout},
		ssrfValidator:   middleware.NewSSRFValidator(allowPrivateIPs),
		allowPrivateIPs: allowPrivateIPs,
	}
}

func (h *HTTPOperation) Execute(url, method string) (*types.OperationResult, error) {
	result := &types.OperationResult{
		Type:       types.OperationHTTP,
		StartTime:  time.Now(),
		HTTPMethod: method,
	}

	// Default to GET if no method specified
	if method == "" {
		method = "GET"
		result.HTTPMethod = "GET"
	}

	// Ensure URL has protocol
	if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
		url = "https://" + url
	}

	// SSRF Protection: Validate URL before making request
	if err := h.ssrfValidator.ValidateURL(url); err != nil {
		result.Error = fmt.Sprintf("URL validation failed: %v", err)
		result.Success = false
		result.EndTime = time.Now()
		return result, nil
	}

	start := time.Now()

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		result.Error = fmt.Sprintf("Failed to create request: %v", err)
		result.Success = false
		result.EndTime = time.Now()
		return result, nil
	}

	// Set a user agent
	req.Header.Set("User-Agent", "ServiceOperation/1.0")

	resp, err := h.client.Do(req)
	
	result.ResponseTime = time.Since(start)
	result.EndTime = time.Now()

	if err != nil {
		// More detailed error messages
		if strings.Contains(err.Error(), "timeout") {
			result.Error = fmt.Sprintf("🕐 Request timeout after %.2fs - Server did not respond within the expected time", h.timeout.Seconds())
		} else if strings.Contains(err.Error(), "connection refused") {
			result.Error = "🚫 Connection refused - Server is not accepting connections on this port"
		} else if strings.Contains(err.Error(), "no such host") {
			result.Error = "🌐 DNS resolution failed - Host not found"
		} else if strings.Contains(err.Error(), "certificate") {
			result.Error = "🔒 SSL/TLS certificate error - Certificate verification failed"
		} else {
			result.Error = fmt.Sprintf("🔌 Connection error: %v", err)
		}
		result.Success = false
		return result, nil
	}
	defer resp.Body.Close()

	result.HTTPStatusCode = resp.StatusCode
	result.ContentLength = resp.ContentLength
	result.Success = resp.StatusCode >= 200 && resp.StatusCode < 400

	// Capture important headers
	result.HTTPHeaders = make(map[string]string)
	for key, values := range resp.Header {
		if len(values) > 0 {
			switch strings.ToLower(key) {
			case "content-type", "server", "cache-control", "content-encoding", "x-powered-by":
				result.HTTPHeaders[key] = values[0]
			}
		}
	}

	// Read response body for keyword checking and additional details
	// Use LimitReader to prevent memory exhaustion from large responses
	limitedReader := io.LimitReader(resp.Body, MaxResponseBodySize)
	body, err := io.ReadAll(limitedReader)
	if err == nil && len(body) > 0 {
		result.ResponseBody = string(body)
		// Update content length if not set by server
		if result.ContentLength <= 0 {
			result.ContentLength = int64(len(body))
		}
		// Indicate if response was truncated
		if int64(len(body)) >= MaxResponseBodySize {
			result.ResponseBody = result.ResponseBody + "\n... [Response truncated at 10MB]"
		}
	}

	// Create detailed status message with emoji
	if !result.Success {
		switch {
		case resp.StatusCode >= 500:
			result.Error = fmt.Sprintf("🔥 Server Error (HTTP %d): %s - The server encountered an internal error", resp.StatusCode, resp.Status)
		case resp.StatusCode >= 400:
			result.Error = fmt.Sprintf("❌ Client Error (HTTP %d): %s - The request was invalid or unauthorized", resp.StatusCode, resp.Status)
		case resp.StatusCode >= 300:
			result.Error = fmt.Sprintf("↩️ Redirect (HTTP %d): %s - Resource has moved", resp.StatusCode, resp.Status)
		default:
			result.Error = fmt.Sprintf("⚠️ Unexpected Status (HTTP %d): %s", resp.StatusCode, resp.Status)
		}
	} else {
		// Success message with emoji
		switch resp.StatusCode {
		case 200:
			result.Error = "✅ OK - Request successful"
		case 201:
			result.Error = "🆕 Created - Resource created successfully"
		case 202:
			result.Error = "⏳ Accepted - Request accepted for processing"
		case 204:
			result.Error = "📭 No Content - Request successful, no content returned"
		default:
			result.Error = fmt.Sprintf("✅ Success (HTTP %d): %s", resp.StatusCode, resp.Status)
		}
	}

	return result, nil
}