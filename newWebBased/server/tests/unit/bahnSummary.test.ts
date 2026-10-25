import { buildBahnSummaries } from '../../src/utils/bahnSummary';

const comp = (id: number, durchgang: number | null, bahn: number | null, disciplineIds: number[] = [], extra: any = {}) => ({
  id,
  name: `WK ${id}`,
  number: String(id),
  durchgang,
  bahn,
  disciplineIds,
  ...extra,
});

const w = (competitionId: number, squadName: string | null, extra: any = {}) => ({ competitionId, squadName, ...extra });

describe('buildBahnSummaries', () => {
  it('returns an empty list without competitions', () => {
    expect(buildBahnSummaries([], [])).toEqual([]);
  });

  it('groups competitions by Durchgang and Bahn, sorted by Durchgang then Bahn', () => {
    const result = buildBahnSummaries(
      [comp(1, 2, 1), comp(2, 1, 2), comp(3, 1, 1), comp(4, 1, 2)],
      []
    );
    expect(result.map(b => [b.durchgang, b.bahn])).toEqual([[1, 1], [1, 2], [2, 1]]);
    expect(result[1].competitions.map(c => c.id)).toEqual([2, 4]);
  });

  it('treats a missing Durchgang or Bahn as 1 (database default)', () => {
    const result = buildBahnSummaries([comp(1, null, null)], []);
    expect(result).toHaveLength(1);
    expect(result[0].durchgang).toBe(1);
    expect(result[0].bahn).toBe(1);
  });

  it('exposes the discipline ids of each competition', () => {
    const result = buildBahnSummaries([comp(1, 1, 1, [10, 20])], []);
    expect(result[0].competitions[0].disciplineIds).toEqual([10, 20]);
  });

  it('counts the participants per squad on the Bahn', () => {
    const result = buildBahnSummaries(
      [comp(1, 1, 1), comp(2, 1, 2)],
      [w(1, 'A'), w(1, 'A'), w(1, 'B'), w(2, 'A')]
    );
    expect(result[0].squads).toEqual([{ name: 'A', participantCount: 2 }, { name: 'B', participantCount: 1 }]);
    expect(result[1].squads).toEqual([{ name: 'A', participantCount: 1 }]);
  });

  it('sums participants of several competitions on the same Bahn', () => {
    const result = buildBahnSummaries([comp(1, 1, 1), comp(2, 1, 1)], [w(1, 'A'), w(2, 'A')]);
    expect(result[0].squads).toEqual([{ name: 'A', participantCount: 2 }]);
  });

  it('ignores rows without squad, from unknown competitions and non-starting participants', () => {
    const result = buildBahnSummaries(
      [comp(1, 1, 1)],
      [w(1, null), w(1, ' '), w(99, 'X'), w(1, 'A', { doesNotStart: true }), w(1, 'A')]
    );
    expect(result[0].squads).toEqual([{ name: 'A', participantCount: 1 }]);
  });

  it('sorts squads naturally (2 before 10)', () => {
    const result = buildBahnSummaries([comp(1, 1, 1)], [w(1, '10'), w(1, '2')]);
    expect(result[0].squads.map(s => s.name)).toEqual(['2', '10']);
  });

  it('keeps Bahnen without squads (the UI decides what to show)', () => {
    const result = buildBahnSummaries([comp(1, 1, 1), comp(2, 1, 2)], [w(1, 'A')]);
    expect(result[1].squads).toEqual([]);
  });
});
