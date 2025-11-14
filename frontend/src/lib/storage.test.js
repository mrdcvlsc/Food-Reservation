/**
 * Storage Helper Tests
 * Tests safe localStorage operations, validation, and error handling
 */

import {
  getUserFromStorage,
  setUserToStorage,
  clearUserStorage,
  getTokenFromStorage,
  setTokenToStorage,
  clearTokenStorage,
  clearAllAuthStorage,
} from './storage';

// Mock localStorage
let mockStore = {};

const mockLocalStorage = {
  getItem: jest.fn((key) => mockStore[key] || null),
  setItem: jest.fn((key, value) => {
    mockStore[key] = value.toString();
  }),
  removeItem: jest.fn((key) => {
    delete mockStore[key];
  }),
  clear: jest.fn(() => {
    mockStore = {};
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

describe('Storage Helpers', () => {
  beforeEach(() => {
    mockStore = {};
    jest.clearAllMocks();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.warn = originalWarn;
    console.error = originalError;
  });

  describe('getUserFromStorage', () => {
    it('should return null when no user in storage', () => {
      const result = getUserFromStorage();
      expect(result).toBeNull();
    });

    it('should return valid user object', () => {
      const user = { id: '123', name: 'Test User', email: 'test@example.com' };
      localStorage.setItem('user', JSON.stringify(user));

      const result = getUserFromStorage();
      expect(result).toEqual(user);
    });

    it('should handle parse errors gracefully', () => {
      localStorage.setItem('user', 'invalid-json{');

      const result = getUserFromStorage();
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Failed to parse user from localStorage:',
        expect.any(Error)
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should validate user shape - reject object without identifiers', () => {
      const invalidUser = { role: 'student', balance: 100 };
      localStorage.setItem('user', JSON.stringify(invalidUser));

      const result = getUserFromStorage();
      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        'Invalid user shape in localStorage, clearing...'
      );
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should accept user with id only', () => {
      const user = { id: '123', balance: 50 };
      localStorage.setItem('user', JSON.stringify(user));

      const result = getUserFromStorage();
      expect(result).toEqual(user);
    });

    it('should accept user with email only', () => {
      const user = { email: 'test@example.com', role: 'student' };
      localStorage.setItem('user', JSON.stringify(user));

      const result = getUserFromStorage();
      expect(result).toEqual(user);
    });

    it('should accept user with name only', () => {
      const user = { name: 'Test User', grade: 'G10' };
      localStorage.setItem('user', JSON.stringify(user));

      const result = getUserFromStorage();
      expect(result).toEqual(user);
    });

    it('should reject null value', () => {
      localStorage.setItem('user', JSON.stringify(null));

      const result = getUserFromStorage();
      expect(result).toBeNull();
    });

    it('should reject primitive values', () => {
      localStorage.setItem('user', JSON.stringify('string'));

      const result = getUserFromStorage();
      expect(result).toBeNull();
    });
  });

  describe('setUserToStorage', () => {
    it('should store valid user with metadata', () => {
      const user = { id: '123', name: 'Test User', email: 'test@example.com' };
      
      const result = setUserToStorage(user);
      
      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'user',
        expect.stringContaining('"id":"123"')
      );
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).toHaveProperty('updatedAt');
      expect(stored.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
    });

    it('should strip sensitive fields - token', () => {
      const user = { 
        id: '123', 
        name: 'Test',
        token: 'secret-jwt-token',
        balance: 100 
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('token');
      expect(stored.balance).toBe(100);
    });

    it('should strip sensitive fields - accessToken', () => {
      const user = { 
        id: '123',
        accessToken: 'access-token-123',
        name: 'Test'
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('accessToken');
    });

    it('should strip sensitive fields - refreshToken', () => {
      const user = { 
        id: '123',
        refreshToken: 'refresh-token-456',
        name: 'Test'
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('refreshToken');
    });

    it('should strip sensitive fields - password', () => {
      const user = { 
        id: '123',
        password: 'plain-password',
        name: 'Test'
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('password');
    });

    it('should strip sensitive fields - passwordHash', () => {
      const user = { 
        id: '123',
        passwordHash: '$2a$10$hashedpassword',
        name: 'Test'
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('passwordHash');
    });

    it('should strip sensitive fields - resetToken', () => {
      const user = { 
        id: '123',
        resetToken: 'reset-token-789',
        name: 'Test'
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('resetToken');
    });

    it('should strip sensitive fields - otp', () => {
      const user = { 
        id: '123',
        otp: '123456',
        name: 'Test'
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('otp');
    });

    it('should strip multiple sensitive fields at once', () => {
      const user = { 
        id: '123',
        name: 'Test',
        token: 'jwt',
        password: 'pass',
        refreshToken: 'refresh',
        otp: '123456',
        balance: 100
      };
      
      setUserToStorage(user);
      
      const stored = JSON.parse(mockStore.user);
      expect(stored).not.toHaveProperty('token');
      expect(stored).not.toHaveProperty('password');
      expect(stored).not.toHaveProperty('refreshToken');
      expect(stored).not.toHaveProperty('otp');
      expect(stored.balance).toBe(100);
      expect(stored.name).toBe('Test');
    });

    it('should not mutate original user object', () => {
      const user = { 
        id: '123',
        token: 'secret',
        name: 'Test'
      };
      
      const originalToken = user.token;
      setUserToStorage(user);
      
      expect(user.token).toBe(originalToken); // Original unchanged
    });

    it('should reject null user', () => {
      const result = setUserToStorage(null);
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Cannot store invalid user object');
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('should reject undefined user', () => {
      const result = setUserToStorage(undefined);
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Cannot store invalid user object');
    });

    it('should reject primitive values', () => {
      const result = setUserToStorage('string');
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith('Cannot store invalid user object');
    });

    it('should reject user without identifiers', () => {
      const user = { role: 'student', balance: 100 };
      
      const result = setUserToStorage(user);
      
      expect(result).toBe(false);
      expect(console.warn).toHaveBeenCalledWith(
        'User object missing required identifiers (id/email/name)'
      );
    });

    it('should handle storage errors gracefully', () => {
      const user = { id: '123', name: 'Test' };
      
      // Mock storage error
      localStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const result = setUserToStorage(user);
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to save user to localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('clearUserStorage', () => {
    it('should remove user from storage', () => {
      localStorage.setItem('user', JSON.stringify({ id: '123', name: 'Test' }));
      
      const result = clearUserStorage();
      
      expect(result).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('should handle errors gracefully', () => {
      localStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });
      
      const result = clearUserStorage();
      
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to clear user from localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('Token storage (legacy)', () => {
    describe('getTokenFromStorage', () => {
      it('should return token from storage', () => {
        localStorage.setItem('token', 'jwt-token-123');
        
        const result = getTokenFromStorage();
        
        expect(result).toBe('jwt-token-123');
      });

      it('should return null when no token', () => {
        const result = getTokenFromStorage();
        
        expect(result).toBeNull();
      });

      it('should handle errors gracefully', () => {
        localStorage.getItem.mockImplementationOnce(() => {
          throw new Error('Storage error');
        });
        
        const result = getTokenFromStorage();
        
        expect(result).toBeNull();
        expect(console.error).toHaveBeenCalled();
      });
    });

    describe('setTokenToStorage', () => {
      it('should store valid token', () => {
        const result = setTokenToStorage('jwt-token-456');
        
        expect(result).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith('token', 'jwt-token-456');
      });

      it('should reject null token', () => {
        const result = setTokenToStorage(null);
        
        expect(result).toBe(false);
        expect(localStorage.setItem).not.toHaveBeenCalled();
      });

      it('should reject non-string token', () => {
        const result = setTokenToStorage(123);
        
        expect(result).toBe(false);
      });

      it('should handle errors gracefully', () => {
        localStorage.setItem.mockImplementationOnce(() => {
          throw new Error('Storage error');
        });
        
        const result = setTokenToStorage('token');
        
        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalled();
      });
    });

    describe('clearTokenStorage', () => {
      it('should remove token from storage', () => {
        localStorage.setItem('token', 'jwt-token');
        
        const result = clearTokenStorage();
        
        expect(result).toBe(true);
        expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      });
    });
  });

  describe('clearAllAuthStorage', () => {
    it('should clear both user and token', () => {
      localStorage.setItem('user', JSON.stringify({ id: '123' }));
      localStorage.setItem('token', 'jwt-token');
      
      clearAllAuthStorage();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });

  describe('Round-trip tests', () => {
    it('should preserve user data through set/get cycle', () => {
      const originalUser = {
        id: '123',
        name: 'Jessica Bertud',
        email: 'jessica@example.com',
        role: 'student',
        grade: 'G10',
        section: 'A',
        balance: 582.00,
      };
      
      setUserToStorage(originalUser);
      const retrieved = getUserFromStorage();
      
      expect(retrieved.id).toBe(originalUser.id);
      expect(retrieved.name).toBe(originalUser.name);
      expect(retrieved.email).toBe(originalUser.email);
      expect(retrieved.balance).toBe(originalUser.balance);
      expect(retrieved).toHaveProperty('updatedAt');
    });

    it('should handle user updates correctly', () => {
      const user = { id: '123', name: 'Test', balance: 100 };
      setUserToStorage(user);
      
      const retrieved = getUserFromStorage();
      retrieved.balance = 150;
      
      setUserToStorage(retrieved);
      const updated = getUserFromStorage();
      
      expect(updated.balance).toBe(150);
    });
  });
});
