/**
 * Unit Tests — applyBuiltInFormula
 *
 * Tests the built-in formula (var_formel) application at ranking/display time.
 *
 * Background (C++ backward compatibility):
 * In the C++ code (result_calc.cpp), tfx_disziplinen.var_formel is applied
 * to the stored rel_leistung value at RANKING TIME, not at save time.
 * This allows:
 *  - Raw scores to be stored unchanged in the database
 *  - Retroactive formula changes to affect all rankings
 *  - Both raw and calculated values to be displayed
 *
 * Common built-in formulas:
 *  - "1*x"    → identity (most common, no transformation)
 *  - "20-x"   → subtract from 20 (time-based: lower time = higher score)
 *  - "x/2,5"  → scaling (German decimal comma)
 *  - "(((1000/x)-2,158)/0,006)/49" → complex time conversion
 */

import { applyBuiltInFormula } from '../../src/utils/formulaUtils';

describe('applyBuiltInFormula', () => {

  // ─── Identity formula ─────────────────────────────────────────────────

  it('should return raw score for identity formula "1*x"', () => {
    expect(applyBuiltInFormula('1*x', 12.5)).toBe(12.5);
  });

  it('should return raw score for identity formula "1*x" with zero', () => {
    expect(applyBuiltInFormula('1*x', 0)).toBe(0);
  });

  // ─── Subtraction formula ──────────────────────────────────────────────

  it('should apply subtraction formula "20-x"', () => {
    // Time-based scoring: lower time = higher score
    expect(applyBuiltInFormula('20-x', 12.5)).toBe(7.5);
  });

  it('should apply subtraction formula "20-x" with zero', () => {
    expect(applyBuiltInFormula('20-x', 0)).toBe(20);
  });

  it('should apply subtraction formula "20-x" with value equal to max', () => {
    expect(applyBuiltInFormula('20-x', 20)).toBe(0);
  });

  // ─── Scaling formula ─────────────────────────────────────────────────

  it('should apply scaling formula "x/2,5" (German decimal comma)', () => {
    // x/2.5: 10 / 2.5 = 4
    expect(applyBuiltInFormula('x/2,5', 10)).toBe(4);
  });

  it('should apply multiplication formula "2*x"', () => {
    expect(applyBuiltInFormula('2*x', 5)).toBe(10);
  });

  // ─── Non-trivial multiplier "5,5*x" (German decimal comma) ────────────

  it('should apply "5,5*x" with x=3 → 16.5', () => {
    expect(applyBuiltInFormula('5,5*x', 3)).toBeCloseTo(16.5);
  });

  it('should apply "5,5*x" with x=4 → 22', () => {
    expect(applyBuiltInFormula('5,5*x', 4)).toBe(22);
  });

  it('should apply "5,5*x" with x=2.5 → 13.75', () => {
    expect(applyBuiltInFormula('5,5*x', 2.5)).toBeCloseTo(13.75);
  });

  it('should apply "5,5*x" with x=0 → 0', () => {
    expect(applyBuiltInFormula('5,5*x', 0)).toBe(0);
  });

  it('should apply "5,5*x" with x=1.8 → 9.9', () => {
    expect(applyBuiltInFormula('5,5*x', 1.8)).toBeCloseTo(9.9);
  });

  // ─── Complex formula ─────────────────────────────────────────────────

  it('should handle complex time conversion formula', () => {
    // (((1000/x)-2,158)/0,006)/49
    const formula = '(((1000/x)-2,158)/0,006)/49';
    const timeInSeconds = 60;
    // (((1000/60) - 2.158) / 0.006) / 49
    // = ((16.6667 - 2.158) / 0.006) / 49
    // = (14.5087 / 0.006) / 49
    // = 2418.11 / 49
    // ≈ 49.349
    const result = applyBuiltInFormula(formula, timeInSeconds);
    expect(result).toBeCloseTo(49.349, 1);
  });

  // ─── Null / empty formula ────────────────────────────────────────────

  it('should return raw score when formula is null', () => {
    expect(applyBuiltInFormula(null, 12.5)).toBe(12.5);
  });

  it('should return raw score when formula is undefined', () => {
    expect(applyBuiltInFormula(undefined, 12.5)).toBe(12.5);
  });

  it('should return raw score when formula is empty string', () => {
    expect(applyBuiltInFormula('', 12.5)).toBe(12.5);
  });

  // ─── Invalid formula ─────────────────────────────────────────────────

  it('should return raw score when formula is invalid', () => {
    // Invalid formula should gracefully fall back to raw score
    expect(applyBuiltInFormula('invalid$formula', 12.5)).toBe(12.5);
  });

  // ─── Edge cases ──────────────────────────────────────────────────────

  it('should handle negative raw score', () => {
    expect(applyBuiltInFormula('20-x', -5)).toBe(25);
  });

  it('should handle very small values', () => {
    expect(applyBuiltInFormula('1*x', 0.001)).toBeCloseTo(0.001);
  });

  it('should handle formula with spaces', () => {
    expect(applyBuiltInFormula('20 - x', 12.5)).toBe(7.5);
  });
});
