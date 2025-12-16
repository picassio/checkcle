package securityscanning

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"service-operation/pocketbase"
	"time"
)

// SecurityClient handles PocketBase operations for security scanning
type SecurityClient struct {
	pbClient *pocketbase.PocketBaseClient
}

// NewSecurityClient creates a new security client
func NewSecurityClient(pbClient *pocketbase.PocketBaseClient) *SecurityClient {
	return &SecurityClient{
		pbClient: pbClient,
	}
}

// GetActiveScans fetches all active security scans from PocketBase
func (c *SecurityClient) GetActiveScans() ([]SecurityScan, error) {
	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records?filter=%s",
		c.pbClient.GetBaseURL(),
		url.QueryEscape("(status='active')"))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch security scans: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch security scans, status: %d", resp.StatusCode)
	}

	var response SecurityScansResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse security scans response: %w", err)
	}

	return response.Items, nil
}

// GetAllScans fetches all security scans from PocketBase
func (c *SecurityClient) GetAllScans() ([]SecurityScan, error) {
	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records?perPage=500",
		c.pbClient.GetBaseURL())

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch security scans: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch security scans, status: %d", resp.StatusCode)
	}

	var response SecurityScansResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse security scans response: %w", err)
	}

	return response.Items, nil
}

// GetScan fetches a single security scan by ID
func (c *SecurityClient) GetScan(scanID string) (*SecurityScan, error) {
	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records/%s",
		c.pbClient.GetBaseURL(), scanID)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch security scan: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch security scan, status: %d", resp.StatusCode)
	}

	var scan SecurityScan
	if err := json.NewDecoder(resp.Body).Decode(&scan); err != nil {
		return nil, fmt.Errorf("failed to parse security scan: %w", err)
	}

	return &scan, nil
}

// CreateScan creates a new security scan
func (c *SecurityClient) CreateScan(scan *SecurityScan) (*SecurityScan, error) {
	data := map[string]interface{}{
		"name":            scan.Name,
		"target_url":      scan.TargetURL,
		"template_tags":   scan.TemplateTags,
		"exclude_tags":    scan.ExcludeTags,
		"severity_filter": scan.SeverityFilter,
		"scan_interval":   scan.ScanInterval,
		"status":          scan.Status,
		"notification_id": scan.NotificationID,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal scan data: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records", c.pbClient.GetBaseURL())

	req, err := http.NewRequest("POST", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create POST request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to create scan: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to create scan, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	var createdScan SecurityScan
	if err := json.NewDecoder(resp.Body).Decode(&createdScan); err != nil {
		return nil, fmt.Errorf("failed to parse created scan: %w", err)
	}

	return &createdScan, nil
}

// UpdateScan updates an existing security scan
func (c *SecurityClient) UpdateScan(scanID string, data map[string]interface{}) error {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal update data: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records/%s",
		c.pbClient.GetBaseURL(), scanID)

	req, err := http.NewRequest("PATCH", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create PATCH request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to update scan: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to update scan, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// UpdateScanStatus updates the status of a security scan
func (c *SecurityClient) UpdateScanStatus(scanID string, status string, lastScan, nextScan *time.Time) error {
	data := map[string]interface{}{
		"status": status,
	}

	if lastScan != nil {
		data["last_scan"] = lastScan.Format(time.RFC3339)
	}

	if nextScan != nil {
		data["next_scan"] = nextScan.Format(time.RFC3339)
	}

	return c.UpdateScan(scanID, data)
}

// UpdateScanFindings updates the findings count for a scan
func (c *SecurityClient) UpdateScanFindings(scanID string, findingsCount, criticalCount, highCount int) error {
	data := map[string]interface{}{
		"findings_count": findingsCount,
		"critical_count": criticalCount,
		"high_count":     highCount,
	}

	return c.UpdateScan(scanID, data)
}

// DeleteScan deletes a security scan
func (c *SecurityClient) DeleteScan(scanID string) error {
	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records/%s",
		c.pbClient.GetBaseURL(), scanID)

	req, err := http.NewRequest("DELETE", reqURL, nil)
	if err != nil {
		return fmt.Errorf("failed to create DELETE request: %w", err)
	}

	resp, err := c.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete scan: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("failed to delete scan, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

// GetScansDueForRun fetches scans that are due for execution
func (c *SecurityClient) GetScansDueForRun() ([]SecurityScan, error) {
	now := time.Now().Format(time.RFC3339)
	filter := fmt.Sprintf("(status='active' && scan_interval>0 && (next_scan='' || next_scan<='%s'))", now)

	reqURL := fmt.Sprintf("%s/api/collections/security_scans/records?filter=%s",
		c.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch scans due for run: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch scans due for run, status: %d", resp.StatusCode)
	}

	var response SecurityScansResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse scans response: %w", err)
	}

	return response.Items, nil
}

// SaveResult saves a security result to PocketBase
func (c *SecurityClient) SaveResult(result *SecurityResult) (string, error) {
	// Truncate raw_data if it's too large (PocketBase has 100KB limit)
	rawData := result.RawData
	if rawData != nil {
		rawDataBytes, _ := json.Marshal(rawData)
		if len(rawDataBytes) > 90000 { // Leave some margin under 100KB
			// Keep only essential fields and truncate large ones
			truncatedData := make(map[string]interface{})
			for key, value := range rawData {
				if strVal, ok := value.(string); ok && len(strVal) > 5000 {
					// Truncate large string values
					truncatedData[key] = strVal[:5000] + "... [truncated]"
				} else {
					truncatedData[key] = value
				}
			}
			// Check size again, if still too large, only keep minimal info
			truncatedBytes, _ := json.Marshal(truncatedData)
			if len(truncatedBytes) > 90000 {
				rawData = map[string]interface{}{
					"_note":       "Raw data truncated due to size limits",
					"template_id": rawData["template_id"],
					"type":        rawData["type"],
					"ip":          rawData["ip"],
				}
			} else {
				rawData = truncatedData
			}
		}
	}

	data := map[string]interface{}{
		"scan_id":           result.ScanID,
		"template_id":       result.TemplateID,
		"template_name":     result.TemplateName,
		"severity":          result.Severity,
		"host":              result.Host,
		"matched_url":       result.MatchedURL,
		"matched_at":        result.MatchedAt.Format(time.RFC3339),
		"description":       result.Description,
		"solution":          result.Solution,
		"cve_ids":           result.CVEIDs,
		"references":        result.References,
		"tags":              result.Tags,
		"curl_command":      result.CurlCommand,
		"extracted_results": result.ExtractedResults,
		"raw_data":          rawData,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("failed to marshal result: %w", err)
	}

	reqURL := fmt.Sprintf("%s/api/collections/security_results/records", c.pbClient.GetBaseURL())

	req, err := http.NewRequest("POST", reqURL, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create POST request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.pbClient.GetHTTPClient().Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to save result: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to save result, status: %d, response: %s", resp.StatusCode, string(bodyBytes))
	}

	var created struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&created); err != nil {
		return "", fmt.Errorf("failed to parse result response: %w", err)
	}

	return created.ID, nil
}

// GetResults fetches security results for a scan
func (c *SecurityClient) GetResults(scanID string) ([]SecurityResult, error) {
	filter := fmt.Sprintf("(scan_id='%s')", scanID)

	reqURL := fmt.Sprintf("%s/api/collections/security_results/records?filter=%s&sort=-created&perPage=500",
		c.pbClient.GetBaseURL(),
		url.QueryEscape(filter))

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch security results: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch security results, status: %d", resp.StatusCode)
	}

	var response SecurityResultsResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse security results response: %w", err)
	}

	return response.Items, nil
}

// GetResult fetches a single security result by ID
func (c *SecurityClient) GetResult(resultID string) (*SecurityResult, error) {
	reqURL := fmt.Sprintf("%s/api/collections/security_results/records/%s",
		c.pbClient.GetBaseURL(), resultID)

	resp, err := http.Get(reqURL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch security result: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch security result, status: %d", resp.StatusCode)
	}

	var result SecurityResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse security result: %w", err)
	}

	return &result, nil
}

// DeleteResultsByScan deletes all results for a scan
func (c *SecurityClient) DeleteResultsByScan(scanID string) error {
	results, err := c.GetResults(scanID)
	if err != nil {
		return err
	}

	for _, result := range results {
		reqURL := fmt.Sprintf("%s/api/collections/security_results/records/%s",
			c.pbClient.GetBaseURL(), result.ID)

		req, err := http.NewRequest("DELETE", reqURL, nil)
		if err != nil {
			continue
		}

		resp, err := c.pbClient.GetHTTPClient().Do(req)
		if err != nil {
			continue
		}
		resp.Body.Close()
	}

	return nil
}
