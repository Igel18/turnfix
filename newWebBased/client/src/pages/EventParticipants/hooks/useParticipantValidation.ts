/**
 * Custom hook for participant validation logic
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import { useTranslation } from 'react-i18next';
import { mapEnglishGenderToGerman, type GenderValue } from '@/utils/genderHelpers';
import { debugLog } from '@/utils/debug';
import { ageMatchesByBirthYear, ageMatchesExact } from '@turnfix/shared';
import type { Competition, CompetitionValidation } from '../EventParticipants.types';

export function useParticipantValidation() {
  const { t } = useTranslation();

  /**
   * Calculate age by birth year only (DEFAULT mode).
   * Month and day are ignored — only the year of birth matters.
   * This matches German gymnastics practice (Jahrgangsprüfung).
   */
  const calculateAgeByYear = (birthday: string): number => {
    if (!birthday) return 0;
    const birthYear = new Date(birthday).getFullYear();
    if (!birthYear || isNaN(birthYear)) return 0;
    return new Date().getFullYear() - birthYear;
  };

  /**
   * Calculate exact age from birthday string (considers month and day).
   * Kept for reference; not used as the default.
   */
  const calculateAge = (birthday: string): number => {
    if (!birthday) return 0;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  /**
   * Validate if participant fits competition requirements
   * @param competition - Competition to validate against
   * @param birthday - Participant's birthday
   * @param gender - Participant's gender (GenderValue: 'male' | 'female' | 'both' | 'unknown')
   * @returns Validation result with reasons for invalidity
   */
  const validateCompetition = (
    competition: Competition,
    birthday: string,
    gender: GenderValue
  ): CompetitionValidation => {
    const reasons: string[] = [];

    // Age validation — year-only (DEFAULT / Jahrgangsprüfung):
    // Use birth year only; month and day are irrelevant.
    // See shared/src/ageCheckUtils.ts for both modes.
    if (birthday) {
      const birthYear = new Date(birthday).getFullYear();
      if (birthYear > 0 && !ageMatchesByBirthYear(birthYear, competition.ageFrom, competition.ageTo)) {
        const age = calculateAgeByYear(birthday);
        reasons.push(
          t('eventParticipants.editParticipant.ageWarning', {
            age,
            ageFrom: competition.ageFrom,
            ageTo: competition.ageTo,
          })
        );
      }
    }

    // Gender validation
    // Convert participant gender to German format (database uses German)
    // Only validate if gender is male or female (skip both/unknown)
    if (gender === 'male' || gender === 'female') {
      const participantGender = mapEnglishGenderToGerman(gender);

      debugLog('🔍 Gender Validation:', {
        formDataGender: gender,
        participantGender,
        competitionGender: competition.gender,
        competitionName: competition.name,
        isGemischt: competition.gender === 'gemischt',
        gendersMatch: competition.gender === participantGender,
        shouldWarn:
          competition.gender !== 'gemischt' &&
          competition.gender !== participantGender,
      });

      // Only warn if competition is NOT mixed AND genders don't match
      if (
        competition.gender !== 'gemischt' &&
        competition.gender !== participantGender
      ) {
        const localizedParticipantGender = t(`common.gender.${gender}`);
        const localizedCompetitionGender = t(
          `common.gender.${competition.gender === 'männlich' ? 'male' : 'female'}`
        );

        reasons.push(
          t('eventParticipants.editParticipant.genderWarning', {
            participantGender: localizedParticipantGender,
            competitionGender: localizedCompetitionGender,
          })
        );
      }
    }

    return { valid: reasons.length === 0, reasons };
  };

  return {
    calculateAge,        // exact method (kept for completeness)
    calculateAgeByYear, // year-only method (DEFAULT)
    validateCompetition,
    // Re-export shared helpers for convenience
    ageMatchesByBirthYear,
    ageMatchesExact,
  };
}
