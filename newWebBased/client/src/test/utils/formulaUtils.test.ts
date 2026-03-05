/**
 * formulaUtils Tests
 * Core scoring engine: formula parsing, validation, calculation, display
 */

import { describe, it, expect } from 'vitest';
import {
  extractFormulaSymbols,
  getFormulaSymbol,
  parseFormula,
  formatFormulaWithValues,
  calculateFormula,
  validateFormula,
  isSubtractionField,
  formatScore,
  FORMULA_VARIABLES,
} from '../../utils/formulaUtils';

// ────────────────────────────────────────────────────────────
// extractFormulaSymbols
// ────────────────────────────────────────────────────────────
describe('extractFormulaSymbols', () => {
  it('extracts single-letter variables from formula', () => {
    expect(extractFormulaSymbols('A + B')).toEqual(['A', 'B']);
  });

  it('extracts symbols from complex formula with parentheses', () => {
    expect(extractFormulaSymbols('(10 + A) - B')).toEqual(['A', 'B']);
  });

  it('returns unique symbols only', () => {
    expect(extractFormulaSymbols('A + B - A')).toEqual(['A', 'B']);
  });

  it('handles formula with no variables', () => {
    expect(extractFormulaSymbols('10 + 5')).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(extractFormulaSymbols('')).toEqual([]);
  });

  it('extracts many variables', () => {
    const result = extractFormulaSymbols('A + B + C + D + E');
    expect(result).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('also matches lowercase letters (custom formulas like 1*x)', () => {
    // Updated: lowercase single-letter variables are now supported for custom formulas
    expect(extractFormulaSymbols('a + b')).toEqual(['a', 'b']);
  });

  it('does not match multi-character words', () => {
    // "AB" should not be matched since we use \b word boundaries
    expect(extractFormulaSymbols('10 + AB')).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
// getFormulaSymbol
// ────────────────────────────────────────────────────────────
describe('getFormulaSymbol', () => {
  it('maps index 0 to A', () => {
    expect(getFormulaSymbol(0)).toBe('A');
  });

  it('maps index 1 to B', () => {
    expect(getFormulaSymbol(1)).toBe('B');
  });

  it('maps index 25 to Z', () => {
    expect(getFormulaSymbol(25)).toBe('Z');
  });

  it('handles index beyond 25 with fromCharCode fallback', () => {
    // index 26 → beyond FORMULA_VARIABLES, falls back to String.fromCharCode(91) = '['
    // This is the actual behavior
    expect(getFormulaSymbol(26)).toBe(String.fromCharCode(91));
  });
});

// ────────────────────────────────────────────────────────────
// parseFormula
// ────────────────────────────────────────────────────────────
describe('parseFormula', () => {
  it('parses simple formula', () => {
    const result = parseFormula('A + B');
    expect(result.originalFormula).toBe('A + B');
    expect(result.symbols).toEqual(['A', 'B']);
    expect(result.hasParentheses).toBe(false);
  });

  it('detects parentheses', () => {
    const result = parseFormula('(10 + A) - B');
    expect(result.hasParentheses).toBe(true);
  });

  it('extracts symbols from formula with leading number', () => {
    const result = parseFormula('10 + A - B');
    expect(result.symbols).toEqual(['A', 'B']);
  });

  it('extracts symbols from formula with decimal leading number', () => {
    const result = parseFormula('9.5 + A - B');
    expect(result.symbols).toEqual(['A', 'B']);
  });

  it('returns empty result for empty formula', () => {
    const result = parseFormula('');
    expect(result.originalFormula).toBe('');
    expect(result.symbols).toEqual([]);
    expect(result.hasParentheses).toBe(false);
  });

  it('has no extra data when formula starts with variable', () => {
    const result = parseFormula('A + B');
    expect(result.symbols).toEqual(['A', 'B']);
  });
});

// ────────────────────────────────────────────────────────────
// formatFormulaWithValues
// ────────────────────────────────────────────────────────────
describe('formatFormulaWithValues', () => {
  it('replaces symbols with formatted values', () => {
    const result = formatFormulaWithValues('A + B', { A: 6, B: 3.5 });
    expect(result).toBe('6.00 + 3.50');
  });

  it('uses custom decimal places', () => {
    const result = formatFormulaWithValues('A + B', { A: 6, B: 3.5 }, { decimals: 3 });
    expect(result).toBe('6.000 + 3.500');
  });

  it('formats formula with leading number and values', () => {
    const result = formatFormulaWithValues('10 + A', { A: 5 });
    expect(result).toBe('10 + 5.00');
  });

  it('returns empty string for empty formula', () => {
    expect(formatFormulaWithValues('', { A: 1 })).toBe('');
  });

  it('handles formula with parentheses', () => {
    const result = formatFormulaWithValues('(10 + A) - B', { A: 6, B: 3.5 });
    expect(result).toBe('(10 + 6.00) - 3.50');
  });

  it('leaves unreferenced symbols unchanged', () => {
    // Only A is provided, B stays
    const result = formatFormulaWithValues('A + B', { A: 5 });
    expect(result).toBe('5.00 + B');
  });

  it('does NOT replace leading number in custom formulas (lowercase vars)', () => {
    // "1*x" — the "1" should stay as-is
    const result = formatFormulaWithValues('1*x', { x: 5 }, { decimals: 2 });
    expect(result).toBe('1*5.00');
  });

  it('replaces lowercase values in custom formulas', () => {
    const result = formatFormulaWithValues('(((1000/x)-2,158)/0,006)/49', { x: 300 }, { decimals: 2 });
    expect(result).toContain('300.00');
  });
});

// ────────────────────────────────────────────────────────────
// calculateFormula
// ────────────────────────────────────────────────────────────
describe('calculateFormula', () => {
  it('calculates simple addition', () => {
    expect(calculateFormula('A + B', { A: 6, B: 4 })).toBe(10);
  });

  it('calculates formula with parentheses and start value', () => {
    const result = calculateFormula('(10 + A) - B', { A: 6, B: 3.5 });
    expect(result).toBe(12.5);
  });

  it('replaces missing variables with 0', () => {
    // B is not provided → treated as 0
    expect(calculateFormula('A + B', { A: 5 })).toBe(5);
  });

  it('returns null for empty formula', () => {
    expect(calculateFormula('', { A: 1 })).toBeNull();
  });

  it('handles multiplication', () => {
    expect(calculateFormula('A * B', { A: 3, B: 4 })).toBe(12);
  });

  it('handles division', () => {
    expect(calculateFormula('A / B', { A: 10, B: 4 })).toBe(2.5);
  });

  it('handles formula with leading number as literal', () => {
    const result = calculateFormula('10 + A', { A: 5 });
    expect(result).toBe(15); // 10 is part of the formula
  });

  it('handles complex gymnastics formula', () => {
    // Typical: (StartValue + A) - B - C  where A=execution, B=difficulty deduction, C=neutral deduction
    const result = calculateFormula('(10 + A) - B - C', { A: 0.5, B: 1.2, C: 0.1 });
    expect(result).toBeCloseTo(9.2, 5);
  });

  it('returns null for formula with invalid characters after substitution', () => {
    // After substitution, if invalid chars remain, should return null
    const result = calculateFormula('A + B', { A: 5, B: 3 });
    expect(result).toBe(8); // Valid
  });

  // ── German decimal comma handling ──────────────────────────
  it('handles German decimal commas in custom formulas', () => {
    // Formula from production: (((1000/x)-2,158)/0,006)/49
    const result = calculateFormula('(((1000/x)-2,158)/0,006)/49', { x: 300 });
    expect(result).toBeCloseTo(3.998, 2);
  });

  it('handles multiple German commas in a formula', () => {
    // Swimming formula: 12*(((100/(1,2*(15*x-16,5)))-0,3))
    const result = calculateFormula('12*(((100/(1,2*(15*x-16,5)))-0,3))', { x: 10 });
    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
  });

  it('handles simple formula with German comma', () => {
    const result = calculateFormula('x * 1,5', { x: 4 });
    expect(result).toBe(6);
  });

  // ── Custom formula protection ──────────────────
  it('handles custom formula "1*x" correctly', () => {
    // Formula "1*x" — the "1" is part of the formula
    const result = calculateFormula('1*x', { x: 5 });
    expect(result).toBe(5);
  });

  it('handles custom formula "2*x" correctly', () => {
    const result = calculateFormula('2*x', { x: 3 });
    expect(result).toBe(6);
  });

  it('handles uppercase formula with leading number as literal', () => {
    const result = calculateFormula('10 + A', { A: 5 });
    expect(result).toBe(15); // 10 is literal part of formula
  });

  it('handles complex custom formula with German decimal commas', () => {
    const result = calculateFormula('(((1000/x)-2,158)/0,006)/49', { x: 300 });
    expect(result).toBeCloseTo(3.998, 2);
  });
});

// ────────────────────────────────────────────────────────────
// validateFormula
// ────────────────────────────────────────────────────────────
describe('validateFormula', () => {
  it('validates simple formula', () => {
    expect(validateFormula('A + B')).toEqual({ valid: true });
  });

  it('validates complex formula', () => {
    expect(validateFormula('(10 + A) - B * C')).toEqual({ valid: true });
  });

  it('rejects empty formula', () => {
    const result = validateFormula('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects formula with invalid characters', () => {
    const result = validateFormula('A + B; DROP TABLE');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('rejects unbalanced parentheses (missing close)', () => {
    const result = validateFormula('(A + B');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('parentheses');
  });

  it('rejects unbalanced parentheses (extra close)', () => {
    const result = validateFormula('A + B)');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('parentheses');
  });

  it('validates nested parentheses', () => {
    expect(validateFormula('((A + B) * C)')).toEqual({ valid: true });
  });

  it('validates formula with decimals', () => {
    expect(validateFormula('10.5 + A')).toEqual({ valid: true });
  });
});

// ────────────────────────────────────────────────────────────
// isSubtractionField
// ────────────────────────────────────────────────────────────
describe('isSubtractionField', () => {
  it('detects "Abzug" as subtraction', () => {
    expect(isSubtractionField('Abzug')).toBe(true);
  });

  it('detects "Ausführung" as subtraction', () => {
    expect(isSubtractionField('Ausführung')).toBe(true);
  });

  it('detects "deduction" as subtraction', () => {
    expect(isSubtractionField('deduction')).toBe(true);
  });

  it('detects "penalty" as subtraction', () => {
    expect(isSubtractionField('penalty')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isSubtractionField('ABZUG')).toBe(true);
    expect(isSubtractionField('Penalty')).toBe(true);
  });

  it('returns false for non-subtraction fields', () => {
    expect(isSubtractionField('Schwierigkeit')).toBe(false);
    expect(isSubtractionField('D-Note')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────
// formatScore (formulaUtils version)
// ────────────────────────────────────────────────────────────
describe('formatScore (formulaUtils)', () => {
  it('formats score with default 2 decimals', () => {
    expect(formatScore(12.5)).toBe('12.50');
  });

  it('formats score with custom decimals', () => {
    expect(formatScore(12.5, 3)).toBe('12.500');
  });

  it('returns dash for null', () => {
    expect(formatScore(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatScore(undefined)).toBe('-');
  });

  it('returns dash for NaN', () => {
    expect(formatScore(NaN)).toBe('-');
  });

  it('formats zero correctly', () => {
    expect(formatScore(0)).toBe('0.00');
  });

  it('formats whole number with trailing zeros', () => {
    expect(formatScore(10)).toBe('10.00');
  });
});

// ────────────────────────────────────────────────────────────
// FORMULA_VARIABLES
// ────────────────────────────────────────────────────────────
describe('FORMULA_VARIABLES', () => {
  it('has 26 entries (A-Z)', () => {
    expect(FORMULA_VARIABLES).toHaveLength(26);
  });

  it('starts with A and ends with Z', () => {
    expect(FORMULA_VARIABLES[0]).toBe('A');
    expect(FORMULA_VARIABLES[25]).toBe('Z');
  });
});
