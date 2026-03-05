/**
 * inputMaskUtils Tests
 * C++ port: mask-based formatting, time↔decimal conversion, padding, normalization
 */

import { describe, it, expect } from 'vitest';
import {
  parseInputMask,
  formatScore,
  normalizeScoreInput,
  getPlaceholder,
  validateInput,
  normalizeScoreByDecimalPlaces,
} from '../../utils/inputMaskUtils';

// ────────────────────────────────────────────────────────────
// parseInputMask
// ────────────────────────────────────────────────────────────
describe('parseInputMask', () => {
  it('parses decimal dot mask "0.00"', () => {
    const result = parseInputMask('0.00');
    expect(result.type).toBe('decimal');
    expect(result.decimalPlaces).toBe(2);
    expect(result.totalLength).toBe(4);
    expect(result.separator).toBe('.');
  });

  it('parses decimal dot mask "00.000"', () => {
    const result = parseInputMask('00.000');
    expect(result.type).toBe('decimal');
    expect(result.decimalPlaces).toBe(3);
    expect(result.totalLength).toBe(6);
  });

  it('parses comma mask "0,00"', () => {
    const result = parseInputMask('0,00');
    expect(result.type).toBe('comma');
    expect(result.decimalPlaces).toBe(2);
    expect(result.separator).toBe(',');
  });

  it('parses comma mask "000,000"', () => {
    const result = parseInputMask('000,000');
    expect(result.type).toBe('comma');
    expect(result.decimalPlaces).toBe(3);
    expect(result.totalLength).toBe(7);
  });

  it('parses time mask "0:00"', () => {
    const result = parseInputMask('0:00');
    expect(result.type).toBe('time');
    expect(result.decimalPlaces).toBe(0);
    expect(result.separator).toBe(':');
  });

  it('parses time mask "00:00.00"', () => {
    const result = parseInputMask('00:00.00');
    expect(result.type).toBe('time');
    expect(result.decimalPlaces).toBe(2);
  });

  it('parses complex time mask "0:00:00.00"', () => {
    const result = parseInputMask('0:00:00.00');
    expect(result.type).toBe('time');
    expect(result.decimalPlaces).toBe(2);
  });

  it('defaults to decimal 3 places for empty mask', () => {
    const result = parseInputMask('');
    expect(result.type).toBe('decimal');
    expect(result.decimalPlaces).toBe(3);
    expect(result.pattern).toBe('0.000');
  });

  it('handles mask without decimal part "00"', () => {
    const result = parseInputMask('00');
    expect(result.type).toBe('decimal');
    expect(result.decimalPlaces).toBe(0);
    expect(result.totalLength).toBe(2);
  });
});

// ────────────────────────────────────────────────────────────
// formatScore (inputMaskUtils version)
// ────────────────────────────────────────────────────────────
describe('formatScore (inputMaskUtils)', () => {
  // Decimal format
  it('formats with "0.00" mask', () => {
    expect(formatScore(5, '0.00')).toBe('5.00');
  });

  it('formats with leading zeros for "00.00" mask', () => {
    expect(formatScore(5, '00.00')).toBe('05.00');
  });

  it('formats with 3 decimal places "0.000"', () => {
    expect(formatScore(5, '0.000')).toBe('5.000');
  });

  it('formats with "000.000" mask', () => {
    expect(formatScore(5, '000.000')).toBe('005.000');
  });

  // Comma format
  it('formats with "0,00" mask', () => {
    expect(formatScore(5, '0,00')).toBe('5,00');
  });

  it('formats with "00,00" mask', () => {
    expect(formatScore(5, '00,00')).toBe('05,00');
  });

  // Time format
  it('formats seconds to time with "0:00:00" mask', () => {
    const result = formatScore(90, '0:00:00');
    expect(result).toBe('0:01:30');
  });

  it('formats time value > 59.59s automatically', () => {
    // When value > 59.59 and unit is not 'm', should use time format
    const result = formatScore(90, '0.00');
    expect(result).toContain(':');
  });

  it('does not auto-convert to time when unit is "m"', () => {
    // Meters should stay decimal even > 59.59
    const result = formatScore(65, '0.00', 'm');
    expect(result).toBe('65.00');
  });

  it('formats zero correctly', () => {
    expect(formatScore(0, '0.00')).toBe('0.00');
  });

  it('formats large time value (1 hour)', () => {
    const result = formatScore(3661, '0:00:00');
    expect(result).toBe('1:01:01');
  });

  it('formats MM:SS time mask', () => {
    const result = formatScore(90, '00:00');
    expect(result).toBe('01:30');
  });
});

// ────────────────────────────────────────────────────────────
// normalizeScoreInput (inputMaskUtils version)
// ────────────────────────────────────────────────────────────
describe('normalizeScoreInput (inputMaskUtils)', () => {
  // Decimal normalization
  it('normalizes "5" with "0.00" mask to "5.00"', () => {
    expect(normalizeScoreInput('5', '0.00')).toBe('5.00');
  });

  it('normalizes "5.5" with "0.00" mask to "5.50"', () => {
    expect(normalizeScoreInput('5.5', '0.00')).toBe('5.50');
  });

  it('normalizes "5" with "00.00" mask to "05.00"', () => {
    expect(normalizeScoreInput('5', '00.00')).toBe('05.00');
  });

  it('normalizes with "000.000" mask', () => {
    expect(normalizeScoreInput('5', '000.000')).toBe('005.000');
  });

  // Comma normalization
  it('normalizes "5" with "0,00" mask to "5,00"', () => {
    expect(normalizeScoreInput('5', '0,00')).toBe('5,00');
  });

  // Time normalization
  it('normalizes decimal seconds to time format', () => {
    const result = normalizeScoreInput('65.5', '0:00.00');
    expect(result).toContain(':');
  });

  it('normalizes time input "1:05" to formatted time', () => {
    const result = normalizeScoreInput('1:05', '0:00:00');
    expect(result).toContain(':');
  });

  // Edge cases
  it('returns empty for empty input', () => {
    expect(normalizeScoreInput('', '0.00')).toBe('');
  });

  it('returns empty for dot-only input', () => {
    expect(normalizeScoreInput('.', '0.00')).toBe('');
  });

  it('returns empty for comma-only input', () => {
    expect(normalizeScoreInput(',', '0.00')).toBe('');
  });

  it('returns empty for colon-only input', () => {
    expect(normalizeScoreInput(':', '0:00')).toBe('');
  });
});

// ────────────────────────────────────────────────────────────
// getPlaceholder
// ────────────────────────────────────────────────────────────
describe('getPlaceholder', () => {
  it('returns the mask itself as placeholder', () => {
    expect(getPlaceholder('0.00')).toBe('0.00');
  });

  it('returns mask for time format', () => {
    expect(getPlaceholder('0:00.00')).toBe('0:00.00');
  });

  it('defaults to "0.000" for empty mask', () => {
    expect(getPlaceholder('')).toBe('0.000');
  });
});

// ────────────────────────────────────────────────────────────
// validateInput
// ────────────────────────────────────────────────────────────
describe('validateInput', () => {
  it('accepts empty value', () => {
    expect(validateInput('', '0.00')).toBe(true);
  });

  it('accepts valid decimal input', () => {
    expect(validateInput('12.5', '0.00')).toBe(true);
  });

  it('accepts valid comma input', () => {
    expect(validateInput('12,5', '0,00')).toBe(true);
  });

  it('accepts valid time input', () => {
    expect(validateInput('1:30', '0:00')).toBe(true);
  });

  it('accepts decimal seconds for time mask', () => {
    expect(validateInput('90.5', '0:00.00')).toBe(true);
  });

  it('accepts HH:MM:SS for time mask', () => {
    expect(validateInput('1:01:30', '0:00:00')).toBe(true);
  });

  it('rejects letters for decimal mask', () => {
    expect(validateInput('abc', '0.00')).toBe(false);
  });

  it('rejects letters for comma mask', () => {
    expect(validateInput('abc', '0,00')).toBe(false);
  });

  it('accepts integer for decimal mask', () => {
    expect(validateInput('12', '0.00')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────
// normalizeScoreByDecimalPlaces (legacy support)
// ────────────────────────────────────────────────────────────
describe('normalizeScoreByDecimalPlaces', () => {
  it('normalizes "5" with 2 decimals to "5.00"', () => {
    expect(normalizeScoreByDecimalPlaces('5', 2)).toBe('5.00');
  });

  it('normalizes "5.5" with 2 decimals to "5.50"', () => {
    expect(normalizeScoreByDecimalPlaces('5.5', 2)).toBe('5.50');
  });

  it('normalizes "5" with 3 decimals to "5.000"', () => {
    expect(normalizeScoreByDecimalPlaces('5', 3)).toBe('5.000');
  });

  it('normalizes "5.5" with 0 decimals to "6"', () => {
    expect(normalizeScoreByDecimalPlaces('5.5', 0)).toBe('6');
  });

  it('returns empty for empty input', () => {
    expect(normalizeScoreByDecimalPlaces('', 2)).toBe('');
  });

  it('returns empty for dot-only input', () => {
    expect(normalizeScoreByDecimalPlaces('.', 2)).toBe('');
  });

  it('returns empty for non-numeric input', () => {
    expect(normalizeScoreByDecimalPlaces('abc', 2)).toBe('');
  });

  // German decimal comma regression tests
  it('normalizes "7,1" with 2 decimals to "7.10" (German comma)', () => {
    expect(normalizeScoreByDecimalPlaces('7,1', 2)).toBe('7.10');
  });

  it('normalizes "3,3" with 2 decimals to "3.30" (German comma)', () => {
    expect(normalizeScoreByDecimalPlaces('3,3', 2)).toBe('3.30');
  });

  it('normalizes "9,75" with 2 decimals to "9.75" (German comma)', () => {
    expect(normalizeScoreByDecimalPlaces('9,75', 2)).toBe('9.75');
  });

  it('normalizes "0,5" with 3 decimals to "0.500" (German comma)', () => {
    expect(normalizeScoreByDecimalPlaces('0,5', 3)).toBe('0.500');
  });
});
