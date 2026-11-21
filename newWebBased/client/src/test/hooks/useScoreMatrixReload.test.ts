import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScoreMatrix } from '@/pages/ScoreCapture/hooks/useScoreMatrix';

vi.mock('@/utils/api', () => ({
  apiGet: vi.fn(),
}));

vi.mock('@/utils/scoreFormatter', () => ({
  normalizeScoreInput: vi.fn((v: string) => v),
}));

describe('useScoreMatrix reload behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the selected squad evaluation for scores and formula fields', async () => {
    const { apiGet } = await import('@/utils/api');
    vi.mocked(apiGet).mockResolvedValue({ results: [
      { participantId: 1, wertungenId: 44, disciplineId: 10, disciplineFieldId: 101, performance: 3 },
      { participantId: 1, wertungenId: 55, disciplineId: 10, disciplineFieldId: 101, performance: 8 }
    ] });
    const participants = [{ id: 1, squad_name: 'I1', evaluations: [
      { id: 44, competitionId: 100, squadName: 'I1', teamId: null },
      { id: 55, competitionId: 100, squadName: 'T1', teamId: 7 }
    ] }] as any;
    const disciplines = [{ int_disziplinid: 10, var_name: 'Boden', int_berechnung: 2 }] as any;
    const fields = [{ id: 101, disciplineId: 10, enabled: true }] as any;
    const scores = [
      { id: 44, participantId: 1, disciplineId: 10, competitionId: 100, score: 3 },
      { id: 55, participantId: 1, disciplineId: 10, competitionId: 100, score: 8 }
    ] as any;
    const { result } = renderHook(() => useScoreMatrix({
      eventId: '42', competitionId: '100', activeSquad: 'T1', activeDiscipline: 10,
      participants, disciplines, disciplineFields: fields, existingScores: scores,
      competitions: [{ id: 100, name: 'WK', event_id: 42, disciplines }],
      getDisciplineFields: () => fields, getFilteredDisciplines: () => disciplines
    }));
    await act(async () => { await result.current.initializeScoreMatrix(participants, disciplines, scores); });
    expect(result.current.scoreMatrix['1-10']).toBe('8');
    expect(result.current.scoreMatrix['1-field-101']).toBe('8');
  });

  it('TDD: loads jury results with cache-buster and active-discipline filters to avoid stale field values after reload', async () => {
    const { apiGet } = await import('@/utils/api');
    vi.mocked(apiGet).mockResolvedValue({ results: [] } as any);

    const participants = [
      {
        id: 1,
        firstname: 'Max',
        lastname: 'Muster',
        squad_name: 'mJade',
      },
    ] as any;

    const disciplines = [
      {
        int_disziplinid: 10,
        var_name: 'Reck m. Kür',
        int_berechnung: 2,
      },
    ] as any;

    const disciplineFields = [
      {
        id: 101,
        disciplineId: 10,
        name: 'A',
        enabled: true,
        sortOrder: 1,
        isFinalScore: false,
        isStartingScore: false,
        group: 1,
      },
    ] as any;

    const { result } = renderHook(() =>
      useScoreMatrix({
        eventId: '42',
        competitionId: '515',
        activeSquad: 'mJade',
        activeDiscipline: 10,
        participants,
        disciplines,
        disciplineFields,
        existingScores: [],
        getDisciplineFields: () => disciplineFields,
        getFilteredDisciplines: () => disciplines,
      })
    );

    await act(async () => {
      await result.current.initializeScoreMatrix(participants, disciplines, []);
    });

    const calledUrl = vi.mocked(apiGet).mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('/jury-results?');
    expect(calledUrl).toContain('eventId=42');
    expect(calledUrl).toContain('competitionId=515');
    expect(calledUrl).toContain('disciplineId=10');
    expect(calledUrl).toContain('attempt=1');
    expect(calledUrl).toContain('type=0');
    expect(calledUrl).toContain('limit=1000');
    expect(calledUrl).toMatch(/_cb=\d+/);
  });
});
