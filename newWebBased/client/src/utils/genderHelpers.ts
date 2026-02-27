/**
 * Gender Helper Utilities — re-export from @turnfix/shared
 *
 * DO NOT add logic here. Edit the canonical source at:
 *   newWebBased/shared/src/genderHelpers.ts
 *
 * This file exists only so that existing imports
 *   import { normalizeGender, GenderValue } from '@/utils/genderHelpers';
 * continue to work without changing every consumer file.
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

// Backward-compatible alias (old client name → shared canonical name)
export { mapDatabaseGenderToString as mapDatabaseGenderValue } from '@turnfix/shared';

export type { GenderValue, GenderValueDE, GenderValueDB } from '@turnfix/shared';
