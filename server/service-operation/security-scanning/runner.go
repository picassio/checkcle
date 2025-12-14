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
	"time"
)

// NucleiRunner handles nuclei scan execution
type NucleiRunner struct {
	resultsDir   string
	templatesDir string
	useDocker    bool
}

// NewNucleiRunner creates a new nuclei runner
func NewNucleiRunner(resultsDir string) *NucleiRunner {
	// Check if nuclei is installed locally
	_, err := exec.LookPath("nuclei")
	useDocker := err != nil

	templatesDir := os.Getenv("NUCLEI_TEMPLATES_DIR")
	if templatesDir == "" {
		templatesDir = filepath.Join(os.Getenv("HOME"), "nuclei-templates")
	}

	return &NucleiRunner{
		resultsDir:   resultsDir,
		templatesDir: templatesDir,
		useDocker:    useDocker,
	}
}

// ExecuteScan runs a nuclei scan and returns the results
func (r *NucleiRunner) ExecuteScan(scan SecurityScan) ([]SecurityResult, error) {
	// Create output directory for this scan
	timestamp := time.Now().Format("20060102-150405")
	outputDir := filepath.Join(r.resultsDir, scan.ID, timestamp)
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create output directory: %w", err)
	}

	outputFile := filepath.Join(outputDir, "results.jsonl")

	// Build command arguments
	var args []string
	if r.useDocker {
		args = r.buildDockerArgs(scan, outputFile, outputDir)
	} else {
		args = r.buildLocalArgs(scan, outputFile)
	}

	log.Printf("[SecurityScanning] Running nuclei scan for %s: %s", scan.Name, scan.TargetURL)
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

func (r *NucleiRunner) getExecutable() string {
	if r.useDocker {
		return "docker"
	}
	return "nuclei"
}

func (r *NucleiRunner) buildLocalArgs(scan SecurityScan, outputFile string) []string {
	args := []string{
		"-target", scan.TargetURL,
		"-jsonl",
		"-o", outputFile,
		"-silent",
		"-no-color",
	}

	// Add template tags filter
	if len(scan.TemplateTags) > 0 {
		args = append(args, "-tags", strings.Join(scan.TemplateTags, ","))
	}

	// Add exclude tags filter
	if len(scan.ExcludeTags) > 0 {
		args = append(args, "-exclude-tags", strings.Join(scan.ExcludeTags, ","))
	}

	// Add severity filter
	if len(scan.SeverityFilter) > 0 {
		args = append(args, "-severity", strings.Join(scan.SeverityFilter, ","))
	}

	// Rate limiting to be a good citizen
	args = append(args, "-rate-limit", "50")
	args = append(args, "-bulk-size", "10")
	args = append(args, "-concurrency", "10")

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

	// Add template tags filter
	if len(scan.TemplateTags) > 0 {
		args = append(args, "-tags", strings.Join(scan.TemplateTags, ","))
	}

	// Add exclude tags filter
	if len(scan.ExcludeTags) > 0 {
		args = append(args, "-exclude-tags", strings.Join(scan.ExcludeTags, ","))
	}

	// Add severity filter
	if len(scan.SeverityFilter) > 0 {
		args = append(args, "-severity", strings.Join(scan.SeverityFilter, ","))
	}

	// Rate limiting
	args = append(args, "-rate-limit", "50")
	args = append(args, "-bulk-size", "10")
	args = append(args, "-concurrency", "10")

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
