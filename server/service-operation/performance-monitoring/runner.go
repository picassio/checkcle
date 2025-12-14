package performancemonitoring

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// SitespeedRunner executes sitespeed.io tests (either locally or via Docker)
type SitespeedRunner struct {
	outputDir       string
	dockerVolume    string // Named Docker volume for DinD scenarios
	useDockerVolume bool
	useLocalExec    bool // Use local sitespeed.io instead of Docker
}

// DockerRunner is an alias for backward compatibility
type DockerRunner = SitespeedRunner

// NewDockerRunner creates a new sitespeed runner
func NewDockerRunner() *SitespeedRunner {
	// Use environment variable or default path
	outputDir := os.Getenv("SITESPEED_RESULTS_DIR")
	if outputDir == "" {
		outputDir = "/opt/sitespeed-results"
	}

	// Check for Docker volume name (for Docker-in-Docker scenarios)
	dockerVolume := os.Getenv("SITESPEED_DOCKER_VOLUME")
	useDockerVolume := dockerVolume != ""

	// Check if local execution is enabled (sitespeed.io installed in container)
	// If SITESPEED_LOCAL_EXEC=true or if sitespeed.io command is available and no Docker volume
	useLocalExec := os.Getenv("SITESPEED_LOCAL_EXEC") == "true"
	if !useLocalExec && !useDockerVolume {
		// Auto-detect: check if sitespeed.io is available locally
		if _, err := exec.LookPath("sitespeed.io"); err == nil {
			useLocalExec = true
			log.Printf("[PERFORMANCE] Auto-detected local sitespeed.io installation, using local execution")
		}
	}

	// Ensure output directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Printf("[PERFORMANCE] Warning: Failed to create output dir %s: %v", outputDir, err)
	}

	runner := &SitespeedRunner{
		outputDir:       outputDir,
		dockerVolume:    dockerVolume,
		useDockerVolume: useDockerVolume,
		useLocalExec:    useLocalExec,
	}

	if useLocalExec {
		log.Printf("[PERFORMANCE] Using local sitespeed.io execution mode")
	} else {
		log.Printf("[PERFORMANCE] Using Docker-based sitespeed.io execution mode")
	}

	return runner
}

// RunSitespeed executes a sitespeed.io test and returns the result directory
func (dr *SitespeedRunner) RunSitespeed(test PerformanceTest, budget *PerformanceBudget) (string, error) {
	// Create unique result directory for this test run
	timestamp := time.Now().Unix()
	timestampStr := fmt.Sprintf("%d", timestamp)
	resultDir := filepath.Join(dr.outputDir, test.ID, timestampStr)
	resultSubPath := filepath.Join(test.ID, timestampStr)

	if err := os.MkdirAll(resultDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create result directory: %w", err)
	}

	// Get browser option
	browser := test.Browser
	if browser == "" {
		browser = "chrome"
	}

	// Get runs/iterations
	runs := test.Runs
	if runs < 1 {
		runs = 1
	}
	if runs > 10 {
		runs = 10
	}

	// Set a timeout for the test (default 10 minutes)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	var cmd *exec.Cmd
	var args []string

	if dr.useLocalExec {
		// Local execution mode - sitespeed.io is installed in the container
		args = dr.buildLocalArgs(test, budget, resultDir, browser, runs)
		log.Printf("[PERFORMANCE] Running sitespeed.io locally for test %s: sitespeed.io %v", test.Name, args)
		cmd = exec.CommandContext(ctx, "sitespeed.io", args...)
	} else {
		// Docker execution mode - run sitespeed.io via Docker
		args = dr.buildDockerArgs(test, budget, resultDir, resultSubPath, browser, runs)
		log.Printf("[PERFORMANCE] Running sitespeed.io via Docker for test %s: docker %v", test.Name, args)
		cmd = exec.CommandContext(ctx, "docker", args...)
	}

	output, err := cmd.CombinedOutput()
	if err != nil {
		// Check if it was a timeout
		if ctx.Err() == context.DeadlineExceeded {
			return "", fmt.Errorf("sitespeed.io test timed out after 10 minutes")
		}
		return "", fmt.Errorf("sitespeed.io failed: %v, output: %s", err, string(output))
	}

	log.Printf("[PERFORMANCE] sitespeed.io completed for test %s, results at: %s", test.Name, resultDir)

	return resultDir, nil
}

// buildLocalArgs builds arguments for local sitespeed.io execution
func (dr *SitespeedRunner) buildLocalArgs(test PerformanceTest, budget *PerformanceBudget, resultDir, browser string, runs int) []string {
	args := []string{
		test.URL,
		"--outputFolder", resultDir,
		"-b", browser,
		"-n", fmt.Sprintf("%d", runs),
	}

	// Add connectivity profile
	if test.Connectivity != "" && test.Connectivity != "native" {
		args = append(args, "--connectivity.profile", test.Connectivity)
	}

	// Visual metrics (SpeedIndex, video recording) - requires ffmpeg, python and xvfb
	// Note: Cannot use headless mode with visual metrics - they need a display (Xvfb)
	if test.VisualMetrics {
		args = append(args, "--browsertime.video", "true")
		args = append(args, "--visualMetrics", "true")
		// Tell sitespeed.io not to start its own Xvfb - we have one running already
		args = append(args, "--browsertime.xvfb", "false")
	} else {
		args = append(args, "--browsertime.video", "false")
		args = append(args, "--visualMetrics", "false")
		// Add headless mode only when visual metrics are disabled
		args = append(args, "--headless")
	}

	// Enable CPU metrics collection for Chrome
	args = append(args, "--cpu")

	// Keep HTML reports and add JSON analysis data
	args = append(args, "--plugins.add", "analysisstorer")

	// Create budget file if budget exists
	if budget != nil {
		budgetPath := filepath.Join(resultDir, "budget.json")
		if err := dr.writeBudgetFile(budget, budgetPath); err != nil {
			log.Printf("[PERFORMANCE] Warning: Failed to write budget file: %v", err)
		} else {
			args = append(args, "--budget.configPath", budgetPath)
			args = append(args, "--budget.output", "json")
		}
	}

	return args
}

// buildDockerArgs builds arguments for Docker-based sitespeed.io execution
func (dr *SitespeedRunner) buildDockerArgs(test PerformanceTest, budget *PerformanceBudget, resultDir, resultSubPath, browser string, runs int) []string {
	// Build Docker command arguments
	// When using Docker-in-Docker via socket, use named volume with subpath
	var volumeMount string
	var outputFolder string
	if dr.useDockerVolume {
		// Mount the named volume and write to a subdirectory
		volumeMount = fmt.Sprintf("%s:/sitespeed.io", dr.dockerVolume)
		outputFolder = "/sitespeed.io/" + resultSubPath
	} else {
		// Direct path mount (when not using DinD)
		volumeMount = fmt.Sprintf("%s:/sitespeed.io", resultDir)
		outputFolder = "/sitespeed.io"
	}

	args := []string{
		"run", "--rm",
		"-v", volumeMount,
		"--shm-size=1g", // Required for Chrome
		"sitespeedio/sitespeed.io:latest",
		test.URL,
		"--outputFolder", outputFolder,
		"-b", browser,
		"-n", fmt.Sprintf("%d", runs),
	}

	// Add connectivity profile
	if test.Connectivity != "" && test.Connectivity != "native" {
		args = append(args, "--connectivity.profile", test.Connectivity)
	}

	// Visual metrics (SpeedIndex, video recording) - Docker image includes ffmpeg and xvfb
	// Note: Cannot use headless mode with visual metrics - they need a display (Xvfb)
	if test.VisualMetrics {
		args = append(args, "--browsertime.video", "true")
		args = append(args, "--visualMetrics", "true")
		// Don't add --headless when visual metrics are enabled
	} else {
		args = append(args, "--browsertime.video", "false")
		args = append(args, "--visualMetrics", "false")
		// Add headless mode only when visual metrics are disabled
		args = append(args, "--headless")
	}

	// Enable CPU metrics collection for Chrome
	args = append(args, "--cpu")

	// Keep HTML reports and add JSON analysis data
	args = append(args, "--plugins.add", "analysisstorer")

	// Create budget file if budget exists
	if budget != nil {
		budgetPath := filepath.Join(resultDir, "budget.json")
		if err := dr.writeBudgetFile(budget, budgetPath); err != nil {
			log.Printf("[PERFORMANCE] Warning: Failed to write budget file: %v", err)
		} else {
			// Budget config path inside the sitespeed container
			var budgetConfigPath string
			if dr.useDockerVolume {
				budgetConfigPath = "/sitespeed.io/" + resultSubPath + "/budget.json"
			} else {
				budgetConfigPath = "/sitespeed.io/budget.json"
			}
			args = append(args, "--budget.configPath", budgetConfigPath)
			args = append(args, "--budget.output", "json")
		}
	}

	return args
}

// writeBudgetFile creates a sitespeed.io budget configuration file
func (dr *SitespeedRunner) writeBudgetFile(budget *PerformanceBudget, path string) error {
	// sitespeed.io budget format
	budgetConfig := map[string]interface{}{
		"budget": map[string]interface{}{},
	}

	budgetRules := budgetConfig["budget"].(map[string]interface{})

	// Add timing metrics
	if budget.LCPLimit > 0 {
		budgetRules["largestContentfulPaint"] = budget.LCPLimit
	}
	if budget.FCPLimit > 0 {
		budgetRules["firstContentfulPaint"] = budget.FCPLimit
	}
	if budget.TTFBLimit > 0 {
		budgetRules["ttfb"] = budget.TTFBLimit
	}
	if budget.SpeedIndexLimit > 0 {
		budgetRules["speedIndex"] = budget.SpeedIndexLimit
	}
	if budget.TBTLimit > 0 {
		budgetRules["totalBlockingTime"] = budget.TBTLimit
	}

	// Add page metrics
	if budget.RequestsLimit > 0 {
		budgetRules["requests"] = budget.RequestsLimit
	}
	if budget.TransferSizeLimit > 0 {
		budgetRules["transferSize"] = budget.TransferSizeLimit
	}

	// Write to file
	file, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create budget file: %w", err)
	}
	defer file.Close()

	// Simple JSON serialization
	content := fmt.Sprintf(`{
  "budget": {
    "largestContentfulPaint": %d,
    "firstContentfulPaint": %d,
    "ttfb": %d,
    "speedIndex": %d,
    "totalBlockingTime": %d,
    "requests": %d,
    "transferSize": %d
  }
}`,
		budget.LCPLimit,
		budget.FCPLimit,
		budget.TTFBLimit,
		budget.SpeedIndexLimit,
		budget.TBTLimit,
		budget.RequestsLimit,
		budget.TransferSizeLimit,
	)

	_, err = file.WriteString(content)
	return err
}

// GetReportURL returns the URL to access the HTML report
func (dr *SitespeedRunner) GetReportURL(resultDir string, baseURL string) string {
	// The report would be served via the API endpoint
	relativePath := filepath.Base(filepath.Dir(resultDir)) + "/" + filepath.Base(resultDir)
	return fmt.Sprintf("%s/performance/report/%s/index.html", baseURL, relativePath)
}

// CleanupOldResults removes results older than the specified duration
func (dr *SitespeedRunner) CleanupOldResults(maxAge time.Duration) error {
	cutoff := time.Now().Add(-maxAge)

	err := filepath.Walk(dr.outputDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip the root directory
		if path == dr.outputDir {
			return nil
		}

		// Check if this is a test ID directory
		if info.IsDir() {
			// Check subdirectories (timestamp directories)
			entries, err := os.ReadDir(path)
			if err != nil {
				return nil // Skip on error
			}

			for _, entry := range entries {
				if entry.IsDir() {
					subInfo, err := entry.Info()
					if err != nil {
						continue
					}
					if subInfo.ModTime().Before(cutoff) {
						subPath := filepath.Join(path, entry.Name())
						log.Printf("[PERFORMANCE] Cleaning up old results: %s", subPath)
						os.RemoveAll(subPath)
					}
				}
			}
		}

		return nil
	})

	return err
}
