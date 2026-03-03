import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScoringNavigation } from '../utils/useScoringNavigation';

const makeParticipant = (overrides: any = {}) => ({
  id: 1,
  participantId: 1,
  name: 'Test',
  firstName: 'Test',
  lastName: 'User',
  club: 'Club',
  clubName: 'Club',
  startNumber: 1,
  status: 'pending' as const,
  currentScore: null as number | null,
  wertungenId: null as number | null,
  ...overrides,
});

describe('useScoringNavigation — score clearing on navigation', () => {
  const unscoredParticipants = [
    makeParticipant({ id: 1, participantId: 1, name: 'Alice', startNumber: 1 }),
    makeParticipant({ id: 2, participantId: 2, name: 'Bob', startNumber: 2 }),
    makeParticipant({ id: 3, participantId: 3, name: 'Charlie', startNumber: 3 }),
  ];

  it('should start with empty score for first unscored participant', () => {
    const { result } = renderHook(() =>
      useScoringNavigation({ participants: unscoredParticipants })
    );

    expect(result.current.score).toBe('');
    expect(result.current.currentParticipantIndex).toBe(0);
  });

  it('should clear score when navigating to next unscored participant', () => {
    const { result } = renderHook(() =>
      useScoringNavigation({ participants: unscoredParticipants })
    );

    // Simulate: user types a score
    act(() => {
      result.current.setScore('14.50');
    });
    expect(result.current.score).toBe('14.50');

    // Navigate to next participant
    act(() => {
      result.current.navigateNext();
    });

    // Score MUST be empty for the next unscored participant
    expect(result.current.score).toBe('');
    expect(result.current.currentParticipantIndex).toBe(1);
  });

  it('should clear score when navigating backward after scoring', () => {
    const { result } = renderHook(() =>
      useScoringNavigation({ participants: unscoredParticipants })
    );

    // Navigate to second participant first
    act(() => {
      result.current.navigateNext();
    });

    // Type a score for second participant
    act(() => {
      result.current.setScore('13.20');
    });
    expect(result.current.score).toBe('13.20');

    // Navigate backward to first (unscored) participant
    act(() => {
      result.current.navigatePrevious();
    });

    // Score MUST be empty for the first unscored participant
    expect(result.current.score).toBe('');
    expect(result.current.currentParticipantIndex).toBe(0);
  });

  it('should clear loadedJuryResults when navigating to participant without wertungenId', () => {
    const participants = [
      makeParticipant({ id: 1, currentScore: 14.5, wertungenId: 100, status: 'completed' }),
      makeParticipant({ id: 2, currentScore: null, wertungenId: null, status: 'pending' }),
    ];

    const { result } = renderHook(() =>
      useScoringNavigation({ participants })
    );

    // Simulate: jury results were loaded for participant A
    act(() => {
      result.current.setLoadedJuryResults({ A: 8.5, B: 1.2 });
    });
    expect(result.current.loadedJuryResults).toEqual({ A: 8.5, B: 1.2 });

    // Navigate to next participant (no wertungenId)
    act(() => {
      result.current.navigateNext();
    });

    // Jury results MUST be cleared!
    expect(result.current.loadedJuryResults).toEqual({});
  });

  it('should clear formulaFieldValues when navigating to participant without wertungenId', () => {
    const participants = [
      makeParticipant({ id: 1, currentScore: 14.5, wertungenId: 100, status: 'completed' }),
      makeParticipant({ id: 2, currentScore: null, wertungenId: null, status: 'pending' }),
    ];

    const { result } = renderHook(() =>
      useScoringNavigation({ participants })
    );

    // Simulate: formula field values were set for participant A
    act(() => {
      result.current.setFormulaFieldValues({ A: 8.5, B: 1.2 });
    });
    expect(result.current.formulaFieldValues).toEqual({ A: 8.5, B: 1.2 });

    // Navigate to next participant
    act(() => {
      result.current.navigateNext();
    });

    // Formula field values MUST be cleared
    expect(result.current.formulaFieldValues).toEqual({});
  });

  it('should show existing score when navigating to already-scored participant', () => {
    const participants = [
      makeParticipant({ id: 1, currentScore: null, wertungenId: null, status: 'pending' }),
      makeParticipant({ id: 2, currentScore: 12.8, wertungenId: 101, status: 'completed' }),
    ];

    const { result } = renderHook(() =>
      useScoringNavigation({ participants })
    );

    // Navigate to scored participant
    act(() => {
      result.current.navigateNext();
    });

    // Should show existing score
    expect(result.current.score).toBe('12.8');
  });

  it('should clear score when using navigateTo for unscored participant', () => {
    const { result } = renderHook(() =>
      useScoringNavigation({ participants: unscoredParticipants })
    );

    // Type a score
    act(() => {
      result.current.setScore('15.00');
    });

    // Navigate directly to third participant
    act(() => {
      result.current.navigateTo(2);
    });

    // Score must be cleared
    expect(result.current.score).toBe('');
    expect(result.current.currentParticipantIndex).toBe(2);
  });

  it('should not navigate beyond participant list bounds', () => {
    const { result } = renderHook(() =>
      useScoringNavigation({ participants: unscoredParticipants })
    );

    // Try to navigate before first
    act(() => {
      result.current.navigatePrevious();
    });
    expect(result.current.currentParticipantIndex).toBe(0);

    // Navigate to last
    act(() => {
      result.current.navigateTo(2);
    });

    // Try to navigate past last
    act(() => {
      result.current.navigateNext();
    });
    expect(result.current.currentParticipantIndex).toBe(2);
  });

  describe('Full scoring + navigation flow (bug reproduction)', () => {
    it('should clear score after save + navigate next (the main bug)', () => {
      // Start with all unscored
      const initialParticipants = [
        makeParticipant({ id: 1, participantId: 1, status: 'pending' }),
        makeParticipant({ id: 2, participantId: 2, status: 'pending' }),
      ];

      const { result, rerender } = renderHook(
        ({ participants }) => useScoringNavigation({ participants }),
        { initialProps: { participants: initialParticipants } }
      );

      // Step 1: User enters score for participant 1
      act(() => {
        result.current.setScore('14.50');
      });
      expect(result.current.score).toBe('14.50');

      // Step 2: Save completed - update participants with the saved score
      const updatedParticipants = [
        makeParticipant({ id: 1, participantId: 1, currentScore: 14.5, wertungenId: 100, status: 'completed' }),
        makeParticipant({ id: 2, participantId: 2, status: 'pending' }),
      ];

      // Rerender with updated participants (simulates setParticipants after save)
      rerender({ participants: updatedParticipants });

      // Step 3: User clicks "Nächster"
      act(() => {
        result.current.navigateNext();
      });

      // Step 4: Score MUST be empty for the next unscored participant
      expect(result.current.score).toBe('');
      expect(result.current.currentParticipantIndex).toBe(1);
      expect(result.current.loadedJuryResults).toEqual({});
      expect(result.current.formulaFieldValues).toEqual({});
    });
  });
});
