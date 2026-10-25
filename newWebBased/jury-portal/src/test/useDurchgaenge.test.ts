import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDurchgaenge } from '../components/JuryPortal/hooks/useDurchgaenge';

const durchgang = (n: number) => ({
  durchgang: n, startTime: null, competitions: [], squads: [{ name: `R${n}`, participantCount: 1 }],
});

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;

describe('useDurchgaenge', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not fetch without an event', () => {
    const { result } = renderHook(() => useDurchgaenge(null));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.durchgaenge).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('loads the Durchgänge of the event', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ durchgaenge: [durchgang(1), durchgang(2)] }));
    const { result } = renderHook(() => useDurchgaenge(7));

    await waitFor(() => expect(result.current.durchgaenge).toHaveLength(2));
    expect(String(fetchMock.mock.calls[0][0])).toContain('/time-planning/durchgaenge?eventId=7');
    expect(result.current.loading).toBe(false);
  });

  it('is loading while the request is in flight', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>(r => { resolve = r; }));
    const { result } = renderHook(() => useDurchgaenge(7));

    await waitFor(() => expect(result.current.loading).toBe(true));
    resolve(jsonResponse({ durchgaenge: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('falls back to an empty list on HTTP errors', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'x' }, false));
    const { result } = renderHook(() => useDurchgaenge(7));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.durchgaenge).toEqual([]);
  });

  it('falls back to an empty list on network errors and malformed payloads', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const first = renderHook(() => useDurchgaenge(7));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.durchgaenge).toEqual([]);

    fetchMock.mockResolvedValueOnce(jsonResponse({ durchgaenge: 'nope' }));
    const second = renderHook(() => useDurchgaenge(8));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.durchgaenge).toEqual([]);
  });

  it('reloads when the event changes and clears data when the event is reset', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ durchgaenge: [durchgang(1)] }))
      .mockResolvedValueOnce(jsonResponse({ durchgaenge: [durchgang(5), durchgang(6)] }));
    const { result, rerender } = renderHook(({ id }) => useDurchgaenge(id), { initialProps: { id: 1 as number | null } });

    await waitFor(() => expect(result.current.durchgaenge).toHaveLength(1));
    rerender({ id: 2 });
    await waitFor(() => expect(result.current.durchgaenge).toHaveLength(2));
    rerender({ id: null });
    await waitFor(() => expect(result.current.durchgaenge).toEqual([]));
  });

  it('ignores a slow response of a previous event', async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise<Response>(r => { resolveFirst = r; }))
      .mockResolvedValueOnce(jsonResponse({ durchgaenge: [durchgang(9)] }));
    const { result, rerender } = renderHook(({ id }) => useDurchgaenge(id), { initialProps: { id: 1 as number | null } });

    rerender({ id: 2 });
    await waitFor(() => expect(result.current.durchgaenge.map(d => d.durchgang)).toEqual([9]));
    resolveFirst(jsonResponse({ durchgaenge: [durchgang(1)] }));
    await new Promise(r => setTimeout(r, 20));
    expect(result.current.durchgaenge.map(d => d.durchgang)).toEqual([9]);
  });
});
