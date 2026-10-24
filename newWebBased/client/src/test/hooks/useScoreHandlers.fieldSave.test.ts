/**
 * Regression: field values entered in quick succession must ALL be auto-saved.
 * A shared debounce timer used to cancel the save of field A when field B was
 * typed within the debounce window, so only B reached the DB and the server
 * recalculated the score from incomplete data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => ({ setSelectedSquad: vi.fn(), setSelectedDiscipline: vi.fn() }),
}));

import { useScoreHandlers } from '@/pages/ScoreCapture/hooks/useScoreHandlers';

const fieldA = { id: 101, name: 'D/A-Note' };
const fieldB = { id: 102, name: 'E/B-Note' };

const setup = () => {
  const saveFieldScore = vi.fn();
  const { result } = renderHook(() =>
    useScoreHandlers({
      scoreMatrix: {},
      setScoreMatrix: vi.fn(),
      disciplineFields: [fieldA, fieldB],
      saveFieldScore,
      participants: [],
      disciplines: [],
      squads: [],
      activeDiscipline: '',
      setActiveDiscipline: vi.fn(),
      selectedEvent: null,
    } as any)
  );
  return { result, saveFieldScore };
};

describe('useScoreHandlers.handleFieldScoreChange auto-save', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves both fields when A and B are entered within the debounce window', () => {
    const { result, saveFieldScore } = setup();

    act(() => { result.current.handleFieldScoreChange(1, 101, '5'); });
    act(() => { vi.advanceTimersByTime(300); });
    act(() => { result.current.handleFieldScoreChange(1, 102, '7.5'); });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(saveFieldScore).toHaveBeenCalledTimes(2);
    expect(saveFieldScore).toHaveBeenCalledWith(1, fieldA, '5');
    expect(saveFieldScore).toHaveBeenCalledWith(1, fieldB, '7.5');
  });

  it('saves only the last value when the same field is edited repeatedly', () => {
    const { result, saveFieldScore } = setup();

    act(() => { result.current.handleFieldScoreChange(1, 101, '7'); });
    act(() => { vi.advanceTimersByTime(200); });
    act(() => { result.current.handleFieldScoreChange(1, 101, '7.5'); });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(saveFieldScore).toHaveBeenCalledTimes(1);
    expect(saveFieldScore).toHaveBeenCalledWith(1, fieldA, '7.5');
  });

  it('still saves a pending field after the user navigated to another participant', () => {
    const { result, saveFieldScore } = setup();

    act(() => { result.current.handleFieldScoreChange(1, 101, '5'); });
    act(() => { result.current.handleFieldScoreChange(2, 101, '6'); });
    act(() => { vi.advanceTimersByTime(2000); });

    expect(saveFieldScore).toHaveBeenCalledWith(1, fieldA, '5');
    expect(saveFieldScore).toHaveBeenCalledWith(2, fieldA, '6');
  });
});
