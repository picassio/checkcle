package middleware

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"
)

// Security: Regex for validating PocketBase IDs and collection names
var (
	validIDRegex         = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
	validCollectionRegex = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)
)

// sanitizeID validates and sanitizes a PocketBase ID
func sanitizeID(id string) (string, error) {
	if id == "" || len(id) > 50 {
		return "", fmt.Errorf("invalid ID format")
	}
	if !validIDRegex.MatchString(id) {
		return "", fmt.Errorf("invalid ID format: contains invalid characters")
	}
	return id, nil
}

// sanitizeCollectionName validates and sanitizes a collection name
func sanitizeCollectionName(name string) (string, error) {
	if name == "" || len(name) > 50 {
		return "", fmt.Errorf("invalid collection name")
	}
	if !validCollectionRegex.MatchString(name) {
		return "", fmt.Errorf("invalid collection name: contains invalid characters")
	}
	return name, nil
}

// RBACMiddleware provides role-based access control
type RBACMiddleware struct {
	pbURL      string
	httpClient *http.Client
	cache      *permissionCache
}

// permissionCache caches user permissions to reduce PocketBase calls
type permissionCache struct {
	mu      sync.RWMutex
	entries map[string]*cacheEntry
	ttl     time.Duration
}

type cacheEntry struct {
	permissions map[string]bool // "resource:action" -> granted
	roles       []string
	expiresAt   time.Time
}

// NewRBACMiddleware creates a new RBAC middleware instance
func NewRBACMiddleware(pocketbaseURL string) *RBACMiddleware {
	return &RBACMiddleware{
		pbURL: pocketbaseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		cache: &permissionCache{
			entries: make(map[string]*cacheEntry),
			ttl:     5 * time.Minute, // Cache permissions for 5 minutes
		},
	}
}

// RequirePermission returns middleware that requires a specific permission
func (r *RBACMiddleware) RequirePermission(resource, action string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			if r.pbURL == "" {
				// RBAC not enabled, allow all
				next.ServeHTTP(w, req)
				return
			}

			// Get the auth token from header
			authHeader := req.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error": "Missing Authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"error": "Invalid Authorization header format"}`, http.StatusUnauthorized)
				return
			}
			token := parts[1]

			// Get user info and check permissions
			hasPermission, err := r.checkPermission(token, resource, action)
			if err != nil {
				http.Error(w, `{"error": "Permission check failed"}`, http.StatusServiceUnavailable)
				return
			}

			if !hasPermission {
				http.Error(w, fmt.Sprintf(`{"error": "Permission denied. Required: %s:%s"}`, resource, action), http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, req)
		})
	}
}

// RequireAnyPermission returns middleware that requires any of the specified permissions
func (r *RBACMiddleware) RequireAnyPermission(permissions [][]string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			if r.pbURL == "" {
				next.ServeHTTP(w, req)
				return
			}

			authHeader := req.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error": "Missing Authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"error": "Invalid Authorization header format"}`, http.StatusUnauthorized)
				return
			}
			token := parts[1]

			// Check if user has any of the required permissions
			for _, perm := range permissions {
				if len(perm) == 2 {
					hasPermission, err := r.checkPermission(token, perm[0], perm[1])
					if err == nil && hasPermission {
						next.ServeHTTP(w, req)
						return
					}
				}
			}

			http.Error(w, `{"error": "Permission denied"}`, http.StatusForbidden)
		})
	}
}

// checkPermission verifies if the token holder has the specified permission
func (r *RBACMiddleware) checkPermission(token, resource, action string) (bool, error) {
	// Get user info from token
	userInfo, err := r.getUserFromToken(token)
	if err != nil {
		fmt.Printf("[RBAC] getUserFromToken failed: %v\n", err)
		return false, err
	}

	// Superusers always have all permissions
	if userInfo.Collection == "_superusers" {
		return true, nil
	}

	// Check cache first
	cacheKey := fmt.Sprintf("%s:%s", userInfo.Collection, userInfo.ID)
	if entry := r.cache.get(cacheKey); entry != nil {
		permKey := fmt.Sprintf("%s:%s", resource, action)
		return entry.permissions[permKey], nil
	}

	// Fetch permissions from PocketBase
	permissions, roles, err := r.fetchUserPermissions(token, userInfo.ID, userInfo.Collection)
	if err != nil {
		fmt.Printf("[RBAC] fetchUserPermissions failed for user %s: %v\n", userInfo.ID, err)
		return false, err
	}
	fmt.Printf("[RBAC] User %s permissions: %v, roles: %v\n", userInfo.ID, permissions, roles)

	// Cache the permissions
	r.cache.set(cacheKey, permissions, roles)

	// Check the permission
	permKey := fmt.Sprintf("%s:%s", resource, action)
	return permissions[permKey], nil
}

// UserInfo represents basic user information
type UserInfo struct {
	ID         string
	Collection string
}

// getUserFromToken extracts user information from a valid token
func (r *RBACMiddleware) getUserFromToken(token string) (*UserInfo, error) {
	// Try users collection first
	if userInfo, err := r.tryGetUserFromCollection(token, "users"); err == nil {
		return userInfo, nil
	}

	// Try superusers collection
	if userInfo, err := r.tryGetUserFromCollection(token, "_superusers"); err == nil {
		return userInfo, nil
	}

	return nil, fmt.Errorf("invalid token")
}

func (r *RBACMiddleware) tryGetUserFromCollection(token, collection string) (*UserInfo, error) {
	reqURL := fmt.Sprintf("%s/api/collections/%s/auth-refresh", r.pbURL, collection)

	req, err := http.NewRequest("POST", reqURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("auth failed: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var authResp struct {
		Record struct {
			ID string `json:"id"`
		} `json:"record"`
	}

	if err := json.Unmarshal(body, &authResp); err != nil {
		return nil, err
	}

	return &UserInfo{
		ID:         authResp.Record.ID,
		Collection: collection,
	}, nil
}

// fetchUserPermissions gets all permissions for a user from PocketBase
func (r *RBACMiddleware) fetchUserPermissions(token, userID, userCollection string) (map[string]bool, []string, error) {
	permissions := make(map[string]bool)
	var roles []string

	// Security: Sanitize inputs to prevent injection
	safeUserID, err := sanitizeID(userID)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid user ID: %w", err)
	}
	safeCollection, err := sanitizeCollectionName(userCollection)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid collection: %w", err)
	}

	// 1. Get user's roles
	userRolesFilter := fmt.Sprintf("user_id='%s' && user_collection='%s'", safeUserID, safeCollection)
	userRolesURL := fmt.Sprintf("%s/api/collections/user_roles/records?filter=%s&expand=role_id",
		r.pbURL, url.QueryEscape(userRolesFilter))

	req, err := http.NewRequest("GET", userRolesURL, nil)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Authorization", token)

	resp, err := r.httpClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("failed to fetch user roles: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, err
	}

	var userRolesResp struct {
		Items []struct {
			RoleID string `json:"role_id"`
			Expand struct {
				RoleID struct {
					ID   string `json:"id"`
					Name string `json:"name"`
				} `json:"role_id"`
			} `json:"expand"`
		} `json:"items"`
	}

	if err := json.Unmarshal(body, &userRolesResp); err != nil {
		return nil, nil, err
	}

	roleIDs := make([]string, 0)
	for _, ur := range userRolesResp.Items {
		roleIDs = append(roleIDs, ur.RoleID)
		if ur.Expand.RoleID.Name != "" {
			roles = append(roles, ur.Expand.RoleID.Name)
		}
	}

	// 2. Get permissions for each role
	for _, roleID := range roleIDs {
		// Security: Sanitize role ID
		safeRoleID, err := sanitizeID(roleID)
		if err != nil {
			continue // Skip invalid role IDs
		}

		rolePermsFilter := fmt.Sprintf("role_id='%s'", safeRoleID)
		rolePermsURL := fmt.Sprintf("%s/api/collections/role_permissions/records?filter=%s&expand=permission_id",
			r.pbURL, url.QueryEscape(rolePermsFilter))

		req, err := http.NewRequest("GET", rolePermsURL, nil)
		if err != nil {
			continue
		}
		req.Header.Set("Authorization", token)

		resp, err := r.httpClient.Do(req)
		if err != nil {
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			continue
		}

		var rolePermsResp struct {
			Items []struct {
				Expand struct {
					PermissionID struct {
						Resource string `json:"resource"`
						Action   string `json:"action"`
					} `json:"permission_id"`
				} `json:"expand"`
			} `json:"items"`
		}

		if err := json.Unmarshal(body, &rolePermsResp); err != nil {
			continue
		}

		for _, rp := range rolePermsResp.Items {
			permKey := fmt.Sprintf("%s:%s", rp.Expand.PermissionID.Resource, rp.Expand.PermissionID.Action)
			permissions[permKey] = true
		}
	}

	// 3. Get user-specific permission overrides
	userPermsFilter := fmt.Sprintf("user_id='%s' && user_collection='%s'", safeUserID, safeCollection)
	userPermsURL := fmt.Sprintf("%s/api/collections/user_permissions/records?filter=%s&expand=permission_id",
		r.pbURL, url.QueryEscape(userPermsFilter))

	req, err = http.NewRequest("GET", userPermsURL, nil)
	if err == nil {
		req.Header.Set("Authorization", token)
		resp, err := r.httpClient.Do(req)
		if err == nil {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			var userPermsResp struct {
				Items []struct {
					Granted bool `json:"granted"`
					Expand  struct {
						PermissionID struct {
							Resource string `json:"resource"`
							Action   string `json:"action"`
						} `json:"permission_id"`
					} `json:"expand"`
				} `json:"items"`
			}

			if json.Unmarshal(body, &userPermsResp) == nil {
				for _, up := range userPermsResp.Items {
					permKey := fmt.Sprintf("%s:%s", up.Expand.PermissionID.Resource, up.Expand.PermissionID.Action)
					// User-specific overrides take precedence
					permissions[permKey] = up.Granted
				}
			}
		}
	}

	// 4. Get resource-level assignments - grants permission if user has any assignment with manage access
	// This allows users with specific resource assignments to perform actions on those resources
	resourceAssignFilter := fmt.Sprintf("user_id='%s' && user_collection='%s'", safeUserID, safeCollection)
	resourceAssignURL := fmt.Sprintf("%s/api/collections/resource_assignments/records?filter=%s",
		r.pbURL, url.QueryEscape(resourceAssignFilter))

	req, err = http.NewRequest("GET", resourceAssignURL, nil)
	if err == nil {
		req.Header.Set("Authorization", token)
		resp, err := r.httpClient.Do(req)
		if err != nil {
			fmt.Printf("[RBAC] resource_assignments request failed: %v\n", err)
		} else {
			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			fmt.Printf("[RBAC] resource_assignments response status: %d, body: %s\n", resp.StatusCode, string(body))

			var resourceAssignResp struct {
				Items []struct {
					ResourceType string `json:"resource_type"`
					ResourceID   string `json:"resource_id"`
					AccessLevel  string `json:"access_level"`
				} `json:"items"`
			}

			if json.Unmarshal(body, &resourceAssignResp) == nil {
				// Track which resource types have manage access via assignments
				resourceManageAccess := make(map[string]bool)
				resourceViewAccess := make(map[string]bool)

				for _, ra := range resourceAssignResp.Items {
					if ra.AccessLevel == "manage" {
						resourceManageAccess[ra.ResourceType] = true
					}
					if ra.AccessLevel == "view" || ra.AccessLevel == "manage" {
						resourceViewAccess[ra.ResourceType] = true
					}
				}

				// Grant permissions based on resource assignments
				// If user has manage access to any resource of a type, allow manage actions
				for resourceType := range resourceManageAccess {
					permissions[fmt.Sprintf("%s:manage", resourceType)] = true
					permissions[fmt.Sprintf("%s:view", resourceType)] = true
					permissions[fmt.Sprintf("%s:create", resourceType)] = true
				}

				// If user has view access to any resource of a type, allow view actions
				for resourceType := range resourceViewAccess {
					if !resourceManageAccess[resourceType] {
						permissions[fmt.Sprintf("%s:view", resourceType)] = true
					}
				}

				fmt.Printf("[RBAC] After resource_assignments - manage: %v, view: %v\n", resourceManageAccess, resourceViewAccess)
			}
		}
	}

	return permissions, roles, nil
}

// Cache methods
func (c *permissionCache) get(key string) *cacheEntry {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.entries[key]
	if !exists {
		return nil
	}

	if time.Now().After(entry.expiresAt) {
		return nil
	}

	return entry
}

func (c *permissionCache) set(key string, permissions map[string]bool, roles []string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.entries[key] = &cacheEntry{
		permissions: permissions,
		roles:       roles,
		expiresAt:   time.Now().Add(c.ttl),
	}
}

// InvalidateCache removes cached permissions for a user
func (r *RBACMiddleware) InvalidateCache(userID, userCollection string) {
	cacheKey := fmt.Sprintf("%s:%s", userCollection, userID)
	r.cache.mu.Lock()
	delete(r.cache.entries, cacheKey)
	r.cache.mu.Unlock()
}

// InvalidateAllCache clears the entire permission cache
func (r *RBACMiddleware) InvalidateAllCache() {
	r.cache.mu.Lock()
	r.cache.entries = make(map[string]*cacheEntry)
	r.cache.mu.Unlock()
}
