import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScoreActions } from '@/pages/ScoreCapture/hooks/useScoreActions';

vi.mock('@/utils/api', () => ({
  apiPost: vi.fn(),
}));

vi.mock('@/utils/scoreFormatter', () => ({
  parseScoreInput: vi.fn((value: string) => {
    if (value === '' || value == null) return NaN;
    return parseFloat(String(value).replace(',', '.'));
  }),
}));

describe('useScoreActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves override score "0" as numeric 0', async () => {
    const { apiPost } = await import('@/utils/api');
    vi.mocked(apiPost).mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() =>
      useScoreActions({
        competitionId: '100',
        competitions: [],
        participants: [],
        disciplines: [{ int_disziplinid: 5, var_name: 'Boden', attempts: 1 } as any],
        displayDisciplines: [],
        scoreMatrix: {},
        selectedEvent: null,
        selectedCompetition: null,
        evaluateFormula: () => 0,
      })
    );

    await result.current.saveScore(11, 5, '0');

    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith('/scores/save-value', {
      competitionId: 100,
      participantId: 11,
      disciplineId: 5,
      score: 0,
    });
  });

  it('does not save empty override score', async () => {
    const { apiPost } = await import('@/utils/api');
    vi.mocked(apiPost).mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() =>
      useScoreActions({
        competitionId: '100',
        competitions: [],
        participants: [],
        disciplines: [{ int_disziplinid: 5, var_name: 'Boden', attempts: 1 } as any],
        displayDisciplines: [],
        scoreMatrix: {},
        selectedEvent: null,
        selectedCompetition: null,
        evaluateFormula: () => 0,
      })
    );

    await result.current.saveScore(11, 5, '');

    expect(apiPost).not.toHaveBeenCalled();
  });

  it('TDD: saveFieldScore persists explicit latest field value when matrix is stale', async () => {
    const { apiPost } = await import('@/utils/api');
    vi.mocked(apiPost).mockResolvedValue({ success: true, data: { id: 1 } } as any);

    const { result } = renderHook(() =>
      useScoreActions({
        competitionId: '100',
        competitions: [],
        participants: [],
        disciplines: [{ int_disziplinid: 5, var_name: 'Boden', attempts: 1 } as any],
        displayDisciplines: [],
        scoreMatrix: {},
        selectedEvent: { int_eventid: 1 },
        selectedCompetition: { id: 100 },
        evaluateFormula: () => 0,
      })
    );

    await result.current.saveFieldScore(
      11,
      {
        id: 101,
        name: 'Wertung',
        disciplineId: 5,
      } as any,
      '4,50'
    );

    expect(apiPost).toHaveBeenCalledWith('/jury-results/save-field-score',
      expect.objectContaining({
        participantId: 11,
        disciplineFieldId: 101,
        performance: 4.5,
        eventId: 1,
        competitionId: 100,
      })
    );
  });

  // ─── calculateDisciplineScores (#89 fix) ───────────────────────────────

  it('#89: calculateDisciplineScores passes the calculated score as override to saveScore', async () => {
    const { apiPost } = await import('@/utils/api');
    vi.mocked(apiPost).mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() =>
      useScoreActions({
        competitionId: '100',
        competitions: [
          {
            id: 100,
            name: 'WK 1',
            disciplines: [{ int_disziplinid: 5, var_name: 'Boden' }],
          } as any,
        ],
        participants: [
          {
            id: 11,
            firstname: 'Max',
            lastname: 'Mustermann',
            assignedCompetitions: [100],
          } as any,
        ],
        disciplines: [{ int_disziplinid: 5, var_name: 'Boden', attempts: 1 } as any],
        displayDisciplines: [
          { int_disziplinid: 5, var_name: 'Boden', formula: 'A+B' } as any,
        ],
        // scoreMatrix has the individual field values (simulating partially filled fields)
        scoreMatrix: {
          '11-101': '8.5', // field A for participant 11
          '11-102': '1.5', // field B for participant 11
        },
        selectedEvent: { int_eventid: 1 },
        selectedCompetition: { id: 100 },
        // evaluateFormula returns the calculated total
        evaluateFormula: (_formula: string, fieldValues: { [key: string]: number }) => {
          const vals = Object.values(fieldValues);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : 0;
        },
      })
    );

    const fields = [
      { id: 101, name: 'A', disciplineId: 5, isFinalScore: false } as any,
      { id: 102, name: 'B', disciplineId: 5, isFinalScore: false } as any,
    ];

    await result.current.calculateDisciplineScores(5, fields);

    // saveScore must have been called with the formula result (10) as override, not relying on
    // the scoreMatrix key for the discipline (which would be missing → empty → skipped)
    expect(apiPost).toHaveBeenCalledWith(
      '/scores/save-value',
      expect.objectContaining({
        participantId: 11,
        disciplineId: 5,
        score: 10, // 8.5 + 1.5 = 10
      })
    );
  });

  it('#89: calculateDisciplineScores does NOT call saveScore when formula returns null', async () => {
    const { apiPost } = await import('@/utils/api');
    vi.mocked(apiPost).mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() =>
      useScoreActions({
        competitionId: '100',
        competitions: [],
        participants: [
          {
            id: 11,
            firstname: 'Max',
            lastname: 'Mustermann',
            assignedCompetitions: [100],
          } as any,
        ],
        disciplines: [{ int_disziplinid: 5, var_name: 'Boden', attempts: 1 } as any],
        displayDisciplines: [
          { int_disziplinid: 5, var_name: 'Boden', formula: 'A+B' } as any,
        ],
        scoreMatrix: { '11-101': '8.5' },
        selectedEvent: { int_eventid: 1 },
        selectedCompetition: { id: 100 },
        // Simulate formula not yet computable (missing field → return NaN)
        evaluateFormula: () => NaN,
      })
    );

    const fields = [
      { id: 101, name: 'A', disciplineId: 5, isFinalScore: false } as any,
    ];

    await result.current.calculateDisciplineScores(5, fields);

    // With NaN result, saveScore must NOT be called
    expect(apiPost).not.toHaveBeenCalled();
  });
});
