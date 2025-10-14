/**
 * Gender Helper Utilities
 * 
 * Provides consistent gender handling across the application.
 * Database values: 
 *   -1: Invalid/Error
 *    0: Unknown/Not set
 *    1: Male
 *    2: Female
 */

export type GenderValue = 'male' | 'female' | 'unknown';

/**
 * Convert database int_geschlecht value to standardized string
 */
export function mapDatabaseGenderToString(intGeschlecht: number | null | undefined): GenderValue {
  if (intGeschlecht === 1) return 'male';
  if (intGeschlecht === 2) return 'female';
  return 'unknown';
}

/**
 * Convert standardized gender string to database int value
 */
export function mapStringGenderToDatabase(gender: string): number {
  if (gender === 'male' || gender === 'männlich' || gender === 'MALE' || gender === '1') return 1;
  if (gender === 'female' || gender === 'weiblich' || gender === 'FEMALE' || gender === '2') return 2;
  return 0;
}

/**
 * Get SQL CASE statement for gender name mapping
 * Use this in raw SQL queries for consistent gender name generation
 */
export function getGenderNameCaseStatement(columnAlias: string = 'geschlecht_name'): string {
  return `
    CASE 
      WHEN t.int_geschlecht = 1 THEN 'male'
      WHEN t.int_geschlecht = 2 THEN 'female'
      ELSE 'unknown'
    END as ${columnAlias}
  `.trim();
}

/**
 * Get localized gender name for display
 * @param gender - The gender value (male/female/unknown)
 * @param locale - The locale (de/en) 
 */
export function getLocalizedGenderName(gender: GenderValue, locale: string = 'de'): string {
  if (locale === 'de') {
    switch (gender) {
      case 'male': return 'Männlich';
      case 'female': return 'Weiblich';
      default: return 'Unbekannt';
    }
  } else {
    // English
    switch (gender) {
      case 'male': return 'Male';
      case 'female': return 'Female';
      default: return 'Unknown';
    }
  }
}

/**
 * Validate if a gender value is set (not unknown)
 */
export function isGenderSet(intGeschlecht: number | null | undefined): boolean {
  return intGeschlecht === 1 || intGeschlecht === 2;
}

/**
 * Get gender filter value for API queries
 * Converts various gender representations to database integer
 */
export function parseGenderFilter(genderParam: string | undefined): number | null {
  if (!genderParam) return null;
  
  const normalized = genderParam.toUpperCase();
  if (normalized === 'MALE' || normalized === '1') return 1;
  if (normalized === 'FEMALE' || normalized === '2') return 2;
  if (normalized === 'UNKNOWN' || normalized === '0') return 0;
  
  return null;
}
