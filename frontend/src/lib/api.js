// src/lib/api.js
// Real backend only. Uses CRA proxy to reach Express on :4000.
// Usage: api.get('/menu'), api.post('/auth/login', {...}), etc.

/**
 * ============================================================================
 * COOKIE-FIRST AUTHENTICATION
 * ============================================================================
 * 
 * This API client is designed for cookie-based authentication (httpOnly cookies).
 * 
 * IMPORTANT: All requests include `credentials: "include"` which tells the browser
 * to automatically send httpOnly cookies with every request.
 * 
 * MIGRATION NOTES:
 * - Old: localStorage token with Authorization header (insecure, XSS vulnerable)
 * - New: httpOnly cookies (secure, XSS-proof, CSRF-protected with SameSite)
 * 
 * FALLBACK FOR DEVELOPMENT:
 * - Still checks localStorage for "token" in development mode only
 * - This is temporary backward compatibility during migration
 * - Remove Authorization header once backend fully implements cookie auth
 * 
 * BACKEND REQUIREMENTS:
 * - Set-Cookie with httpOnly, secure, SameSite=strict on login
 * - Validate cookie on all protected endpoints
 * - Clear cookie on logout
 * 
 * ============================================================================
 */

// allow overriding backend host via REACT_APP_API_URL (e.g. http://localhost:4000)
const API_BASE = (process.env.REACT_APP_API_URL || "").replace(/\/$/, ""); // no trailing slash

const toApi = (path) => {
  // default base path for API endpoints
  if (!path) return `${API_BASE || ""}/api`;
  // normalize requested path to start with /api
  const p = path.startsWith("/api") ? path : path.startsWith("/") ? `/api${path}` : `/api/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
};

async function request(path, { method = "GET", body, headers, signal } = {}) {
  // MIGRATION FALLBACK: Check localStorage for legacy token (development only)
  // TODO: Remove this after backend fully implements cookie-based auth
  const legacyToken = localStorage.getItem("token");

  // Detect FormData
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  // Build headers
  const h = {
    // Legacy fallback: Add Authorization header if localStorage token exists (dev only)
    ...(legacyToken ? { Authorization: `Bearer ${legacyToken}` } : {}),
    ...(headers || {}),
  };
  if (!isFormData) {
    h["Content-Type"] = h["Content-Type"] || "application/json";
  }
  // prefer JSON responses
  h["Accept"] = h["Accept"] || "application/json";

  let res;
  try {
    res = await fetch(toApi(path), {
      method,
      headers: h,
      // CRITICAL: credentials: "include" ensures httpOnly cookies are sent
      // This is required for cookie-based authentication to work
      credentials: "include",
      body: isFormData ? body : (body != null ? JSON.stringify(body) : undefined),
      signal, // Pass AbortController signal to fetch for cancellation support
    });
  } catch (error) {
    // Network errors, aborted requests, etc.
    if (error.name === 'AbortError') {
      throw error; // Re-throw abort errors as-is
    }
    // Wrap network errors in ApiError
    throw new ApiError(
      error.message || 'Network request failed',
      0, // status 0 for network errors
      null,
      null,
      error
    );
  }

  // Try to parse JSON only when content-type indicates JSON
  const ct = res.headers.get("content-type") || "";
  const isJson = ct.includes("application/json");
  let data = null;
  try {
    if (res.status !== 204) {
      data = isJson ? await res.json() : await res.text();
    }
  } catch (parseError) {
    // if parse fails, leave data as text or null
    console.warn('Failed to parse response body:', parseError);
  }

  // Non-2xx responses throw ApiError
  if (!res.ok) {
    const msg =
      (isJson && data && (data.error || data.message)) ||
      (typeof data === "string" && data) ||
      `${res.status} ${res.statusText}`;
    throw new ApiError(msg, res.status, data, res);
  }

  // Backend responses are inconsistent - some return { status, data }, some return raw data
  // Unwrap if wrapped, otherwise return as-is
  if (isJson && data && typeof data === 'object' && 'data' in data && 'status' in data) {
    return data.data;
  }

  return data;
}

export class ApiError extends Error {
  static Maintenance = 503;    // service unavailable / maintenance
  static NotFound = 404;
  static ServerError = 500;    // generic 5xx server error
  static BadRequest = 400;
  static Unauthorized = 401;   // not authenticated (login required)
  static Forbidden = 403;      // authenticated but lacks permission
  static Conflict = 409;

  constructor(message, status = 0, data = null, response = null, cause = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;     // HTTP status code (e.g., 401, 500) or 0 for network errors
    this.data = data;         // parsed JSON or text body if available
    this.response = response; // original fetch Response object (optional)
    this.cause = cause;       // original error if this wraps another error
    
    // Preserve stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
  
  /**
   * Check if error is a specific HTTP status
   */
  is(status) {
    return this.status === status;
  }
  
  /**
   * Check if error is in a status range
   */
  isClientError() {
    return this.status >= 400 && this.status < 500;
  }
  
  isServerError() {
    return this.status >= 500 && this.status < 600;
  }
  
  isNetworkError() {
    return this.status === 0;
  }
}

/**
 * Standardized API methods with consistent return format
 * All methods return { status, data } or throw ApiError
 * All methods accept { signal } for AbortController support
 */
export const api = {
  /**
   * GET request
   * @param {string} path - API endpoint path
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  get: async (path, options = {}) => {
    return await request(path, { ...options, method: "GET" });
  },
  
  /**
   * POST request
   * @param {string} path - API endpoint path
   * @param {any} body - Request body
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  post: async (path, body, options = {}) => {
    return await request(path, { ...options, method: "POST", body });
  },
  
  /**
   * PUT request
   * @param {string} path - API endpoint path
   * @param {any} body - Request body
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  put: async (path, body, options = {}) => {
    return await request(path, { ...options, method: "PUT", body });
  },
  
  /**
   * PUT form data (for file uploads)
   * @param {string} path - API endpoint path
   * @param {FormData} form - FormData object
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  putForm: async (path, form, options = {}) => {
    return await request(path, { ...options, method: "PUT", body: form });
  },
  
  /**
   * DELETE request
   * @param {string} path - API endpoint path
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  del: async (path, options = {}) => {
    return await request(path, { ...options, method: "DELETE" });
  },
  
  // Alias for compatibility with code that calls api.delete(...)
  delete: async (path, options = {}) => {
    return await request(path, { ...options, method: "DELETE" });
  },
  
  /**
   * PATCH request
   * @param {string} path - API endpoint path
   * @param {any} body - Request body
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  patch: async (path, body, options = {}) => {
    return await request(path, { ...options, method: "PATCH", body });
  },
  
  /**
   * Get menu items (convenience method)
   * @param {boolean} includeDeleted - Include deleted items
   * @param {Object} options - Request options including signal
   * @returns {Promise<{status: number, data: any}>}
   * @throws {ApiError}
   */
  getMenu: async (includeDeleted = false, options = {}) => {
    const url = includeDeleted ? '/menu?includeDeleted=true' : '/menu';
    return await api.get(url, options);
  }
};