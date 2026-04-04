import { describe, it, expect } from 'vitest';
import { assignRanks, computeTotalScore, sortAndRank } from '../rankingUtils';

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

// ─── computeTotalScore ────────────────────────────────────────────────────────

describe('computeTotalScore', () => {
  const scores = { Boden: 12.0, Reck: 11.5, Barren: 10.0, Ringe: 9.5, Pferd: 11.0, Sprung: 13.0 };

  it('sums all scores when Streichwertung is disabled', () => {
    expect(computeTotalScore(scores, false, 0)).toBeCloseTo(67.0);
  });

  it('drops 1 lowest score (Streichwertung dropCount=1)', () => {
    // Lowest = Ringe 9.5 → sum of rest = 57.5
    expect(computeTotalScore(scores, true, 1)).toBeCloseTo(57.5);
  });

  it('drops 2 lowest scores (Streichwertung dropCount=2)', () => {
    // Two lowest: Ringe 9.5, Barren 10.0 → sum of rest = 47.5
    expect(computeTotalScore(scores, true, 2)).toBeCloseTo(47.5);
  });

  it('no-op when dropWorstScore=false even with dropCount>0', () => {
    expect(computeTotalScore(scores, false, 3)).toBeCloseTo(67.0);
  });

  it('no-op when dropCount >= number of disciplines (would drop everything)', () => {
    // Safety: never drop all scores
    expect(computeTotalScore(scores, true, 6)).toBeCloseTo(67.0);
  });

  it('single discipline: always returns that score', () => {
    expect(computeTotalScore({ Boden: 12.5 }, true, 1)).toBeCloseTo(12.5);
  });

  it('empty scores: returns 0', () => {
    expect(computeTotalScore({}, true, 1)).toBe(0);
  });
});

// ─── sortAndRank ──────────────────────────────────────────────────────────────

describe('sortAndRank (sort direction + ranking combined)', () => {
  const participants = [
    { id: 1, name: 'Anna',  totalScore: 55.0 },
    { id: 2, name: 'Berta', totalScore: 62.5 },
    { id: 3, name: 'Clara', totalScore: 48.0 },
  ];

  it('normal sport: higher score = rank 1 (sortAscending=false)', () => {
    const result = sortAndRank(participants, false);
    expect(result.map(r => r.name)).toEqual(['Berta', 'Anna', 'Clara']);
    expect(result.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  it('time sport: lower score = rank 1 (sortAscending=true)', () => {
    // Lower time is better
    const result = sortAndRank(participants, true);
    expect(result.map(r => r.name)).toEqual(['Clara', 'Anna', 'Berta']);
    expect(result.map(r => r.rank)).toEqual([1, 2, 3]);
  });

  it('time sport with tie: both tied participants get same rank, next skips', () => {
    const tied = [
      { id: 1, name: 'Anna',  totalScore: 10.0 },
      { id: 2, name: 'Berta', totalScore: 10.0 },
      { id: 3, name: 'Clara', totalScore: 12.0 },
    ];
    const result = sortAndRank(tied, true);
    expect(result.map(r => r.rank)).toEqual([1, 1, 3]);
  });

  it('does not mutate the original array', () => {
    const original = [...participants];
    sortAndRank(participants, false);
    expect(participants).toEqual(original);
  });

  it('defaults to descending (sortAscending defaults to false)', () => {
    const result = sortAndRank(participants);
    expect(result[0].name).toBe('Berta');
  });
});
