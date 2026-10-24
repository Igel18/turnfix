export const MIN_COMPETITION_AGE = 1;
export const MAX_COMPETITION_AGE = 120;

export const isValidCompetitionAge = (age: number): boolean =>
  Number.isInteger(age) && age >= MIN_COMPETITION_AGE && age <= MAX_COMPETITION_AGE;

export const isValidCompetitionAgeRange = (ageFrom: number, ageTo: number): boolean =>
  isValidCompetitionAge(ageFrom) && isValidCompetitionAge(ageTo) && ageFrom <= ageTo;
