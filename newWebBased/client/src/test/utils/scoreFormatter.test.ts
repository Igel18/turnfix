/**
 * scoreFormatter Tests
 * Score display: time parsing/formatting, locale separators, precision, validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectFormatType,
  getDecimalSeparator,
  formatTime,
  parseTime,
  getDecimalPlaces,
  formatScore,
  formatDisciplineScore,
  clearDisciplineCache,
  setDisciplineConfig,
  getScorePlaceholder,
  getScoreInputStep,
  validateAndRoundScore,
  normalizeScoreInput,
  parseScoreInput,
} from '../../utils/scoreFormatter';

// Clear cache before each test
beforeEach(() => {
  clearDisciplineCache();
});

// ────────────────────────────────────────────────────────────
// detectFormatType
// ────────────────────────────────────────────────────────────
describe('detectFormatType', () => {
  it('returns time for mask with colon', () => {
    expect(detectFormatType('0:00.00')).toBe('time');
  });

  it('returns decimal-comma for mask with comma', () => {
    expect(detectFormatType('0,00')).toBe('decimal-comma');
  });

  it('returns decimal-point for mask with dot', () => {
    expect(detectFormatType('0.00')).toBe('decimal-point');
  });

  it('defaults to decimal-point when no mask', () => {
    expect(detectFormatType(undefined)).toBe('decimal-point');
  });

  it('handles complex time mask', () => {
    expect(detectFormatType('00:00:00.00')).toBe('time');
  });
});

// ────────────────────────────────────────────────────────────
// getDecimalSeparator
// ────────────────────────────────────────────────────────────
describe('getDecimalSeparator', () => {
  it('returns comma for comma mask', () => {
    expect(getDecimalSeparator('0,00')).toBe(',');
  });

  it('returns dot for dot mask', () => {
    expect(getDecimalSeparator('0.00')).toBe('.');
  });

  it('returns dot for time mask', () => {
    expect(getDecimalSeparator('0:00.00')).toBe('.');
  });

  it('returns dot for undefined mask', () => {
    expect(getDecimalSeparator(undefined)).toBe('.');
  });
});

// ────────────────────────────────────────────────────────────
// formatTime
// ────────────────────────────────────────────────────────────
describe('formatTime', () => {
  it('formats seconds to default HH:MM:SS', () => {
    const result = formatTime(3661); // 1h 1m 1s
    expect(result).toBe('1:01:01');
  });

  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00:00');
  });

  it('returns dash for negative seconds', () => {
    expect(formatTime(-5)).toBe('-');
  });

  it('formats with decimal places', () => {
    const result = formatTime(65.5, '0:00:00.0');
    expect(result).toContain(':');
    // 65.5s = 0h 1m 5.5s
  });

  it('formats mm:ss format', () => {
    const result = formatTime(90, '00:00');
    expect(result).toBe('01:30');
  });
});

// ────────────────────────────────────────────────────────────
// parseTime
// ────────────────────────────────────────────────────────────
describe('parseTime', () => {
  it('parses hh:mm:ss format', () => {
    expect(parseTime('1:01:01')).toBe(3661);
  });

  it('parses mm:ss format', () => {
    expect(parseTime('1:30')).toBe(90);
  });

  it('parses mm:ss.d format with comma', () => {
    expect(parseTime('1:30,5')).toBe(90.5);
  });

  it('parses mm:ss.d format with dot', () => {
    expect(parseTime('1:30.5')).toBe(90.5);
  });

  it('returns 0 for empty string', () => {
    expect(parseTime('')).toBe(0);
  });

  it('returns 0 for dash', () => {
    expect(parseTime('-')).toBe(0);
  });

  it('parses plain seconds', () => {
    expect(parseTime('45.5')).toBe(45.5);
  });

  it('handles hh:mm:ss.d format', () => {
    expect(parseTime('1:01:01.5')).toBe(3661.5);
  });
});

// ────────────────────────────────────────────────────────────
// getDecimalPlaces
// ────────────────────────────────────────────────────────────
describe('getDecimalPlaces', () => {
  it('defaults to 2 for undefined', () => {
    expect(getDecimalPlaces(undefined)).toBe(2);
  });

  it('defaults to 2 for null', () => {
    expect(getDecimalPlaces(null as any)).toBe(2);
  });

  it('returns 0 for calculationType 0', () => {
    expect(getDecimalPlaces(0)).toBe(0);
  });

  it('returns 1 for calculationType 1', () => {
    expect(getDecimalPlaces(1)).toBe(1);
  });

  it('returns 3 for calculationType 3', () => {
    expect(getDecimalPlaces(3)).toBe(3);
  });

  it('clamps to max 3', () => {
    expect(getDecimalPlaces(5)).toBe(3);
  });

  it('clamps to min 0', () => {
    expect(getDecimalPlaces(-1)).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────
// formatScore (scoreFormatter version)
// ────────────────────────────────────────────────────────────
describe('formatScore', () => {
  it('returns dash for null', () => {
    expect(formatScore(null)).toBe('-');
  });

  it('returns dash for undefined', () => {
    expect(formatScore(undefined)).toBe('-');
  });

  it('returns dash for NaN', () => {
    expect(formatScore(NaN)).toBe('-');
  });

  it('formats with default 2 decimals (no config)', () => {
    expect(formatScore(12.5)).toBe('12.50');
  });

  it('formats with legacy calculationType number', () => {
    expect(formatScore(12.5, 3)).toBe('12.500');
    expect(formatScore(12.5, 0)).toBe('13');
    expect(formatScore(12.5, 1)).toBe('12.5');
  });

  it('formats zero correctly', () => {
    expect(formatScore(0)).toBe('0.00');
  });

  it('formats with comma separator config', () => {
    const result = formatScore(12.5, { inputMask: '0,00', calculationType: 2 });
    expect(result).toBe('12,50');
  });

  it('formats with time config', () => {
    const result = formatScore(90, { inputMask: '0:00:00' });
    expect(result).toContain(':');
  });

  it('formats with dot separator config', () => {
    const result = formatScore(12.5, { inputMask: '0.00', calculationType: 2 });
    expect(result).toBe('12.50');
  });
});

// ────────────────────────────────────────────────────────────
// formatDisciplineScore (with caching)
// ────────────────────────────────────────────────────────────
describe('formatDisciplineScore', () => {
  it('returns dash for null', () => {
    expect(formatDisciplineScore(null, 1)).toBe('-');
  });

  it('uses provided config', () => {
    const result = formatDisciplineScore(12.5, 1, { calculationType: 3 });
    expect(result).toBe('12.500');
  });

  it('caches config for subsequent calls', () => {
    formatDisciplineScore(12.5, 42, { calculationType: 3 });
    // Second call without config should use cache
    const result = formatDisciplineScore(9.1, 42);
    expect(result).toBe('9.100');
  });

  it('setDisciplineConfig updates cache', () => {
    setDisciplineConfig(99, { calculationType: 1 });
    const result = formatDisciplineScore(12.5, 99);
    expect(result).toBe('12.5');
  });
});

// ────────────────────────────────────────────────────────────
// getScorePlaceholder
// ────────────────────────────────────────────────────────────
describe('getScorePlaceholder', () => {
  it('returns 0.00 for 2 decimal places (legacy number)', () => {
    expect(getScorePlaceholder(2)).toBe('0.00');
  });

  it('returns 0 for 0 decimal places', () => {
    expect(getScorePlaceholder(0)).toBe('0');
  });

  it('returns 0.000 for 3 decimal places', () => {
    expect(getScorePlaceholder(3)).toBe('0.000');
  });

  it('returns inputMask when provided in config', () => {
    expect(getScorePlaceholder({ inputMask: '0:00.00' })).toBe('0:00.00');
  });

  it('defaults to 0.00 for no config', () => {
    expect(getScorePlaceholder()).toBe('0.00');
  });
});

// ────────────────────────────────────────────────────────────
// getScoreInputStep
// ────────────────────────────────────────────────────────────
describe('getScoreInputStep', () => {
  it('returns 0.01 for 2 decimals', () => {
    expect(getScoreInputStep(2)).toBe('0.01');
  });

  it('returns 1 for 0 decimals', () => {
    expect(getScoreInputStep(0)).toBe('1');
  });

  it('returns 0.1 for 1 decimal', () => {
    expect(getScoreInputStep(1)).toBe('0.1');
  });

  it('returns 0.001 for 3 decimals', () => {
    expect(getScoreInputStep(3)).toBe('0.001');
  });

  it('returns 0.1 for time format', () => {
    expect(getScoreInputStep({ inputMask: '0:00.00' })).toBe('0.1');
  });
});

// ────────────────────────────────────────────────────────────
// validateAndRoundScore
// ────────────────────────────────────────────────────────────
describe('validateAndRoundScore', () => {
  it('rounds to 2 decimals by default', () => {
    expect(validateAndRoundScore(12.345)).toBe(12.35);
  });

  it('rounds to 0 decimals', () => {
    expect(validateAndRoundScore(12.6, 0)).toBe(13);
  });

  it('rounds to 3 decimals', () => {
    expect(validateAndRoundScore(12.3456, 3)).toBe(12.346);
  });

  it('does not round time format', () => {
    expect(validateAndRoundScore(90.123, { inputMask: '0:00.00' })).toBe(90.123);
  });

  it('handles exact values without floating point drift', () => {
    expect(validateAndRoundScore(12.50, 2)).toBe(12.5);
  });
});

// ────────────────────────────────────────────────────────────
// normalizeScoreInput
// ────────────────────────────────────────────────────────────
describe('normalizeScoreInput', () => {
  it('normalizes "5" with 2 decimals to "5.00"', () => {
    expect(normalizeScoreInput('5', 2)).toBe('5.00');
  });

  it('normalizes "5.5" with 2 decimals to "5.50"', () => {
    expect(normalizeScoreInput('5.5', 2)).toBe('5.50');
  });

  it('handles comma input', () => {
    expect(normalizeScoreInput('5,5', 2)).toBe('5.50');
  });

  it('returns empty for empty input', () => {
    expect(normalizeScoreInput('', 2)).toBe('');
  });

  it('returns empty for dash input', () => {
    expect(normalizeScoreInput('-', 2)).toBe('');
  });

  it('returns original for non-numeric input', () => {
    expect(normalizeScoreInput('abc', 2)).toBe('abc');
  });

  it('uses comma separator from config', () => {
    const result = normalizeScoreInput('5.5', { inputMask: '0,00', calculationType: 2 });
    expect(result).toBe('5,50');
  });

  it('does not normalize time input', () => {
    const result = normalizeScoreInput('1:30', { inputMask: '0:00.00' });
    expect(result).toBe('1:30');
  });
});

// ────────────────────────────────────────────────────────────
// parseScoreInput
// ────────────────────────────────────────────────────────────
describe('parseScoreInput', () => {
  it('parses dot-separated value', () => {
    expect(parseScoreInput('12.5')).toBe(12.5);
  });

  it('parses comma-separated value', () => {
    expect(parseScoreInput('12,5')).toBe(12.5);
  });

  it('returns 0 for empty string', () => {
    expect(parseScoreInput('')).toBe(0);
  });

  it('returns 0 for dash', () => {
    expect(parseScoreInput('-')).toBe(0);
  });

  it('returns 0 for non-numeric', () => {
    expect(parseScoreInput('abc')).toBe(0);
  });

  it('parses integer', () => {
    expect(parseScoreInput('10')).toBe(10);
  });

  it('parses zero', () => {
    expect(parseScoreInput('0')).toBe(0);
  });
});
