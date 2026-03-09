/**
 * formulaUtils Tests (Shared)
 *
 * TDD-portiert aus client/src/test/utils/formulaCalculator.test.ts
 * und client/src/test/utils/customFormula.test.ts.
 *
 * Tests for:
 * - detectFormulaType:  'letter' | 'variable' | 'none'
 * - getMaxLetterIndex:  max variable index in formula
 * - getOperatorAfterField:  UI-friendly operator symbol
 * - extractFormulaSymbols:  symbol extraction (both cases)
 * - getFormulaSymbol:  index → letter mapping
 * - calculateFormula:  full formula evaluation
 * - formatFormulaWithValues: display formula with substituted values
 * - validateFormula:  structural validation
 * - parseTimeToSeconds:  time format parsing
 * - normalizeValueForCalculation:  input normalization
 * - calculateFormulaResult:  integration (values[] + type API)
 */

import { describe, it, expect } from 'vitest';
import {
  extractFormulaSymbols,
  getFormulaSymbol,
  parseFormula,
  formatFormulaWithValues,
  calculateFormula,
  applyBuiltInFormula,
  validateFormula,
  isSubtractionField,
  buildFieldSymbolsMap,
  formatScore,
  FORMULA_VARIABLES,
  // New functions added for formulaCalculator parity
  detectFormulaType,
  getMaxLetterIndex,
  getOperatorAfterField,
  parseTimeToSeconds,
  normalizeValueForCalculation,
  calculateFormulaResult,
} from '../formulaUtils';

// ════════════════════════════════════════════════════════════════════════
// detectFormulaType
// ════════════════════════════════════════════════════════════════════════

describe('detectFormulaType', () => {
  it('detects letter-based formula (A + B)', () => {
    expect(detectFormulaType('A + B')).toBe('letter');
  });

  it('detects variable-based formula (x + y)', () => {
    expect(detectFormulaType('x + y')).toBe('variable');
  });

  it('returns none for numeric-only formula', () => {
    expect(detectFormulaType('10 + 5')).toBe('none');
  });

  it('returns none for empty string', () => {
    expect(detectFormulaType('')).toBe('none');
  });

  it('prefers letter over variable when both present', () => {
    expect(detectFormulaType('A + x')).toBe('letter');
  });

  it('detects "1*x" as variable type', () => {
    expect(detectFormulaType('1*x')).toBe('variable');
  });

  it('detects "2*x+1" as variable type', () => {
    expect(detectFormulaType('2*x+1')).toBe('variable');
  });
});

// ════════════════════════════════════════════════════════════════════════
// getMaxLetterIndex
// ════════════════════════════════════════════════════════════════════════

describe('getMaxLetterIndex', () => {
  it('returns 0 for formula with only A', () => {
    expect(getMaxLetterIndex('A + 5')).toBe(0);
  });

  it('returns 2 for formula up to C', () => {
    expect(getMaxLetterIndex('A + B + C')).toBe(2);
  });

  it('returns -1 for formula without letter variables', () => {
    expect(getMaxLetterIndex('10 + 5')).toBe(-1);
  });

  it('handles non-sequential letters', () => {
    expect(getMaxLetterIndex('A + D')).toBe(3);
  });
});

// ════════════════════════════════════════════════════════════════════════
// getOperatorAfterField
// ════════════════════════════════════════════════════════════════════════

describe('getOperatorAfterField', () => {
  it('detects + after field A (index 0)', () => {
    expect(getOperatorAfterField('A + B', 0)).toBe('+');
  });

  it('detects - after field A', () => {
    expect(getOperatorAfterField('A - B', 0)).toBe('-');
  });

  it('converts * to ×', () => {
    expect(getOperatorAfterField('A * B', 0)).toBe('×');
  });

  it('converts / to ÷', () => {
    expect(getOperatorAfterField('A / B', 0)).toBe('÷');
  });

  it('returns empty string when no operator follows', () => {
    expect(getOperatorAfterField('A', 0)).toBe('');
  });

  it('returns empty string for empty formula', () => {
    expect(getOperatorAfterField('', 0)).toBe('');
  });
});

// ════════════════════════════════════════════════════════════════════════
// parseTimeToSeconds
// ════════════════════════════════════════════════════════════════════════

describe('parseTimeToSeconds', () => {
  it('parses MM:SS.ms format', () => {
    expect(parseTimeToSeconds('1:23.50')).toBe(60 + 23 + 0.5);
  });

  it('parses 0:00.00 format', () => {
    expect(parseTimeToSeconds('0:00.00')).toBe(0);
  });

  it('parses time with comma separator', () => {
    expect(parseTimeToSeconds('1:23,50')).toBe(60 + 23 + 0.5);
  });

  it('returns null for non-time string', () => {
    expect(parseTimeToSeconds('12.5')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseTimeToSeconds('')).toBeNull();
  });

  it('returns null for plain number', () => {
    expect(parseTimeToSeconds('100')).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════
// normalizeValueForCalculation
// ════════════════════════════════════════════════════════════════════════

describe('normalizeValueForCalculation', () => {
  it('converts time format to seconds string', () => {
    const result = normalizeValueForCalculation('1:23.50');
    expect(parseFloat(result)).toBeCloseTo(83.5, 5);
  });

  it('replaces comma with dot for regular numbers', () => {
    expect(normalizeValueForCalculation('12,5')).toBe('12.5');
  });

  it('passes through dot-separated numbers unchanged', () => {
    expect(normalizeValueForCalculation('12.5')).toBe('12.5');
  });

  it('passes through integers unchanged', () => {
    expect(normalizeValueForCalculation('100')).toBe('100');
  });
});

// ════════════════════════════════════════════════════════════════════════
// calculateFormulaResult (values[] + type integration API)
// ════════════════════════════════════════════════════════════════════════

describe('calculateFormulaResult', () => {
  it('calculates simple addition with letter formula', () => {
    const { result, error } = calculateFormulaResult('A + B', ['6', '4'], 'letter');
    expect(error).toBeNull();
    expect(result).toBe(10);
  });

  it('calculates formula with parentheses', () => {
    const { result, error } = calculateFormulaResult('(10 + A) - B', ['6', '3.5'], 'letter');
    expect(error).toBeNull();
    expect(result).toBe(12.5);
  });

  it('handles comma-separated input values', () => {
    const { result, error } = calculateFormulaResult('A + B', ['6,5', '3,5'], 'letter');
    expect(error).toBeNull();
    expect(result).toBe(10);
  });

  it('handles time format input values', () => {
    const { result, error } = calculateFormulaResult('A + B', ['1:00.00', '0:30.00'], 'letter');
    expect(error).toBeNull();
    expect(result).toBe(90);
  });

  it('returns error for invalid value', () => {
    const { result, error } = calculateFormulaResult('A + B', ['abc', '5'], 'letter');
    expect(result).toBeNull();
    expect(error).toContain('Invalid value');
  });

  it('returns error for division by zero', () => {
    const { result, error } = calculateFormulaResult('A / B', ['10', '0'], 'letter');
    expect(result).toBeNull();
    expect(error).toBeTruthy();
  });

  // Custom formulas with lowercase variables
  it('calculates custom formula 1*x with variable type', () => {
    const { result, error } = calculateFormulaResult('1*x', ['5'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(5);
  });

  it('calculates custom formula with German decimal commas in formula', () => {
    const { result, error } = calculateFormulaResult('(((1000/x)-2,158)/0,006)/49', ['300'], 'variable');
    expect(error).toBeNull();
    expect(result).toBeCloseTo(3.998, 2);
  });

  it('calculates swimming formula with commas', () => {
    const { result, error } = calculateFormulaResult('12*(((100/(1,2*(15*x-16,5)))-0,3))', ['10'], 'variable');
    expect(error).toBeNull();
    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
  });

  it('calculates simple custom formula x * 1,5', () => {
    const { result, error } = calculateFormulaResult('x * 1,5', ['4'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(6);
  });

  it('handles variable formula with comma input AND comma in formula', () => {
    const { result, error } = calculateFormulaResult('(((1000/x)-2,158)/0,006)/49', ['83,5'], 'variable');
    expect(error).toBeNull();
    expect(result).not.toBeNull();
  });

  it('calculates "1*x" with x=5.0 → 5', () => {
    const { result, error } = calculateFormulaResult('1*x', ['5.0'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(5);
  });

  it('calculates "2*x+1" with x=3.0 → 7', () => {
    const { result, error } = calculateFormulaResult('2*x+1', ['3.0'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(7);
  });

  it('calculates "1*x" with x=9.50 → 9.5', () => {
    const { result, error } = calculateFormulaResult('1*x', ['9.50'], 'variable');
    expect(error).toBeNull();
    expect(result).toBeCloseTo(9.5, 5);
  });

  it('calculates "1*x" with x=0 → 0', () => {
    const { result, error } = calculateFormulaResult('1*x', ['0'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(0);
  });

  it('calculates "20-x" with x=0 → 20', () => {
    const { result, error } = calculateFormulaResult('20-x', ['0'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(20);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Existing shared functions (regression tests)
// ════════════════════════════════════════════════════════════════════════

describe('extractFormulaSymbols', () => {
  it('extracts uppercase letter variables', () => {
    expect(extractFormulaSymbols('A + B')).toEqual(['A', 'B']);
  });

  it('extracts lowercase variable "x" from "1*x"', () => {
    const symbols = extractFormulaSymbols('1*x');
    expect(symbols).toContain('x');
  });

  it('extracts multiple lowercase variables', () => {
    const symbols = extractFormulaSymbols('x + y');
    expect(symbols.length).toBe(2);
  });

  it('handles mixed case: "A + x"', () => {
    const symbols = extractFormulaSymbols('A + x');
    expect(symbols.length).toBe(2);
  });

  it('returns empty for empty formula', () => {
    expect(extractFormulaSymbols('')).toEqual([]);
  });
});

describe('parseFormula', () => {
  it('parses formula with symbols and parentheses', () => {
    const parsed = parseFormula('(10 + A) - B');
    expect(parsed.originalFormula).toBe('(10 + A) - B');
    expect(parsed.symbols).toEqual(['A', 'B']);
    expect(parsed.hasParentheses).toBe(true);
  });

  it('returns empty parse info for empty input', () => {
    const parsed = parseFormula('');
    expect(parsed.originalFormula).toBe('');
    expect(parsed.symbols).toEqual([]);
    expect(parsed.hasParentheses).toBe(false);
  });
});

describe('getFormulaSymbol', () => {
  it('maps 0 to A', () => {
    expect(getFormulaSymbol(0)).toBe('A');
  });

  it('maps 1 to B', () => {
    expect(getFormulaSymbol(1)).toBe('B');
  });

  it('maps 25 to Z', () => {
    expect(getFormulaSymbol(25)).toBe('Z');
  });
});

describe('calculateFormula', () => {
  it('calculates uppercase formula "A + B"', () => {
    expect(calculateFormula('A + B', { A: 6, B: 4 })).toBe(10);
  });

  it('calculates "(10 + A) - B" with literal 10', () => {
    expect(calculateFormula('(10 + A) - B', { A: 6, B: 3.5 })).toBeCloseTo(12.5, 5);
  });

  it('calculates custom formula "1*x" with x=5', () => {
    expect(calculateFormula('1*x', { x: 5 })).toBe(5);
  });

  it('calculates "2*x+1" with x=3', () => {
    expect(calculateFormula('2*x+1', { x: 3 })).toBe(7);
  });

  it('calculates "(10 + x) - y"', () => {
    expect(calculateFormula('(10 + x) - y', { x: 6, y: 3.5 })).toBeCloseTo(12.5, 5);
  });

  it('returns null for empty formula', () => {
    expect(calculateFormula('', {})).toBeNull();
  });

  it('replaces missing uppercase symbols with 0', () => {
    expect(calculateFormula('A + B', { A: 2 })).toBe(2);
  });

  it('replaces remaining lowercase symbols with 0', () => {
    expect(calculateFormula('x + y', { x: 2 })).toBe(2);
  });

  // ── Non-trivial formula "5,5*x" (German decimal comma) ──

  it('calculates "5,5*x" with x=3 → 16.5', () => {
    expect(calculateFormula('5,5*x', { x: 3 })).toBeCloseTo(16.5);
  });

  it('calculates "5,5*x" with x=4 → 22', () => {
    expect(calculateFormula('5,5*x', { x: 4 })).toBe(22);
  });

  it('calculates "5,5*x" with x=2.5 → 13.75', () => {
    expect(calculateFormula('5,5*x', { x: 2.5 })).toBeCloseTo(13.75);
  });

  it('calculates "5,5*x" with x=0 → 0', () => {
    expect(calculateFormula('5,5*x', { x: 0 })).toBe(0);
  });

  it('calculates "5,5*x" with x=1.8 → 9.9', () => {
    expect(calculateFormula('5,5*x', { x: 1.8 })).toBeCloseTo(9.9);
  });
});

describe('applyBuiltInFormula', () => {
  it('returns raw score when formula is missing', () => {
    expect(applyBuiltInFormula(undefined, 7.5)).toBe(7.5);
    expect(applyBuiltInFormula(null, 7.5)).toBe(7.5);
    expect(applyBuiltInFormula('', 7.5)).toBe(7.5);
  });

  it('applies valid built-in formula', () => {
    expect(applyBuiltInFormula('20-x', 5)).toBe(15);
  });

  it('falls back to raw score for invalid built-in formula', () => {
    expect(applyBuiltInFormula('x + ;', 5)).toBe(5);
  });
});

describe('formatFormulaWithValues', () => {
  it('replaces uppercase variables', () => {
    const result = formatFormulaWithValues('A + B', { A: 6, B: 4 });
    expect(result).toContain('6');
    expect(result).toContain('4');
  });

  it('replaces lowercase variable x', () => {
    const result = formatFormulaWithValues('1*x', { x: 5 });
    expect(result).toContain('5');
    expect(result).not.toContain('x');
  });
});

describe('validateFormula', () => {
  it('validates "A + B" as valid', () => {
    expect(validateFormula('A + B').valid).toBe(true);
  });

  it('validates "1*x" as valid', () => {
    expect(validateFormula('1*x').valid).toBe(true);
  });

  it('rejects empty formula', () => {
    expect(validateFormula('').valid).toBe(false);
  });

  it('rejects unbalanced parentheses', () => {
    expect(validateFormula('(A + B').valid).toBe(false);
  });

  it('rejects invalid characters', () => {
    const result = validateFormula('A + B; DROP TABLE');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('rejects non-evaluable formulas', () => {
    const result = validateFormula('A +');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be evaluated');
  });
});

describe('isSubtractionField', () => {
  it('detects subtraction keywords', () => {
    expect(isSubtractionField('Abzug Ausführung')).toBe(true);
    expect(isSubtractionField('Deduction')).toBe(true);
    expect(isSubtractionField('Penalty Time')).toBe(true);
    expect(isSubtractionField('Ausf-Fehler')).toBe(true);
  });

  it('returns false for non-subtraction field names', () => {
    expect(isSubtractionField('Schwierigkeit')).toBe(false);
  });
});

describe('buildFieldSymbolsMap', () => {
  it('maps and sorts non-final/non-starting fields by sortOrder', () => {
    const map = buildFieldSymbolsMap([
      { fieldName: 'Abzug', performance: 1.2, sortOrder: 2 },
      { fieldName: 'Startwert', performance: 10, sortOrder: 0, isStartingScore: true },
      { fieldName: 'D-Note', performance: 5.8, sortOrder: 1 },
      { fieldName: 'Endwert', performance: 14.6, sortOrder: 3, isFinalScore: true }
    ], 'A-B');

    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.A.value).toBe(5.8);
    expect(map.B.value).toBe(1.2);
    expect(map.B.isSubtraction).toBe(true);
  });

  it('uses generated symbols when no formula is provided', () => {
    const map = buildFieldSymbolsMap([
      { fieldName: 'Wert 1', performance: 3.3 },
      { fieldName: 'Wert 2', performance: 4.4 }
    ]);

    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.A.value).toBe(3.3);
    expect(map.B.value).toBe(4.4);
  });

  it('falls back to generated symbol if formula has too few variables', () => {
    const map = buildFieldSymbolsMap([
      { fieldName: 'X', performance: 1 },
      { fieldName: 'Y', performance: 2 }
    ], 'A');

    expect(Object.keys(map)).toEqual(['A', 'B']);
    expect(map.B.value).toBe(2);
  });
});

describe('formatScore', () => {
  it('formats numeric score with default decimals', () => {
    expect(formatScore(12.345)).toBe('12.35');
  });

  it('formats numeric score with custom decimals', () => {
    expect(formatScore(12.345, 1)).toBe('12.3');
  });

  it('returns dash for nullish or NaN values', () => {
    expect(formatScore(null)).toBe('-');
    expect(formatScore(undefined)).toBe('-');
    expect(formatScore(Number.NaN)).toBe('-');
  });
});
