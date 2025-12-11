package types

// ValidationConfig holds all content validation settings for a service
type ValidationConfig struct {
	ExpectedStatusCode int             `json:"expected_status_code,omitempty"`
	KeywordCheck       string          `json:"keyword_check,omitempty"`
	KeywordCheckType   string          `json:"keyword_check_type,omitempty"` // "contains" or "not_contains"
	JSONPathChecks     []JSONPathCheck `json:"json_path_checks,omitempty"`
	HeaderChecks       []HeaderCheck   `json:"header_checks,omitempty"`
}

// JSONPathCheck defines a single JSON path validation rule
type JSONPathCheck struct {
	Path          string `json:"path"`           // e.g., "$.data.status"
	Operator      string `json:"operator"`       // "equals", "not_equals", "contains", "exists", "not_exists"
	ExpectedValue string `json:"expected_value"` // expected value to match against
}

// HeaderCheck defines a single header validation rule
type HeaderCheck struct {
	HeaderName    string `json:"header_name"`    // e.g., "Content-Type"
	Operator      string `json:"operator"`       // "equals", "contains", "exists"
	ExpectedValue string `json:"expected_value"` // e.g., "application/json"
}

// ValidationResult holds the result of all validations for a single check
type ValidationResult struct {
	Passed           bool                   `json:"passed"`
	StatusCodeResult *StatusCodeValidation  `json:"status_code_result,omitempty"`
	KeywordResult    *KeywordValidation     `json:"keyword_result,omitempty"`
	JSONPathResults  []JSONPathValidation   `json:"json_path_results,omitempty"`
	HeaderResults    []HeaderValidation     `json:"header_results,omitempty"`
	FailureReason    string                 `json:"failure_reason,omitempty"`
}

// StatusCodeValidation result
type StatusCodeValidation struct {
	Expected int    `json:"expected"`
	Actual   int    `json:"actual"`
	Passed   bool   `json:"passed"`
	Message  string `json:"message,omitempty"`
}

// KeywordValidation result
type KeywordValidation struct {
	Keyword   string `json:"keyword"`
	CheckType string `json:"check_type"`
	Found     bool   `json:"found"`
	Passed    bool   `json:"passed"`
	Message   string `json:"message,omitempty"`
}

// JSONPathValidation result
type JSONPathValidation struct {
	Path          string `json:"path"`
	Operator      string `json:"operator"`
	ExpectedValue string `json:"expected_value"`
	ActualValue   string `json:"actual_value,omitempty"`
	Passed        bool   `json:"passed"`
	Message       string `json:"message,omitempty"`
}

// HeaderValidation result
type HeaderValidation struct {
	HeaderName    string `json:"header_name"`
	Operator      string `json:"operator"`
	ExpectedValue string `json:"expected_value"`
	ActualValue   string `json:"actual_value,omitempty"`
	Passed        bool   `json:"passed"`
	Message       string `json:"message,omitempty"`
}

// HasValidationRules checks if any validation rules are configured
func (c *ValidationConfig) HasValidationRules() bool {
	if c == nil {
		return false
	}
	return c.ExpectedStatusCode > 0 ||
		c.KeywordCheck != "" ||
		len(c.JSONPathChecks) > 0 ||
		len(c.HeaderChecks) > 0
}
