import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../../utils/api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing cache
    (apiRequest as any).requestCache?.clear();
    (apiRequest as any).cacheExpiry?.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiRequest', () => {
    it('should make a GET request with proper URL formatting', async () => {
      const mockResponse = { data: 'test' };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiRequest('/events');

      expect(fetch).toHaveBeenCalledWith('/api/events', {});
      expect(result).toEqual(mockResponse);
    });

    it('should handle endpoint that already starts with /api', async () => {
      const mockResponse = { data: 'test' };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiRequest('/api/events');

      expect(fetch).toHaveBeenCalledWith('/api/events', {});
      expect(result).toEqual(mockResponse);
    });

    it('should handle absolute URLs', async () => {
      const mockResponse = { data: 'test' };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiRequest('http://localhost:3000/api/events');

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/api/events', {});
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for non-ok responses', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(apiRequest('/events')).rejects.toThrow('HTTP error! status: 404');
    });

    it('should handle network errors', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiRequest('/events')).rejects.toThrow('Network error');
    });

    it('should pass custom options to fetch', async () => {
      const mockResponse = { success: true };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Event' }),
      };

      const result = await apiRequest('/events', options);

      expect(fetch).toHaveBeenCalledWith('/api/events', options);
      expect(result).toEqual(mockResponse);
    });

    it('should cache GET requests', async () => {
      const mockResponse = { data: 'cached' };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First request
      const result1 = await apiRequest('/events');
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockResponse);

      // Second request should use cache
      const result2 = await apiRequest('/events');
      expect(fetch).toHaveBeenCalledTimes(1); // Should not make another request
      expect(result2).toEqual(mockResponse);
    });

    it('should not cache non-GET requests', async () => {
      const mockResponse = { success: true };
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // First POST request
      await apiRequest('/events', { method: 'POST' });
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second POST request should not use cache
      await apiRequest('/events', { method: 'POST' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle cache expiry', async () => {
      const mockResponse = { data: 'fresh' };
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      // Mock a scenario where cache expires
      const originalCacheTimeout = (apiRequest as any).CACHE_TIMEOUT;
      (apiRequest as any).CACHE_TIMEOUT = 1; // 1ms timeout

      // First request
      await apiRequest('/events');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 2));

      // Second request should make a new fetch call
      await apiRequest('/events');
      expect(fetch).toHaveBeenCalledTimes(2);

      // Restore original timeout
      (apiRequest as any).CACHE_TIMEOUT = originalCacheTimeout;
    });
  });
});
