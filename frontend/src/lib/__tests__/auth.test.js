/**
 * @jest-environment jsdom
 */

import { getCurrentUser, refreshAuthToken, refreshSessionForPublic, refreshSessionSilent, refreshSessionForProtected, logout, hasLegacyToken } from '../auth';
import { api } from '../api';
import { getUserFromStorage, setUserToStorage, clearAllAuthStorage } from '../storage';

// Mock the api module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    static Maintenance = 503;
    static NotFound = 404;
    static ServerError = 500;
    static BadRequest = 400;
    static Unauthorized = 401;
    static Forbidden = 403;
    static Conflict = 409;

    constructor(message, status = 0, data = null, response = null) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
      this.response = response;
    }
  },
}));

// Mock storage module
jest.mock('../storage', () => ({
  getUserFromStorage: jest.fn(),
  setUserToStorage: jest.fn(),
  clearAllAuthStorage: jest.fn(),
  clearUserStorage: jest.fn(),
  clearTokenStorage: jest.fn(),
  getTokenFromStorage: jest.fn(),
}));

describe('Auth Helper - Cookie-First Authentication', () => {
  let mockNavigate;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Clear localStorage
    localStorage.clear();
    
    // Create mock navigate function
    mockNavigate = jest.fn();
    
    // Set development environment for some tests
    process.env.NODE_ENV = 'test';
  });

  describe('getCurrentUser()', () => {
    it('should fetch and normalize user from /auth/me', async () => {
      const mockUser = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'student',
        balance: 100,
        grade: 'G10',
        section: 'A',
        createdAt: '2024-01-01T00:00:00Z',
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(user).toEqual({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'student',
        balance: 100,
        grade: 'G10',
        section: 'A',
        createdAt: '2024-01-01T00:00:00Z',
      });

      // Should cache using storage helper
      expect(setUserToStorage).toHaveBeenCalledWith(expect.objectContaining({
        id: '123',
        name: 'John Doe',
      }));
    });

    it('should normalize user with alternative field names', async () => {
      const mockUser = {
        _id: 'abc',
        fullName: 'Jane Smith',
        username: 'jane@test.com',
        role: 'admin',
        wallet: '250.50',
        memberSince: '2023-06-15T00:00:00Z',
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await getCurrentUser();

      expect(user).toEqual({
        id: 'abc',
        name: 'Jane Smith',
        email: 'jane@test.com',
        role: 'admin',
        balance: 250.50,
        grade: '',
        section: '',
        createdAt: '2023-06-15T00:00:00Z',
      });
    });

    it('should return null if user has no role', async () => {
      const mockUser = {
        id: '123',
        name: 'Invalid User',
        email: 'invalid@test.com',
        // no role
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await getCurrentUser();

      expect(user).toBeNull();
    });

    it('should return null and clear cache on 401 error', async () => {
      const ApiError = require('../api').ApiError;
      const error = new ApiError('Unauthorized', 401);

      api.get.mockRejectedValueOnce(error);

      const user = await getCurrentUser();

      expect(user).toBeNull();
      expect(clearAllAuthStorage).toHaveBeenCalled();
    });

    it('should throw error for non-401 errors', async () => {
      const ApiError = require('../api').ApiError;
      const error = new ApiError('Server Error', 500);

      api.get.mockRejectedValueOnce(error);

      await expect(getCurrentUser()).rejects.toThrow('Server Error');
    });
  });

  describe('refreshAuthToken()', () => {
    it('should return true on successful refresh', async () => {
      api.post.mockResolvedValueOnce({ success: true });

      const result = await refreshAuthToken();

      expect(api.post).toHaveBeenCalledWith('/auth/refresh');
      expect(result).toBe(true);
    });

    it('should return false on failed refresh', async () => {
      api.post.mockRejectedValueOnce(new Error('Refresh failed'));

      const result = await refreshAuthToken();

      expect(result).toBe(false);
    });
  });

  describe('refreshSessionForPublic()', () => {
    it('should redirect to /dashboard for student users', async () => {
      const mockUser = {
        id: '1',
        name: 'Student User',
        email: 'student@test.com',
        role: 'student',
        balance: 50,
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await refreshSessionForPublic({ navigate: mockNavigate });

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      expect(user.role).toBe('student');
    });

    it('should redirect to /admin for admin users', async () => {
      const mockUser = {
        id: '2',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
        balance: 0,
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await refreshSessionForPublic({ navigate: mockNavigate });

      expect(mockNavigate).toHaveBeenCalledWith('/admin');
      expect(user.role).toBe('admin');
    });

    it('should return null and not navigate when no session exists', async () => {
      const ApiError = require('../api').ApiError;
      api.get.mockRejectedValueOnce(new ApiError('Unauthorized', 401));

      const user = await refreshSessionForPublic({ navigate: mockNavigate });

      expect(user).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should clear cache and return null for unknown roles', async () => {
      const mockUser = {
        id: '3',
        name: 'Unknown Role',
        email: 'unknown@test.com',
        role: 'unknown_role',
        balance: 0,
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await refreshSessionForPublic({ navigate: mockNavigate });

      expect(user).toBeNull();
      expect(clearAllAuthStorage).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('refreshSessionSilent()', () => {
    it('should return user without navigation', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'student',
        balance: 75,
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await refreshSessionSilent();

      expect(user).not.toBeNull();
      expect(user.role).toBe('student');
    });

    it('should return null on error without throwing', async () => {
      api.get.mockRejectedValueOnce(new Error('Network error'));

      const user = await refreshSessionSilent();

      expect(user).toBeNull();
    });
  });

  describe('refreshSessionForProtected()', () => {
    it('should return user when role matches', async () => {
      const mockUser = {
        id: '1',
        name: 'Student User',
        email: 'student@test.com',
        role: 'student',
        balance: 100,
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'student',
      });

      expect(user).not.toBeNull();
      expect(user.role).toBe('student');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should call setUser callback if provided', async () => {
      const mockUser = {
        id: '1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'student',
        balance: 50,
      };

      const mockSetUser = jest.fn();
      api.get.mockResolvedValueOnce(mockUser);

      await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'student',
        setUser: mockSetUser,
      });

      expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({
        id: '1',
        role: 'student',
      }));
    });

    it('should navigate to /status/unauthorized when no session', async () => {
      const ApiError = require('../api').ApiError;
      api.get.mockRejectedValueOnce(new ApiError('Unauthorized', 401));

      const user = await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'student',
      });

      expect(user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/status/unauthorized');
    });

    it('should navigate to /status/forbidden when role mismatch', async () => {
      const mockUser = {
        id: '1',
        name: 'Student User',
        email: 'student@test.com',
        role: 'student',
        balance: 50,
      };

      api.get.mockResolvedValueOnce(mockUser);

      const user = await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'admin', // User is student, but requires admin
      });

      expect(user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/status/forbidden');
    });

    it('should navigate to /status/maintenance on 503 error', async () => {
      const ApiError = require('../api').ApiError;
      api.get.mockRejectedValueOnce(new ApiError('Maintenance', 503));

      await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'student',
      });

      expect(mockNavigate).toHaveBeenCalledWith('/status/maintenance');
    });

    it('should navigate to /status/server_error on 500 error', async () => {
      const ApiError = require('../api').ApiError;
      api.get.mockRejectedValueOnce(new ApiError('Server Error', 500));

      await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'student',
      });

      expect(mockNavigate).toHaveBeenCalledWith('/status/server_error');
    });

    it('should navigate to /status/something_went_wrong on non-API errors', async () => {
      api.get.mockRejectedValueOnce(new Error('Network failure'));

      await refreshSessionForProtected({
        navigate: mockNavigate,
        requiredRole: 'student',
      });

      expect(mockNavigate).toHaveBeenCalledWith('/status/something_went_wrong');
    });
  });

  describe('logout()', () => {
    it('should call /auth/logout and clear cache', async () => {
      api.post.mockResolvedValueOnce({ success: true });

      await logout({ navigate: mockNavigate });

      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      expect(clearAllAuthStorage).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should clear cache even if logout endpoint fails', async () => {
      api.post.mockRejectedValueOnce(new Error('Logout failed'));

      await logout({ navigate: mockNavigate });

      expect(clearAllAuthStorage).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should handle missing navigate gracefully', async () => {
      api.post.mockResolvedValueOnce({ success: true });

      await expect(logout({})).resolves.not.toThrow();
    });
  });

  describe('hasLegacyToken()', () => {
    it('should return false in non-development environments', () => {
      process.env.NODE_ENV = 'production';
      const { getTokenFromStorage } = require('../storage');
      getTokenFromStorage.mockReturnValueOnce('test_token');

      const result = hasLegacyToken();

      expect(result).toBe(false);
    });

    it('should return true in development if token exists', () => {
      process.env.NODE_ENV = 'development';
      const { getTokenFromStorage } = require('../storage');
      getTokenFromStorage.mockReturnValueOnce('test_token');

      const result = hasLegacyToken();

      expect(result).toBe(true);
    });

    it('should return false in development if no token', () => {
      process.env.NODE_ENV = 'development';
      const { getTokenFromStorage } = require('../storage');
      getTokenFromStorage.mockReturnValueOnce(null);

      const result = hasLegacyToken();

      expect(result).toBe(false);
    });
  });
});
