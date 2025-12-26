
package operations

import (
	"fmt"
	"net"
	"regexp"
	"time"

	"service-operation/types"
)

type TCPOperation struct {
	timeout         time.Duration
	allowPrivateIPs bool
}

func NewTCPOperation(timeout time.Duration) *TCPOperation {
	return &TCPOperation{timeout: timeout, allowPrivateIPs: true}
}

// NewTCPOperationWithConfig creates a TCP operation with SSRF protection settings
func NewTCPOperationWithConfig(timeout time.Duration, allowPrivateIPs bool) *TCPOperation {
	return &TCPOperation{timeout: timeout, allowPrivateIPs: allowPrivateIPs}
}

// validateTCPHost validates the host for TCP connections to prevent SSRF
func (t *TCPOperation) validateTCPHost(host string) error {
	if host == "" {
		return fmt.Errorf("host cannot be empty")
	}

	// Check length
	if len(host) > 253 {
		return fmt.Errorf("hostname is too long")
	}

	// Block dangerous characters that could be used for injection
	if matched, _ := regexp.MatchString(`[;&|$\x60\\]`, host); matched {
		return fmt.Errorf("invalid characters in hostname")
	}

	// Check if it's an IP address
	ip := net.ParseIP(host)
	if ip != nil {
		return t.validateIP(ip)
	}

	// Validate hostname format (RFC 1123)
	hostnamePattern := regexp.MustCompile(`^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$`)
	if !hostnamePattern.MatchString(host) {
		return fmt.Errorf("invalid hostname format")
	}

	// Resolve hostname and check all IPs
	ips, err := net.LookupIP(host)
	if err != nil {
		// Allow if DNS resolution fails - connection will fail anyway
		return nil
	}

	for _, resolvedIP := range ips {
		if err := t.validateIP(resolvedIP); err != nil {
			return fmt.Errorf("hostname resolves to blocked IP: %v", err)
		}
	}

	return nil
}

// validateIP checks if an IP is safe for TCP connections
func (t *TCPOperation) validateIP(ip net.IP) error {
	// Always block loopback
	if ip.IsLoopback() {
		return fmt.Errorf("loopback addresses are not allowed")
	}

	// Block link-local (includes cloud metadata endpoints)
	if ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() {
		return fmt.Errorf("link-local addresses are not allowed")
	}

	// Block unspecified
	if ip.IsUnspecified() {
		return fmt.Errorf("unspecified addresses are not allowed")
	}

	// Block cloud metadata endpoints
	metadataIPs := []string{
		"169.254.169.254", // AWS, GCP, Azure
		"169.254.170.2",   // AWS ECS
		"100.100.100.200", // Alibaba Cloud
	}
	for _, metaIP := range metadataIPs {
		if ip.String() == metaIP {
			return fmt.Errorf("cloud metadata addresses are not allowed")
		}
	}

	// Block private IPs if not allowed
	if !t.allowPrivateIPs && ip.IsPrivate() {
		return fmt.Errorf("private network addresses are not allowed")
	}

	return nil
}

func (t *TCPOperation) Execute(host string, port int) (*types.OperationResult, error) {
	result := &types.OperationResult{
		Type:      types.OperationTCP,
		Host:      host,
		Port:      port,
		StartTime: time.Now(),
	}

	// Validate host before connecting
	if err := t.validateTCPHost(host); err != nil {
		result.EndTime = time.Now()
		result.Error = fmt.Sprintf("Host validation failed: %v", err)
		result.TCPConnected = false
		result.Success = false
		result.Details = fmt.Sprintf("Connection blocked: %v", err)
		return result, nil
	}

	start := time.Now()

	address := fmt.Sprintf("%s:%d", host, port)
	conn, err := net.DialTimeout("tcp", address, t.timeout)
	
	result.ResponseTime = time.Since(start)
	result.EndTime = time.Now()

	if err != nil {
		result.Error = err.Error()
		result.TCPConnected = false
		result.Success = false
		result.Details = fmt.Sprintf("Failed to connect to %s:%d - %s", host, port, err.Error())
	} else {
		conn.Close()
		result.TCPConnected = true
		result.Success = true
		result.Details = fmt.Sprintf("Successfully connected to %s:%d", host, port)
	}

	return result, nil
}