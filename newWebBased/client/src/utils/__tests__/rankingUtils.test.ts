import { describe, it, expect } from 'vitest';
import { assignRanks } from '../rankingUtils';

const make = (scores: number[]) =>
  scores.map((totalScore, i) => ({ id: i + 1, totalScore }));

describe('assignRanks', () => {
  it('no ties: sequential ranks 1, 2, 3', () => {
    const result = assignRanks(make([100, 90, 80]));
    expect(result.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  it('two-way tie: both get same rank, next skips', () => {
    // scores: 100, 95, 95, 90  →  ranks: 1, 2, 2, 4
    const result = assignRanks(make([100, 95, 95, 90]));
    expect(result.map(r => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it('three-way tie at top: all rank 1, next is rank 4', () => {
    const result = assignRanks(make([95, 95, 95, 80]));
    expect(result.map(r => r.rank)).toEqual([1, 1, 1, 4]);
  });

  it('all tied: everyone gets rank 1', () => {
    const result = assignRanks(make([88, 88, 88]));
    expect(result.map(r => r.rank)).toEqual([1, 1, 1]);
  });

  it('tie in the middle: ranks 1, 2, 2, 4, 5', () => {
    const result = assignRanks(make([100, 90, 90, 80, 70]));
    expect(result.map(r => r.rank)).toEqual([1, 2, 2, 4, 5]);
  });

  it('single participant: gets rank 1', () => {
    const result = assignRanks(make([50]));
    expect(result.map(r => r.rank)).toEqual([1]);
  });

  it('empty array: returns empty array', () => {
    const result = assignRanks([]);
    expect(result).toEqual([]);
  });

  it('preserves all original properties', () => {
    const input = [{ id: 7, totalScore: 100, name: 'Alice' }];
    const result = assignRanks(input);
    expect(result[0]).toMatchObject({ id: 7, totalScore: 100, name: 'Alice', rank: 1 });
  });
});
