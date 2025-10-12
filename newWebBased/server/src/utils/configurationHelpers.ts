/**
 * Configuration helpers for consistent values across the application
 */

// Gender configuration for competitions (German/Austrian system)
export const COMPETITION_GENDER_VALUES = ['männlich', 'weiblich', 'gemischt'] as const;
export type CompetitionGender = typeof COMPETITION_GENDER_VALUES[number];

// Gender configuration for participants (international system)
export const PARTICIPANT_GENDER_VALUES = ['MALE', 'FEMALE', 'OTHER'] as const;
export type ParticipantGender = typeof PARTICIPANT_GENDER_VALUES[number];

// Database gender mapping (based on TurnFix legacy system)
export const DATABASE_GENDER_MAPPING = {
  1: 'MALE',
  2: 'FEMALE',
  // Add more mappings as needed
} as const;

// Competition status values
export const COMPETITION_STATUS_VALUES = ['REGISTERED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'] as const;
export type CompetitionStatus = typeof COMPETITION_STATUS_VALUES[number];

// Medal type values
export const MEDAL_TYPE_VALUES = ['gold', 'silver', 'bronze'] as const;
export type MedalType = typeof MEDAL_TYPE_VALUES[number];

/**
 * Get gender values for competitions
 */
export function getCompetitionGenderValues(): readonly string[] {
  return COMPETITION_GENDER_VALUES;
}

/**
 * Get gender values for participants
 */
export function getParticipantGenderValues(): readonly string[] {
  return PARTICIPANT_GENDER_VALUES;
}

/**
 * Get competition status values
 */
export function getCompetitionStatusValues(): readonly string[] {
  return COMPETITION_STATUS_VALUES;
}

/**
 * Get medal type values
 */
export function getMedalTypeValues(): readonly string[] {
  return MEDAL_TYPE_VALUES;
}

/**
 * Convert database gender code to participant gender string
 */
export function convertDatabaseGenderToParticipant(genderCode: number): ParticipantGender {
  const mapped = DATABASE_GENDER_MAPPING[genderCode as keyof typeof DATABASE_GENDER_MAPPING];
  return mapped || 'OTHER';
}

/**
 * Convert participant gender string to database gender code
 */
export function convertParticipantGenderToDatabase(gender: ParticipantGender): number {
  const entries = Object.entries(DATABASE_GENDER_MAPPING);
  const found = entries.find(([, value]) => value === gender);
  return found ? parseInt(found[0]) : 0; // 0 as fallback for unknown
}