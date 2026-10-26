import { describe, it, expect } from 'vitest';
import { effectiveDisciplineScore, recalculateLinkedScore } from '../effectiveScore';

const field = (performance: number | null, sortOrder: number, extra: object = {}) => ({
  performance, sortOrder, isFinalScore: false, isStartingScore: false, ...extra,
});

describe('recalculateLinkedScore', () => {
  it('recalculates a linked formula from the jury fields when the stored score is stale', () => {
    expect(recalculateLinkedScore(12.75, [field(7.5, 1), field(2, 2)], '(10 + A) - B')).toBe(15.5);
  });

  it('keeps the stored score for variable formulas', () => {
    expect(recalculateLinkedScore(12.75, [field(7.5, 1)], '20-x')).toBe(12.75);
  });

  it('keeps the stored score without jury results or formula', () => {
    expect(recalculateLinkedScore(9, [], 'A+B')).toBe(9);
    expect(recalculateLinkedScore(9, undefined, 'A+B')).toBe(9);
    expect(recalculateLinkedScore(9, [field(1, 1)], null)).toBe(9);
    expect(recalculateLinkedScore(9, [field(1, 1)], '  ')).toBe(9);
  });

  it('keeps the stored score when the formula cannot be evaluated', () => {
    expect(recalculateLinkedScore(9.25, [field(4, 1)], 'A + )')).toBe(9.25);
  });

  it('ignores the final and starting score fields', () => {
    const fields = [field(5, 1), field(3, 2), field(99, 3, { isFinalScore: true }), field(77, 4, { isStartingScore: true })];
    expect(recalculateLinkedScore(0, fields, 'A+B')).toBe(8);
  });
});

describe('effectiveDisciplineScore', () => {
  it('returns the stored score without any formula', () => {
    expect(effectiveDisciplineScore({ storedScore: 12.5 })).toBe(12.5);
  });

  it('applies the built-in formula to the stored score', () => {
    expect(effectiveDisciplineScore({ storedScore: 6, builtInFormula: '20-x' })).toBe(14);
  });

  it('keeps the score for the identity formula', () => {
    expect(effectiveDisciplineScore({ storedScore: 9.5, builtInFormula: '1*x' })).toBe(9.5);
  });

  it('applies a linked formula first and the built-in formula to its result', () => {
    const score = effectiveDisciplineScore({
      storedScore: 1,
      juryResults: [field(5, 1), field(3, 2)],
      linkedFormula: 'A+B',
      builtInFormula: '20-x',
    });
    expect(score).toBe(12);
  });

  it('uses a variable linked formula only through the built-in step', () => {
    expect(effectiveDisciplineScore({ storedScore: 6, juryResults: [field(1, 1)], linkedFormula: '20-x' })).toBe(6);
  });

  it('falls back to the raw score when the built-in formula cannot be evaluated', () => {
    expect(effectiveDisciplineScore({ storedScore: 6, builtInFormula: '20-' })).toBe(6);
  });
});
