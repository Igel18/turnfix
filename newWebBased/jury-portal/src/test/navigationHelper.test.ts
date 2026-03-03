import { describe, it, expect } from 'vitest';
import { getScoreForParticipant, shouldClearJuryResults } from '../utils/navigationHelper';

describe('Navigation Helper — Score clearing on participant change', () => {

  describe('getScoreForParticipant', () => {
    it('should return empty string for participant with no score', () => {
      const participant = { currentScore: null, wertungenId: null };
      expect(getScoreForParticipant(participant)).toBe('');
    });

    it('should return empty string for participant with undefined score', () => {
      const participant = { currentScore: undefined, wertungenId: null };
      expect(getScoreForParticipant(participant)).toBe('');
    });

    it('should return empty string for undefined participant', () => {
      expect(getScoreForParticipant(undefined)).toBe('');
    });

    it('should return empty string for null participant', () => {
      expect(getScoreForParticipant(null)).toBe('');
    });

    it('should return score string for participant WITH existing score', () => {
      const participant = { currentScore: 14.5, wertungenId: 123 };
      expect(getScoreForParticipant(participant)).toBe('14.5');
    });

    it('should return empty string for participant with score 0 (not yet scored)', () => {
      const participant = { currentScore: 0, wertungenId: null };
      expect(getScoreForParticipant(participant)).toBe('');
    });
  });

  describe('shouldClearJuryResults', () => {
    it('should clear jury results when participant has no wertungenId', () => {
      const participant = { currentScore: null, wertungenId: null };
      expect(shouldClearJuryResults(participant)).toBe(true);
    });

    it('should clear jury results for undefined participant', () => {
      expect(shouldClearJuryResults(undefined)).toBe(true);
    });

    it('should NOT clear jury results when participant HAS wertungenId (will be loaded)', () => {
      const participant = { currentScore: 14.5, wertungenId: 123 };
      expect(shouldClearJuryResults(participant)).toBe(false);
    });
  });

  describe('Navigation flow simulation', () => {
    /**
     * Simulates the exact user flow:
     * 1. Participant A gets scored (14.50)
     * 2. User clicks "Nächster"
     * 3. Participant B should show empty score field
     */
    it('should NOT carry over previous participant score to next unscored participant', () => {
      const participants = [
        { currentScore: 14.5, wertungenId: 100 },  // Participant A - just scored
        { currentScore: null, wertungenId: null },   // Participant B - not yet scored
        { currentScore: null, wertungenId: null },   // Participant C - not yet scored
      ];

      // After saving Participant A, navigate to Participant B
      const nextParticipant = participants[1];
      
      const scoreForNext = getScoreForParticipant(nextParticipant);
      expect(scoreForNext).toBe(''); // Must be empty!
      
      const shouldClear = shouldClearJuryResults(nextParticipant);
      expect(shouldClear).toBe(true); // Jury results must be cleared!
    });

    it('should show existing score when navigating to already-scored participant', () => {
      const participants = [
        { currentScore: 14.5, wertungenId: 100 },   // Participant A - scored
        { currentScore: 12.8, wertungenId: 101 },   // Participant B - also scored
      ];

      // Navigate to Participant B
      const scoreForB = getScoreForParticipant(participants[1]);
      expect(scoreForB).toBe('12.8');
      
      const shouldClear = shouldClearJuryResults(participants[1]);
      expect(shouldClear).toBe(false); // Has wertungenId, don't clear
    });

    it('should clear score when navigating backward to unscored participant', () => {
      const participants = [
        { currentScore: null, wertungenId: null },   // Participant A - not scored
        { currentScore: 14.5, wertungenId: 100 },   // Participant B - scored
      ];

      // Navigate backward to Participant A
      const scoreForA = getScoreForParticipant(participants[0]);
      expect(scoreForA).toBe('');
    });
  });
});
