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

// DockerRunner executes sitespeed.io tests via Docker
type DockerRunner struct {
	outputDir       string
	dockerVolume    string // Named Docker volume for DinD scenarios
	useDockerVolume bool
}

// NewDockerRunner creates a new Docker runner
func NewDockerRunner() *DockerRunner {
	// Use environment variable or default path
	outputDir := os.Getenv("SITESPEED_RESULTS_DIR")
	if outputDir == "" {
		outputDir = "/opt/sitespeed-results"
	}

	// Check for Docker volume name (for Docker-in-Docker scenarios)
	dockerVolume := os.Getenv("SITESPEED_DOCKER_VOLUME")
	useDockerVolume := dockerVolume != ""

	// Ensure output directory exists
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		log.Printf("[PERFORMANCE] Warning: Failed to create output dir %s: %v", outputDir, err)
	}

	return &DockerRunner{
		outputDir:       outputDir,
		dockerVolume:    dockerVolume,
		useDockerVolume: useDockerVolume,
	}
}

// RunSitespeed executes a sitespeed.io test and returns the result directory
func (dr *DockerRunner) RunSitespeed(test PerformanceTest, budget *PerformanceBudget) (string, error) {
	// Create unique result directory for this test run
	timestamp := time.Now().Unix()
	timestampStr := fmt.Sprintf("%d", timestamp)
	resultDir := filepath.Join(dr.outputDir, test.ID, timestampStr)
	resultSubPath := filepath.Join(test.ID, timestampStr)

	if err := os.MkdirAll(resultDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create result directory: %w", err)
	}

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
	}

	// Add browser option
	browser := test.Browser
	if browser == "" {
		browser = "chrome"
	}
	args = append(args, "-b", browser)

	// Add runs/iterations
	runs := test.Runs
	if runs < 1 {
		runs = 1
	}
	if runs > 10 {
		runs = 10
	}
	args = append(args, "-n", fmt.Sprintf("%d", runs))

	// Add connectivity profile
	if test.Connectivity != "" && test.Connectivity != "native" {
		args = append(args, "--connectivity.profile", test.Connectivity)
	}

	// Add headless mode for server environments
	// Note: Visual metrics (SpeedIndex, FirstVisualChange) are NOT available in headless mode
	// as they require video recording which needs a display
	args = append(args, "--headless")

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

	log.Printf("[PERFORMANCE] Running sitespeed.io for test %s: docker %v", test.Name, args)

	// Set a timeout for the test (default 10 minutes)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	cmd := exec.CommandContext(ctx, "docker", args...)

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

// writeBudgetFile creates a sitespeed.io budget configuration file
func (dr *DockerRunner) writeBudgetFile(budget *PerformanceBudget, path string) error {
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
func (dr *DockerRunner) GetReportURL(resultDir string, baseURL string) string {
	// The report would be served via the API endpoint
	relativePath := filepath.Base(filepath.Dir(resultDir)) + "/" + filepath.Base(resultDir)
	return fmt.Sprintf("%s/performance/report/%s/index.html", baseURL, relativePath)
}

// CleanupOldResults removes results older than the specified duration
func (dr *DockerRunner) CleanupOldResults(maxAge time.Duration) error {
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
