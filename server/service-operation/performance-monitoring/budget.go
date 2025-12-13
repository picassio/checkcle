package performancemonitoring

// BudgetChecker validates performance metrics against budget limits
type BudgetChecker struct{}

// NewBudgetChecker creates a new budget checker
func NewBudgetChecker() *BudgetChecker {
	return &BudgetChecker{}
}

// CheckBudget validates metrics against the provided budget
func (bc *BudgetChecker) CheckBudget(metrics *PerformanceMetrics, budget *PerformanceBudget) (bool, map[string]interface{}) {
	if budget == nil {
		return true, nil
	}

	results := make(map[string]interface{})
	allPassed := true

	// Check LCP
	if budget.LCPLimit > 0 {
		result := bc.checkMetric("lcp", metrics.LCP, float64(budget.LCPLimit))
		results["lcp"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check FCP
	if budget.FCPLimit > 0 {
		result := bc.checkMetric("fcp", metrics.FCP, float64(budget.FCPLimit))
		results["fcp"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check CLS
	if budget.CLSLimit > 0 {
		result := bc.checkMetric("cls", metrics.CLS, budget.CLSLimit)
		results["cls"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check TBT
	if budget.TBTLimit > 0 {
		result := bc.checkMetric("tbt", metrics.TBT, float64(budget.TBTLimit))
		results["tbt"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check TTFB
	if budget.TTFBLimit > 0 {
		result := bc.checkMetric("ttfb", metrics.TTFB, float64(budget.TTFBLimit))
		results["ttfb"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check Speed Index
	if budget.SpeedIndexLimit > 0 {
		result := bc.checkMetric("speed_index", metrics.SpeedIndex, float64(budget.SpeedIndexLimit))
		results["speed_index"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check Requests
	if budget.RequestsLimit > 0 {
		result := bc.checkMetric("requests", float64(metrics.Requests), float64(budget.RequestsLimit))
		results["requests"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	// Check Transfer Size
	if budget.TransferSizeLimit > 0 {
		result := bc.checkMetric("transfer_size", float64(metrics.TransferSize), float64(budget.TransferSizeLimit))
		results["transfer_size"] = result
		if !result.Passed {
			allPassed = false
		}
	}

	return allPassed, results
}

// checkMetric compares a metric value against its limit
func (bc *BudgetChecker) checkMetric(name string, value, limit float64) BudgetCheckResult {
	passed := value <= limit
	severity := bc.getSeverity(name, value)

	return BudgetCheckResult{
		Metric:   name,
		Value:    value,
		Limit:    limit,
		Passed:   passed,
		Severity: severity,
	}
}

// getSeverity determines the severity level based on Google's Core Web Vitals thresholds
func (bc *BudgetChecker) getSeverity(metric string, value float64) string {
	thresholds := map[string]struct {
		good float64
		poor float64
	}{
		"lcp":         {2500, 4000},
		"fcp":         {1800, 3000},
		"cls":         {0.1, 0.25},
		"tbt":         {200, 600},
		"ttfb":        {800, 1800},
		"speed_index": {3400, 5800},
	}

	if t, ok := thresholds[metric]; ok {
		if value <= t.good {
			return "good"
		}
		if value <= t.poor {
			return "needs-improvement"
		}
		return "poor"
	}

	// For metrics without defined thresholds
	return "unknown"
}

// GetWebVitalStatus returns the overall status based on Core Web Vitals
func (bc *BudgetChecker) GetWebVitalStatus(metrics *PerformanceMetrics) string {
	lcpStatus := bc.getSeverity("lcp", metrics.LCP)
	fcpStatus := bc.getSeverity("fcp", metrics.FCP)
	clsStatus := bc.getSeverity("cls", metrics.CLS)

	// Return the worst status
	if lcpStatus == "poor" || fcpStatus == "poor" || clsStatus == "poor" {
		return "poor"
	}
	if lcpStatus == "needs-improvement" || fcpStatus == "needs-improvement" || clsStatus == "needs-improvement" {
		return "needs-improvement"
	}
	return "good"
}

// GetFailedBudgets returns a list of metrics that failed their budgets
func (bc *BudgetChecker) GetFailedBudgets(results map[string]interface{}) []BudgetCheckResult {
	var failed []BudgetCheckResult

	for _, v := range results {
		if result, ok := v.(BudgetCheckResult); ok {
			if !result.Passed {
				failed = append(failed, result)
			}
		}
	}

	return failed
}
