/**
 * Gender Helper Utilities
 * 
 * Centralized gender value normalization and conversion for consistent handling
 * across all UI components and pages.
 * 
 * Purpose:
 * - Normalize various gender formats (male, männlich, m, 1, etc.) to standard values
 * - Provide type-safe gender types
 * - Support internationalization (German/English)
 * - Handle edge cases (null, undefined, unknown, etc.)
 * 
 * Usage:
 * ```typescript
 * import { normalizeGender, GenderValue } from '@/utils/genderHelpers';
 * 
 * const gender = normalizeGender('weiblich'); // returns 'female'
 * const gender = normalizeGender(2);          // returns 'female'
 * const gender = normalizeGender('unknown');  // returns 'unknown'
 * ```
 */

/**
 * Standard gender values used throughout the application
 * - 'male': Male/Männlich
 * - 'female': Female/Weiblich  
 * - 'both': Mixed/Gemischt (for competitions allowing both genders)
 * - 'unknown': Unknown/Unbekannt (missing or invalid data)
 */
export type GenderValue = 'male' | 'female' | 'both' | 'unknown';

/**
 * German gender values (as returned from backend)
 */
export type GenderValueDE = 'männlich' | 'weiblich' | 'gemischt' | 'unbekannt';

/**
 * Database gender values (PostgreSQL int_geschlecht)
 * - 0: Unknown/Unbekannt
 * - 1: Male/Männlich
 * - 2: Female/Weiblich
 */
export type GenderValueDB = 0 | 1 | 2;

/**
 * Normalizes various gender representations to standard English values
 * 
 * Handles multiple input formats:
 * - English: 'male', 'female', 'both', 'unknown'
 * - German: 'männlich', 'weiblich', 'gemischt', 'unbekannt'
 * - Short codes: 'm', 'f', 'w'
 * - Database values: 0, 1, 2
 * - Boolean: true (male), false (female)
 * - Null/undefined/empty: 'unknown'
 * 
 * @param value - Gender value in any supported format
 * @returns Normalized gender value ('male' | 'female' | 'both' | 'unknown')
 * 
 * @example
 * normalizeGender('weiblich')  // 'female'
 * normalizeGender(2)           // 'female'
 * normalizeGender('w')         // 'female'
 * normalizeGender('männlich')  // 'male'
 * normalizeGender(1)           // 'male'
 * normalizeGender('m')         // 'male'
 * normalizeGender('gemischt')  // 'both'
 * normalizeGender(null)        // 'unknown'
 */
export function normalizeGender(value: any): GenderValue {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return 'unknown';
  }

  // Convert to string and normalize
  const str = String(value).toLowerCase().trim();

  // Male variations
  if (
    str === 'male' ||
    str === 'm' ||
    str === 'männlich' ||
    str === '1' ||
    str === 'true'
  ) {
    return 'male';
  }

  // Female variations
  if (
    str === 'female' ||
    str === 'f' ||
    str === 'w' ||
    str === 'weiblich' ||
    str === '2' ||
    str === 'false'
  ) {
    return 'female';
  }

  // Both/Mixed variations
  if (
    str === 'both' ||
    str === 'mixed' ||
    str === 'alle' ||
    str === 'all' ||
    str === 'gemischt'
  ) {
    return 'both';
  }

  // Unknown/Undefined variations
  if (
    str === 'unknown' ||
    str === 'unbekannt' ||
    str === 'undefined' ||
    str === 'null' ||
    str === '-' ||
    str === '0'
  ) {
    return 'unknown';
  }

  // Default to unknown if not recognized
  if (process.env.DEBUG === 'true') {
    console.warn('⚠️ Unknown gender value, defaulting to unknown:', value);
  }
  return 'unknown';
}

/**
 * Normalizes gender value specifically for EventParticipants compatibility
 * Returns only 'male' or 'female' with 'unknown' values mapped to 'male' (legacy behavior)
 * 
 * @deprecated Use normalizeGender() instead which properly handles 'unknown'
 * @param value - Gender value in any supported format
 * @returns 'male' | 'female'
 */
export function normalizeGenderLegacy(value: any): 'male' | 'female' {
  const normalized = normalizeGender(value);
  
  // Legacy behavior: unknown defaults to male
  if (normalized === 'unknown' || normalized === 'both') {
    if (process.env.DEBUG === 'true') {
      console.warn('⚠️ Unknown/both gender value, defaulting to male (legacy):', value);
    }
    return 'male';
  }
  
  return normalized as 'male' | 'female';
}

/**
 * Converts database integer value to standard gender value
 * 
 * @param intGeschlecht - Database value (0=unknown, 1=male, 2=female)
 * @returns Normalized gender value
 * 
 * @example
 * mapDatabaseGenderValue(0)  // 'unknown'
 * mapDatabaseGenderValue(1)  // 'male'
 * mapDatabaseGenderValue(2)  // 'female'
 */
export function mapDatabaseGenderValue(intGeschlecht: number | null | undefined): GenderValue {
  if (intGeschlecht === null || intGeschlecht === undefined) {
    return 'unknown';
  }

  switch (intGeschlecht) {
    case 0:
      return 'unknown';
    case 1:
      return 'male';
    case 2:
      return 'female';
    default:
      if (process.env.DEBUG === 'true') {
        console.warn('⚠️ Invalid database gender value:', intGeschlecht);
      }
      return 'unknown';
  }
}

/**
 * Converts German gender string to English standard value
 * 
 * @param germanValue - German gender string
 * @returns Normalized gender value
 * 
 * @example
 * mapGermanGenderToEnglish('männlich')  // 'male'
 * mapGermanGenderToEnglish('weiblich')  // 'female'
 * mapGermanGenderToEnglish('gemischt')  // 'both'
 */
export function mapGermanGenderToEnglish(germanValue: string): GenderValue {
  return normalizeGender(germanValue);
}

/**
 * Converts standard gender value to German string
 * 
 * @param value - Standard gender value
 * @returns German gender string
 * 
 * @example
 * mapEnglishGenderToGerman('male')     // 'männlich'
 * mapEnglishGenderToGerman('female')   // 'weiblich'
 * mapEnglishGenderToGerman('both')     // 'gemischt'
 * mapEnglishGenderToGerman('unknown')  // 'unbekannt'
 */
export function mapEnglishGenderToGerman(value: GenderValue): GenderValueDE {
  switch (value) {
    case 'male':
      return 'männlich';
    case 'female':
      return 'weiblich';
    case 'both':
      return 'gemischt';
    case 'unknown':
      return 'unbekannt';
    default:
      return 'unbekannt';
  }
}

/**
 * Type guard to check if value is a valid GenderValue
 * 
 * @param value - Value to check
 * @returns True if value is a valid GenderValue
 */
export function isValidGenderValue(value: any): value is GenderValue {
  return (
    value === 'male' ||
    value === 'female' ||
    value === 'both' ||
    value === 'unknown'
  );
}

/**
 * Type guard to check if value is a valid database gender value
 * 
 * @param value - Value to check
 * @returns True if value is a valid database gender value (0, 1, or 2)
 */
export function isValidDatabaseGenderValue(value: any): value is GenderValueDB {
  return value === 0 || value === 1 || value === 2;
}
