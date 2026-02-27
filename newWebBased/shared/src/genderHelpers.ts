/**
 * Gender Helper Utilities (Shared)
 *
 * SINGLE SOURCE OF TRUTH for gender types and core mapping functions.
 * Do NOT duplicate. Import from @turnfix/shared.
 *
 * Database values:
 *   0: Unknown/Not set
 *   1: Male
 *   2: Female
 *
 * API returns German values for legacy compatibility:
 *   'männlich', 'weiblich', 'gemischt', 'unbekannt'
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Standard gender values used throughout the application.
 * - 'male': Male / Männlich
 * - 'female': Female / Weiblich
 * - 'both': Mixed / Gemischt (competitions allowing both genders)
 * - 'unknown': Unknown / Unbekannt (missing or invalid data)
 */
export type GenderValue = 'male' | 'female' | 'both' | 'unknown';

/** German gender values (as stored/returned by backend). */
export type GenderValueDE = 'männlich' | 'weiblich' | 'gemischt' | 'unbekannt';

/**
 * Database gender values (int_geschlecht).
 * 0 = Unknown, 1 = Male, 2 = Female
 */
export type GenderValueDB = 0 | 1 | 2;

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Normalizes various gender representations to standard English values.
 *
 * Handles: English, German, short codes (m/f/w), DB integers (0/1/2),
 * booleans, null/undefined/empty.
 */
export function normalizeGender(value: unknown): GenderValue {
  if (value === null || value === undefined || value === '') return 'unknown';

  const str = String(value).toLowerCase().trim();

  // Male
  if (str === 'male' || str === 'm' || str === 'männlich' || str === '1' || str === 'true') {
    return 'male';
  }
  // Female
  if (str === 'female' || str === 'f' || str === 'w' || str === 'weiblich' || str === '2' || str === 'false') {
    return 'female';
  }
  // Both / Mixed
  if (str === 'both' || str === 'mixed' || str === 'alle' || str === 'all' || str === 'gemischt') {
    return 'both';
  }
  // Unknown
  if (str === 'unknown' || str === 'unbekannt' || str === 'undefined' || str === 'null' || str === '-' || str === '0') {
    return 'unknown';
  }

  return 'unknown';
}

/**
 * Legacy normalizer — returns only 'male' | 'female'.
 * Maps 'unknown'/'both' to 'male' (legacy behaviour).
 *
 * @deprecated Prefer normalizeGender() which correctly handles all 4 values.
 */
export function normalizeGenderLegacy(value: unknown): 'male' | 'female' {
  const n = normalizeGender(value);
  return (n === 'unknown' || n === 'both') ? 'male' : n;
}

// ---------------------------------------------------------------------------
// Database ↔ String mapping
// ---------------------------------------------------------------------------

/** Convert DB int_geschlecht to English string. */
export function mapDatabaseGenderToString(intGeschlecht: number | null | undefined): GenderValue {
  if (intGeschlecht === 1) return 'male';
  if (intGeschlecht === 2) return 'female';
  return 'unknown';
}

/** Convert DB int_geschlecht to German string (legacy API compat). */
export function mapDatabaseGenderToGerman(intGeschlecht: number | null | undefined): GenderValueDE {
  if (intGeschlecht === 1) return 'männlich';
  if (intGeschlecht === 2) return 'weiblich';
  return 'unbekannt';
}

/** Convert gender string to DB int. */
export function mapStringGenderToDatabase(gender: string): number {
  if (gender === 'male' || gender === 'männlich' || gender === 'MALE' || gender === '1') return 1;
  if (gender === 'female' || gender === 'weiblich' || gender === 'FEMALE' || gender === '2') return 2;
  return 0;
}

// ---------------------------------------------------------------------------
// English ↔ German mapping
// ---------------------------------------------------------------------------

/** German → English (alias for normalizeGender). */
export function mapGermanGenderToEnglish(germanValue: string): GenderValue {
  return normalizeGender(germanValue);
}

/** English → German. */
export function mapEnglishGenderToGerman(value: GenderValue): GenderValueDE {
  switch (value) {
    case 'male': return 'männlich';
    case 'female': return 'weiblich';
    case 'both': return 'gemischt';
    case 'unknown':
    default: return 'unbekannt';
  }
}

// ---------------------------------------------------------------------------
// Localized display names
// ---------------------------------------------------------------------------

/** Get localized gender name for display. */
export function getLocalizedGenderName(gender: GenderValue, locale: string = 'de'): string {
  if (locale === 'de') {
    switch (gender) {
      case 'male': return 'Männlich';
      case 'female': return 'Weiblich';
      case 'both': return 'Gemischt';
      default: return 'Unbekannt';
    }
  }
  // English fallback
  switch (gender) {
    case 'male': return 'Male';
    case 'female': return 'Female';
    case 'both': return 'Mixed';
    default: return 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// Validation & type guards
// ---------------------------------------------------------------------------

/** True if the int_geschlecht value represents a known gender (1 or 2). */
export function isGenderSet(intGeschlecht: number | null | undefined): boolean {
  return intGeschlecht === 1 || intGeschlecht === 2;
}

/** Type guard for GenderValue. */
export function isValidGenderValue(value: unknown): value is GenderValue {
  return value === 'male' || value === 'female' || value === 'both' || value === 'unknown';
}

/** Type guard for GenderValueDB. */
export function isValidDatabaseGenderValue(value: unknown): value is GenderValueDB {
  return value === 0 || value === 1 || value === 2;
}

// ---------------------------------------------------------------------------
// Filter / query helpers
// ---------------------------------------------------------------------------

/**
 * Parse a gender filter parameter to DB integer.
 * Returns null if the parameter is absent/invalid.
 */
export function parseGenderFilter(genderParam: string | undefined): number | null {
  if (!genderParam) return null;
  const n = genderParam.toUpperCase();
  if (n === 'MALE' || n === '1') return 1;
  if (n === 'FEMALE' || n === '2') return 2;
  if (n === 'UNKNOWN' || n === '0') return 0;
  return null;
}
