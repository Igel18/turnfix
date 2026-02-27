/**
 * Gender Helper Utilities — re-export from @turnfix/shared
 *
 * DO NOT add logic here. Edit the canonical source at:
 *   newWebBased/shared/src/genderHelpers.ts
 *
 * This file re-exports shared helpers and adds server-only SQL CASE helpers.
 */
export {
  normalizeGender,
  normalizeGenderLegacy,
  mapDatabaseGenderToString,
  mapDatabaseGenderToGerman,
  mapStringGenderToDatabase,
  mapGermanGenderToEnglish,
  mapEnglishGenderToGerman,
  getLocalizedGenderName,
  isGenderSet,
  isValidGenderValue,
  isValidDatabaseGenderValue,
  parseGenderFilter,
} from '@turnfix/shared';

export type { GenderValue, GenderValueDE, GenderValueDB } from '@turnfix/shared';

// ─── Server-only SQL CASE helpers (not shared) ────────────────────────

/**
 * Get SQL CASE statement for gender name mapping (English)
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
 * Get SQL CASE statement for German gender name mapping
 * Use this in raw SQL queries for API responses
 */
export function getGermanGenderCaseStatement(tableAlias: string = 't', columnAlias: string = 'gender'): string {
  return `
    CASE 
      WHEN ${tableAlias}.int_geschlecht = 1 THEN 'männlich'
      WHEN ${tableAlias}.int_geschlecht = 2 THEN 'weiblich'
      ELSE 'unbekannt'
    END as ${columnAlias}
  `.trim();
}
