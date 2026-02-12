/**
 * Formula Calculator Tests
 * Tests for formula parsing and calculation utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateFormula, parseFormula, validateFormula } from '../../utils/formulaCalculator';

describe('Formula Calculator', () => {
  describe('calculateFormula', () => {
    describe('Letter-based Formulas', () => {
      it('calculates simple addition A+B', () => {
        const result = calculateFormula('A+B', { A: 5, B: 3 });
        expect(result).toBe(8);
      });

      it('calculates simple subtraction A-B', () => {
        const result = calculateFormula('A-B', { A: 10, B: 3 });
        expect(result).toBe(7);
      });

      it('calculates multiplication A*B', () => {
        const result = calculateFormula('A*B', { A: 4, B: 5 });
        expect(result).toBe(20);
      });

      it('calculates division A/B', () => {
        const result = calculateFormula('A/B', { A: 20, B: 4 });
        expect(result).toBe(5);
      });

      it('calculates complex formula (A+B)*C', () => {
        const result = calculateFormula('(A+B)*C', { A: 2, B: 3, C: 4 });
        expect(result).toBe(20);
      });

      it('handles multiple operations A+B-C+D', () => {
        const result = calculateFormula('A+B-C+D', { A: 10, B: 5, C: 3, D: 2 });
        expect(result).toBe(14);
      });
    });

    describe('Variable-based Formulas', () => {
      it('calculates x*2', () => {
        const result = calculateFormula('x*2', { x: 5 });
        expect(result).toBe(10);
      });

      it('calculates score-penalty', () => {
        const result = calculateFormula('score-penalty', { score: 15.5, penalty: 0.5 });
        expect(result).toBe(15);
      });

      it('calculates (d+e)/2', () => {
        const result = calculateFormula('(d+e)/2', { d: 10, e: 14 });
        expect(result).toBe(12);
      });
    });

    describe('Edge Cases', () => {
      it('handles decimal numbers', () => {
        const result = calculateFormula('A+B', { A: 5.5, B: 3.3 });
        expect(result).toBeCloseTo(8.8, 1);
      });

      it('handles negative numbers', () => {
        const result = calculateFormula('A+B', { A: -5, B: 10 });
        expect(result).toBe(5);
      });

      it('returns null for division by zero', () => {
        const result = calculateFormula('A/B', { A: 10, B: 0 });
        expect(result).toBeNull();
      });

      it('returns null for missing variables', () => {
        const result = calculateFormula('A+B', { A: 5 });
        expect(result).toBeNull();
      });

      it('returns null for invalid formula', () => {
        const result = calculateFormula('A++B', { A: 5, B: 3 });
        expect(result).toBeNull();
      });

      it('handles zero values correctly', () => {
        const result = calculateFormula('A+B', { A: 0, B: 0 });
        expect(result).toBe(0);
      });
    });

    describe('Whitespace Handling', () => {
      it('handles formulas with spaces', () => {
        const result = calculateFormula('A + B * C', { A: 2, B: 3, C: 4 });
        expect(result).toBe(14);
      });

      it('handles formulas without spaces', () => {
        const result = calculateFormula('A+B*C', { A: 2, B: 3, C: 4 });
        expect(result).toBe(14);
      });
    });
  });

  describe('parseFormula', () => {
    it('extracts variables from letter-based formula', () => {
      const vars = parseFormula('A+B-C');
      expect(vars).toEqual(['A', 'B', 'C']);
    });

    it('extracts variables from variable-based formula', () => {
      const vars = parseFormula('score-penalty+bonus');
      expect(vars).toEqual(['score', 'penalty', 'bonus']);
    });

    it('returns unique variables only', () => {
      const vars = parseFormula('A+A*B+B');
      expect(vars).toEqual(['A', 'B']);
    });

    it('handles formulas with parentheses', () => {
      const vars = parseFormula('(A+B)*(C-D)');
      expect(vars).toEqual(['A', 'B', 'C', 'D']);
    });

    it('ignores numbers', () => {
      const vars = parseFormula('A*2+B/3');
      expect(vars).toEqual(['A', 'B']);
    });

    it('returns empty array for invalid formula', () => {
      const vars = parseFormula('+++');
      expect(vars).toEqual([]);
    });
  });

  describe('validateFormula', () => {
    it('validates correct letter-based formula', () => {
      const result = validateFormula('A+B-C');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('validates correct variable-based formula', () => {
      const result = validateFormula('score-penalty');
      expect(result.valid).toBe(true);
    });

    it('validates formula with parentheses', () => {
      const result = validateFormula('(A+B)*(C-D)');
      expect(result.valid).toBe(true);
    });

    it('rejects empty formula', () => {
      const result = validateFormula('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('rejects formula with invalid characters', () => {
      const result = validateFormula('A+B$C');
      expect(result.valid).toBe(false);
    });

    it('rejects formula with unmatched parentheses', () => {
      const result = validateFormula('(A+B');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('parenthes');
    });

    it('rejects formula with consecutive operators', () => {
      const result = validateFormula('A++B');
      expect(result.valid).toBe(false);
    });

    it('accepts formula with decimals', () => {
      const result = validateFormula('A*1.5+B*2.3');
      expect(result.valid).toBe(true);
    });
  });
});
