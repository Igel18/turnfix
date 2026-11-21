import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTeams } from '@/pages/Teams/hooks/useTeams';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Team competition loading', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads all event competitions with their types and numbers for the team form', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.startsWith('/api/competitions')
        ? [
            { id: 1, number: '101', name: 'Turnen', competitionType: 1 },
            { id: 2, number: '102', name: 'Turnen', competitionType: 1 },
            { id: 3, number: '103', name: 'Einzel', competitionType: 0 }
          ]
        : url.startsWith('/api/clubs') ? { clubs: [] } : { teams: [] }
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useTeams('42'));
    await waitFor(() => expect(result.current.competitions).toHaveLength(3));
    expect(result.current.competitions.map(c => c.number)).toEqual(['101', '102', '103']);
    expect(fetchMock).toHaveBeenCalledWith('/api/competitions?eventId=42&limit=1000');
  });
});
