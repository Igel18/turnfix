import { buildDurchgangSummaries, formatTimeHHMM } from '../../src/utils/durchgangSummary';

const comp = (id: number, durchgang: number | null, startTime: Date | string | null = null, extra: any = {}) => ({
  id,
  name: `WK ${id}`,
  number: String(id),
  durchgang,
  startTime,
  ...extra,
});

const w = (competitionId: number, squadName: string | null, extra: any = {}) => ({
  competitionId,
  squadName,
  ...extra,
});

describe('formatTimeHHMM', () => {
  it('formats a Date using LOCAL hours/minutes (TIME columns are wall-clock)', () => {
    expect(formatTimeHHMM(new Date(1970, 0, 1, 9, 5, 0))).toBe('09:05');
  });

  it('extracts HH:MM from strings', () => {
    expect(formatTimeHHMM('14:30:00')).toBe('14:30');
    expect(formatTimeHHMM('9:00')).toBe('09:00');
  });

  it('returns null for empty or unparsable values', () => {
    expect(formatTimeHHMM(null)).toBeNull();
    expect(formatTimeHHMM(undefined)).toBeNull();
    expect(formatTimeHHMM('abc')).toBeNull();
  });
});

describe('buildDurchgangSummaries', () => {
  it('returns an empty list without competitions', () => {
    expect(buildDurchgangSummaries([], [])).toEqual([]);
  });

  it('groups competitions by Durchgang and sorts Durchgänge ascending', () => {
    const result = buildDurchgangSummaries([comp(3, 2), comp(1, 1), comp(2, 1)], []);
    expect(result.map(d => d.durchgang)).toEqual([1, 2]);
    expect(result[0].competitions.map(c => c.id)).toEqual([1, 2]);
    expect(result[1].competitions.map(c => c.id)).toEqual([3]);
  });

  it('treats a missing Durchgang as 1 (database default)', () => {
    const result = buildDurchgangSummaries([comp(1, null)], []);
    expect(result[0].durchgang).toBe(1);
  });

  it('assigns squads to the Durchgang of their participants competition', () => {
    const result = buildDurchgangSummaries(
      [comp(1, 1), comp(2, 2)],
      [w(1, 'A'), w(1, 'A'), w(1, 'B'), w(2, 'C')]
    );
    expect(result[0].squads).toEqual([
      { name: 'A', participantCount: 2 },
      { name: 'B', participantCount: 1 },
    ]);
    expect(result[1].squads).toEqual([{ name: 'C', participantCount: 1 }]);
  });

  it('lists a squad in every Durchgang in which it has participants, with per-Durchgang counts', () => {
    const result = buildDurchgangSummaries(
      [comp(1, 1), comp(2, 2)],
      [w(1, 'A'), w(1, 'A'), w(2, 'A')]
    );
    expect(result[0].squads).toEqual([{ name: 'A', participantCount: 2 }]);
    expect(result[1].squads).toEqual([{ name: 'A', participantCount: 1 }]);
  });

  it('ignores rows without a squad, with empty squad name, or from unknown competitions', () => {
    const result = buildDurchgangSummaries(
      [comp(1, 1)],
      [w(1, null), w(1, ''), w(1, '  '), w(99, 'X'), w(1, 'A')]
    );
    expect(result[0].squads).toEqual([{ name: 'A', participantCount: 1 }]);
  });

  it('does not count participants that do not start', () => {
    const result = buildDurchgangSummaries(
      [comp(1, 1)],
      [w(1, 'A'), w(1, 'A', { doesNotStart: true })]
    );
    expect(result[0].squads).toEqual([{ name: 'A', participantCount: 1 }]);
  });

  it('sorts squads naturally (2 before 10)', () => {
    const result = buildDurchgangSummaries([comp(1, 1)], [w(1, '10'), w(1, '2'), w(1, '1')]);
    expect(result[0].squads.map(s => s.name)).toEqual(['1', '2', '10']);
  });

  it('uses the earliest competition start time as Durchgang start time', () => {
    const result = buildDurchgangSummaries(
      [comp(1, 1, new Date(1970, 0, 1, 11, 0)), comp(2, 1, new Date(1970, 0, 1, 9, 30)), comp(3, 1, null)],
      []
    );
    expect(result[0].startTime).toBe('09:30');
  });

  it('has a null start time when no competition has one', () => {
    expect(buildDurchgangSummaries([comp(1, 1)], [])[0].startTime).toBeNull();
  });

  it('keeps Durchgänge without squads in the result (the UI decides what to show)', () => {
    const result = buildDurchgangSummaries([comp(1, 1), comp(2, 2)], [w(1, 'A')]);
    expect(result[1].squads).toEqual([]);
  });
});
