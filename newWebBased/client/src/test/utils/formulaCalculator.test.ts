/**
 * formulaCalculator Tests
 * Hand-written arithmetic parser with operator precedence, parentheses, negatives
 */

import { describe, it, expect } from 'vitest';
import {
  parseTimeToSeconds,
  normalizeValueForCalculation,
  detectFormulaType,
  extractVariables,
  getMaxLetterIndex,
  getFieldLetter,
  getOperatorAfterField,
  replaceVariablesInFormula,
  evaluateArithmetic,
  calculateFormulaResult,
} from '../../utils/formulaCalculator';

// ────────────────────────────────────────────────────────────
// parseTimeToSeconds
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// normalizeValueForCalculation
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// detectFormulaType
// ────────────────────────────────────────────────────────────
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
    // Has uppercase A → letter type takes precedence
    expect(detectFormulaType('A + x')).toBe('letter');
  });
});

// ────────────────────────────────────────────────────────────
// extractVariables
// ────────────────────────────────────────────────────────────
describe('extractVariables', () => {
  it('extracts letter variables sorted and unique', () => {
    expect(extractVariables('A + B + A', 'letter')).toEqual(['A', 'B']);
  });

  it('extracts many letter variables', () => {
    expect(extractVariables('A + B + C + D', 'letter')).toEqual(['A', 'B', 'C', 'D']);
  });

  it('extracts variable-type variables', () => {
    const result = extractVariables('x + y', 'variable');
    expect(result).toContain('x');
    expect(result).toContain('y');
  });

  it('returns empty array for no matches', () => {
    expect(extractVariables('10 + 5', 'letter')).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────
// getMaxLetterIndex
// ────────────────────────────────────────────────────────────
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
    // A and D → max is D=3
    expect(getMaxLetterIndex('A + D')).toBe(3);
  });
});

// ────────────────────────────────────────────────────────────
// getFieldLetter
// ────────────────────────────────────────────────────────────
describe('getFieldLetter', () => {
  it('maps 0 to A', () => {
    expect(getFieldLetter(0)).toBe('A');
  });

  it('maps 1 to B', () => {
    expect(getFieldLetter(1)).toBe('B');
  });

  it('maps 25 to Z', () => {
    expect(getFieldLetter(25)).toBe('Z');
  });
});

// ────────────────────────────────────────────────────────────
// getOperatorAfterField
// ────────────────────────────────────────────────────────────
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

// ────────────────────────────────────────────────────────────
// replaceVariablesInFormula
// ────────────────────────────────────────────────────────────
describe('replaceVariablesInFormula', () => {
  it('replaces letter variables with values', () => {
    const result = replaceVariablesInFormula('A + B', [6, 4], 'letter');
    expect(result).toBe('6 + 4');
  });

  it('replaces in complex formula', () => {
    const result = replaceVariablesInFormula('(10 + A) - B', [6, 3.5], 'letter');
    expect(result).toBe('(10 + 6) - 3.5');
  });

  it('normalizes comma to dot', () => {
    const result = replaceVariablesInFormula('A + 1,5', [2], 'letter');
    expect(result).toBe('2 + 1.5');
  });

  it('replaces variable-type variables', () => {
    const result = replaceVariablesInFormula('x + y', [3, 7], 'variable');
    expect(result).toBe('3 + 7');
  });
});

// ────────────────────────────────────────────────────────────
// evaluateArithmetic (Core recursive descent parser)
// ────────────────────────────────────────────────────────────
describe('evaluateArithmetic', () => {
  // Basic operations
  it('evaluates addition', () => {
    expect(evaluateArithmetic('2+3')).toBe(5);
  });

  it('evaluates subtraction', () => {
    expect(evaluateArithmetic('10-3')).toBe(7);
  });

  it('evaluates multiplication', () => {
    expect(evaluateArithmetic('4*3')).toBe(12);
  });

  it('evaluates division', () => {
    expect(evaluateArithmetic('10/4')).toBe(2.5);
  });

  // Operator precedence
  it('respects multiplication before addition', () => {
    expect(evaluateArithmetic('2+3*4')).toBe(14);
  });

  it('respects division before subtraction', () => {
    expect(evaluateArithmetic('10-6/3')).toBe(8);
  });

  // Parentheses
  it('respects parentheses', () => {
    expect(evaluateArithmetic('(2+3)*4')).toBe(20);
  });

  it('handles nested parentheses', () => {
    expect(evaluateArithmetic('((2+3)*4)-5')).toBe(15);
  });

  // Negative numbers
  it('handles negative number at start', () => {
    expect(evaluateArithmetic('-5+3')).toBe(-2);
  });

  it('handles negative in parentheses', () => {
    expect(evaluateArithmetic('(-5)+3')).toBe(-2);
  });

  // Decimals
  it('handles decimal numbers', () => {
    expect(evaluateArithmetic('1.5+2.5')).toBe(4);
  });

  it('handles decimal multiplication', () => {
    expect(evaluateArithmetic('0.1*0.2')).toBeCloseTo(0.02, 10);
  });

  // Whitespace
  it('handles expressions with spaces', () => {
    expect(evaluateArithmetic('2 + 3')).toBe(5);
  });

  // Complex gymnastics formulas
  it('evaluates typical gymnastics formula: (10 + 6) - 3.5', () => {
    expect(evaluateArithmetic('(10+6)-3.5')).toBe(12.5);
  });

  it('evaluates multi-step formula', () => {
    expect(evaluateArithmetic('(10+0.5)-1.2-0.1')).toBeCloseTo(9.2, 10);
  });

  // Error cases
  it('throws on division by zero', () => {
    expect(() => evaluateArithmetic('10/0')).toThrow('Division by zero');
  });

  it('throws on invalid characters', () => {
    expect(() => evaluateArithmetic('2+3a')).toThrow();
  });

  it('throws on mismatched parentheses', () => {
    expect(() => evaluateArithmetic('(2+3')).toThrow();
  });

  it('evaluates single number', () => {
    expect(evaluateArithmetic('42')).toBe(42);
  });
});

// ────────────────────────────────────────────────────────────
// calculateFormulaResult (Integration)
// ────────────────────────────────────────────────────────────
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
    expect(result).toBe(90); // 60s + 30s
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

  // ── Custom formulas with lowercase variables ──────────────
  it('calculates custom formula 1*x with variable type', () => {
    const { result, error } = calculateFormulaResult('1*x', ['5'], 'variable');
    expect(error).toBeNull();
    expect(result).toBe(5);
  });

  it('calculates custom formula with German decimal commas in formula', () => {
    // Production formula: (((1000/x)-2,158)/0,006)/49
    const { result, error } = calculateFormulaResult('(((1000/x)-2,158)/0,006)/49', ['300'], 'variable');
    expect(error).toBeNull();
    expect(result).toBeCloseTo(3.998, 2);
  });

  it('calculates swimming formula with commas', () => {
    // 12*(((100/(1,2*(15*x-16,5)))-0,3))
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
    // Input "83,5" (German comma for 83.5) in formula with "2,158" (German comma for 2.158)
    const { result, error } = calculateFormulaResult('(((1000/x)-2,158)/0,006)/49', ['83,5'], 'variable');
    expect(error).toBeNull();
    expect(result).not.toBeNull();
  });
});
