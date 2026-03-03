import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isEventOnDate, validateScore } from '../utils/eventUtils';

describe('isEventOnDate', () => {
  describe('edge cases', () => {
    it('should return false for null event', () => {
      expect(isEventOnDate(null)).toBe(false);
    });

    it('should return false for undefined event', () => {
      expect(isEventOnDate(undefined)).toBe(false);
    });

    it('should return false for event without any date', () => {
      expect(isEventOnDate({})).toBe(false);
    });

    it('should return false for event with empty date strings', () => {
      expect(isEventOnDate({ dat_eventstartdate: '', dat_eventbeginn: '' })).toBe(false);
    });
  });

  describe('single-day event (start date only)', () => {
    it('should return true when reference date matches start date', () => {
      const event = { dat_eventstartdate: '2026-03-03' };
      const ref = new Date(2026, 2, 3); // March 3, 2026
      expect(isEventOnDate(event, ref)).toBe(true);
    });

    it('should return false when reference date does not match start date', () => {
      const event = { dat_eventstartdate: '2026-03-03' };
      const ref = new Date(2026, 2, 4); // March 4, 2026
      expect(isEventOnDate(event, ref)).toBe(false);
    });

    it('should use dat_eventbeginn as fallback for start date', () => {
      const event = { dat_eventbeginn: '2026-03-03' };
      const ref = new Date(2026, 2, 3);
      expect(isEventOnDate(event, ref)).toBe(true);
    });

    it('should prefer dat_eventstartdate over dat_eventbeginn', () => {
      const event = {
        dat_eventstartdate: '2026-03-03',
        dat_eventbeginn: '2026-03-05' // different date
      };
      const ref = new Date(2026, 2, 3);
      expect(isEventOnDate(event, ref)).toBe(true);
    });
  });

  describe('multi-day event (start + end date)', () => {
    const multiDayEvent = {
      dat_eventstartdate: '2026-03-01',
      dat_eventenddate: '2026-03-05'
    };

    it('should return true on start date', () => {
      const ref = new Date(2026, 2, 1);
      expect(isEventOnDate(multiDayEvent, ref)).toBe(true);
    });

    it('should return true on end date', () => {
      const ref = new Date(2026, 2, 5);
      expect(isEventOnDate(multiDayEvent, ref)).toBe(true);
    });

    it('should return true on date in between', () => {
      const ref = new Date(2026, 2, 3);
      expect(isEventOnDate(multiDayEvent, ref)).toBe(true);
    });

    it('should return false on day before start', () => {
      const ref = new Date(2026, 1, 28); // Feb 28
      expect(isEventOnDate(multiDayEvent, ref)).toBe(false);
    });

    it('should return false on day after end', () => {
      const ref = new Date(2026, 2, 6);
      expect(isEventOnDate(multiDayEvent, ref)).toBe(false);
    });

    it('should use dat_eventende as fallback for end date', () => {
      const event = {
        dat_eventstartdate: '2026-03-01',
        dat_eventende: '2026-03-05'
      };
      const ref = new Date(2026, 2, 3);
      expect(isEventOnDate(event, ref)).toBe(true);
    });
  });

  describe('defaults to today when no reference date given', () => {
    let realDate: DateConstructor;

    beforeEach(() => {
      realDate = global.Date;
      // Mock Date to always return March 3, 2026
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 2, 3, 14, 30, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should match today when event is today', () => {
      const event = { dat_eventstartdate: '2026-03-03' };
      expect(isEventOnDate(event)).toBe(true);
    });

    it('should not match today when event is tomorrow', () => {
      const event = { dat_eventstartdate: '2026-03-04' };
      expect(isEventOnDate(event)).toBe(false);
    });
  });
});

describe('validateScore', () => {
  describe('empty/missing values', () => {
    it('should return valid for empty string', () => {
      expect(validateScore('', 10)).toEqual({ isValid: true, message: '' });
    });

    it('should return valid for whitespace-only string', () => {
      expect(validateScore('   ', 10)).toEqual({ isValid: true, message: '' });
    });
  });

  describe('NaN handling', () => {
    it('should return invalid for non-numeric string', () => {
      const result = validateScore('abc', 10);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Ungültiger Wert');
    });
  });

  describe('maxScore enforcement', () => {
    it('should return valid when score is below maxScore', () => {
      expect(validateScore('8.5', 10)).toEqual({ isValid: true, message: '' });
    });

    it('should return valid when score equals maxScore', () => {
      expect(validateScore('10', 10)).toEqual({ isValid: true, message: '' });
    });

    it('should return invalid when score exceeds maxScore', () => {
      const result = validateScore('10.5', 10);
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('10.00');
    });

    it('should return valid for any score when maxScore is 0 (no limit)', () => {
      expect(validateScore('999', 0)).toEqual({ isValid: true, message: '' });
    });

    it('should validate with decimal precision', () => {
      const result = validateScore('16.001', 16);
      expect(result.isValid).toBe(false);
    });

    it('should return valid for 0 score', () => {
      expect(validateScore('0', 10)).toEqual({ isValid: true, message: '' });
    });

    it('should return valid for negative score (no lower bound enforced)', () => {
      expect(validateScore('-1', 10)).toEqual({ isValid: true, message: '' });
    });
  });
});
