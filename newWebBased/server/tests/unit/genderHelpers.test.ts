/**
 * Unit Tests — genderHelpers
 *
 * Tests all gender mapping functions: DB ↔ string ↔ localized display.
 * Ensures legacy compatibility (int_geschlecht 1/2) and German API values.
 */

import {
  mapDatabaseGenderToString,
  mapDatabaseGenderToGerman,
  mapStringGenderToDatabase,
  getLocalizedGenderName,
  isGenderSet,
  parseGenderFilter,
  getGenderNameCaseStatement,
  getGermanGenderCaseStatement,
} from '../../src/utils/genderHelpers';

describe('genderHelpers', () => {

  // ─── mapDatabaseGenderToString ────────────────────────────────────────

  describe('mapDatabaseGenderToString', () => {
    it('should map 1 to male', () => {
      expect(mapDatabaseGenderToString(1)).toBe('male');
    });

    it('should map 2 to female', () => {
      expect(mapDatabaseGenderToString(2)).toBe('female');
    });

    it('should map 0 to unknown', () => {
      expect(mapDatabaseGenderToString(0)).toBe('unknown');
    });

    it('should map null to unknown', () => {
      expect(mapDatabaseGenderToString(null)).toBe('unknown');
    });

    it('should map undefined to unknown', () => {
      expect(mapDatabaseGenderToString(undefined)).toBe('unknown');
    });

    it('should map unexpected values to unknown', () => {
      expect(mapDatabaseGenderToString(3)).toBe('unknown');
      expect(mapDatabaseGenderToString(-1)).toBe('unknown');
    });
  });

  // ─── mapDatabaseGenderToGerman ────────────────────────────────────────

  describe('mapDatabaseGenderToGerman', () => {
    it('should map 1 to männlich', () => {
      expect(mapDatabaseGenderToGerman(1)).toBe('männlich');
    });

    it('should map 2 to weiblich', () => {
      expect(mapDatabaseGenderToGerman(2)).toBe('weiblich');
    });

    it('should map null to unbekannt', () => {
      expect(mapDatabaseGenderToGerman(null)).toBe('unbekannt');
    });

    it('should map 0 to unbekannt', () => {
      expect(mapDatabaseGenderToGerman(0)).toBe('unbekannt');
    });
  });

  // ─── mapStringGenderToDatabase ────────────────────────────────────────

  describe('mapStringGenderToDatabase', () => {
    it('should map "male" to 1', () => {
      expect(mapStringGenderToDatabase('male')).toBe(1);
    });

    it('should map "female" to 2', () => {
      expect(mapStringGenderToDatabase('female')).toBe(2);
    });

    it('should map German "männlich" to 1', () => {
      expect(mapStringGenderToDatabase('männlich')).toBe(1);
    });

    it('should map German "weiblich" to 2', () => {
      expect(mapStringGenderToDatabase('weiblich')).toBe(2);
    });

    it('should map uppercase "MALE/FEMALE" to 1/2', () => {
      expect(mapStringGenderToDatabase('MALE')).toBe(1);
      expect(mapStringGenderToDatabase('FEMALE')).toBe(2);
    });

    it('should map string numbers "1"/"2"', () => {
      expect(mapStringGenderToDatabase('1')).toBe(1);
      expect(mapStringGenderToDatabase('2')).toBe(2);
    });

    it('should map unknown strings to 0', () => {
      expect(mapStringGenderToDatabase('other')).toBe(0);
      expect(mapStringGenderToDatabase('')).toBe(0);
    });
  });

  // ─── getLocalizedGenderName ───────────────────────────────────────────

  describe('getLocalizedGenderName', () => {
    it('should return German names by default', () => {
      expect(getLocalizedGenderName('male')).toBe('Männlich');
      expect(getLocalizedGenderName('female')).toBe('Weiblich');
      expect(getLocalizedGenderName('unknown')).toBe('Unbekannt');
    });

    it('should return English names when locale is en', () => {
      expect(getLocalizedGenderName('male', 'en')).toBe('Male');
      expect(getLocalizedGenderName('female', 'en')).toBe('Female');
      expect(getLocalizedGenderName('unknown', 'en')).toBe('Unknown');
    });
  });

  // ─── isGenderSet ──────────────────────────────────────────────────────

  describe('isGenderSet', () => {
    it('should return true for male (1)', () => {
      expect(isGenderSet(1)).toBe(true);
    });

    it('should return true for female (2)', () => {
      expect(isGenderSet(2)).toBe(true);
    });

    it('should return false for 0', () => {
      expect(isGenderSet(0)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isGenderSet(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isGenderSet(undefined)).toBe(false);
    });
  });

  // ─── parseGenderFilter ───────────────────────────────────────────────

  describe('parseGenderFilter', () => {
    it('should parse "MALE" to 1', () => {
      expect(parseGenderFilter('MALE')).toBe(1);
    });

    it('should parse "FEMALE" to 2', () => {
      expect(parseGenderFilter('FEMALE')).toBe(2);
    });

    it('should parse "male" (case-insensitive)', () => {
      expect(parseGenderFilter('male')).toBe(1);
      expect(parseGenderFilter('Male')).toBe(1);
    });

    it('should parse "1" and "2"', () => {
      expect(parseGenderFilter('1')).toBe(1);
      expect(parseGenderFilter('2')).toBe(2);
    });

    it('should parse "UNKNOWN" to 0', () => {
      expect(parseGenderFilter('UNKNOWN')).toBe(0);
    });

    it('should return null for undefined', () => {
      expect(parseGenderFilter(undefined)).toBeNull();
    });

    it('should return null for unrecognized values', () => {
      expect(parseGenderFilter('divers')).toBeNull();
    });
  });

  // ─── SQL helper functions ────────────────────────────────────────────

  describe('getGenderNameCaseStatement', () => {
    it('should generate CASE statement with default alias', () => {
      const result = getGenderNameCaseStatement();
      expect(result).toContain('CASE');
      expect(result).toContain("'male'");
      expect(result).toContain("'female'");
      expect(result).toContain("'unknown'");
      expect(result).toContain('geschlecht_name');
    });

    it('should use custom column alias', () => {
      const result = getGenderNameCaseStatement('gender');
      expect(result).toContain('as gender');
    });
  });

  describe('getGermanGenderCaseStatement', () => {
    it('should generate German CASE statement', () => {
      const result = getGermanGenderCaseStatement();
      expect(result).toContain("'männlich'");
      expect(result).toContain("'weiblich'");
      expect(result).toContain("'unbekannt'");
    });

    it('should use custom table alias', () => {
      const result = getGermanGenderCaseStatement('p');
      expect(result).toContain('p.int_geschlecht');
    });
  });
});
