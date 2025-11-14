/**
 * Storage Helpers - Safe localStorage operations with validation
 * 
 * Centralizes user data caching with proper error handling,
 * shape validation, and sensitive data stripping.
 */

const USER_STORAGE_KEY = 'user';
const TOKEN_STORAGE_KEY = 'token';

/**
 * Validates user object has required shape
 * Must have at least one identifying field: id, email, or name
 */
function isValidUserShape(user) {
  if (!user || typeof user !== 'object') {
    return false;
  }
  
  // Must have at least one identifier
  const hasIdentifier = user.id || user.email || user.name;
  if (!hasIdentifier) {
    return false;
  }
  
  return true;
}

/**
 * Safely retrieves and validates user from localStorage
 * @returns {Object|null} User object or null if invalid/missing
 */
export function getUserFromStorage() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    
    const user = JSON.parse(raw);
    
    // Validate shape
    if (!isValidUserShape(user)) {
      console.warn('Invalid user shape in localStorage, clearing...');
      clearUserStorage();
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    // Clear corrupted data
    clearUserStorage();
    return null;
  }
}

/**
 * Safely stores user to localStorage with validation and cleanup
 * Strips sensitive fields (tokens, passwords) and adds metadata
 * @param {Object} user - User object to store
 * @returns {boolean} Success status
 */
export function setUserToStorage(user) {
  try {
    if (!user || typeof user !== 'object') {
      console.warn('Cannot store invalid user object');
      return false;
    }
    
    // Create clean copy without sensitive data
    const cleanUser = { ...user };
    
    // Strip sensitive fields
    delete cleanUser.token;
    delete cleanUser.accessToken;
    delete cleanUser.refreshToken;
    delete cleanUser.password;
    delete cleanUser.passwordHash;
    delete cleanUser.resetToken;
    delete cleanUser.otp;
    
    // Add cache metadata
    cleanUser.updatedAt = new Date().toISOString();
    
    // Validate before storing
    if (!isValidUserShape(cleanUser)) {
      console.warn('User object missing required identifiers (id/email/name)');
      return false;
    }
    
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(cleanUser));
    return true;
  } catch (error) {
    console.error('Failed to save user to localStorage:', error);
    return false;
  }
}

/**
 * Clears user data from localStorage
 */
export function clearUserStorage() {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear user from localStorage:', error);
    return false;
  }
}

/**
 * Gets authentication token from localStorage
 * NOTE: This is a legacy function for backward compatibility.
 * New code should rely on httpOnly cookies for token storage.
 * 
 * @deprecated Use cookie-based auth instead
 * @returns {string|null} Token or null
 */
export function getTokenFromStorage() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to get token from localStorage:', error);
    return null;
  }
}

/**
 * Sets authentication token to localStorage
 * @deprecated Use cookie-based auth instead
 * @param {string} token - JWT token
 */
export function setTokenToStorage(token) {
  try {
    if (token && typeof token === 'string') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to set token to localStorage:', error);
    return false;
  }
}

/**
 * Clears authentication token from localStorage
 * @deprecated Use cookie-based auth instead
 */
export function clearTokenStorage() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear token from localStorage:', error);
    return false;
  }
}

/**
 * Clears all auth-related data from localStorage
 */
export function clearAllAuthStorage() {
  clearUserStorage();
  clearTokenStorage();
}
