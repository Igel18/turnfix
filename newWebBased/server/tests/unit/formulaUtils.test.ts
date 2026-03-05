/**
 * Unit Tests — formulaUtils
 *
 * Tests the core formula parsing, calculation, validation, and formatting
 * functions used for gymnastics score computation.
 */

import {
  extractFormulaSymbols,
  getFormulaSymbol,
  parseFormula,
  formatFormulaWithValues,
  calculateFormula,
  validateFormula,
  isSubtractionField,
  buildFieldSymbolsMap,
  formatScore,
  FORMULA_VARIABLES,
} from '../../src/utils/formulaUtils';

describe('formulaUtils', () => {

  // ─── extractFormulaSymbols ────────────────────────────────────────────

  describe('extractFormulaSymbols', () => {
    it('should extract single symbols', () => {
      expect(extractFormulaSymbols('A')).toEqual(['A']);
    });

    it('should extract multiple unique symbols', () => {
      expect(extractFormulaSymbols('A + B - C')).toEqual(['A', 'B', 'C']);
    });

    it('should deduplicate symbols', () => {
      expect(extractFormulaSymbols('A + A - B')).toEqual(['A', 'B']);
    });

    it('should handle formulas with numbers and parentheses', () => {
      expect(extractFormulaSymbols('(10 + A) - B')).toEqual(['A', 'B']);
    });

    it('should return empty array for empty/null input', () => {
      expect(extractFormulaSymbols('')).toEqual([]);
    });

    it('should match lowercase letters (used in custom formulas like "1*x")', () => {
      expect(extractFormulaSymbols('a + b')).toEqual(['a', 'b']);
    });

    it('should handle D+E-Neutral pattern', () => {
      // Real formula from production: "D+E-Neutral" style
      expect(extractFormulaSymbols('A+B')).toEqual(['A', 'B']);
    });
  });

  // ─── getFormulaSymbol ─────────────────────────────────────────────────

  describe('getFormulaSymbol', () => {
    it('should return A for index 0', () => {
      expect(getFormulaSymbol(0)).toBe('A');
    });

    it('should return Z for index 25', () => {
      expect(getFormulaSymbol(25)).toBe('Z');
    });

    it('should handle index beyond 25', () => {
      // Should still produce a character via String.fromCharCode
      const result = getFormulaSymbol(26);
      expect(typeof result).toBe('string');
      expect(result.length).toBe(1);
    });
  });

  // ─── parseFormula ─────────────────────────────────────────────────────

  describe('parseFormula', () => {
    it('should parse simple addition formula', () => {
      const result = parseFormula('A + B');
      expect(result.symbols).toEqual(['A', 'B']);
      expect(result.hasParentheses).toBe(false);
    });

    it('should detect parentheses', () => {
      const result = parseFormula('(A + B) - C');
      expect(result.hasParentheses).toBe(true);
      expect(result.symbols).toEqual(['A', 'B', 'C']);
    });

    it('should extract symbols from formula with leading number', () => {
      const result = parseFormula('10 + A - B');
      expect(result.symbols).toEqual(['A', 'B']);
    });

    it('should handle formula with decimal leading number', () => {
      const result = parseFormula('10.5 + A');
      expect(result.symbols).toEqual(['A']);
    });

    it('should return empty for empty formula', () => {
      const result = parseFormula('');
      expect(result.symbols).toEqual([]);
      expect(result.originalFormula).toBe('');
    });
  });

  // ─── calculateFormula ─────────────────────────────────────────────────

  describe('calculateFormula', () => {
    it('should calculate simple addition', () => {
      expect(calculateFormula('A + B', { A: 3, B: 4 })).toBe(7);
    });

    it('should calculate subtraction', () => {
      expect(calculateFormula('A - B', { A: 10, B: 3.5 })).toBe(6.5);
    });

    it('should calculate with parentheses and starting value', () => {
      // (10 + A) - B with A=6, B=3.5 → 12.5
      expect(calculateFormula('(10 + A) - B', { A: 6, B: 3.5 })).toBe(12.5);
    });

    it('should replace undefined variables with 0', () => {
      expect(calculateFormula('A + B', { A: 5 })).toBe(5);
    });

    it('should handle multiplication', () => {
      expect(calculateFormula('A * B', { A: 3, B: 4 })).toBe(12);
    });

    it('should handle division', () => {
      expect(calculateFormula('A / B', { A: 10, B: 4 })).toBe(2.5);
    });

    it('should return null for empty formula', () => {
      expect(calculateFormula('', { A: 1 })).toBeNull();
    });

    it('should return null for invalid formula', () => {
      expect(calculateFormula('A $ B', { A: 1, B: 2 })).toBeNull();
    });

    it('should handle the D+E pattern (real gymnastics)', () => {
      // D-Score + E-Score
      expect(calculateFormula('A + B', { A: 5.2, B: 8.3 })).toBeCloseTo(13.5);
    });

    it('should handle D+E-Neutral pattern', () => {
      // D + E - Neutral deduction
      expect(calculateFormula('A + B - C', { A: 5.2, B: 8.3, C: 0.3 })).toBeCloseTo(13.2);
    });

    it('should handle formula with leading number', () => {
      const result = calculateFormula('10 + A', { A: 3 });
      expect(result).toBe(13); // 10 is literal part of formula
    });
  });

  // ─── formatFormulaWithValues ──────────────────────────────────────────

  describe('formatFormulaWithValues', () => {
    it('should replace symbols with formatted values', () => {
      const result = formatFormulaWithValues('A + B', { A: 6, B: 3.5 });
      expect(result).toBe('6.00 + 3.50');
    });

    it('should handle custom decimal places', () => {
      const result = formatFormulaWithValues('A + B', { A: 6, B: 3.5 }, { decimals: 3 });
      expect(result).toBe('6.000 + 3.500');
    });

    it('should format formula with leading number', () => {
      const result = formatFormulaWithValues('10 + A - B', { A: 6, B: 3.5 });
      expect(result).toContain('6.00');
      expect(result).toContain('3.50');
    });

    it('should return empty string for empty formula', () => {
      expect(formatFormulaWithValues('', { A: 1 })).toBe('');
    });
  });

  // ─── validateFormula ──────────────────────────────────────────────────

  describe('validateFormula', () => {
    it('should validate simple formulas', () => {
      expect(validateFormula('A + B')).toEqual({ valid: true });
    });

    it('should validate formulas with parentheses', () => {
      expect(validateFormula('(A + B) * C')).toEqual({ valid: true });
    });

    it('should reject empty formulas', () => {
      expect(validateFormula('')).toEqual({ valid: false, error: 'Formula is empty' });
    });

    it('should reject unbalanced parentheses (missing close)', () => {
      const result = validateFormula('(A + B');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('parentheses');
    });

    it('should reject unbalanced parentheses (extra close)', () => {
      const result = validateFormula('A + B)');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('parentheses');
    });

    it('should reject invalid characters', () => {
      const result = validateFormula('A $ B');
      expect(result.valid).toBe(false);
    });
  });

  // ─── isSubtractionField ───────────────────────────────────────────────

  describe('isSubtractionField', () => {
    it('should detect "Abzug" fields', () => {
      expect(isSubtractionField('Abzug')).toBe(true);
      expect(isSubtractionField('Neutral Abzug')).toBe(true);
    });

    it('should detect "Ausführung" fields', () => {
      expect(isSubtractionField('Ausführung')).toBe(true);
    });

    it('should detect "deduction" fields', () => {
      expect(isSubtractionField('deduction')).toBe(true);
    });

    it('should detect "penalty" fields', () => {
      expect(isSubtractionField('penalty')).toBe(true);
    });

    it('should not flag regular fields', () => {
      expect(isSubtractionField('Note')).toBe(false);
      expect(isSubtractionField('Ausgangswert')).toBe(false);
      expect(isSubtractionField('D-Note')).toBe(false);
    });
  });

  // ─── formatScore ─────────────────────────────────────────────────────

  describe('formatScore', () => {
    it('should format numbers with 2 decimal places by default', () => {
      expect(formatScore(13.5)).toBe('13.50');
    });

    it('should format with custom decimal places', () => {
      expect(formatScore(13.567, 3)).toBe('13.567');
    });

    it('should return "-" for null', () => {
      expect(formatScore(null)).toBe('-');
    });

    it('should return "-" for undefined', () => {
      expect(formatScore(undefined)).toBe('-');
    });

    it('should return "-" for NaN', () => {
      expect(formatScore(NaN)).toBe('-');
    });

    it('should handle zero', () => {
      expect(formatScore(0)).toBe('0.00');
    });
  });

  // ─── buildFieldSymbolsMap ─────────────────────────────────────────────

  describe('buildFieldSymbolsMap', () => {
    it('should map jury results to formula symbols', () => {
      const juryResults = [
        { fieldName: 'D-Note', performance: 5.2, sortOrder: 1 },
        { fieldName: 'E-Note', performance: 8.3, sortOrder: 2 },
      ];
      const result = buildFieldSymbolsMap(juryResults, 'A + B');
      expect(result['A'].value).toBe(5.2);
      expect(result['B'].value).toBe(8.3);
    });

    it('should mark subtraction fields', () => {
      const juryResults = [
        { fieldName: 'Note', performance: 9.0, sortOrder: 1 },
        { fieldName: 'Abzug', performance: 0.5, sortOrder: 2 },
      ];
      const result = buildFieldSymbolsMap(juryResults, 'A - B');
      expect(result['A'].isSubtraction).toBe(false);
      expect(result['B'].isSubtraction).toBe(true);
    });

    it('should handle empty jury results', () => {
      const result = buildFieldSymbolsMap([], 'A + B');
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  // ─── FORMULA_VARIABLES ───────────────────────────────────────────────

  describe('FORMULA_VARIABLES', () => {
    it('should contain 26 uppercase letters', () => {
      expect(FORMULA_VARIABLES).toHaveLength(26);
      expect(FORMULA_VARIABLES[0]).toBe('A');
      expect(FORMULA_VARIABLES[25]).toBe('Z');
    });
  });
});
