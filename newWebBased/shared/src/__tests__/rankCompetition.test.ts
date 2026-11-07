import { describe, it, expect } from 'vitest';
import { rankCompetition } from '../rankingUtils';

describe('rankCompetition', () => {
  it('ranks by the summed scores and shares a rank for equal totals', () => {
    const result = rankCompetition([
      { key: 1, scores: [10, 10] },
      { key: 2, scores: [9, 11] },
      { key: 3, scores: [5, 5] },
    ]);
    expect(result.get(1)).toEqual({ totalScore: 20, rank: 1 });
    expect(result.get(2)).toEqual({ totalScore: 20, rank: 1 });
    expect(result.get(3)).toEqual({ totalScore: 10, rank: 3 });
  });

  it('ties totals that differ only by floating-point summation order', () => {
    const result = rankCompetition([
      { key: 'a', scores: [13.35, 14.15, 12.1, 12.6] },
      { key: 'b', scores: [14.3, 10.5, 14, 13.4] },
    ]);
    expect(result.get('a')?.rank).toBe(1);
    expect(result.get('b')?.rank).toBe(1);
  });

  it('ranks ascending for time based competitions', () => {
    const result = rankCompetition(
      [{ key: 1, scores: [12] }, { key: 2, scores: [9] }],
      { sortAscending: true },
    );
    expect(result.get(2)?.rank).toBe(1);
    expect(result.get(1)?.rank).toBe(2);
  });

  it('drops the worst scores before ranking', () => {
    const result = rankCompetition(
      [{ key: 1, scores: [10, 10, 1] }, { key: 2, scores: [9, 9, 9] }],
      { dropWorstScore: true, dropCount: 1 },
    );
    expect(result.get(1)).toEqual({ totalScore: 20, rank: 1 });
    expect(result.get(2)).toEqual({ totalScore: 18, rank: 2 });
  });

  it('does not rank entries without scores or excluded entries', () => {
    const result = rankCompetition([
      { key: 1, scores: [10] },
      { key: 2, scores: [null, undefined] },
      { key: 3, scores: [50], excluded: true },
    ]);
    expect(result.get(1)?.rank).toBe(1);
    expect(result.get(2)).toEqual({ totalScore: null, rank: 0 });
    expect(result.get(3)).toEqual({ totalScore: 50, rank: 0 });
  });

  it('uses a given total instead of summing the scores', () => {
    const result = rankCompetition([
      { key: 1, scores: [1], totalScore: 30 },
      { key: 2, scores: [20] },
    ]);
    expect(result.get(1)).toEqual({ totalScore: 30, rank: 1 });
    expect(result.get(2)?.rank).toBe(2);
  });

  it('rounds totals to the visible precision before sorting and assigning places', () => {
    const result = rankCompetition(
      [
        { key: 'a', scores: [10.126] },
        { key: 'b', scores: [10.124] },
        { key: 'c', scores: [10.11] },
      ],
      { totalScoreDecimalPlaces: 2 },
    );

    expect(result.get('a')).toEqual({ totalScore: 10.13, rank: 1 });
    expect(result.get('b')).toEqual({ totalScore: 10.12, rank: 2 });
    expect(result.get('c')).toEqual({ totalScore: 10.11, rank: 3 });
  });

  it('ties totals that format identically at the competition precision', () => {
    const result = rankCompetition(
      [
        { key: 'a', scores: [10.124] },
        { key: 'b', scores: [10.123] },
        { key: 'c', scores: [10.11] },
      ],
      { totalScoreDecimalPlaces: 2 },
    );

    expect(result.get('a')).toEqual({ totalScore: 10.12, rank: 1 });
    expect(result.get('b')).toEqual({ totalScore: 10.12, rank: 1 });
    expect(result.get('c')).toEqual({ totalScore: 10.11, rank: 3 });
  });
});
