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
});
