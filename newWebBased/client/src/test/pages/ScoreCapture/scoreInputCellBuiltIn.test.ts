import { describe, expect, it } from 'vitest';
import { parseBuiltInFormulaInputValue } from '../../../pages/ScoreCapture/components/ScoreInputCell';

describe('parseBuiltInFormulaInputValue', () => {
  it('parses decimal comma values', () => {
    expect(parseBuiltInFormulaInputValue('4,15')).toBe(4.15);
  });

  it('parses decimal point values', () => {
    expect(parseBuiltInFormulaInputValue('4.15')).toBe(4.15);
  });

  it('parses time format to seconds', () => {
    expect(parseBuiltInFormulaInputValue('1:23,50')).toBe(83.5);
  });

  it('returns 0 for empty input', () => {
    expect(parseBuiltInFormulaInputValue('')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(parseBuiltInFormulaInputValue('abc')).toBe(0);
  });
});
