package performancemonitoring

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
)

// ResultParser parses sitespeed.io JSON output
type ResultParser struct{}

// NewResultParser creates a new result parser
func NewResultParser() *ResultParser {
	return &ResultParser{}
}

// ParseResults parses the sitespeed.io results from the given directory
func (p *ResultParser) ParseResults(resultDir string, testURL string) (*SitespeedResult, error) {
	result := &SitespeedResult{
		URL:     testURL,
		RawData: make(map[string]interface{}),
	}

	// Try to find the data directory with summary files
	dataDir := filepath.Join(resultDir, "data")
	if _, err := os.Stat(dataDir); err == nil {
		// Parse all summary files from data directory
		return p.parseSummaryFiles(dataDir, result)
	}

	// Fallback: Find the pages directory
	pagesDir := filepath.Join(resultDir, "pages")
	if _, err := os.Stat(pagesDir); os.IsNotExist(err) {
		// Try to find browsertime.json directly in resultDir
		browsertimePath := filepath.Join(resultDir, "browsertime.json")
		if _, err := os.Stat(browsertimePath); os.IsNotExist(err) {
			return nil, fmt.Errorf("no sitespeed.io results found in %s", resultDir)
		}
		return p.parseBrowsertimeFile(browsertimePath, result)
	}

	// Walk through pages directory to find data files
	var pageDataDir string
	err := filepath.Walk(pagesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() && info.Name() == "data" {
			pageDataDir = path
			return filepath.SkipDir
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error walking pages directory: %w", err)
	}

	if pageDataDir == "" {
		// Try alternative structure - look for browsertime.pageSummary.json
		summaryPath := p.findFile(resultDir, "browsertime.pageSummary.json")
		if summaryPath != "" {
			return p.parsePageSummaryFile(summaryPath, result)
		}
		return nil, fmt.Errorf("no data directory found in %s", pagesDir)
	}

	// Parse browsertime.json from data directory
	browsertimePath := filepath.Join(pageDataDir, "browsertime.json")
	if _, err := os.Stat(browsertimePath); err == nil {
		return p.parseBrowsertimeFile(browsertimePath, result)
	}

	// Try browsertime.pageSummary.json
	summaryPath := filepath.Join(pageDataDir, "browsertime.pageSummary.json")
	if _, err := os.Stat(summaryPath); err == nil {
		return p.parsePageSummaryFile(summaryPath, result)
	}

	return nil, fmt.Errorf("no browsertime results found in %s", pageDataDir)
}

// parseSummaryFiles parses the summary files from the data directory
func (p *ResultParser) parseSummaryFiles(dataDir string, result *SitespeedResult) (*SitespeedResult, error) {
	// Parse browsertime summary (timings, web vitals, CPU)
	browsertimePath := filepath.Join(dataDir, "browsertime.summary-total.json")
	if _, err := os.Stat(browsertimePath); err == nil {
		if err := p.parseBrowsertimeSummary(browsertimePath, result); err != nil {
			// Log but continue
			fmt.Printf("Warning: failed to parse browsertime summary: %v\n", err)
		}
	}

	// Parse pagexray summary (content size, requests)
	pagexrayPath := filepath.Join(dataDir, "pagexray.summary-total.json")
	if _, err := os.Stat(pagexrayPath); err == nil {
		if err := p.parsePagexraySummary(pagexrayPath, result); err != nil {
			fmt.Printf("Warning: failed to parse pagexray summary: %v\n", err)
		}
	}

	// Parse coach summary (scores)
	coachPath := filepath.Join(dataDir, "coach.summary-total.json")
	if _, err := os.Stat(coachPath); err == nil {
		if err := p.parseCoachSummary(coachPath, result); err != nil {
			fmt.Printf("Warning: failed to parse coach summary: %v\n", err)
		}
	}

	// Try to find and parse browsertime.pageSummary.json for DOM elements
	// This file is in the pages/<domain>/data/ directory
	pagesDir := filepath.Dir(dataDir) // Go up from data/ to result root
	pagesDir = filepath.Join(pagesDir, "pages")
	if _, err := os.Stat(pagesDir); err == nil {
		// Find browsertime.pageSummary.json in any subdirectory
		filepath.Walk(pagesDir, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil
			}
			if info.Name() == "browsertime.pageSummary.json" {
				p.parseBrowsertimePageSummary(path, result)
				return filepath.SkipDir
			}
			return nil
		})
	}

	result.ReportPath = dataDir
	return result, nil
}

// parseBrowsertimeSummary parses browsertime.summary-total.json
func (p *ResultParser) parseBrowsertimeSummary(path string, result *SitespeedResult) error {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read browsertime summary: %w", err)
	}

	var summaryData map[string]interface{}
	if err := json.Unmarshal(data, &summaryData); err != nil {
		return fmt.Errorf("failed to parse browsertime summary: %w", err)
	}

	// Store raw data
	result.RawData["browsertime"] = summaryData

	// Extract timings
	if timings, ok := summaryData["timings"].(map[string]interface{}); ok {
		result.Statistics.Timings.FullyLoaded = p.extractStatValue(timings, "fullyLoaded")
		result.Statistics.Timings.TTFB = p.extractStatValue(timings, "largestContentfulPaint") // Will be overwritten below
	}

	// Extract Google Web Vitals
	if gwv, ok := summaryData["googleWebVitals"].(map[string]interface{}); ok {
		result.Statistics.GoogleWebVitals = GoogleWebVitals{
			LCP: p.extractStatValue(gwv, "largestContentfulPaint"),
			FCP: p.extractStatValue(gwv, "firstContentfulPaint"),
			CLS: p.extractStatValue(gwv, "cumulativeLayoutShift"),
			TBT: p.extractStatValue(gwv, "totalBlockingTime"),
		}
		result.Statistics.Timings.TTFB = p.extractStatValue(gwv, "ttfb")
	}

	// Extract navigation timings
	if navTiming, ok := summaryData["navigationTiming"].(map[string]interface{}); ok {
		result.Statistics.Timings.DNS = p.extractStatValue(navTiming, "domainLookupEnd")
		result.Statistics.Timings.Connect = p.extractStatValue(navTiming, "connectStart")
		result.Statistics.Timings.SSL = p.extractStatValue(navTiming, "secureConnectionStart")
	}

	// Extract page timings
	if pageTimings, ok := summaryData["pageTimings"].(map[string]interface{}); ok {
		result.Statistics.Timings.BackendTime = p.extractStatValue(pageTimings, "backEndTime")
		result.Statistics.Timings.FrontendTime = p.extractStatValue(pageTimings, "frontEndTime")
		if result.Statistics.Timings.TTFB.Median == 0 {
			result.Statistics.Timings.TTFB = p.extractStatValue(pageTimings, "backEndTime")
		}
	}

	// Extract visual metrics
	if vm, ok := summaryData["visualMetrics"].(map[string]interface{}); ok {
		result.Statistics.VisualMetrics = VisualMetrics{
			SpeedIndex:        p.extractStatValue(vm, "SpeedIndex"),
			FirstVisualChange: p.extractStatValue(vm, "FirstVisualChange"),
			LastVisualChange:  p.extractStatValue(vm, "LastVisualChange"),
			LCP:               p.extractStatValue(vm, "LargestContentfulPaint"),
		}
	}

	// Extract CPU metrics
	if cpu, ok := summaryData["cpu"].(map[string]interface{}); ok {
		if longTasks, ok := cpu["longTasks"].(map[string]interface{}); ok {
			result.Statistics.CPU = CPUMetrics{
				LongTasks:       p.extractStatValue(longTasks, "tasks"),
				LongTasksTime:   p.extractStatValue(longTasks, "totalDuration"),
				MaxLongTaskTime: p.extractStatValue(longTasks, "maxPotentialFid"),
			}
		}
	}

	return nil
}

// parsePagexraySummary parses pagexray.summary-total.json
func (p *ResultParser) parsePagexraySummary(path string, result *SitespeedResult) error {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read pagexray summary: %w", err)
	}

	var summaryData map[string]interface{}
	if err := json.Unmarshal(data, &summaryData); err != nil {
		return fmt.Errorf("failed to parse pagexray summary: %w", err)
	}

	// Store raw data
	result.RawData["pagexray"] = summaryData

	// Extract page info
	result.Statistics.PageInfo = PageInfo{
		Requests:     p.extractStatValue(summaryData, "requests"),
		TransferSize: p.extractStatValue(summaryData, "transferSize"),
	}

	// Extract content types
	if contentTypes, ok := summaryData["contentTypes"].(map[string]interface{}); ok {
		// HTML
		if html, ok := contentTypes["html"].(map[string]interface{}); ok {
			result.Statistics.ContentSize.HTML = p.extractStatValue(html, "transferSize")
			result.Statistics.Requests.HTML = p.extractStatValue(html, "requests")
		}
		// CSS
		if css, ok := contentTypes["css"].(map[string]interface{}); ok {
			result.Statistics.ContentSize.CSS = p.extractStatValue(css, "transferSize")
			result.Statistics.Requests.CSS = p.extractStatValue(css, "requests")
		}
		// JavaScript
		if js, ok := contentTypes["javascript"].(map[string]interface{}); ok {
			result.Statistics.ContentSize.JS = p.extractStatValue(js, "transferSize")
			result.Statistics.Requests.JavaScript = p.extractStatValue(js, "requests")
		}
		// Image
		if img, ok := contentTypes["image"].(map[string]interface{}); ok {
			result.Statistics.ContentSize.Image = p.extractStatValue(img, "transferSize")
			result.Statistics.Requests.Image = p.extractStatValue(img, "requests")
		}
		// Font
		if font, ok := contentTypes["font"].(map[string]interface{}); ok {
			result.Statistics.ContentSize.Font = p.extractStatValue(font, "transferSize")
			result.Statistics.Requests.Font = p.extractStatValue(font, "requests")
		}
		// Other (svg, json, plain, other combined)
		var otherSize, otherRequests float64
		for _, key := range []string{"svg", "json", "plain", "other"} {
			if other, ok := contentTypes[key].(map[string]interface{}); ok {
				otherSize += p.extractStatValue(other, "transferSize").Median
				otherRequests += p.extractStatValue(other, "requests").Median
			}
		}
		result.Statistics.ContentSize.Other = StatValue{Median: otherSize}
		result.Statistics.Requests.Other = StatValue{Median: otherRequests}
	}

	// Extract third party
	if thirdParty, ok := summaryData["thirdParty"].(map[string]interface{}); ok {
		result.Statistics.Requests.ThirdParty = p.extractStatValue(thirdParty, "requests")
	}

	return nil
}

// parseCoachSummary parses coach.summary-total.json
func (p *ResultParser) parseCoachSummary(path string, result *SitespeedResult) error {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read coach summary: %w", err)
	}

	var summaryData map[string]interface{}
	if err := json.Unmarshal(data, &summaryData); err != nil {
		return fmt.Errorf("failed to parse coach summary: %w", err)
	}

	// Store raw data
	result.RawData["coach"] = summaryData

	// Extract overall score
	result.Statistics.Coach.Score = p.extractStatValue(summaryData, "score")

	// Extract performance score
	if perf, ok := summaryData["performance"].(map[string]interface{}); ok {
		result.Statistics.Coach.Performance = p.extractStatValue(perf, "score")
	}

	// Extract best practice score
	if bp, ok := summaryData["bestpractice"].(map[string]interface{}); ok {
		result.Statistics.Coach.BestPractice = p.extractStatValue(bp, "score")
	}

	// Extract privacy score (use as accessibility proxy since it's similar)
	if privacy, ok := summaryData["privacy"].(map[string]interface{}); ok {
		result.Statistics.Coach.Accessibility = p.extractStatValue(privacy, "score")
	}

	return nil
}

// parseBrowsertimePageSummary parses browsertime.pageSummary.json for DOM elements and visual metrics
func (p *ResultParser) parseBrowsertimePageSummary(path string, result *SitespeedResult) error {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return fmt.Errorf("failed to read browsertime page summary: %w", err)
	}

	var summaryData map[string]interface{}
	if err := json.Unmarshal(data, &summaryData); err != nil {
		return fmt.Errorf("failed to parse browsertime page summary: %w", err)
	}

	// Extract DOM elements from browserScripts
	if browserScripts, ok := summaryData["browserScripts"].([]interface{}); ok && len(browserScripts) > 0 {
		if firstScript, ok := browserScripts[0].(map[string]interface{}); ok {
			if pageinfo, ok := firstScript["pageinfo"].(map[string]interface{}); ok {
				if domElements, ok := pageinfo["domElements"].(float64); ok {
					result.Statistics.PageInfo.DOMElements = StatValue{
						Median: domElements,
						Mean:   domElements,
						Min:    domElements,
						Max:    domElements,
					}
				}
			}
		}
	}

	// Extract visual metrics if available (from the visualMetrics array)
	if visualMetrics, ok := summaryData["visualMetrics"].([]interface{}); ok && len(visualMetrics) > 0 {
		if firstVM, ok := visualMetrics[0].(map[string]interface{}); ok {
			if si, ok := firstVM["SpeedIndex"].(float64); ok && si > 0 {
				result.Statistics.VisualMetrics.SpeedIndex = StatValue{Median: si, Mean: si, Min: si, Max: si}
			}
			if fvc, ok := firstVM["FirstVisualChange"].(float64); ok && fvc > 0 {
				result.Statistics.VisualMetrics.FirstVisualChange = StatValue{Median: fvc, Mean: fvc, Min: fvc, Max: fvc}
			}
			if lvc, ok := firstVM["LastVisualChange"].(float64); ok && lvc > 0 {
				result.Statistics.VisualMetrics.LastVisualChange = StatValue{Median: lvc, Mean: lvc, Min: lvc, Max: lvc}
			}
		}
	}

	return nil
}

// parseBrowsertimeFile parses the browsertime.json file
func (p *ResultParser) parseBrowsertimeFile(path string, result *SitespeedResult) (*SitespeedResult, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read browsertime file: %w", err)
	}

	var browsertimeData []map[string]interface{}
	if err := json.Unmarshal(data, &browsertimeData); err != nil {
		// Try parsing as single object
		var singleData map[string]interface{}
		if err := json.Unmarshal(data, &singleData); err != nil {
			return nil, fmt.Errorf("failed to parse browsertime file: %w", err)
		}
		browsertimeData = []map[string]interface{}{singleData}
	}

	if len(browsertimeData) == 0 {
		return nil, fmt.Errorf("no data in browsertime file")
	}

	// Get the first result (or aggregate if multiple iterations)
	btData := browsertimeData[0]
	result.RawData = btData

	// Extract statistics
	if stats, ok := btData["statistics"].(map[string]interface{}); ok {
		result.Statistics = p.extractStatistics(stats)
	}

	result.ReportPath = filepath.Dir(path)
	return result, nil
}

// parsePageSummaryFile parses the browsertime.pageSummary.json file
func (p *ResultParser) parsePageSummaryFile(path string, result *SitespeedResult) (*SitespeedResult, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read page summary file: %w", err)
	}

	var summaryData map[string]interface{}
	if err := json.Unmarshal(data, &summaryData); err != nil {
		return nil, fmt.Errorf("failed to parse page summary file: %w", err)
	}

	result.RawData = summaryData

	// Extract statistics from page summary
	if stats, ok := summaryData["statistics"].(map[string]interface{}); ok {
		result.Statistics = p.extractStatistics(stats)
	}

	result.ReportPath = filepath.Dir(path)
	return result, nil
}

// extractStatistics extracts metrics from the statistics object
func (p *ResultParser) extractStatistics(stats map[string]interface{}) SitespeedStatistics {
	result := SitespeedStatistics{}

	// Extract visual metrics
	if vm, ok := stats["visualMetrics"].(map[string]interface{}); ok {
		result.VisualMetrics = VisualMetrics{
			SpeedIndex:        p.extractStatValue(vm, "SpeedIndex"),
			FirstVisualChange: p.extractStatValue(vm, "FirstVisualChange"),
			LastVisualChange:  p.extractStatValue(vm, "LastVisualChange"),
			LCP:               p.extractStatValue(vm, "LargestContentfulPaint"),
		}
	}

	// Extract Google Web Vitals
	if gwv, ok := stats["googleWebVitals"].(map[string]interface{}); ok {
		result.GoogleWebVitals = GoogleWebVitals{
			LCP: p.extractStatValue(gwv, "largestContentfulPaint"),
			FCP: p.extractStatValue(gwv, "firstContentfulPaint"),
			CLS: p.extractStatValue(gwv, "cumulativeLayoutShift"),
			TBT: p.extractStatValue(gwv, "totalBlockingTime"),
		}
	}

	// Extract timings
	if timings, ok := stats["timings"].(map[string]interface{}); ok {
		result.Timings = Timings{
			TTFB: p.extractStatValue(timings, "timeToFirstByte"),
		}

		// Try alternate path for TTFB
		if result.Timings.TTFB.Median == 0 {
			if pt, ok := timings["pageTimings"].(map[string]interface{}); ok {
				result.Timings.TTFB = p.extractStatValue(pt, "backEndTime")
				result.Timings.BackendTime = p.extractStatValue(pt, "backEndTime")
				result.Timings.FrontendTime = p.extractStatValue(pt, "frontEndTime")
			}
		}

		// Extract navigation timings
		if nt, ok := timings["navigationTiming"].(map[string]interface{}); ok {
			result.Timings.DNS = p.extractStatValue(nt, "domainLookupTime")
			result.Timings.Connect = p.extractStatValue(nt, "connectTime")
			result.Timings.SSL = p.extractStatValue(nt, "secureConnectionTime")
		}

		// Extract fully loaded
		result.Timings.FullyLoaded = p.extractStatValue(timings, "fullyLoaded")
	}

	// Extract page info
	if pageInfo, ok := stats["pageinfo"].(map[string]interface{}); ok {
		result.PageInfo = PageInfo{
			Requests:     p.extractStatValue(pageInfo, "requests"),
			TransferSize: p.extractStatValue(pageInfo, "transferSize"),
			DOMElements:  p.extractStatValue(pageInfo, "domElements"),
		}
	}

	// Extract content size breakdown
	if contentSize, ok := stats["contentSize"].(map[string]interface{}); ok {
		result.ContentSize = ContentSize{
			HTML:  p.extractStatValue(contentSize, "html"),
			CSS:   p.extractStatValue(contentSize, "css"),
			JS:    p.extractStatValue(contentSize, "javascript"),
			Image: p.extractStatValue(contentSize, "image"),
			Font:  p.extractStatValue(contentSize, "font"),
			Other: p.extractStatValue(contentSize, "other"),
			Total: p.extractStatValue(contentSize, "total"),
		}
	}

	// Extract coach scores
	if coach, ok := stats["coach"].(map[string]interface{}); ok {
		if coachRun, ok := coach["coachAdvice"].(map[string]interface{}); ok {
			result.Coach = CoachScore{
				Score:         p.extractStatValue(coachRun, "score"),
				Performance:   p.extractStatValue(coachRun, "performance"),
				Accessibility: p.extractStatValue(coachRun, "accessibility"),
				BestPractice:  p.extractStatValue(coachRun, "bestPractice"),
			}
		}
	}

	// Extract CPU metrics
	if cpu, ok := stats["cpu"].(map[string]interface{}); ok {
		result.CPU = CPUMetrics{
			LongTasks:       p.extractStatValue(cpu, "longTasks"),
			LongTasksTime:   p.extractStatValue(cpu, "longTasksTotalDuration"),
			MaxLongTaskTime: p.extractStatValue(cpu, "maxPotentialFid"),
		}
	}

	// Extract request breakdown
	if requests, ok := stats["requests"].(map[string]interface{}); ok {
		result.Requests = RequestBreakdown{
			HTML:       p.extractStatValue(requests, "html"),
			CSS:        p.extractStatValue(requests, "css"),
			JavaScript: p.extractStatValue(requests, "javascript"),
			Image:      p.extractStatValue(requests, "image"),
			Font:       p.extractStatValue(requests, "font"),
			Other:      p.extractStatValue(requests, "other"),
		}
	}

	// Try to get third party requests
	if thirdParty, ok := stats["thirdParty"].(map[string]interface{}); ok {
		result.Requests.ThirdParty = p.extractStatValue(thirdParty, "requests")
	}

	return result
}

// extractStatValue extracts a statistical value from a metric
func (p *ResultParser) extractStatValue(data map[string]interface{}, key string) StatValue {
	result := StatValue{}

	if val, ok := data[key].(map[string]interface{}); ok {
		if median, ok := val["median"].(float64); ok {
			result.Median = median
		}
		if mean, ok := val["mean"].(float64); ok {
			result.Mean = mean
		}
		if min, ok := val["min"].(float64); ok {
			result.Min = min
		}
		if max, ok := val["max"].(float64); ok {
			result.Max = max
		}
		if p90, ok := val["p90"].(float64); ok {
			result.P90 = p90
		}
		if p99, ok := val["p99"].(float64); ok {
			result.P99 = p99
		}
	} else if floatVal, ok := data[key].(float64); ok {
		// Simple value without statistics
		result.Median = floatVal
		result.Mean = floatVal
		result.Min = floatVal
		result.Max = floatVal
	}

	return result
}

// findFile recursively finds a file by name
func (p *ResultParser) findFile(rootDir, filename string) string {
	var foundPath string

	filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && strings.HasSuffix(info.Name(), filename) {
			foundPath = path
			return filepath.SkipDir
		}
		return nil
	})

	return foundPath
}

// ConvertToMetrics converts SitespeedResult to PerformanceMetrics
func (p *ResultParser) ConvertToMetrics(result *SitespeedResult, testID string) *PerformanceMetrics {
	metrics := &PerformanceMetrics{
		TestID:     testID,
		URL:        result.URL,
		ReportPath: result.ReportPath,
		RawData:    result.RawData,
	}

	stats := result.Statistics

	// Use Google Web Vitals if available, otherwise fall back to visual metrics
	if stats.GoogleWebVitals.LCP.Median > 0 {
		metrics.LCP = stats.GoogleWebVitals.LCP.Median
	} else {
		metrics.LCP = stats.VisualMetrics.LCP.Median
	}

	metrics.FCP = stats.GoogleWebVitals.FCP.Median
	metrics.CLS = stats.GoogleWebVitals.CLS.Median
	metrics.TBT = stats.GoogleWebVitals.TBT.Median

	metrics.TTFB = stats.Timings.TTFB.Median
	metrics.SpeedIndex = stats.VisualMetrics.SpeedIndex.Median
	metrics.FirstVisualChange = stats.VisualMetrics.FirstVisualChange.Median
	metrics.LastVisualChange = stats.VisualMetrics.LastVisualChange.Median

	metrics.Requests = int(stats.PageInfo.Requests.Median)
	metrics.TransferSize = int64(stats.PageInfo.TransferSize.Median)
	metrics.DOMElements = int(stats.PageInfo.DOMElements.Median)

	// Content Size Breakdown
	metrics.HTMLSize = int64(stats.ContentSize.HTML.Median)
	metrics.CSSSize = int64(stats.ContentSize.CSS.Median)
	metrics.JSSize = int64(stats.ContentSize.JS.Median)
	metrics.ImageSize = int64(stats.ContentSize.Image.Median)
	metrics.FontSize = int64(stats.ContentSize.Font.Median)
	metrics.OtherSize = int64(stats.ContentSize.Other.Median)

	// Navigation Timings
	metrics.DNSTime = stats.Timings.DNS.Median
	metrics.ConnectTime = stats.Timings.Connect.Median
	metrics.SSLTime = stats.Timings.SSL.Median
	metrics.BackendTime = stats.Timings.BackendTime.Median
	metrics.FrontendTime = stats.Timings.FrontendTime.Median
	metrics.FullyLoaded = stats.Timings.FullyLoaded.Median

	// Coach Scores
	metrics.CoachScore = stats.Coach.Score.Median
	metrics.CoachPerformance = stats.Coach.Performance.Median
	metrics.CoachAccessibility = stats.Coach.Accessibility.Median
	metrics.CoachBestPractice = stats.Coach.BestPractice.Median

	// CPU Metrics
	metrics.CPULongTasks = int(stats.CPU.LongTasks.Median)
	metrics.CPULongTasksTime = stats.CPU.LongTasksTime.Median
	metrics.MaxLongTaskTime = stats.CPU.MaxLongTaskTime.Median

	// Request Breakdown
	metrics.RequestsHTML = int(stats.Requests.HTML.Median)
	metrics.RequestsCSS = int(stats.Requests.CSS.Median)
	metrics.RequestsJS = int(stats.Requests.JavaScript.Median)
	metrics.RequestsImage = int(stats.Requests.Image.Median)
	metrics.RequestsFont = int(stats.Requests.Font.Median)
	metrics.RequestsOther = int(stats.Requests.Other.Median)
	metrics.ThirdPartyRequests = int(stats.Requests.ThirdParty.Median)

	return metrics
}
