package middleware

import (
	"net/http"
	"strings"
)

// CORSMiddleware handles Cross-Origin Resource Sharing
type CORSMiddleware struct {
	allowedOrigins map[string]bool
	allowAll       bool
}

// NewCORSMiddleware creates a new CORS middleware with specified allowed origins
// If origins is empty, allows all origins (for development only)
func NewCORSMiddleware(origins []string) *CORSMiddleware {
	m := &CORSMiddleware{
		allowedOrigins: make(map[string]bool),
	}

	if len(origins) == 0 {
		m.allowAll = true
		return m
	}

	for _, origin := range origins {
		origin = strings.TrimSpace(origin)
		if origin == "*" {
			m.allowAll = true
			return m
		}
		if origin != "" {
			m.allowedOrigins[origin] = true
		}
	}

	return m
}

// Handle wraps an http.Handler with CORS headers
func (c *CORSMiddleware) Handle(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Check if origin is allowed
		if c.isOriginAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else if c.allowAll {
			// For development/backwards compatibility when no origins configured
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		// If origin is not allowed and allowAll is false, don't set CORS headers
		// Browser will block the request

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// isOriginAllowed checks if the given origin is in the allowed list
func (c *CORSMiddleware) isOriginAllowed(origin string) bool {
	if origin == "" {
		return false
	}
	return c.allowedOrigins[origin]
}
