import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBahnen } from '../components/JuryPortal/hooks/useBahnen';

const bahn = (n: number) => ({ durchgang: 1, bahn: n, competitions: [], squads: [] });
const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('useBahnen', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not fetch without an event', () => {
    const { result } = renderHook(() => useBahnen(null));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.bahnen).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('loads the Bahnen of the event', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ bahnen: [bahn(1), bahn(2)] }));
    const { result } = renderHook(() => useBahnen(7));

    await waitFor(() => expect(result.current.bahnen).toHaveLength(2));
    expect(String(fetchMock.mock.calls[0][0])).toContain('/time-planning/bahn-details?eventId=7');
    expect(result.current.loading).toBe(false);
  });

  it('is loading while the request is in flight', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(r => { resolve = r; }));
    const { result } = renderHook(() => useBahnen(7));

    await waitFor(() => expect(result.current.loading).toBe(true));
    resolve(jsonResponse({ bahnen: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('falls back to an empty list on HTTP errors, network errors and malformed payloads', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false));
    const http = renderHook(() => useBahnen(1));
    await waitFor(() => expect(http.result.current.loading).toBe(false));
    expect(http.result.current.bahnen).toEqual([]);

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const network = renderHook(() => useBahnen(2));
    await waitFor(() => expect(network.result.current.loading).toBe(false));
    expect(network.result.current.bahnen).toEqual([]);

    fetchMock.mockResolvedValueOnce(jsonResponse({ bahnen: 'nope' }));
    const malformed = renderHook(() => useBahnen(3));
    await waitFor(() => expect(malformed.result.current.loading).toBe(false));
    expect(malformed.result.current.bahnen).toEqual([]);
  });

  it('reloads when the event changes and clears when it is reset', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ bahnen: [bahn(1)] }))
      .mockResolvedValueOnce(jsonResponse({ bahnen: [bahn(1), bahn(2)] }));
    const { result, rerender } = renderHook(({ id }) => useBahnen(id), { initialProps: { id: 1 as number | null } });

    await waitFor(() => expect(result.current.bahnen).toHaveLength(1));
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.bahnen).toHaveLength(2));
    rerender({ id: null });
    await waitFor(() => expect(result.current.bahnen).toEqual([]));
  });

  it('ignores a slow response of a previous event', async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise<Response>(r => { resolveFirst = r; }))
      .mockResolvedValueOnce(jsonResponse({ bahnen: [bahn(9)] }));
    const { result, rerender } = renderHook(({ id }) => useBahnen(id), { initialProps: { id: 1 as number | null } });

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.bahnen.map(b => b.bahn)).toEqual([9]));
    resolveFirst(jsonResponse({ bahnen: [bahn(1)] }));
    await new Promise(r => setTimeout(r, 20));
    expect(result.current.bahnen.map(b => b.bahn)).toEqual([9]);
  });
});
