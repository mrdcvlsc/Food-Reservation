import { api, ApiError } from './api';

/**
 * ============================================================================
 * COOKIE-FIRST AUTHENTICATION
 * ============================================================================
 * 
 * This app uses httpOnly cookies for authentication tokens (preferred for security).
 * 
 * BACKEND REQUIREMENTS:
 * - Must set secure, httpOnly, SameSite=strict cookies for access/refresh tokens
 * - Must implement GET /auth/me endpoint that returns current user from cookie
 * - Must implement POST /auth/refresh endpoint for token refresh (if using refresh tokens)
 * - Cookies should be automatically sent with fetch() when credentials: "include" is set
 * 
 * MIGRATION STRATEGY:
 * - Primary: Use httpOnly cookies (backend sets, browser manages)
 * - Fallback: localStorage token in development only (for backward compatibility)
 * - Remove localStorage.getItem("token") once backend cookie auth is fully deployed
 * 
 * SECURITY NOTES:
 * - httpOnly cookies prevent XSS attacks (JavaScript cannot access token)
 * - SameSite=strict prevents CSRF attacks
 * - secure flag ensures cookies only sent over HTTPS in production
 * 
 * TODO (Backend):
 * - [ ] Implement POST /auth/login to set httpOnly cookie
 * - [ ] Implement POST /auth/logout to clear httpOnly cookie
 * - [ ] Implement GET /auth/me to return user from cookie
 * - [ ] Implement POST /auth/refresh for token refresh (optional)
 * - [ ] Ensure all protected endpoints validate cookie
 * 
 * ============================================================================
 */

// Normalize user shape used by the app
function normalizeUser(me) {
  return {
    id: me.id ?? me._id ?? me.userId,
    name: me.name ?? me.fullName ?? me.username ?? 'User',
    email: me.email ?? me.username ?? '',
    role: me.role,
    balance: Number(me.balance ?? me.wallet ?? 0),
    grade: me.grade ?? '',
    section: me.section ?? '',
    createdAt: me.createdAt ?? me.memberSince ?? null,
    // raw: me // keep raw if you need it
  };
}

/**
 * Get current authenticated user from backend (cookie-based).
 * This is the canonical way to retrieve user session.
 * 
 * @returns {Promise<Object|null>} Normalized user object or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    // Primary: Call /auth/me which validates httpOnly cookie
    const { data: me } = await api.get('/auth/me');
    
    if (!me || !me.role) {
      // No valid session
      return null;
    }

    const normalized = normalizeUser(me);
    
    // Cache in localStorage for offline/display purposes only (not for auth)
    try {
      localStorage.setItem('user', JSON.stringify(normalized));
    } catch (err) {
      console.warn('Failed to cache user in localStorage:', err);
    }

    return normalized;
  } catch (err) {
    // If /auth/me fails, session is invalid
    if (err instanceof ApiError && err.status === 401) {
      // Clear cached data
      localStorage.removeItem('user');
      localStorage.removeItem('token'); // Legacy cleanup
      return null;
    }
    
    // For other errors (500, network), throw to let caller handle
    throw err;
  }
}

/**
 * Refresh authentication tokens (if backend supports refresh tokens).
 * This should be called when receiving 401 errors on protected endpoints.
 * 
 * @returns {Promise<boolean>} True if refresh succeeded, false otherwise
 */
export async function refreshAuthToken() {
  try {
    // Call backend refresh endpoint (must exist)
    // Backend should set new access token cookie and return success
    await api.post('/auth/refresh');
    return true;
  } catch (err) {
    // Refresh failed - user needs to log in again
    console.warn('Token refresh failed:', err);
    return false;
  }
}

/**
 * Refresh session when a token exists. Intended for public pages (login/register).
 * - If no session -> returns null (allows public page access)
 * - If valid session exists -> persists normalized user, redirects by role and returns user
 * - If session invalid -> clears cache and returns null (no navigation, allows public page)
 *
 * @param {Function} navigate - react-router navigate function
 */
export async function refreshSessionForPublic({ navigate }) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      // No session - allow public page access
      return null;
    }

    // Valid session exists - redirect to role-appropriate page
    if (user.role === 'admin') {
      navigate('/admin');
      return user;
    }
    if (user.role === 'student') {
      navigate('/dashboard');
      return user;
    }

    // Unknown role: clear cache and allow public page to continue
    localStorage.removeItem('user');
    return null;
  } catch (err) {
    // Network error or other issue - log but don't block public page
    console.warn('Session refresh failed:', err);
    localStorage.removeItem('user');
    return null;
  }
}

/**
 * Silent refresh that does not navigate — returns normalized user or null.
 * Useful for components that need to check auth state without redirecting.
 */
export async function refreshSessionSilent() {
  try {
    return await getCurrentUser();
  } catch (err) {
    console.warn('Silent session refresh failed:', err);
    return null;
  }
}

/**
 * Refresh session for protected pages. Navigates to status pages on failure.
 * - If no session or session invalid -> navigate('/status/unauthorized') and return null
 * - If role mismatch -> navigate('/status/forbidden') and return null
 * - On success -> persists normalized user, optionally calls setUser(normalized), and returns normalized
 *
 * @param {{ navigate: Function, requiredRole: string, setUser?: Function }} opts
 */
export async function refreshSessionForProtected({ navigate, requiredRole, setUser } = {}) {
  try {
    // Attempt to get current user from cookie-based session
    const user = await getCurrentUser();

    if (!user || !user.role) {
      // No valid session
      navigate('/status/unauthorized');
      return null;
    }

    // Check role authorization
    if (requiredRole && user.role !== requiredRole) {
      navigate('/status/forbidden');
      return null;
    }

    // Update component state if setter provided
    if (typeof setUser === 'function') {
      try {
        setUser(user);
      } catch (errSetUser) {
        console.warn('Failed to call setUser:', errSetUser);
      }
    }

    return user;
  } catch (err) {
    // Clear cached data on error
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Legacy cleanup
    
    // Decide redirect based on API error status when available
    if (err instanceof ApiError) {
      switch (err.status) {
        case ApiError.Maintenance:
          navigate('/status/maintenance');
          break;
        case ApiError.ServerError:
          navigate('/status/server_error');
          break;
        case ApiError.Forbidden:
          // authenticated but not allowed
          navigate('/status/forbidden');
          break;
        case ApiError.Unauthorized:
        default:
          // not authenticated or session expired
          navigate('/status/unauthorized');
          break;
      }
    } else {
      // Network error or other unexpected error
      navigate('/status/something_went_wrong');
    }

    return null;
  }
}

/**
 * Development fallback: Check if we have a localStorage token.
 * This is ONLY for backward compatibility during migration.
 * 
 * @deprecated Use cookie-based auth instead. Remove after backend migration.
 * @returns {boolean}
 */
export function hasLegacyToken() {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  return !!localStorage.getItem('token');
}

/**
 * Logout helper - clears cached user data and calls backend logout endpoint.
 * Backend should clear httpOnly cookies on logout.
 * 
 * @param {Function} navigate - react-router navigate function
 */
export async function logout({ navigate }) {
  try {
    // Call backend logout (clears cookie)
    await api.post('/auth/logout');
  } catch (err) {
    // Even if logout fails, we clear local cache
    console.warn('Logout endpoint failed:', err);
  }

  // Clear cached data
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // Legacy cleanup

  // Redirect to login
  if (navigate) {
    navigate('/login');
  }
}

