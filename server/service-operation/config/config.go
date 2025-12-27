package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port           string
	DefaultCount   int
	DefaultTimeout time.Duration
	MaxCount       int
	MaxTimeout     time.Duration
	EnableLogging  bool

	// PocketBase configuration
	PocketBaseEnabled  bool
	PocketBaseURL      string

	// Security configuration
	AllowedOrigins   []string // CORS allowed origins
	AuthEnabled      bool     // Enable authentication middleware
	AllowPrivateIPs  bool     // Allow SSRF to private IPs (for internal monitoring)
	RBACEnabled      bool     // Enable RBAC permission checks
}

func Load() *Config {
	cfg := &Config{
		Port:           getEnv("PORT", "8091"),
		DefaultCount:   getEnvInt("DEFAULT_COUNT", 4),
		DefaultTimeout: getEnvDuration("DEFAULT_TIMEOUT", 15*time.Second),
		MaxCount:       getEnvInt("MAX_COUNT", 20),
		MaxTimeout:     getEnvDuration("MAX_TIMEOUT", 30*time.Second),
		EnableLogging:  getEnvBool("ENABLE_LOGGING", true),

		// PocketBase settings
		PocketBaseEnabled:  getEnvBool("POCKETBASE_ENABLED", true),
		PocketBaseURL:      getEnv("POCKETBASE_URL", ""),

		// Security settings
		AllowedOrigins:  getEnvList("ALLOWED_ORIGINS", []string{}),
		AuthEnabled:     getEnvBool("AUTH_ENABLED", true),
		AllowPrivateIPs: getEnvBool("ALLOW_PRIVATE_IPS", true), // Default true for internal monitoring
		RBACEnabled:     getEnvBool("RBAC_ENABLED", true),      // Enable RBAC by default
	}

	return cfg
}

func getEnvList(key string, defaultValue []string) []string {
	if value := os.Getenv(key); value != "" {
		// Split by comma and trim whitespace
		parts := strings.Split(value, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		return result
	}
	return defaultValue
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}