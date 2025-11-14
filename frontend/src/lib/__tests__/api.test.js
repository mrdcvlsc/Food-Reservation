/**
 * API Layer Tests
 * Tests standardized API adapter with AbortController and typed ApiError
 */

import { api, ApiError } from './api';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Layer', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    // Set development mode for legacy token support
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Successful requests', () => {
    it('GET should return { status, data } on 200', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ users: [] }),
      });

      const response = await api.get('/users');

      expect(response).toEqual({
        status: 200,
        data: { users: [] }
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        })
      );
    });

    it('POST should return { status, data } on 201', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: '123', name: 'New User' }),
      });

      const response = await api.post('/users', { name: 'New User' });

      expect(response).toEqual({
        status: 201,
        data: { id: '123', name: 'New User' }
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New User' }),
          credentials: 'include',
        })
      );
    });

    it('PUT should return { status, data }', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ updated: true }),
      });

      const response = await api.put('/users/123', { name: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ updated: true });
    });

    it('DELETE should return { status, data }', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({}),
      });

      const response = await api.del('/users/123');

      expect(response.status).toBe(204);
      expect(response.data).toBeNull();
    });

    it('should handle 204 No Content correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({}),
      });

      const response = await api.delete('/items/456');

      expect(response).toEqual({
        status: 204,
        data: null
      });
    });
  });

  describe('ApiError - Client Errors (4xx)', () => {
    it('should throw ApiError on 400 Bad Request', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Invalid input' }),
      });

      await expect(api.get('/test')).rejects.toThrow(ApiError);
      
      try {
        await api.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(400);
        expect(error.message).toBe('Invalid input');
        expect(error.data).toEqual({ error: 'Invalid input' });
        expect(error.is(400)).toBe(true);
        expect(error.isClientError()).toBe(true);
        expect(error.isServerError()).toBe(false);
      }
    });

    it('should throw ApiError on 401 Unauthorized', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Not authenticated' }),
      });

      await expect(api.post('/protected', {})).rejects.toThrow(ApiError);
      
      try {
        await api.post('/protected', {});
      } catch (error) {
        expect(error.status).toBe(ApiError.Unauthorized);
        expect(error.is(ApiError.Unauthorized)).toBe(true);
      }
    });

    it('should throw ApiError on 403 Forbidden', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Access denied' }),
      });

      try {
        await api.get('/admin');
      } catch (error) {
        expect(error.status).toBe(ApiError.Forbidden);
        expect(error.message).toBe('Access denied');
      }
    });

    it('should throw ApiError on 404 Not Found', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Resource not found' }),
      });

      try {
        await api.get('/nonexistent');
      } catch (error) {
        expect(error.status).toBe(ApiError.NotFound);
        expect(error.is(ApiError.NotFound)).toBe(true);
      }
    });

    it('should throw ApiError on 409 Conflict', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Email already exists' }),
      });

      try {
        await api.post('/register', { email: 'test@test.com' });
      } catch (error) {
        expect(error.status).toBe(ApiError.Conflict);
      }
    });
  });

  describe('ApiError - Server Errors (5xx)', () => {
    it('should throw ApiError on 500 Internal Server Error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Database connection failed' }),
      });

      await expect(api.get('/data')).rejects.toThrow(ApiError);
      
      try {
        await api.get('/data');
      } catch (error) {
        expect(error.status).toBe(ApiError.ServerError);
        expect(error.isServerError()).toBe(true);
        expect(error.isClientError()).toBe(false);
      }
    });

    it('should throw ApiError on 503 Service Unavailable', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Maintenance mode',
      });

      try {
        await api.get('/');
      } catch (error) {
        expect(error.status).toBe(ApiError.Maintenance);
        expect(error.is(ApiError.Maintenance)).toBe(true);
        expect(error.data).toBe('Maintenance mode');
      }
    });
  });

  describe('AbortController support', () => {
    it('should pass signal to fetch', async () => {
      const controller = new AbortController();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: 'test' }),
      });

      await api.get('/test', { signal: controller.signal });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal
        })
      );
    });

    it('should re-throw AbortError when request is aborted', async () => {
      const controller = new AbortController();
      
      fetch.mockRejectedValueOnce(new DOMException('Request aborted', 'AbortError'));

      await expect(
        api.get('/test', { signal: controller.signal })
      ).rejects.toThrow('AbortError');

      try {
        await api.get('/test', { signal: controller.signal });
      } catch (error) {
        expect(error.name).toBe('AbortError');
        // AbortError should not be wrapped in ApiError
        expect(error).not.toBeInstanceOf(ApiError);
      }
    });

    it('should support signal in POST requests', async () => {
      const controller = new AbortController();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ created: true }),
      });

      await api.post('/items', { name: 'Test' }, { signal: controller.signal });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: controller.signal,
          body: JSON.stringify({ name: 'Test' })
        })
      );
    });
  });

  describe('Network errors', () => {
    it('should wrap network errors in ApiError with status 0', async () => {
      fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      try {
        await api.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error.status).toBe(0);
        expect(error.isNetworkError()).toBe(true);
        expect(error.message).toContain('Failed to fetch');
        expect(error.cause).toBeInstanceOf(TypeError);
      }
    });

    it('should handle connection refused', async () => {
      fetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(api.get('/test')).rejects.toThrow(ApiError);
      
      try {
        await api.get('/test');
      } catch (error) {
        expect(error.status).toBe(0);
        expect(error.isNetworkError()).toBe(true);
      }
    });
  });

  describe('Cookie-based authentication', () => {
    it('should always include credentials', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await api.get('/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });

    it('should include legacy Authorization header in development if localStorage token exists', async () => {
      localStorage.setItem('token', 'legacy-jwt-token');
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await api.get('/protected');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer legacy-jwt-token'
          })
        })
      );
    });

    it('should NOT include Authorization header in production', async () => {
      process.env.NODE_ENV = 'production';
      localStorage.setItem('token', 'should-not-use-this');
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      await api.get('/protected');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything()
          })
        })
      );
    });
  });

  describe('Content-Type handling', () => {
    it('should set Content-Type: application/json for JSON bodies', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({}),
        json: async () => ({}),
      });

      await api.post('/test', { data: 'value' });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should NOT set Content-Type for FormData', async () => {
      const formData = new FormData();
      formData.append('file', 'test');
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({}),
        json: async () => ({}),
      });

      await api.putForm('/upload', formData);

      const call = fetch.mock.calls[0][1];
      expect(call.headers).not.toHaveProperty('Content-Type');
      expect(call.body).toBeInstanceOf(FormData);
    });

    it('should handle text responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Plain text error',
      });

      try {
        await api.get('/test');
      } catch (error) {
        expect(error.data).toBe('Plain text error');
        expect(error.message).toBe('Plain text error');
      }
    });
  });

  describe('Error message extraction', () => {
    it('should prefer error field from JSON response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Custom error message' }),
      });

      try {
        await api.get('/test');
      } catch (error) {
        expect(error.message).toBe('Custom error message');
      }
    });

    it('should fall back to message field if error field missing', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Error via message field' }),
      });

      try {
        await api.get('/test');
      } catch (error) {
        expect(error.message).toBe('Error via message field');
      }
    });

    it('should use status text if no error/message in response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      });

      try {
        await api.get('/test');
      } catch (error) {
        expect(error.message).toBe('500 Internal Server Error');
      }
    });
  });

  describe('API method aliases', () => {
    it('api.delete should work as alias for api.del', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({}),
      });

      const response = await api.delete('/items/123');

      expect(response.status).toBe(204);
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('api.patch should work', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ updated: true }),
      });

      const response = await api.patch('/items/123', { status: 'active' });

      expect(response.data).toEqual({ updated: true });
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'active' })
        })
      );
    });
  });

  describe('getMenu convenience method', () => {
    it('should call GET /menu', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ items: [] }),
      });

      await api.getMenu();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/menu'),
        expect.any(Object)
      );
    });

    it('should support includeDeleted parameter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ items: [] }),
      });

      await api.getMenu(true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/menu?includeDeleted=true'),
        expect.any(Object)
      );
    });

    it('should support signal in getMenu', async () => {
      const controller = new AbortController();
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ items: [] }),
      });

      await api.getMenu(false, { signal: controller.signal });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });
});
