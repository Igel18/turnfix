import { 
  getCompetitionGenderValues, 
  getParticipantGenderValues, 
  getCompetitionStatusValues, 
  getMedalTypeValues,
  convertDatabaseGenderToParticipant,
  convertParticipantGenderToDatabase,
  COMPETITION_GENDER_VALUES,
  PARTICIPANT_GENDER_VALUES,
  COMPETITION_STATUS_VALUES,
  MEDAL_TYPE_VALUES
} from '../utils/configurationHelpers';

describe('Configuration Helpers', () => {
  describe('Gender Configuration', () => {
    it('should return correct competition gender values', () => {
      const genders = getCompetitionGenderValues();
      expect(genders).toEqual(['männlich', 'weiblich', 'gemischt']);
      expect(genders.length).toBe(3);
    });

    it('should return correct participant gender values', () => {
      const genders = getParticipantGenderValues();
      expect(genders).toEqual(['MALE', 'FEMALE', 'OTHER']);
      expect(genders.length).toBe(3);
    });

    it('should convert database gender codes to participant genders', () => {
      expect(convertDatabaseGenderToParticipant(1)).toBe('MALE');
      expect(convertDatabaseGenderToParticipant(2)).toBe('FEMALE');
      expect(convertDatabaseGenderToParticipant(99)).toBe('OTHER'); // Unknown code
    });

    it('should convert participant genders to database codes', () => {
      expect(convertParticipantGenderToDatabase('MALE')).toBe(1);
      expect(convertParticipantGenderToDatabase('FEMALE')).toBe(2);
      expect(convertParticipantGenderToDatabase('OTHER')).toBe(0); // Unknown maps to 0
    });
  });

  describe('Competition Status Configuration', () => {
    it('should return correct competition status values', () => {
      const statuses = getCompetitionStatusValues();
      expect(statuses).toEqual(['REGISTERED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW']);
      expect(statuses.length).toBe(4);
    });
  });

  describe('Medal Type Configuration', () => {
    it('should return correct medal type values', () => {
      const medals = getMedalTypeValues();
      expect(medals).toEqual(['gold', 'silver', 'bronze']);
      expect(medals.length).toBe(3);
    });
  });

  describe('Type Safety', () => {
    it('should have readonly arrays', () => {
      const genders = getCompetitionGenderValues();
      expect(Array.isArray(genders)).toBe(true);
      // Cannot test readonly at runtime, but TypeScript ensures it
    });

    it('should export const arrays that match function results', () => {
      expect(Array.from(COMPETITION_GENDER_VALUES)).toEqual(getCompetitionGenderValues());
      expect(Array.from(PARTICIPANT_GENDER_VALUES)).toEqual(getParticipantGenderValues());
      expect(Array.from(COMPETITION_STATUS_VALUES)).toEqual(getCompetitionStatusValues());
      expect(Array.from(MEDAL_TYPE_VALUES)).toEqual(getMedalTypeValues());
    });
  });
});