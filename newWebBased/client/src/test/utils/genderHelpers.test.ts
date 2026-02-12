/**
 * Gender Helper Functions Tests
 * Tests for gender normalization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeGender,
  mapDatabaseGenderValue,
  mapGermanGenderToEnglish,
  mapEnglishGenderToGerman,
  isValidGenderValue
} from '../../utils/genderHelpers';

describe('Gender Helper Functions', () => {
  describe('normalizeGender', () => {
    it('normalizes männlich to male', () => {
      expect(normalizeGender('männlich')).toBe('male');
    });

    it('normalizes weiblich to female', () => {
      expect(normalizeGender('weiblich')).toBe('female');
    });

    it('normalizes gemischt to both', () => {
      expect(normalizeGender('gemischt')).toBe('both');
    });

    it('keeps male as male', () => {
      expect(normalizeGender('male')).toBe('male');
    });

    it('keeps female as female', () => {
      expect(normalizeGender('female')).toBe('female');
    });

    it('keeps both as both', () => {
      expect(normalizeGender('both')).toBe('both');
    });

    it('returns unknown for invalid values', () => {
      expect(normalizeGender('invalid')).toBe('unknown');
    });

    it('returns unknown for null', () => {
      expect(normalizeGender(null)).toBe('unknown');
    });

    it('returns unknown for undefined', () => {
      expect(normalizeGender(undefined)).toBe('unknown');
    });
  });

  describe('mapDatabaseGenderValue', () => {
    it('maps 0 to unknown', () => {
      expect(mapDatabaseGenderValue(0)).toBe('unknown');
    });

    it('maps 1 to male', () => {
      expect(mapDatabaseGenderValue(1)).toBe('male');
    });

    it('maps 2 to female', () => {
      expect(mapDatabaseGenderValue(2)).toBe('female');
    });

    it('maps null to unknown', () => {
      expect(mapDatabaseGenderValue(null)).toBe('unknown');
    });

    it('maps undefined to unknown', () => {
      expect(mapDatabaseGenderValue(undefined)).toBe('unknown');
    });
  });

  describe('mapGermanGenderToEnglish', () => {
    it('maps männlich to male', () => {
      expect(mapGermanGenderToEnglish('männlich')).toBe('male');
    });

    it('maps weiblich to female', () => {
      expect(mapGermanGenderToEnglish('weiblich')).toBe('female');
    });

    it('maps gemischt to both', () => {
      expect(mapGermanGenderToEnglish('gemischt')).toBe('both');
    });
  });

  describe('mapEnglishGenderToGerman', () => {
    it('maps male to männlich', () => {
      expect(mapEnglishGenderToGerman('male')).toBe('männlich');
    });

    it('maps female to weiblich', () => {
      expect(mapEnglishGenderToGerman('female')).toBe('weiblich');
    });

    it('maps both to gemischt', () => {
      expect(mapEnglishGenderToGerman('both')).toBe('gemischt');
    });

    it('maps unknown to unbekannt', () => {
      expect(mapEnglishGenderToGerman('unknown')).toBe('unbekannt');
    });
  });

  describe('isValidGenderValue', () => {
    it('returns true for valid values', () => {
      expect(isValidGenderValue('male')).toBe(true);
      expect(isValidGenderValue('female')).toBe(true);
      expect(isValidGenderValue('both')).toBe(true);
      expect(isValidGenderValue('unknown')).toBe(true);
    });

    it('returns false for invalid values', () => {
      expect(isValidGenderValue('invalid')).toBe(false);
      expect(isValidGenderValue('')).toBe(false);
      expect(isValidGenderValue(null)).toBe(false);
      expect(isValidGenderValue(123)).toBe(false);
    });
  });
});
