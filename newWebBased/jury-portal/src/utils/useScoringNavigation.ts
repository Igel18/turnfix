/**
 * Custom hook encapsulating the scoring navigation logic.
 * 
 * Extracted from JuryPortal.tsx for testability and to fix the bug where
 * score and formula field values were not cleared on participant navigation.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { getScoreForParticipant, shouldClearJuryResults } from './navigationHelper';

interface Participant {
  id: number;
  participantId: number;
  currentScore?: number | null;
  wertungenId?: number | null;
  status: 'completed' | 'current' | 'pending';
  [key: string]: any;
}

interface UseScoringNavigationOptions {
  participants: Participant[];
  decimals?: number;
}

interface UseScoringNavigationResult {
  currentParticipantIndex: number;
  currentParticipant: Participant | undefined;
  score: string;
  setScore: (score: string) => void;
  loadedJuryResults: Record<string, number>;
  setLoadedJuryResults: (results: Record<string, number>) => void;
  formulaFieldValues: Record<string, number>;
  setFormulaFieldValues: (values: Record<string, number>) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateTo: (index: number) => void;
  saveScore: (savedScore: number) => void;
}

export function useScoringNavigation({
  participants,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  decimals: _decimals = 2,
}: UseScoringNavigationOptions): UseScoringNavigationResult {
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState<number>(0);
  const [score, setScore] = useState<string>('');
  const [loadedJuryResults, setLoadedJuryResults] = useState<Record<string, number>>({});
  const [formulaFieldValues, setFormulaFieldValues] = useState<Record<string, number>>({});

  const currentParticipant = useMemo(
    () => participants[currentParticipantIndex],
    [participants, currentParticipantIndex]
  );

  // Clear score and formula state whenever participant index changes
  useEffect(() => {
    const participant = participants[currentParticipantIndex];
    const newScore = getScoreForParticipant(participant);
    setScore(newScore);

    // Always clear formula-related state on navigation
    // The loadJuryResults effect in JuryPortal will re-populate if needed
    if (shouldClearJuryResults(participant)) {
      setLoadedJuryResults({});
      setFormulaFieldValues({});
    }
  }, [currentParticipantIndex, participants]);

  const navigateNext = useCallback(() => {
    if (currentParticipantIndex < participants.length - 1) {
      setCurrentParticipantIndex(currentParticipantIndex + 1);
      // Score clearing is handled by the useEffect above
    }
  }, [currentParticipantIndex, participants.length]);

  const navigatePrevious = useCallback(() => {
    if (currentParticipantIndex > 0) {
      setCurrentParticipantIndex(currentParticipantIndex - 1);
      // Score clearing is handled by the useEffect above
    }
  }, [currentParticipantIndex]);

  const navigateTo = useCallback((index: number) => {
    if (index >= 0 && index < participants.length) {
      setCurrentParticipantIndex(index);
      // Score clearing is handled by the useEffect above
    }
  }, [participants.length]);

  const saveScore = useCallback((_savedScore: number) => {
    // This is called after a successful score save
    // No need to update score display — the participant's currentScore
    // will be updated in the parent, and the useEffect handles the rest
  }, []);

  return {
    currentParticipantIndex,
    currentParticipant,
    score,
    setScore,
    loadedJuryResults,
    setLoadedJuryResults,
    formulaFieldValues,
    setFormulaFieldValues,
    navigateNext,
    navigatePrevious,
    navigateTo,
    saveScore,
  };
}
