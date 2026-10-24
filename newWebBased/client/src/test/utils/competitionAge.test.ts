import { describe, it, expect } from 'vitest'
import {
  MIN_COMPETITION_AGE,
  MAX_COMPETITION_AGE,
  isValidCompetitionAge,
  isValidCompetitionAgeRange
} from '@turnfix/shared'

describe('competition age limits', () => {
  it('allows ages from 1 up to 120', () => {
    expect(MIN_COMPETITION_AGE).toBe(1)
    expect(MAX_COMPETITION_AGE).toBe(120)
  })

  it.each([1, 18, 50, 51, 99, 100, 120])('accepts %i', age => {
    expect(isValidCompetitionAge(age)).toBe(true)
  })

  it.each([0, -3, 121, 5.5, NaN, Infinity])('rejects %s', age => {
    expect(isValidCompetitionAge(age)).toBe(false)
  })

  it('validates ranges: from <= to, both within limits', () => {
    expect(isValidCompetitionAgeRange(6, 120)).toBe(true)
    expect(isValidCompetitionAgeRange(30, 30)).toBe(true)
    expect(isValidCompetitionAgeRange(40, 30)).toBe(false)
    expect(isValidCompetitionAgeRange(6, 121)).toBe(false)
    expect(isValidCompetitionAgeRange(NaN, 20)).toBe(false)
  })
})
