import PocketBase from 'pocketbase';

// Dynamically detect API base URL from current host (for use in browser)
const dynamicBaseUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8090`
    : 'http://localhost:8090';

// Define available API endpoints
export const API_ENDPOINTS = {
  REMOTE: dynamicBaseUrl
};

// Get the current endpoint from localStorage or use remote as default
export const getCurrentEndpoint = (): string => {
  if (typeof window !== 'undefined') {
    const savedEndpoint = localStorage.getItem('pocketbase_endpoint');
    return savedEndpoint || API_ENDPOINTS.REMOTE;
  }
  return API_ENDPOINTS.REMOTE;
};

// Set the API endpoint and reinitialize PocketBase
export const setApiEndpoint = (endpoint: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pocketbase_endpoint', endpoint);
    window.location.reload(); // Reload to reinitialize PocketBase with new endpoint
  }
};

// Initialize the PocketBase client with the current API URL
export const pb = new PocketBase(getCurrentEndpoint());

// Helper to check if user is authenticated
export const isAuthenticated = () => {
  return pb.authStore.isValid;
};

// Export the auth store for use in components
export const authStore = pb.authStore;

// Security helper: Validate token expiry
const isTokenExpired = (token: string): boolean => {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));

    // Check if token has expired (exp is in seconds)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch {
    // If we can't parse the token, consider it expired
    return true;
  }
};

// Security helper: Clear all auth data
export const clearAuthData = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pocketbase_auth');
    pb.authStore.clear();
  }
};

// Configure PocketBase to persist authentication between page reloads
// SECURITY NOTE: Tokens are stored in localStorage which is accessible to JavaScript.
// For enhanced security in production, consider implementing httpOnly cookies
// via a backend proxy. The current implementation includes token expiry validation.
if (typeof window !== 'undefined') {
  const storedAuthData = localStorage.getItem('pocketbase_auth');
  if (storedAuthData) {
    try {
      const parsedData = JSON.parse(storedAuthData);

      // Security: Validate token before restoring
      if (parsedData.token && !isTokenExpired(parsedData.token)) {
        pb.authStore.save(parsedData.token, parsedData.model);
      } else {
        // Token is expired or invalid, clear it
        localStorage.removeItem('pocketbase_auth');
      }
    } catch {
      // Failed to parse stored auth data, remove it
      localStorage.removeItem('pocketbase_auth');
    }
  }

  // Subscribe to authStore changes to persist authentication
  pb.authStore.onChange(() => {
    if (pb.authStore.isValid && pb.authStore.token) {
      // Only save if token is not expired
      if (!isTokenExpired(pb.authStore.token)) {
        localStorage.setItem('pocketbase_auth', JSON.stringify({
          token: pb.authStore.token,
          model: pb.authStore.model
        }));
      }
    } else {
      localStorage.removeItem('pocketbase_auth');
    }
  });
}
