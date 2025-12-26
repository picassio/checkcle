package middleware

import (
	"fmt"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
)

// MaxRequestBodySize is the maximum allowed request body size (1MB)
const MaxRequestBodySize = 1 * 1024 * 1024

// LimitRequestBody wraps the request body with a size limiter
// to prevent DoS attacks via large request bodies
func LimitRequestBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, MaxRequestBodySize)
		next.ServeHTTP(w, r)
	})
}

// SSRFValidator validates URLs to prevent Server-Side Request Forgery
type SSRFValidator struct {
	allowPrivateIPs bool
}

// NewSSRFValidator creates a new SSRF validator
func NewSSRFValidator(allowPrivateIPs bool) *SSRFValidator {
	return &SSRFValidator{
		allowPrivateIPs: allowPrivateIPs,
	}
}

// ValidateURL checks if a URL is safe to request
func (v *SSRFValidator) ValidateURL(rawURL string) error {
	// Parse the URL
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Only allow http and https schemes
	scheme := strings.ToLower(parsedURL.Scheme)
	if scheme != "http" && scheme != "https" {
		return fmt.Errorf("only http and https schemes are allowed")
	}

	// Get the hostname
	hostname := parsedURL.Hostname()
	if hostname == "" {
		return fmt.Errorf("hostname is required")
	}

	// Block localhost and variations
	lowerHost := strings.ToLower(hostname)
	blockedHosts := []string{
		"localhost",
		"127.0.0.1",
		"0.0.0.0",
		"::1",
		"[::1]",
		"0",
		"0x7f000001",
		"2130706433", // Decimal for 127.0.0.1
	}
	for _, blocked := range blockedHosts {
		if lowerHost == blocked {
			return fmt.Errorf("localhost addresses are not allowed")
		}
	}

	// Check if it's an IP address
	ip := net.ParseIP(hostname)
	if ip != nil {
		if err := v.validateIP(ip); err != nil {
			return err
		}
	} else {
		// It's a hostname, resolve it and check all IPs
		ips, err := net.LookupIP(hostname)
		if err != nil {
			// Allow if DNS resolution fails - the actual request will fail anyway
			return nil
		}

		for _, resolvedIP := range ips {
			if err := v.validateIP(resolvedIP); err != nil {
				return fmt.Errorf("hostname resolves to blocked IP: %w", err)
			}
		}
	}

	return nil
}

// validateIP checks if an IP address is safe to request
func (v *SSRFValidator) validateIP(ip net.IP) error {
	// Always block loopback
	if ip.IsLoopback() {
		return fmt.Errorf("loopback addresses are not allowed")
	}

	// Block link-local (169.254.x.x) - includes AWS metadata endpoint
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return fmt.Errorf("link-local addresses are not allowed")
	}

	// Block unspecified (0.0.0.0, ::)
	if ip.IsUnspecified() {
		return fmt.Errorf("unspecified addresses are not allowed")
	}

	// Block cloud metadata endpoints specifically
	metadataIPs := []string{
		"169.254.169.254", // AWS, GCP, Azure metadata
		"169.254.170.2",   // AWS ECS metadata
		"100.100.100.200", // Alibaba Cloud metadata
		"192.0.0.192",     // Oracle Cloud metadata
	}
	for _, metaIP := range metadataIPs {
		if ip.String() == metaIP {
			return fmt.Errorf("cloud metadata addresses are not allowed")
		}
	}

	// Block private IPs if not allowed
	if !v.allowPrivateIPs {
		if ip.IsPrivate() {
			return fmt.Errorf("private network addresses are not allowed")
		}
	}

	return nil
}

// SanitizeFilterValue escapes special characters in PocketBase filter values
// to prevent filter injection attacks
func SanitizeFilterValue(value string) string {
	if value == "" {
		return value
	}

	// Escape single quotes by doubling them (PocketBase uses single quotes)
	value = strings.ReplaceAll(value, "'", "''")

	// Remove or escape other potentially dangerous characters
	value = strings.ReplaceAll(value, "\\", "\\\\")

	return value
}

// ValidateID checks if a value is a valid PocketBase ID format
// PocketBase IDs are 15 characters alphanumeric
func ValidateID(id string) bool {
	if id == "" {
		return false
	}

	// PocketBase IDs are typically 15 alphanumeric characters
	// But we'll be more lenient and allow 1-50 alphanumeric characters
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9]{1,50}$`, id)
	return matched
}

// ValidateHostname checks if a string is a valid hostname or IP address
func ValidateHostname(host string) error {
	if host == "" {
		return fmt.Errorf("hostname cannot be empty")
	}

	// Check length
	if len(host) > 253 {
		return fmt.Errorf("hostname is too long (max 253 characters)")
	}

	// Check if it's a valid IP address
	if ip := net.ParseIP(host); ip != nil {
		return nil
	}

	// Validate hostname format
	// RFC 1123 hostname pattern
	hostnamePattern := `^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$`
	matched, _ := regexp.MatchString(hostnamePattern, host)
	if !matched {
		return fmt.Errorf("invalid hostname format")
	}

	return nil
}

// SanitizeUserAgent removes potentially dangerous characters from user agent strings
func SanitizeUserAgent(userAgent string) string {
	if userAgent == "" {
		return userAgent
	}

	// Limit length
	if len(userAgent) > 512 {
		userAgent = userAgent[:512]
	}

	// Remove control characters and newlines (prevent header injection)
	var builder strings.Builder
	for _, r := range userAgent {
		// Only allow printable ASCII characters (32-126)
		if r >= 32 && r <= 126 {
			builder.WriteRune(r)
		}
	}

	return builder.String()
}

// ValidatePathComponent checks if a path component is safe
// (no directory traversal, no special characters)
func ValidatePathComponent(component string) error {
	if component == "" {
		return fmt.Errorf("path component cannot be empty")
	}

	// Check for directory traversal
	if component == ".." || component == "." {
		return fmt.Errorf("directory traversal not allowed")
	}

	if strings.Contains(component, "..") {
		return fmt.Errorf("directory traversal not allowed")
	}

	if strings.Contains(component, "/") || strings.Contains(component, "\\") {
		return fmt.Errorf("path separators not allowed in component")
	}

	// Only allow alphanumeric, dash, underscore, and dot
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9._-]+$`, component)
	if !matched {
		return fmt.Errorf("invalid characters in path component")
	}

	return nil
}
