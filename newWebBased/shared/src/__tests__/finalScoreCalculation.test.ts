import { describe, expect, it } from 'vitest';
import {
  calculateFinalScoreFromFieldValues,
  sumNonFinalFieldValues,
  type ScoreCalculationFieldInput,
} from '../formulaUtils';

const makeField = (overrides: Partial<ScoreCalculationFieldInput> = {}): ScoreCalculationFieldInput => ({
  fieldId: 1,
  fieldName: 'D-Note',
  value: 0,
  sortOrder: 1,
  isFinalScore: false,
  isStartingScore: false,
  ...overrides,
});

describe('final score calculation helpers', () => {
  it('sums non-final values when no formula is configured', () => {
    const result = calculateFinalScoreFromFieldValues('', [
      makeField({ value: 5.5 }),
      makeField({ fieldId: 2, fieldName: 'E-Note', value: 4.3, sortOrder: 2 }),
      makeField({ fieldId: 3, fieldName: 'Endwert', value: 99, sortOrder: 3, isFinalScore: true }),
    ]);

    expect(result).toBeCloseTo(9.8);
  });

  it('calculates linked formulas using field order', () => {
    const result = calculateFinalScoreFromFieldValues('A + B - C', [
      makeField({ fieldName: 'D', value: 5.0, sortOrder: 1 }),
      makeField({ fieldId: 2, fieldName: 'E', value: 4.0, sortOrder: 2 }),
      makeField({ fieldId: 3, fieldName: 'Penalty', value: 0.5, sortOrder: 3 }),
      makeField({ fieldId: 4, fieldName: 'Endwert', value: null, sortOrder: 4, isFinalScore: true }),
    ]);

    expect(result).toBeCloseTo(8.5);
  });

  it('supports single lowercase variable formulas like 1*x with one field', () => {
    const result = calculateFinalScoreFromFieldValues('1*x', [
      makeField({ fieldName: 'Wertung', value: 8.75 }),
      makeField({ fieldId: 2, fieldName: 'Endwert', value: null, isFinalScore: true }),
    ]);

    expect(result).toBeCloseTo(8.75);
  });

  it('ignores start and final fields in fallback sums', () => {
    const result = sumNonFinalFieldValues([
      makeField({ fieldName: 'Ausgangswert', value: 10, isStartingScore: true }),
      makeField({ fieldId: 2, fieldName: 'D', value: 6 }),
      makeField({ fieldId: 3, fieldName: 'E', value: 3.5 }),
      makeField({ fieldId: 4, fieldName: 'Endwert', value: 99, isFinalScore: true }),
    ]);

    expect(result).toBeCloseTo(9.5);
  });
});
