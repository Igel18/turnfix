import { describe, expect, it } from 'vitest';
import { computeEffectiveParticipantScore } from '../utils/effectiveParticipantScore';

describe('computeEffectiveParticipantScore', () => {
  it('recalculates linked formula score from jury fields when stored score is stale', () => {
    const result = computeEffectiveParticipantScore({
      score: 12.75,
      formula: '(10 + A) - B',
      juryResults: [
        { performance: 7.5, isFinalScore: false, isStartingScore: false, sortOrder: 1 },
        { performance: 2.0, isFinalScore: false, isStartingScore: false, sortOrder: 2 }
      ]
    });

    expect(result).toBe(15.5);
  });

  it('keeps stored score for variable formulas (built-in)', () => {
    const result = computeEffectiveParticipantScore({
      score: 12.75,
      formula: '20-x',
      juryResults: [
        { performance: 7.5, isFinalScore: false, isStartingScore: false, sortOrder: 1 }
      ]
    });

    expect(result).toBe(12.75);
  });

  it('falls back to stored score when linked formula cannot be evaluated', () => {
    const result = computeEffectiveParticipantScore({
      score: 9.25,
      formula: 'A + )',
      juryResults: [{ performance: 4.0, isFinalScore: false, isStartingScore: false, sortOrder: 1 }]
    });

    expect(result).toBe(9.25);
  });
});
