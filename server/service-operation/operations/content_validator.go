package operations

import (
	"encoding/json"
	"fmt"
	"strings"

	"service-operation/types"
)

// ContentValidator performs content validation on HTTP responses
type ContentValidator struct{}

// NewContentValidator creates a new ContentValidator instance
func NewContentValidator() *ContentValidator {
	return &ContentValidator{}
}

// ValidateResponse performs all configured content validations
func (cv *ContentValidator) ValidateResponse(
	result *types.OperationResult,
	config *types.ValidationConfig,
) *types.ValidationResult {
	validationResult := &types.ValidationResult{
		Passed: true,
	}

	// Skip validation if no config provided
	if config == nil || !config.HasValidationRules() {
		return validationResult
	}

	// 1. Validate expected status code
	if config.ExpectedStatusCode > 0 {
		statusResult := cv.validateStatusCode(result.HTTPStatusCode, config.ExpectedStatusCode)
		validationResult.StatusCodeResult = statusResult
		if !statusResult.Passed {
			validationResult.Passed = false
			validationResult.FailureReason = statusResult.Message
		}
	}

	// 2. Validate keyword check
	if config.KeywordCheck != "" {
		keywordResult := cv.validateKeyword(result.ResponseBody, config.KeywordCheck, config.KeywordCheckType)
		validationResult.KeywordResult = keywordResult
		if !keywordResult.Passed {
			validationResult.Passed = false
			if validationResult.FailureReason == "" {
				validationResult.FailureReason = keywordResult.Message
			}
		}
	}

	// 3. Validate JSON path checks
	if len(config.JSONPathChecks) > 0 {
		for _, check := range config.JSONPathChecks {
			jsonResult := cv.validateJSONPath(result.ResponseBody, check)
			validationResult.JSONPathResults = append(validationResult.JSONPathResults, *jsonResult)
			if !jsonResult.Passed {
				validationResult.Passed = false
				if validationResult.FailureReason == "" {
					validationResult.FailureReason = jsonResult.Message
				}
			}
		}
	}

	// 4. Validate header checks
	if len(config.HeaderChecks) > 0 {
		for _, check := range config.HeaderChecks {
			headerResult := cv.validateHeader(result.HTTPHeaders, check)
			validationResult.HeaderResults = append(validationResult.HeaderResults, *headerResult)
			if !headerResult.Passed {
				validationResult.Passed = false
				if validationResult.FailureReason == "" {
					validationResult.FailureReason = headerResult.Message
				}
			}
		}
	}

	return validationResult
}

func (cv *ContentValidator) validateStatusCode(actual, expected int) *types.StatusCodeValidation {
	passed := actual == expected
	message := ""
	if !passed {
		message = fmt.Sprintf("Expected status code %d, got %d", expected, actual)
	}
	return &types.StatusCodeValidation{
		Expected: expected,
		Actual:   actual,
		Passed:   passed,
		Message:  message,
	}
}

func (cv *ContentValidator) validateKeyword(body, keyword, checkType string) *types.KeywordValidation {
	found := strings.Contains(body, keyword)

	var passed bool
	var message string

	switch checkType {
	case "not_contains":
		passed = !found
		if !passed {
			message = fmt.Sprintf("Keyword '%s' was found but should not be present", keyword)
		}
	default: // "contains" is the default
		passed = found
		if !passed {
			message = fmt.Sprintf("Keyword '%s' not found in response body", keyword)
		}
	}

	return &types.KeywordValidation{
		Keyword:   keyword,
		CheckType: checkType,
		Found:     found,
		Passed:    passed,
		Message:   message,
	}
}

func (cv *ContentValidator) validateJSONPath(body string, check types.JSONPathCheck) *types.JSONPathValidation {
	result := &types.JSONPathValidation{
		Path:          check.Path,
		Operator:      check.Operator,
		ExpectedValue: check.ExpectedValue,
		Passed:        false,
	}

	// Parse JSON body
	var jsonData interface{}
	if err := json.Unmarshal([]byte(body), &jsonData); err != nil {
		result.Message = fmt.Sprintf("Failed to parse response as JSON: %v", err)
		return result
	}

	// Execute JSON path query using simple path parser
	value, found := cv.getJSONPathValue(jsonData, check.Path)

	if !found {
		if check.Operator == "not_exists" {
			result.Passed = true
			result.Message = "Path does not exist (as expected)"
		} else if check.Operator == "exists" {
			result.Message = fmt.Sprintf("JSON path '%s' not found in response", check.Path)
		} else {
			result.Message = fmt.Sprintf("JSON path '%s' not found in response", check.Path)
		}
		return result
	}

	// Convert value to string for comparison
	actualStr := fmt.Sprintf("%v", value)
	result.ActualValue = actualStr

	// Evaluate based on operator
	switch check.Operator {
	case "exists":
		result.Passed = true
		result.Message = "Path exists"
	case "not_exists":
		result.Passed = false
		result.Message = fmt.Sprintf("JSON path '%s' exists but should not", check.Path)
	case "equals":
		result.Passed = actualStr == check.ExpectedValue
		if !result.Passed {
			result.Message = fmt.Sprintf("Expected '%s', got '%s'", check.ExpectedValue, actualStr)
		}
	case "not_equals":
		result.Passed = actualStr != check.ExpectedValue
		if !result.Passed {
			result.Message = fmt.Sprintf("Value should not equal '%s'", check.ExpectedValue)
		}
	case "contains":
		result.Passed = strings.Contains(actualStr, check.ExpectedValue)
		if !result.Passed {
			result.Message = fmt.Sprintf("Value '%s' does not contain '%s'", actualStr, check.ExpectedValue)
		}
	default:
		result.Message = fmt.Sprintf("Unknown operator: %s", check.Operator)
	}

	return result
}

// getJSONPathValue extracts a value from JSON data using a simple path format
// Supports: $.key, $.key.nested, $.key[0], $.key[0].nested
func (cv *ContentValidator) getJSONPathValue(data interface{}, path string) (interface{}, bool) {
	// Remove leading $. if present
	path = strings.TrimPrefix(path, "$.")
	path = strings.TrimPrefix(path, "$")

	if path == "" {
		return data, true
	}

	parts := cv.parseJSONPath(path)
	current := data

	for _, part := range parts {
		if part == "" {
			continue
		}

		switch v := current.(type) {
		case map[string]interface{}:
			val, ok := v[part]
			if !ok {
				return nil, false
			}
			current = val
		case []interface{}:
			// Try to parse as array index
			var index int
			if _, err := fmt.Sscanf(part, "%d", &index); err == nil {
				if index < 0 || index >= len(v) {
					return nil, false
				}
				current = v[index]
			} else {
				return nil, false
			}
		default:
			return nil, false
		}
	}

	return current, true
}

// parseJSONPath splits a JSON path into parts, handling array notation
func (cv *ContentValidator) parseJSONPath(path string) []string {
	var parts []string
	var current strings.Builder

	for i := 0; i < len(path); i++ {
		c := path[i]
		switch c {
		case '.':
			if current.Len() > 0 {
				parts = append(parts, current.String())
				current.Reset()
			}
		case '[':
			if current.Len() > 0 {
				parts = append(parts, current.String())
				current.Reset()
			}
		case ']':
			if current.Len() > 0 {
				parts = append(parts, current.String())
				current.Reset()
			}
		default:
			current.WriteByte(c)
		}
	}

	if current.Len() > 0 {
		parts = append(parts, current.String())
	}

	return parts
}

func (cv *ContentValidator) validateHeader(headers map[string]string, check types.HeaderCheck) *types.HeaderValidation {
	result := &types.HeaderValidation{
		HeaderName:    check.HeaderName,
		Operator:      check.Operator,
		ExpectedValue: check.ExpectedValue,
		Passed:        false,
	}

	// Get header value (case-insensitive lookup)
	actualValue := ""
	found := false
	for key, value := range headers {
		if strings.EqualFold(key, check.HeaderName) {
			actualValue = value
			found = true
			break
		}
	}
	result.ActualValue = actualValue

	switch check.Operator {
	case "exists":
		result.Passed = found
		if !result.Passed {
			result.Message = fmt.Sprintf("Header '%s' not found", check.HeaderName)
		}
	case "equals":
		result.Passed = found && actualValue == check.ExpectedValue
		if !result.Passed {
			if !found {
				result.Message = fmt.Sprintf("Header '%s' not found", check.HeaderName)
			} else {
				result.Message = fmt.Sprintf("Expected '%s', got '%s'", check.ExpectedValue, actualValue)
			}
		}
	case "contains":
		result.Passed = found && strings.Contains(actualValue, check.ExpectedValue)
		if !result.Passed {
			if !found {
				result.Message = fmt.Sprintf("Header '%s' not found", check.HeaderName)
			} else {
				result.Message = fmt.Sprintf("Header value '%s' does not contain '%s'", actualValue, check.ExpectedValue)
			}
		}
	default:
		result.Message = fmt.Sprintf("Unknown operator: %s", check.Operator)
	}

	return result
}
