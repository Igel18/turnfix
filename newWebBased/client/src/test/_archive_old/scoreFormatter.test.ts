/**
 * Score Formatter Tests
 * Tests for score formatting and display utilities
 */

import { describe, it, expect } from 'vitest';
import {
  formatScore,
  formatScoreWithPrecision,
  roundScore,
  parseScore
} from '../../utils/scoreFormatter';

describe('Score Formatter', () => {
  describe('formatScore', () => {
    it('formats integer scores without decimals', () => {
      expect(formatScore(10)).toBe('10.00');
    });

    it('formats decimal scores with 2 decimals', () => {
      expect(formatScore(9.5)).toBe('9.50');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatScore(9.556)).toBe('9.56');
      expect(formatScore(9.554)).toBe('9.55');
    });

    it('handles zero correctly', () => {
      expect(formatScore(0)).toBe('0.00');
    });

    it('handles negative scores', () => {
      expect(formatScore(-5.5)).toBe('-5.50');
    });

    it('handles null and undefined', () => {
      expect(formatScore(null)).toBe('0.00');
      expect(formatScore(undefined)).toBe('0.00');
    });

    it('handles NaN', () => {
      expect(formatScore(NaN)).toBe('0.00');
    });

    it('formats very large numbers', () => {
      expect(formatScore(999.99)).toBe('999.99');
    });

    it('formats very small decimal numbers', () => {
      expect(formatScore(0.01)).toBe('0.01');
      expect(formatScore(0.001)).toBe('0.00');
    });
  });

  describe('formatScoreWithPrecision', () => {
    it('formats with custom precision', () => {
      expect(formatScoreWithPrecision(9.5, 1)).toBe('9.5');
      expect(formatScoreWithPrecision(9.5, 3)).toBe('9.500');
    });

    it('formats with 0 precision', () => {
      expect(formatScoreWithPrecision(9.7, 0)).toBe('10');
      expect(formatScoreWithPrecision(9.4, 0)).toBe('9');
    });

    it('rounds correctly with different precision', () => {
      expect(formatScoreWithPrecision(9.556, 1)).toBe('9.6');
      expect(formatScoreWithPrecision(9.556, 2)).toBe('9.56');
      expect(formatScoreWithPrecision(9.556, 3)).toBe('9.556');
    });
  });

  describe('roundScore', () => {
    it('rounds to 2 decimals by default', () => {
      expect(roundScore(9.556)).toBe(9.56);
      expect(roundScore(9.554)).toBe(9.55);
    });

    it('rounds to custom decimal places', () => {
      expect(roundScore(9.556, 1)).toBe(9.6);
      expect(roundScore(9.556, 3)).toBe(9.556);
    });

    it('handles rounding edge cases', () => {
      expect(roundScore(9.995)).toBe(10.00);
      expect(roundScore(9.994)).toBe(9.99);
    });

    it('handles negative numbers', () => {
      expect(roundScore(-9.556)).toBe(-9.56);
    });

    it('handles zero', () => {
      expect(roundScore(0)).toBe(0);
    });
  });

  describe('parseScore', () => {
    it('parses string scores to numbers', () => {
      expect(parseScore('9.5')).toBe(9.5);
      expect(parseScore('10')).toBe(10);
    });

    it('parses numbers directly', () => {
      expect(parseScore(9.5)).toBe(9.5);
    });

    it('handles comma decimal separator', () => {
      expect(parseScore('9,5')).toBe(9.5);
      expect(parseScore('10,75')).toBe(10.75);
    });

    it('handles whitespace', () => {
      expect(parseScore('  9.5  ')).toBe(9.5);
      expect(parseScore('9 . 5')).toBe(9.5);
    });

    it('returns null for invalid input', () => {
      expect(parseScore('invalid')).toBeNull();
      expect(parseScore('')).toBeNull();
      expect(parseScore('abc123')).toBeNull();
    });

    it('returns null for null and undefined', () => {
      expect(parseScore(null)).toBeNull();
      expect(parseScore(undefined)).toBeNull();
    });

    it('handles negative scores', () => {
      expect(parseScore('-9.5')).toBe(-9.5);
    });
  });
});
