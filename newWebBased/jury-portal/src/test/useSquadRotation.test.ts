import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSquadRotation } from '../components/JuryPortal/hooks/useSquadRotation';

const device = (id: number) => ({ round: id, disciplineId: id, name: `D${id}`, shortName: `D${id}`, icon: null });
const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as Response;
const emptyStatuses = () => jsonResponse({ squadDisciplines: [] });

describe('useSquadRotation', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not fetch without event or squad', () => {
    const noEvent = renderHook(() => useSquadRotation(null, 'A'));
    const noSquad = renderHook(() => useSquadRotation(1, undefined));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(noEvent.result.current.rotation).toEqual([]);
    expect(noSquad.result.current.rotation).toEqual([]);
  });

  it('loads the rotation of the squad and encodes the squad name', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ devices: [device(1), device(2)] }))
      .mockResolvedValueOnce(emptyStatuses());
    const { result } = renderHook(() => useSquadRotation(7, 'R 1&2'));

    await waitFor(() => expect(result.current.rotation).toHaveLength(2));
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/time-planning/squad-rotation?eventId=7&squad=R%201%262');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/squad-disciplines?eventId=7&squadName=R%201%262');
  });

  it('marks only disciplines with the completed status', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ devices: [device(1), device(2)] }))
      .mockResolvedValueOnce(jsonResponse({
        squadDisciplines: [
          { disciplineId: 1, status: { name: 'Leistungen erfasst' } },
          { disciplineId: 2, status: { name: 'Offen' } },
        ],
      }));
    const { result } = renderHook(() => useSquadRotation(7, 'A'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.completedDisciplineIds).toEqual([1]);
  });

  it('falls back to an empty rotation on errors and malformed payloads', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(emptyStatuses());
    const http = renderHook(() => useSquadRotation(1, 'A'));
    await waitFor(() => expect(http.result.current.loading).toBe(false));
    expect(http.result.current.rotation).toEqual([]);

    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(emptyStatuses());
    const network = renderHook(() => useSquadRotation(1, 'B'));
    await waitFor(() => expect(network.result.current.loading).toBe(false));
    expect(network.result.current.rotation).toEqual([]);

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ devices: 'nope' }))
      .mockResolvedValueOnce(emptyStatuses());
    const malformed = renderHook(() => useSquadRotation(1, 'C'));
    await waitFor(() => expect(malformed.result.current.loading).toBe(false));
    expect(malformed.result.current.rotation).toEqual([]);
  });

  it('reloads when the squad changes and clears it when the squad is reset', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ devices: [device(1)] }))
      .mockResolvedValueOnce(emptyStatuses())
      .mockResolvedValueOnce(jsonResponse({ devices: [device(5), device(6)] }));
    fetchMock.mockResolvedValueOnce(emptyStatuses());
    const { result, rerender } = renderHook(({ squad }) => useSquadRotation(1, squad), {
      initialProps: { squad: 'A' as string | undefined },
    });

    await waitFor(() => expect(result.current.rotation).toHaveLength(1));
    rerender({ squad: 'B' });
    await waitFor(() => expect(result.current.rotation).toHaveLength(2));
    rerender({ squad: undefined });
    await waitFor(() => expect(result.current.rotation).toEqual([]));
  });

  it('ignores a slow response of a previous squad', async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockReturnValueOnce(new Promise<Response>(r => { resolveFirst = r; }))
      .mockResolvedValueOnce(emptyStatuses())
      .mockResolvedValueOnce(jsonResponse({ devices: [device(9)] }))
      .mockResolvedValueOnce(emptyStatuses());
    const { result, rerender } = renderHook(({ squad }) => useSquadRotation(1, squad), {
      initialProps: { squad: 'A' as string | undefined },
    });

    rerender({ squad: 'B' });
    await waitFor(() => expect(result.current.rotation.map(d => d.disciplineId)).toEqual([9]));
    resolveFirst(jsonResponse({ devices: [device(1)] }));
    await new Promise(r => setTimeout(r, 20));
    expect(result.current.rotation.map(d => d.disciplineId)).toEqual([9]);
  });
});
