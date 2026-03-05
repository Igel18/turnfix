/**
 * TDD Tests — Built-in Formula Save Flow (Double-Calculation Bug)
 *
 * BUG: When entering a score for a built-in formula discipline (e.g., "20-x"):
 *   1. User types x=5 → FormulaInput calculates 20-5=15, calls onScoreChange(15, {x:5})
 *   2. onFormulaChange sets score="15.00" (the CALCULATED value — WRONG)
 *   3. handleFormulaSubmit saves 15 to rel_leistung (should be 5, the RAW value)
 *   4. After save, currentScore=15 → getBuiltInFormulaInitialValues('20-x', 15) → {x:15}
 *   5. FormulaInput shows x=15.00, calculates 20-15=5.00 — VALUES INVERTED!
 *
 * FIX: For built-in formulas, store the RAW input value (x=5), not the calculated result (15).
 *   The var_formel is applied at ranking time by applyBuiltInFormula().
 *
 * These tests verify:
 *   - getScoreToSave() returns raw value for built-in formulas
 *   - getScoreToSave() returns calculated value for linked formulas
 *   - isBuiltInFormula() correctly identifies formula types
 *   - Round-trip stability: enter → save → load → same input
 */

import { describe, it, expect } from 'vitest';
import {
  getScoreToSave,
  isBuiltInFormula,
} from '../utils/builtInFormulaHelper';
import { getBuiltInFormulaInitialValues } from '../utils/builtInFormulaHelper';

// ─── isBuiltInFormula ──────────────────────────────────────────────────────

describe('isBuiltInFormula', () => {
  it('should return true for "1*x" with no discipline fields', () => {
    expect(isBuiltInFormula('1*x', 0)).toBe(true);
  });

  it('should return true for "20-x" with no discipline fields', () => {
    expect(isBuiltInFormula('20-x', 0)).toBe(true);
  });

  it('should return false when discipline fields exist (linked formula)', () => {
    expect(isBuiltInFormula('A+B', 2)).toBe(false);
  });

  it('should return false for purely uppercase formula without fields', () => {
    // Uppercase-only formula = linked formula (even without fields loaded yet)
    expect(isBuiltInFormula('A+B', 0)).toBe(false);
  });

  it('should return false for null/empty formula', () => {
    expect(isBuiltInFormula('', 0)).toBe(false);
    expect(isBuiltInFormula(null as any, 0)).toBe(false);
    expect(isBuiltInFormula(undefined as any, 0)).toBe(false);
  });

  it('should return true for "x*2+3" with no discipline fields', () => {
    expect(isBuiltInFormula('x*2+3', 0)).toBe(true);
  });
});

// ─── getScoreToSave ────────────────────────────────────────────────────────

describe('getScoreToSave', () => {
  describe('built-in formula "20-x"', () => {
    it('should return raw value (5) instead of calculated value (15) for x=5', () => {
      // User typed x=5, formula calculates 20-5=15
      const result = getScoreToSave(15, { x: 5 }, '20-x', 0);
      expect(result).toBe(5);
    });

    it('should return raw value (12.5) for x=12.5', () => {
      // 20 - 12.5 = 7.5 calculated, but we store 12.5
      const result = getScoreToSave(7.5, { x: 12.5 }, '20-x', 0);
      expect(result).toBe(12.5);
    });

    it('should return raw value (0) for x=0', () => {
      const result = getScoreToSave(20, { x: 0 }, '20-x', 0);
      expect(result).toBe(0);
    });
  });

  describe('built-in formula "1*x" (identity)', () => {
    it('should return raw value (7.5) for x=7.5', () => {
      // 1*7.5 = 7.5, raw is also 7.5 — same value either way
      const result = getScoreToSave(7.5, { x: 7.5 }, '1*x', 0);
      expect(result).toBe(7.5);
    });

    it('should return raw value (0) for x=0', () => {
      const result = getScoreToSave(0, { x: 0 }, '1*x', 0);
      expect(result).toBe(0);
    });
  });

  describe('built-in formula "x*2+3"', () => {
    it('should return raw value (5) instead of calculated (13)', () => {
      // x=5, formula=x*2+3=13, but we store 5
      const result = getScoreToSave(13, { x: 5 }, 'x*2+3', 0);
      expect(result).toBe(5);
    });
  });

  describe('linked formula (uppercase, with discipline fields)', () => {
    it('should return calculated value for "A+B" with discipline fields', () => {
      const result = getScoreToSave(13, { A: 5, B: 8 }, 'A+B', 2);
      expect(result).toBe(13);
    });

    it('should return calculated value for "(10+A)-B" with discipline fields', () => {
      const result = getScoreToSave(7, { A: 5, B: 8 }, '(10+A)-B', 2);
      expect(result).toBe(7);
    });
  });

  describe('linked formula (uppercase, no discipline fields loaded yet)', () => {
    it('should return calculated value for uppercase-only formulas', () => {
      // Even if disciplineFieldCount=0 (not loaded yet), uppercase = linked
      const result = getScoreToSave(13, { A: 5, B: 8 }, 'A+B', 0);
      expect(result).toBe(13);
    });
  });
});

// ─── Round-trip stability ──────────────────────────────────────────────────

describe('Built-in formula round-trip (enter → save → load → same input)', () => {
  it('should be stable for "20-x": enter x=5 → save 5 → load x=5', () => {
    const formula = '20-x';

    // Step 1: User types x=5, formula calculates 15
    const calculatedScore = 15;
    const fieldValues = { x: 5 };

    // Step 2: getScoreToSave should return the raw value (5)
    const scoreToSave = getScoreToSave(calculatedScore, fieldValues, formula, 0);
    expect(scoreToSave).toBe(5);

    // Step 3: After save, currentScore = 5 (stored raw)
    const currentScore = scoreToSave;

    // Step 4: On load, getBuiltInFormulaInitialValues maps back to x
    const loadedValues = getBuiltInFormulaInitialValues(formula, currentScore, 0);
    expect(loadedValues).toEqual({ x: 5 }); // Must be the SAME as original input!
  });

  it('should be stable for "1*x": enter x=9.5 → save 9.5 → load x=9.5', () => {
    const formula = '1*x';
    const calculatedScore = 9.5;
    const fieldValues = { x: 9.5 };

    const scoreToSave = getScoreToSave(calculatedScore, fieldValues, formula, 0);
    expect(scoreToSave).toBe(9.5);

    const loadedValues = getBuiltInFormulaInitialValues(formula, scoreToSave, 0);
    expect(loadedValues).toEqual({ x: 9.5 });
  });

  it('should be stable for "x*2+3": enter x=4 → save 4 → load x=4', () => {
    const formula = 'x*2+3';
    const calculatedScore = 11; // 4*2+3=11
    const fieldValues = { x: 4 };

    const scoreToSave = getScoreToSave(calculatedScore, fieldValues, formula, 0);
    expect(scoreToSave).toBe(4);

    const loadedValues = getBuiltInFormulaInitialValues(formula, scoreToSave, 0);
    expect(loadedValues).toEqual({ x: 4 });
  });

  it('should NOT double-calculate for "20-x": enter x=5 → save → load should NOT yield x=15', () => {
    const formula = '20-x';
    const fieldValues = { x: 5 };

    // The old buggy behavior: store calculated value (15) instead of raw (5)
    const buggyScoreToSave = 15; // This is what the bug does

    // This would cause the inversion:
    const buggyLoadedValues = getBuiltInFormulaInitialValues(formula, buggyScoreToSave, 0);
    // BUG: x=15 instead of x=5 — the formula inverts!
    expect(buggyLoadedValues).toEqual({ x: 15 });
    // 20-15=5 — completely wrong result on re-display

    // With the fix: store raw value (5)
    const fixedScoreToSave = getScoreToSave(15, fieldValues, formula, 0);
    const fixedLoadedValues = getBuiltInFormulaInitialValues(formula, fixedScoreToSave, 0);
    expect(fixedLoadedValues).toEqual({ x: 5 }); // Correct!
  });
});
