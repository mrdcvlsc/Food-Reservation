import { api, ApiError } from './api';

// Normalize user shape used by the app
function normalizeUser(me) {
  return {
    name: me.name ?? me.fullName ?? me.username ?? 'User',
    email: me.email ?? me.username ?? '',
    role: me.role,
    balance: Number(me.balance ?? me.wallet ?? 0),
    createdAt: me.createdAt ?? me.memberSince ?? null,
    // raw: me // keep raw if you need it
  };
}

/**
 * Refresh session when a token exists. Intended for public pages (login/register).
 * - If token missing -> returns null
 * - If token exists and is valid -> persists normalized user, redirects by role and returns user
 * - If token invalid or me has no role -> clears session and returns null (no navigation)
 *
 * @param {Function} navigate - react-router navigate function
 */
export async function refreshSessionForPublic({ navigate }) {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const me = await api.get('/wallets/me');
    if (!me || !me?.role) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }

    const normalized = normalizeUser(me);
    try {
      localStorage.setItem('user', JSON.stringify(normalized));
    } catch (err) {
      // ignore storage errors
      console.warn('failed to persist normalized user', err);
    }

    if (me?.role === 'admin') {
      navigate('/admin');
      return normalized;
    }
    if (me?.role === 'student') {
      navigate('/dashboard');
      return normalized;
    }

    // Unknown role: clear session and allow public page to continue
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  } catch (err) {
    // token invalid/expired -> clear session and let the public page continue
    console.warn('session refresh failed', err);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

/**
 * Silent refresh that does not navigate — returns normalized user or null.
 * Useful for protected pages which will decide redirects themselves.
 */
export async function refreshSessionSilent() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const me = await api.get('/wallets/me');
    if (!me || !me.role) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    const normalized = normalizeUser(me);
    try { localStorage.setItem('user', JSON.stringify(normalized)); } catch {}
    return normalized;
  } catch (err) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return null;
  }
}

/**
 * Refresh session for protected pages. Navigates to status pages on failure.
 * - If no token or token invalid -> navigate('/status/unauthorized') and return null
 * - If role mismatch -> navigate('/status/forbidden') and return null
 * - On success -> persists normalized user, optionally calls setUser(normalized), and returns normalized
 *
 * @param {{ navigate: Function, requiredRole: string, setUser?: Function }} opts
 */
export async function refreshSessionForProtected({ navigate, requiredRole, setUser } = {}) {
  const sessionJwtToken = localStorage.getItem('token');
  if (!sessionJwtToken) {
    navigate('/status/unauthorized');
    return null;
  }

  try {
    const me = await api.get('/wallets/me');
    if (!me || !me.role) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/status/unauthorized');
      return null;
    }

    const normalized = normalizeUser(me);
    try { localStorage.setItem('user', JSON.stringify(normalized)); } catch {}

    if (requiredRole && normalized.role !== requiredRole) {
      // Role mismatch
      navigate('/status/forbidden');
      return null;
    }

    if (typeof setUser === 'function') {
      try { setUser(normalized); } catch(errSetUser) {
        console.warn(errSetUser);
      }
    }

    return normalized;
  } catch (err) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
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
          // token valid but not allowed
          navigate('/status/forbidden');
          break;
        case ApiError.Unauthorized:
        default:
          // token invalid/expired or unknown status -> clear session and send to unauthorized
          navigate('/status/unauthorized');
          break;
      }
    } else {
      navigate('/status/something_went_wrong');
    }

    return null;
  }
}
