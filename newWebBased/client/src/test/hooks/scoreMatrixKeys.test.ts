/**
 * Regression: a field ID that equals the discipline ID (both are plain integers from
 * different tables) made the field value and the discipline score share one
 * scoreMatrix entry, e.g. B=7,6 was overwritten by the saved result 13,6 -> 19,6.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { scoreKey, fieldScoreKey } from '@/pages/ScoreCapture/utils/scoreKeys';

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({ setSelectedSquad: vi.fn(), setSelectedDiscipline: vi.fn() }),
}));

import { useScoreHandlers } from '@/pages/ScoreCapture/hooks/useScoreHandlers';

describe('score matrix keys', () => {
  it('never collide for a field and a discipline with the same numeric id', () => {
    expect(fieldScoreKey(1, 7)).not.toBe(scoreKey(1, 7));
  });

  it('are stable and unique per participant/field', () => {
    expect(fieldScoreKey(1, 7)).toBe(fieldScoreKey(1, 7));
    expect(fieldScoreKey(1, 7)).not.toBe(fieldScoreKey(2, 7));
    expect(fieldScoreKey(1, 7)).not.toBe(fieldScoreKey(1, 8));
    expect(fieldScoreKey(11, 2)).not.toBe(fieldScoreKey(1, 12));
  });

  it('keeps the discipline score key format used by exports and tables', () => {
    expect(scoreKey(5, 'Boden')).toBe('5-Boden');
    expect(scoreKey(5, 74)).toBe('5-74');
  });
});

describe('useScoreHandlers with field id equal to discipline id', () => {
  it('stores a field value without touching the discipline score entry', () => {
    let matrix: Record<string, string> = { [scoreKey(1, 7)]: '13.6' };
    const setScoreMatrix = vi.fn((updater: any) => { matrix = updater(matrix); });
    const { result } = renderHook(() =>
      useScoreHandlers({
        scoreMatrix: matrix, setScoreMatrix, disciplineFields: [], saveFieldScore: vi.fn(),
        participants: [], disciplines: [], squads: [], activeDiscipline: '',
        setActiveDiscipline: vi.fn(), selectedEvent: null,
      } as any)
    );

    act(() => { result.current.handleFieldScoreChange(1, 7, '7.6'); });

    expect(matrix[scoreKey(1, 7)]).toBe('13.6');
    expect(matrix[fieldScoreKey(1, 7)]).toBe('7.6');
  });
});
