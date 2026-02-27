/**
 * Custom Formula Tests (Benutzerdefinierte Formel)
 * TDD: Tests for custom formulas like "1*x", "2*x+1", etc.
 * 
 * These tests verify that:
 * 1. extractFormulaSymbols detects lowercase variables (x, y, z)
 * 2. calculateFormula works with lowercase custom formulas
 * 3. formatFormulaWithValues works with lowercase variables
 * 4. validateFormula accepts lowercase variables
 * 5. detectFormulaType correctly identifies variable-based formulas
 * 6. extractVariables finds all used variables
 * 
 * BUG CONTEXT:
 * When a discipline has a "Benutzerdefinierte Formel" (e.g. "1*x"),
 * the Jury Portal shows no input fields because extractFormulaSymbols
 * only matches uppercase [A-Z]. This test suite ensures both uppercase
 * and lowercase formulas work correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  extractFormulaSymbols,
  parseFormula,
  formatFormulaWithValues,
  calculateFormula,
  validateFormula,
  FORMULA_VARIABLES,
} from '../../utils/formulaUtils';
import {
  detectFormulaType,
  extractVariables,
  replaceVariablesInFormula,
  calculateFormulaResult,
} from '../../utils/formulaCalculator';

// ════════════════════════════════════════════════════════════════════════
// formulaUtils — Custom Formula (lowercase variable) support
// ════════════════════════════════════════════════════════════════════════

describe('Custom Formula: extractFormulaSymbols', () => {
  it('extracts lowercase variable "x" from custom formula "1*x"', () => {
    const symbols = extractFormulaSymbols('1*x');
    expect(symbols.length).toBeGreaterThan(0);
    // Should contain 'x' or its uppercase equivalent
    expect(symbols.some(s => s === 'x' || s === 'X')).toBe(true);
  });

  it('extracts lowercase variable "x" from "2*x+1"', () => {
    const symbols = extractFormulaSymbols('2*x+1');
    expect(symbols.length).toBeGreaterThan(0);
  });

  it('extracts multiple lowercase variables from "x + y"', () => {
    const symbols = extractFormulaSymbols('x + y');
    expect(symbols.length).toBe(2);
  });

  it('extracts lowercase "x" from "(10 + x) - y"', () => {
    const symbols = extractFormulaSymbols('(10 + x) - y');
    expect(symbols.length).toBe(2);
  });

  it('handles mixed case: "A + x" has 2 symbols', () => {
    const symbols = extractFormulaSymbols('A + x');
    expect(symbols.length).toBe(2);
  });

  it('still works with uppercase-only formula "A + B"', () => {
    const symbols = extractFormulaSymbols('A + B');
    expect(symbols).toEqual(['A', 'B']);
  });
});

describe('Custom Formula: parseFormula', () => {
  it('parses custom formula "1*x" and finds symbols', () => {
    const result = parseFormula('1*x');
    expect(result.symbols.length).toBeGreaterThan(0);
    expect(result.originalFormula).toBe('1*x');
  });

  it('parses custom formula "2*x+1" and finds symbols', () => {
    const result = parseFormula('2*x+1');
    expect(result.symbols.length).toBeGreaterThan(0);
  });
});

describe('Custom Formula: calculateFormula', () => {
  it('calculates "1*x" with x=5 → 5', () => {
    // The values map should accept lowercase keys
    const result = calculateFormula('1*x', { x: 5 });
    expect(result).toBe(5);
  });

  it('calculates "2*x+1" with x=3 → 7', () => {
    const result = calculateFormula('2*x+1', { x: 3 });
    expect(result).toBe(7);
  });

  it('calculates "1*x" with x=9.5 → 9.5', () => {
    const result = calculateFormula('1*x', { x: 9.5 });
    expect(result).toBeCloseTo(9.5, 5);
  });

  it('calculates "(10 + x) - y" with x=6, y=3.5 → 12.5', () => {
    const result = calculateFormula('(10 + x) - y', { x: 6, y: 3.5 });
    expect(result).toBeCloseTo(12.5, 5);
  });

  it('calculates "x*y" with x=3, y=4 → 12', () => {
    const result = calculateFormula('x*y', { x: 3, y: 4 });
    expect(result).toBe(12);
  });

  it('still works with uppercase formula "A + B"', () => {
    const result = calculateFormula('A + B', { A: 6, B: 4 });
    expect(result).toBe(10);
  });
});

describe('Custom Formula: formatFormulaWithValues', () => {
  it('replaces lowercase x with value in "1*x"', () => {
    const result = formatFormulaWithValues('1*x', { x: 5 });
    expect(result).toContain('5');
    expect(result).not.toContain('x');
  });

  it('replaces both x and y in "(10 + x) - y"', () => {
    const result = formatFormulaWithValues('(10 + x) - y', { x: 6, y: 3.5 });
    expect(result).toContain('6');
    expect(result).toContain('3.5');
    expect(result).not.toContain('x');
    expect(result).not.toContain('y');
  });
});

describe('Custom Formula: validateFormula', () => {
  it('validates "1*x" as valid', () => {
    const result = validateFormula('1*x');
    expect(result.valid).toBe(true);
  });

  it('validates "2*x+1" as valid', () => {
    const result = validateFormula('2*x+1');
    expect(result.valid).toBe(true);
  });

  it('validates "(10 + x) - y" as valid', () => {
    const result = validateFormula('(10 + x) - y');
    expect(result.valid).toBe(true);
  });

  it('still rejects injection attempts', () => {
    const result = validateFormula('x + y; DROP TABLE');
    expect(result.valid).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// formulaCalculator — Custom Formula support
// ════════════════════════════════════════════════════════════════════════

describe('Custom Formula: detectFormulaType', () => {
  it('detects "1*x" as variable type', () => {
    expect(detectFormulaType('1*x')).toBe('variable');
  });

  it('detects "2*x+1" as variable type', () => {
    expect(detectFormulaType('2*x+1')).toBe('variable');
  });

  it('detects "x + y" as variable type', () => {
    expect(detectFormulaType('x + y')).toBe('variable');
  });

  it('detects "A + B" as letter type', () => {
    expect(detectFormulaType('A + B')).toBe('letter');
  });

  it('detects "10 + 5" as none', () => {
    expect(detectFormulaType('10 + 5')).toBe('none');
  });
});

describe('Custom Formula: extractVariables', () => {
  it('extracts "x" from "1*x"', () => {
    const vars = extractVariables('1*x', 'variable');
    expect(vars).toContain('x');
  });

  it('extracts "x" and "y" from "x + y"', () => {
    const vars = extractVariables('x + y', 'variable');
    expect(vars).toContain('x');
    expect(vars).toContain('y');
  });

  it('extracts "x" from "2*x+1"', () => {
    const vars = extractVariables('2*x+1', 'variable');
    expect(vars).toContain('x');
  });
});

describe('Custom Formula: calculateFormulaResult', () => {
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
});

describe('Custom Formula: replaceVariablesInFormula', () => {
  it('replaces x in "1*x" with value', () => {
    const result = replaceVariablesInFormula('1*x', [5], 'variable');
    expect(result).toBe('1*5');
  });

  it('replaces x and y in "x+y" with values', () => {
    const result = replaceVariablesInFormula('x+y', [3, 4], 'variable');
    expect(result).toBe('3+4');
  });
});
