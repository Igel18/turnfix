/**
 * Tests for api.ts utility
 * Covers: apiRequest, apiGet, apiPost, apiPut, apiDelete, invalidateCache
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock debug module before importing api
vi.mock('@/utils/debug', () => ({
  debugLog: vi.fn(),
  isDebugEnabled: () => false,
}));

// Must import after mocks
import { apiRequest, apiGet, apiPost, apiPut, apiDelete, invalidateCache } from '@/utils/api';

describe('api utilities', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear cache between tests
    invalidateCache();

    fetchSpy = vi.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── URL construction ────────────────────────────────────

  describe('URL construction', () => {
    it('prepends /api to relative endpoints', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'ok' }),
        headers: new Headers(),
        status: 200,
      });
      await apiGet('/disciplines');
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/disciplines',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('keeps absolute URLs unchanged', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'ok' }),
        headers: new Headers(),
        status: 200,
      });
      await apiGet('http://localhost:3001/api/test');
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.anything()
      );
    });

    it('handles endpoint without leading slash', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'ok' }),
        headers: new Headers(),
        status: 200,
      });
      await apiGet('disciplines');
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/disciplines',
        expect.anything()
      );
    });
  });

  // ─── apiGet ──────────────────────────────────────────────

  describe('apiGet', () => {
    it('makes GET request and returns parsed JSON', async () => {
      const mockData = { id: 1, name: 'Boden' };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
        headers: new Headers(),
        status: 200,
      });
      const result = await apiGet('/disciplines/1');
      expect(result).toEqual(mockData);
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
        headers: new Headers(),
      });
      await expect(apiGet('/disciplines/999')).rejects.toThrow('Not found');
    });

    it('uses cache for repeated GET requests', async () => {
      const mockData = { id: 1 };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
        headers: new Headers(),
        status: 200,
      });

      // First call
      const result1 = await apiGet('/cached-endpoint');
      // Second call should use cache
      const result2 = await apiGet('/cached-endpoint');

      expect(result1).toEqual(mockData);
      expect(result2).toEqual(mockData);
      // Only one actual fetch call
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── apiPost ─────────────────────────────────────────────

  describe('apiPost', () => {
    it('makes POST request with JSON body', async () => {
      const requestData = { participantId: 1, score: 9.5 };
      const responseData = { success: true };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
        headers: new Headers(),
        status: 200,
      });

      const result = await apiPost('/scores/save-value', requestData);
      expect(result).toEqual(responseData);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/scores/save-value',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestData),
        })
      );
    });

    it('handles POST without body', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      await apiPost('/scores/recalculate');
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/scores/recalculate',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });

    it('does not cache POST requests', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      await apiPost('/scores/save', { score: 1 });
      await apiPost('/scores/save', { score: 2 });

      // Both POST calls should go through
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ─── apiPut ──────────────────────────────────────────────

  describe('apiPut', () => {
    it('makes PUT request with JSON body', async () => {
      const requestData = { name: 'Updated Discipline' };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      await apiPut('/disciplines/1', requestData);
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/disciplines/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestData),
        })
      );
    });
  });

  // ─── apiDelete ───────────────────────────────────────────

  describe('apiDelete', () => {
    it('makes DELETE request', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
        status: 200,
      });

      await apiDelete('/disciplines/1');
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/disciplines/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  // ─── Error handling ──────────────────────────────────────

  describe('error handling', () => {
    it('attaches response status to thrown error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
        headers: new Headers(),
      });

      try {
        await apiGet('/failing-endpoint');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.response).toBeDefined();
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Internal Server Error');
      }
    });

    it('handles non-JSON error response gracefully', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('not json')),
        headers: new Headers(),
      });

      await expect(apiGet('/bad-gateway')).rejects.toThrow('HTTP error! status: 502');
    });

    it('propagates network errors', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network failure'));
      await expect(apiGet('/network-error')).rejects.toThrow('Network failure');
    });
  });

  // ─── invalidateCache ────────────────────────────────────

  describe('invalidateCache', () => {
    it('clears all cache entries when called without pattern', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'ok' }),
        headers: new Headers(),
        status: 200,
      });

      await apiGet('/test1');
      await apiGet('/test2');
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      invalidateCache();

      // After invalidation, new requests go through
      await apiGet('/test1');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('clears only matching cache entries with pattern', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'ok' }),
        headers: new Headers(),
        status: 200,
      });

      await apiGet('/disciplines');
      await apiGet('/participants');
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      invalidateCache('disciplines');

      // Only disciplines cache cleared
      await apiGet('/disciplines');
      expect(fetchSpy).toHaveBeenCalledTimes(3);

      // Participants still cached
      await apiGet('/participants');
      expect(fetchSpy).toHaveBeenCalledTimes(3); // still 3, not 4
    });
  });

  // ─── Request headers ────────────────────────────────────

  describe('request headers', () => {
    it('sets Content-Type to application/json by default', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers(),
        status: 200,
      });
      await apiGet('/test');
      const calledOptions = fetchSpy.mock.calls[0][1];
      expect(calledOptions.headers['Content-Type']).toBe('application/json');
    });

    it('allows custom headers to override defaults', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers(),
        status: 200,
      });
      await apiGet('/test', { headers: { 'X-Custom': 'value' } });
      const calledOptions = fetchSpy.mock.calls[0][1];
      expect(calledOptions.headers['X-Custom']).toBe('value');
    });
  });
});
