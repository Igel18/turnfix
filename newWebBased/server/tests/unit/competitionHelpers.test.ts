/**
 * Unit Tests — competitionHelpers
 *
 * Tests the pure transformation functions used across competition routes:
 * status calculation, gender/bereich mapping, time handling, age conversion,
 * DB→client transformation, and field-mapping for updates.
 */

import {
  getCompetitionStatus,
  getGenderFromBereich,
  getGenderFlags,
  formatTime,
  formatDate,
  parseTimeInput,
  ageToBirthYear,
  birthYearToAge,
  buildUpdateData,
  BereichInfo,
} from '../../src/utils/competitionHelpers';

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeBereich(overrides: Partial<BereichInfo> = {}): BereichInfo {
  return {
    int_bereicheid: 1,
    var_name: 'Test',
    bol_maennlich: true,
    bol_weiblich: false,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════

describe('competitionHelpers', () => {

  // ─── getCompetitionStatus ─────────────────────────────────────────────

  describe('getCompetitionStatus', () => {
    it('should return "active" for today\'s date', () => {
      expect(getCompetitionStatus(new Date())).toBe('active');
    });

    it('should return "upcoming" for a future date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(getCompetitionStatus(future)).toBe('upcoming');
    });

    it('should return "completed" for a past date', () => {
      const past = new Date('2020-01-01');
      expect(getCompetitionStatus(past)).toBe('completed');
    });

    it('should return "completed" for null date', () => {
      expect(getCompetitionStatus(null)).toBe('completed');
    });
  });

  // ─── getGenderFromBereich ─────────────────────────────────────────────

  describe('getGenderFromBereich', () => {
    it('should return "männlich" for male-only bereich', () => {
      expect(getGenderFromBereich(makeBereich({ bol_maennlich: true, bol_weiblich: false }))).toBe('männlich');
    });

    it('should return "weiblich" for female-only bereich', () => {
      expect(getGenderFromBereich(makeBereich({ bol_maennlich: false, bol_weiblich: true }))).toBe('weiblich');
    });

    it('should return "gemischt" for both genders', () => {
      expect(getGenderFromBereich(makeBereich({ bol_maennlich: true, bol_weiblich: true }))).toBe('gemischt');
    });

    it('should return "gemischt" for null bereich', () => {
      expect(getGenderFromBereich(null)).toBe('gemischt');
    });

    it('should return "gemischt" when both flags are false', () => {
      expect(getGenderFromBereich(makeBereich({ bol_maennlich: false, bol_weiblich: false }))).toBe('gemischt');
    });
  });

  // ─── getGenderFlags ──────────────────────────────────────────────────

  describe('getGenderFlags', () => {
    it('should return male flags for "männlich"', () => {
      const result = getGenderFlags('männlich');
      expect(result).toEqual({ male: true, female: false, name: 'Männlich' });
    });

    it('should return female flags for "weiblich"', () => {
      const result = getGenderFlags('weiblich');
      expect(result).toEqual({ male: false, female: true, name: 'Weiblich' });
    });

    it('should return male flags for "male" (English)', () => {
      const result = getGenderFlags('male');
      expect(result).toEqual({ male: true, female: false, name: 'Männlich' });
    });

    it('should return female flags for "female" (English)', () => {
      const result = getGenderFlags('female');
      expect(result).toEqual({ male: false, female: true, name: 'Weiblich' });
    });

    it('should return gemischt flags for unknown gender', () => {
      const result = getGenderFlags('gemischt');
      expect(result).toEqual({ male: true, female: true, name: 'Gemischt' });
    });

    it('should default to gemischt for empty string', () => {
      const result = getGenderFlags('');
      expect(result).toEqual({ male: true, female: true, name: 'Gemischt' });
    });
  });

  // ─── Time Formatting (local timezone) ─────────────────────────────────

  describe('formatTime', () => {
    it('should format a Date to HH:MM (local time)', () => {
      const d = new Date(1970, 0, 1, 14, 30, 0); // 14:30 local
      expect(formatTime(d)).toBe('14:30');
    });

    it('should pad single-digit hours and minutes', () => {
      const d = new Date(1970, 0, 1, 9, 5, 0);
      expect(formatTime(d)).toBe('09:05');
    });

    it('should return null for null input', () => {
      expect(formatTime(null)).toBeNull();
    });

    it('should handle midnight', () => {
      const d = new Date(1970, 0, 1, 0, 0, 0);
      expect(formatTime(d)).toBe('00:00');
    });
  });

  describe('formatDate', () => {
    it('should format a Date to YYYY-MM-DD (via toISOString → UTC)', () => {
      // formatDate uses toISOString() which outputs UTC.
      // Use a midday time so the UTC date stays the same regardless of timezone.
      const d = new Date(2026, 5, 15, 12, 0, 0); // June 15, 2026 12:00 local
      expect(formatDate(d)).toBe('2026-06-15');
    });

    it('should return null for null input', () => {
      expect(formatDate(null)).toBeNull();
    });
  });

  describe('parseTimeInput', () => {
    it('should parse "14:30" into a Date with local hours', () => {
      const result = parseTimeInput('14:30');
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
    });

    it('should return null for undefined input', () => {
      expect(parseTimeInput(undefined)).toBeNull();
    });

    it('should handle "09:05" correctly', () => {
      const result = parseTimeInput('09:05');
      expect(result!.getHours()).toBe(9);
      expect(result!.getMinutes()).toBe(5);
    });

    it('should combine with date when provided', () => {
      const result = parseTimeInput('14:30', '2026-06-15');
      expect(result).not.toBeNull();
      expect(result!.getHours()).toBe(14);
      expect(result!.getMinutes()).toBe(30);
    });
  });

  // ─── Age ↔ BirthYear Conversion ──────────────────────────────────────

  describe('ageToBirthYear', () => {
    it('should convert age to birth year based on event year', () => {
      expect(ageToBirthYear(2026, 16)).toBe(2010);
    });

    it('should handle age 0', () => {
      expect(ageToBirthYear(2026, 0)).toBe(2026);
    });

    it('should handle large age', () => {
      expect(ageToBirthYear(2026, 99)).toBe(1927);
    });
  });

  describe('birthYearToAge', () => {
    it('should convert birth year to age based on event year', () => {
      expect(birthYearToAge(2026, 2010, 0)).toBe(16);
    });

    it('should return fallback when birth year is null', () => {
      expect(birthYearToAge(2026, null, 99)).toBe(99);
    });

    it('should return 0 for same year', () => {
      expect(birthYearToAge(2026, 2026, 0)).toBe(0);
    });
  });

  // ─── buildUpdateData (client→DB field mapping) ────────────────────────

  describe('buildUpdateData', () => {
    it('should map name to var_name', () => {
      const result = buildUpdateData({ name: 'Test WK' }, 2026);
      expect(result.var_name).toBe('Test WK');
    });

    it('should map number to var_nummer', () => {
      const result = buildUpdateData({ number: 'W01' }, 2026);
      expect(result.var_nummer).toBe('W01');
    });

    it('should convert ageFrom to yer_von (birth year)', () => {
      const result = buildUpdateData({ ageFrom: 16 }, 2026);
      expect(result.yer_von).toBe(2010); // 2026 - 16
    });

    it('should convert ageTo to yer_bis (birth year)', () => {
      const result = buildUpdateData({ ageTo: 25 }, 2026);
      expect(result.yer_bis).toBe(2001); // 2026 - 25
    });

    it('should parse startTime to local Date', () => {
      const result = buildUpdateData({ startTime: '14:30' }, 2026);
      expect(result.tim_startzeit).not.toBeNull();
      expect(result.tim_startzeit.getHours()).toBe(14);
      expect(result.tim_startzeit.getMinutes()).toBe(30);
    });

    it('should set startTime to null when empty', () => {
      const result = buildUpdateData({ startTime: '' }, 2026);
      expect(result.tim_startzeit).toBeNull();
    });

    it('should map boolean settings correctly', () => {
      const result = buildUpdateData({
        dropWorstScore: true,
        showAgeGroup: false,
        isOptionalCompetition: true,
        useCompulsoryProgram: false,
        sortAscending: true,
      }, 2026);

      expect(result.bol_streichwertung).toBe(true);
      expect(result.bol_ak_anzeigen).toBe(false);
      expect(result.bol_wahlwettkampf).toBe(true);
      expect(result.bol_kp).toBe(false);
      expect(result.bol_sortasc).toBe(true);
    });

    it('should not include fields that are not in input', () => {
      const result = buildUpdateData({ name: 'Only Name' }, 2026);
      expect(result).not.toHaveProperty('var_nummer');
      expect(result).not.toHaveProperty('yer_von');
      expect(result).not.toHaveProperty('bol_streichwertung');
    });

    it('should map round and track', () => {
      const result = buildUpdateData({ round: 2, track: 3 }, 2026);
      expect(result.int_durchgang).toBe(2);
      expect(result.int_bahn).toBe(3);
    });

    it('should map competitionType', () => {
      const result = buildUpdateData({ competitionType: 1 }, 2026);
      expect(result.int_typ).toBe(1);
    });
  });
});
