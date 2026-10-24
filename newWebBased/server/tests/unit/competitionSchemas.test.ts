import { competitionAgeSchema } from '../../src/utils/competitionSchemas';

describe('competitionAgeSchema', () => {
  it.each([1, 50, 51, 99, 100, 120])('accepts %i', age => {
    expect(competitionAgeSchema.safeParse(age).success).toBe(true);
  });

  it.each([0, -1, 121, 12.5])('rejects %s', age => {
    expect(competitionAgeSchema.safeParse(age).success).toBe(false);
  });
});
