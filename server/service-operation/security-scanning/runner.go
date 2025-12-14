package securityscanning

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// Default user-agent to mimic a real browser (Chrome on Windows)
const DefaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// NucleiRunner handles nuclei scan execution
type NucleiRunner struct {
	resultsDir    string
	templatesDir  string
	useDocker     bool
	katanaEnabled bool
	mu            sync.Mutex
}

// NewNucleiRunner creates a new nuclei runner
func NewNucleiRunner(resultsDir string) *NucleiRunner {
	// Check if nuclei is installed locally
	_, err := exec.LookPath("nuclei")
	useDocker := err != nil

	// Check if katana is installed
	_, katanaErr := exec.LookPath("katana")
	katanaEnabled := katanaErr == nil

	templatesDir := os.Getenv("NUCLEI_TEMPLATES_DIR")
	if templatesDir == "" {
		templatesDir = filepath.Join(os.Getenv("HOME"), "nuclei-templates")
	}

	if katanaEnabled {
		log.Printf("[SecurityScanning] Katana crawler is available for deep scanning")
	}

	return &NucleiRunner{
		resultsDir:    resultsDir,
		templatesDir:  templatesDir,
		useDocker:     useDocker,
		katanaEnabled: katanaEnabled,
	}
}

// ExecuteScan runs a nuclei scan and returns the results
func (r *NucleiRunner) ExecuteScan(scan SecurityScan) ([]SecurityResult, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Create output directory for this scan
	timestamp := time.Now().Format("20060102-150405")
	outputDir := filepath.Join(r.resultsDir, scan.ID, timestamp)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	outputFile := filepath.Join(outputDir, "results.jsonl")
	urlsFile := filepath.Join(outputDir, "urls.txt")

	// Determine targets based on scan mode
	targets := []string{scan.TargetURL}

	// If crawl is enabled and katana is available, crawl first
	if scan.CrawlEnabled && r.katanaEnabled {
		log.Printf("[SecurityScanning] Starting Katana crawl for %s", scan.TargetURL)
		crawledURLs, err := r.runKatanaCrawl(scan, outputDir)
		if err != nil {
			log.Printf("[SecurityScanning] Katana crawl failed: %v, falling back to single URL", err)
		} else if len(crawledURLs) > 0 {
			targets = crawledURLs
			log.Printf("[SecurityScanning] Katana discovered %d URLs", len(targets))
		}
	}

	// Write targets to file for nuclei
	if len(targets) > 1 {
		if err := r.writeURLsToFile(targets, urlsFile); err != nil {
			return nil, fmt.Errorf("failed to write URLs file: %w", err)
		}
	}

	// Build command arguments
	var args []string
	if r.useDocker {
		args = r.buildDockerArgs(scan, outputFile, outputDir)
	} else {
		if len(targets) > 1 {
			args = r.buildLocalArgsWithList(scan, outputFile, urlsFile)
		} else {
			args = r.buildLocalArgs(scan, outputFile)
		}
	}

	scanMode := scan.ScanMode
	if scanMode == "" {
		scanMode = "single"
	}
	log.Printf("[SecurityScanning] Running nuclei scan for %s: %s (mode: %s, targets: %d)", scan.Name, scan.TargetURL, scanMode, len(targets))
	log.Printf("[SecurityScanning] Command: %s %s", r.getExecutable(), strings.Join(args, " "))

	// Execute the scan
	var cmd *exec.Cmd
	if r.useDocker {
		cmd = exec.Command("docker", args...)
	} else {
		cmd = exec.Command("nuclei", args...)
	}

	// Capture output for debugging
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	startTime := time.Now()
	err := cmd.Run()
	duration := time.Since(startTime)

	log.Printf("[SecurityScanning] Scan completed in %v", duration)

	if err != nil {
		// Nuclei may return non-zero exit code even on success (e.g., no findings)
		// Check if output file was created
		if _, statErr := os.Stat(outputFile); os.IsNotExist(statErr) {
			return nil, fmt.Errorf("nuclei scan failed: %w", err)
		}
		log.Printf("[SecurityScanning] Nuclei exited with error (may be normal): %v", err)
	}

	// Parse results
	results, err := r.parseResults(outputFile, scan.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to parse results: %w", err)
	}

	log.Printf("[SecurityScanning] Found %d vulnerabilities for %s", len(results), scan.Name)

	return results, nil
}

// getUserAgent returns the user-agent to use for scanning
func (r *NucleiRunner) getUserAgent(scan SecurityScan) string {
	if scan.UserAgent != "" {
		return scan.UserAgent
	}
	return DefaultUserAgent
}

// runKatanaCrawl runs Katana to crawl URLs before scanning
func (r *NucleiRunner) runKatanaCrawl(scan SecurityScan, outputDir string) ([]string, error) {
	crawlOutputFile := filepath.Join(outputDir, "crawled_urls.txt")

	// Build katana arguments
	args := []string{
		"-u", scan.TargetURL,
		"-o", crawlOutputFile,
		"-silent",
		"-no-color",
	}

	// Add user-agent header
	userAgent := r.getUserAgent(scan)
	args = append(args, "-H", fmt.Sprintf("User-Agent: %s", userAgent))

	// Set crawl depth (default 3)
	depth := scan.CrawlDepth
	if depth <= 0 {
		depth = 3
	}
	args = append(args, "-d", fmt.Sprintf("%d", depth))

	// Set max pages (default 100)
	maxPages := scan.CrawlMaxPages
	if maxPages <= 0 {
		maxPages = 100
	}
	args = append(args, "-c", fmt.Sprintf("%d", maxPages)) // concurrency as proxy for max pages

	// Enable headless mode if configured
	if scan.HeadlessEnabled {
		args = append(args, "-headless")
		args = append(args, "-headless-options", "no-sandbox")
		// Use system-installed Chrome instead of downloading Chromium
		args = append(args, "-system-chrome")
	}

	// Add scope to stay within same domain
	args = append(args, "-fs", "dn") // field scope: domain name

	log.Printf("[SecurityScanning] Running Katana: katana %s", strings.Join(args, " "))

	cmd := exec.Command("katana", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	startTime := time.Now()
	err := cmd.Run()
	duration := time.Since(startTime)

	log.Printf("[SecurityScanning] Katana crawl completed in %v", duration)

	if err != nil {
		return nil, fmt.Errorf("katana crawl failed: %w", err)
	}

	// Read crawled URLs
	urls, err := r.readURLsFromFile(crawlOutputFile)
	if err != nil {
		return nil, fmt.Errorf("failed to read crawled URLs: %w", err)
	}

	// Always include the original target URL
	urlSet := make(map[string]bool)
	urlSet[scan.TargetURL] = true
	for _, u := range urls {
		urlSet[u] = true
	}

	result := make([]string, 0, len(urlSet))
	for u := range urlSet {
		result = append(result, u)
	}

	return result, nil
}

// writeURLsToFile writes URLs to a file for nuclei to use
func (r *NucleiRunner) writeURLsToFile(urls []string, filePath string) error {
	file, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	for _, url := range urls {
		if _, err := file.WriteString(url + "\n"); err != nil {
			return err
		}
	}
	return nil
}

// readURLsFromFile reads URLs from a file
func (r *NucleiRunner) readURLsFromFile(filePath string) ([]string, error) {
	file, err := os.Open(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	defer file.Close()

	var urls []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			urls = append(urls, line)
		}
	}

	return urls, scanner.Err()
}

// buildLocalArgsWithList builds nuclei arguments for scanning multiple URLs from a file
func (r *NucleiRunner) buildLocalArgsWithList(scan SecurityScan, outputFile string, urlsFile string) []string {
	args := []string{
		"-list", urlsFile,
		"-jsonl",
		"-o", outputFile,
		"-silent",
		"-no-color",
	}

	// Add user-agent header to avoid WAF/bot detection
	userAgent := r.getUserAgent(scan)
	args = append(args, "-H", fmt.Sprintf("User-Agent: %s", userAgent))

	// Add deep scanning options
	args = r.addDeepScanOptions(args, scan)

	// IMPORTANT: Template tags are incompatible with automatic scan mode (-as)
	// When -as is enabled, nuclei auto-detects technologies and selects templates
	// Specifying both causes "could not find any templates with tech tag" error
	if !scan.AutomaticScan {
		// Add template tags filter (only when not using automatic scan)
		if len(scan.TemplateTags) > 0 {
			args = append(args, "-tags", strings.Join(scan.TemplateTags, ","))
		}
	}

	// Add exclude tags filter (works with both modes)
	if len(scan.ExcludeTags) > 0 {
		args = append(args, "-exclude-tags", strings.Join(scan.ExcludeTags, ","))
	}

	// Add severity filter
	if len(scan.SeverityFilter) > 0 {
		args = append(args, "-severity", strings.Join(scan.SeverityFilter, ","))
	}

	// Rate limiting
	args = r.addRateLimitOptions(args, scan)

	return args
}

func (r *NucleiRunner) getExecutable() string {
	if r.useDocker {
		return "docker"
	}
	return "nuclei"
}

// addDeepScanOptions adds deep scanning flags based on scan configuration
func (r *NucleiRunner) addDeepScanOptions(args []string, scan SecurityScan) []string {
	// Automatic scan mode - uses Wappalyzer technology detection
	if scan.AutomaticScan {
		args = append(args, "-as")
	}

	// Headless mode for JavaScript-heavy sites
	if scan.HeadlessEnabled {
		args = append(args, "-headless")
		// Use system-installed Chrome instead of downloading Chromium
		args = append(args, "-system-chrome")
	}

	// DAST/Fuzzing mode
	if scan.DastEnabled {
		args = append(args, "-dast")
	}

	// Scan all IPs associated with DNS
	if scan.ScanAllIPs {
		args = append(args, "-sa")
	}

	return args
}

// addRateLimitOptions adds rate limiting options
func (r *NucleiRunner) addRateLimitOptions(args []string, scan SecurityScan) []string {
	// Rate limiting - use configured values or defaults
	rateLimit := scan.RateLimit
	if rateLimit <= 0 {
		rateLimit = 150 // Default: 150 requests/sec
	}
	bulkSize := scan.BulkSize
	if bulkSize <= 0 {
		bulkSize = 25 // Default: 25 templates per host
	}
	concurrency := scan.Concurrency
	if concurrency <= 0 {
		concurrency = 25 // Default: 25 concurrent hosts
	}

	args = append(args, "-rate-limit", fmt.Sprintf("%d", rateLimit))
	args = append(args, "-bulk-size", fmt.Sprintf("%d", bulkSize))
	args = append(args, "-concurrency", fmt.Sprintf("%d", concurrency))

	// Add timeout if configured
	if scan.Timeout > 0 {
		args = append(args, "-timeout", fmt.Sprintf("%d", scan.Timeout))
	}

	return args
}

func (r *NucleiRunner) buildLocalArgs(scan SecurityScan, outputFile string) []string {
	args := []string{
		"-target", scan.TargetURL,
		"-jsonl",
		"-o", outputFile,
		"-silent",
		"-no-color",
	}

	// Add user-agent header to avoid WAF/bot detection
	userAgent := r.getUserAgent(scan)
	args = append(args, "-H", fmt.Sprintf("User-Agent: %s", userAgent))

	// Add deep scanning options
	args = r.addDeepScanOptions(args, scan)

	// IMPORTANT: Template tags are incompatible with automatic scan mode (-as)
	// When -as is enabled, nuclei auto-detects technologies and selects templates
	// Specifying both causes "could not find any templates with tech tag" error
	if !scan.AutomaticScan {
		// Add template tags filter (only when not using automatic scan)
		if len(scan.TemplateTags) > 0 {
			args = append(args, "-tags", strings.Join(scan.TemplateTags, ","))
		}
	}

	// Add exclude tags filter (works with both modes)
	if len(scan.ExcludeTags) > 0 {
		args = append(args, "-exclude-tags", strings.Join(scan.ExcludeTags, ","))
	}

	// Add severity filter
	if len(scan.SeverityFilter) > 0 {
		args = append(args, "-severity", strings.Join(scan.SeverityFilter, ","))
	}

	// Rate limiting
	args = r.addRateLimitOptions(args, scan)

	return args
}

func (r *NucleiRunner) buildDockerArgs(scan SecurityScan, outputFile string, outputDir string) []string {
	// Docker run arguments
	args := []string{
		"run", "--rm",
		"-v", outputDir + ":/results",
		"projectdiscovery/nuclei:latest",
		"-target", scan.TargetURL,
		"-jsonl",
		"-o", "/results/results.jsonl",
		"-silent",
		"-no-color",
	}

	// Add user-agent header to avoid WAF/bot detection
	userAgent := r.getUserAgent(scan)
	args = append(args, "-H", fmt.Sprintf("User-Agent: %s", userAgent))

	// Add deep scanning options
	args = r.addDeepScanOptions(args, scan)

	// IMPORTANT: Template tags are incompatible with automatic scan mode (-as)
	// When -as is enabled, nuclei auto-detects technologies and selects templates
	// Specifying both causes "could not find any templates with tech tag" error
	if !scan.AutomaticScan {
		// Add template tags filter (only when not using automatic scan)
		if len(scan.TemplateTags) > 0 {
			args = append(args, "-tags", strings.Join(scan.TemplateTags, ","))
		}
	}

	// Add exclude tags filter (works with both modes)
	if len(scan.ExcludeTags) > 0 {
		args = append(args, "-exclude-tags", strings.Join(scan.ExcludeTags, ","))
	}

	// Add severity filter
	if len(scan.SeverityFilter) > 0 {
		args = append(args, "-severity", strings.Join(scan.SeverityFilter, ","))
	}

	// Rate limiting
	args = r.addRateLimitOptions(args, scan)

	return args
}

func (r *NucleiRunner) parseResults(outputFile string, scanID string) ([]SecurityResult, error) {
	file, err := os.Open(outputFile)
	if err != nil {
		if os.IsNotExist(err) {
			// No results file means no findings
			return []SecurityResult{}, nil
		}
		return nil, fmt.Errorf("failed to open results file: %w", err)
	}
	defer file.Close()

	var results []SecurityResult
	scanner := bufio.NewScanner(file)

	// Increase buffer size for large lines
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}

		var output NucleiOutput
		if err := json.Unmarshal([]byte(line), &output); err != nil {
			log.Printf("[SecurityScanning] Failed to parse result line: %v", err)
			continue
		}

		result := r.convertToResult(output, scanID)
		results = append(results, result)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading results file: %w", err)
	}

	return results, nil
}

func (r *NucleiRunner) convertToResult(output NucleiOutput, scanID string) SecurityResult {
	// Parse timestamp
	matchedAt, err := time.Parse(time.RFC3339, output.Timestamp)
	if err != nil {
		matchedAt = time.Now()
	}

	// Extract CVE IDs
	var cveIDs []string
	if output.Info.Classification.CVEIDs != nil {
		cveIDs = output.Info.Classification.CVEIDs
	}

	// Extract references
	var references []string
	if output.Info.Reference != nil {
		references = output.Info.Reference
	}

	// Extract tags
	var tags []string
	if output.Info.Tags != nil {
		tags = output.Info.Tags
	}

	// Build extracted results string
	extractedResults := ""
	if len(output.ExtractedResults) > 0 {
		extractedResults = strings.Join(output.ExtractedResults, "\n")
	}

	// Normalize severity
	severity := strings.ToLower(output.Info.Severity)
	if severity == "" {
		severity = "unknown"
	}

	// Build raw data map
	rawData := map[string]interface{}{
		"template_id":    output.TemplateID,
		"type":           output.Type,
		"matcher_name":   output.MatcherName,
		"extractor_name": output.ExtractorName,
		"ip":             output.IP,
		"request":        output.Request,
		"response":       output.Response,
	}

	return SecurityResult{
		ScanID:           scanID,
		TemplateID:       output.TemplateID,
		TemplateName:     output.Info.Name,
		Severity:         severity,
		Host:             output.Host,
		MatchedURL:       output.MatchedAt,
		MatchedAt:        matchedAt,
		Description:      output.Info.Description,
		Solution:         output.Info.Remediation,
		CVEIDs:           cveIDs,
		References:       references,
		Tags:             tags,
		CurlCommand:      output.CurlCommand,
		ExtractedResults: extractedResults,
		RawData:          rawData,
	}
}

// CheckNucleiInstallation verifies nuclei is available
func (r *NucleiRunner) CheckNucleiInstallation() error {
	if r.useDocker {
		// Check if Docker is available
		cmd := exec.Command("docker", "version")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("docker is not available: %w", err)
		}

		// Pull nuclei image if not present
		log.Printf("[SecurityScanning] Using Docker for nuclei execution")
		return nil
	}

	// Check nuclei version
	cmd := exec.Command("nuclei", "-version")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("nuclei is not available: %w", err)
	}

	log.Printf("[SecurityScanning] Nuclei version: %s", strings.TrimSpace(string(output)))
	return nil
}

// UpdateTemplates updates nuclei templates
func (r *NucleiRunner) UpdateTemplates() error {
	if r.useDocker {
		// Docker image comes with templates
		return nil
	}

	cmd := exec.Command("nuclei", "-update-templates")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Printf("[SecurityScanning] Updating nuclei templates...")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to update templates: %w", err)
	}

	log.Printf("[SecurityScanning] Templates updated successfully")
	return nil
}

// GetResultsDir returns the results directory
func (r *NucleiRunner) GetResultsDir() string {
	return r.resultsDir
}
