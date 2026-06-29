import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScoreData } from '@/pages/ScoreCapture/hooks/useScoreData';

vi.mock('@/utils/api', () => ({
  apiGet: vi.fn(),
}));

describe('useScoreData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TDD: loads initial scores with cache-buster to avoid stale values after reload', async () => {
    const { apiGet } = await import('@/utils/api');

    vi.mocked(apiGet).mockImplementation(async (url: string) => {
      if (url.startsWith('/event-participants?')) return { participants: [] } as any;
      if (url.startsWith('/squad-management?')) return { squads: [] } as any;
      if (url.startsWith('/competitions?')) return [] as any;
      if (url === '/discipline-fields') return [] as any;
      if (url.startsWith('/scores?')) return { results: [] } as any;
      if (url.startsWith('/statuses?')) return { statuses: [] } as any;
      if (url.startsWith('/squad-disciplines?')) return { squadDisciplines: [] } as any;
      return {} as any;
    });

    const { result } = renderHook(() => useScoreData({ eventId: '42' }));

    await act(async () => {
      await result.current.loadInitialData();
    });

    expect(apiGet).toHaveBeenCalledWith(
      expect.stringMatching(/^\/scores\?eventId=42&limit=1000&_cb=\d+$/)
    );
  });
});
