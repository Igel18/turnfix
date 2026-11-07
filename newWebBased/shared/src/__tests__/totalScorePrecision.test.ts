import { describe, expect, it } from 'vitest';
import { formatTotalScore, getTotalScoreDecimalPlaces } from '../scoreFormatter';

describe('total score precision', () => {
  it('uses the greatest configured discipline precision', () => {
    expect(getTotalScoreDecimalPlaces([1, 3, 2])).toBe(3);
    expect(getTotalScoreDecimalPlaces([0, 0])).toBe(0);
  });

  it('defaults to two places when no discipline precision is available', () => {
    expect(getTotalScoreDecimalPlaces([])).toBe(2);
    expect(getTotalScoreDecimalPlaces([undefined])).toBe(2);
  });

  it('formats totals with trailing zeroes at the selected precision', () => {
    expect(formatTotalScore(15.25, 3)).toBe('15.250');
    expect(formatTotalScore(15.25, 1)).toBe('15.3');
  });
});