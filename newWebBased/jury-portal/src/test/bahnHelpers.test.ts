import { describe, it, expect } from 'vitest';
import {
  buildBahnOptions,
  needsBahnSelection,
  filterParticipantsForBahn,
} from '../utils/bahnHelpers';
import type { BahnDetail, Durchgang, Squad } from '../components/JuryPortal/JuryPortal.types';

const bahnDetail = (
  durchgang: number,
  bahn: number,
  competitions: Array<[number, number[]]>,
  squads: string[]
): BahnDetail => ({
  durchgang,
  bahn,
  competitions: competitions.map(([id, disciplineIds]) => ({ id, name: `WK ${id}`, number: String(id), disciplineIds })),
  squads: squads.map(name => ({ name, participantCount: 1 })),
});

const p = (id: number, competitionIds?: number[]) => ({
  id,
  ...(competitionIds ? { competitions: competitionIds.map(cid => ({ id: cid })) } : {}),
}) as any;

const squad = (name: string, participants: any[]): Squad => ({ id: 1, name, participants });

const durchgang = (n: number): Durchgang => ({ durchgang: n, startTime: null, competitions: [], squads: [] });

describe('filterParticipantsForBahn', () => {
  const bahn = { competitionIds: [10] } as any;

  it('keeps everyone without a Bahn', () => {
    const list = [p(1, [10]), p(2, [20])];
    expect(filterParticipantsForBahn(list, null)).toBe(list);
  });

  it('keeps only participants competing in the competitions of the Bahn', () => {
    const list = [p(1, [10]), p(2, [20]), p(3, [20, 10])];
    expect(filterParticipantsForBahn(list, bahn).map(x => x.id)).toEqual([1, 3]);
  });

  it('supports assignedCompetitions', () => {
    const list = [{ id: 1, assignedCompetitions: [10] }, { id: 2, assignedCompetitions: [20] }] as any[];
    expect(filterParticipantsForBahn(list, bahn).map(x => x.id)).toEqual([1]);
  });

  it('keeps participants without competition information', () => {
    expect(filterParticipantsForBahn([p(1), p(2, [20])], bahn).map(x => x.id)).toEqual([1]);
  });
});

describe('buildBahnOptions', () => {
  const bahnen = [
    bahnDetail(1, 1, [[10, [100, 200]]], ['A', 'B']),
    bahnDetail(1, 2, [[20, [100]]], ['A']),
    bahnDetail(2, 1, [[30, [100]]], ['A']),
  ];
  const a = squad('A', [p(1, [10]), p(2, [20]), p(3, [30])]);
  const ctx = (overrides: any = {}) => ({ durchgang: durchgang(1), squad: a, disciplineId: 100, ...overrides });

  it('lists the Bahnen of the Durchgang on which the squad competes, sorted by Bahn', () => {
    expect(buildBahnOptions(bahnen, ctx()).map(o => o.bahn)).toEqual([1, 2]);
  });

  it('ignores Bahnen of other Durchgänge', () => {
    expect(buildBahnOptions(bahnen, ctx({ durchgang: durchgang(2) })).map(o => o.bahn)).toEqual([1]);
  });

  it('uses all Durchgänge when none is selected', () => {
    expect(buildBahnOptions(bahnen, ctx({ durchgang: null })).length).toBe(3);
  });

  it('ignores Bahnen on which the squad does not compete', () => {
    expect(buildBahnOptions(bahnen, ctx({ squad: squad('B', [p(9, [10])]) })).map(o => o.bahn)).toEqual([1]);
  });

  it('only offers Bahnen whose competitions include the chosen discipline', () => {
    expect(buildBahnOptions(bahnen, ctx({ disciplineId: 200 })).map(o => o.bahn)).toEqual([1]);
    expect(buildBahnOptions(bahnen, ctx({ disciplineId: 999 }))).toEqual([]);
  });

  it('takes any Bahn into account when no discipline is given', () => {
    expect(buildBahnOptions(bahnen, ctx({ disciplineId: null })).map(o => o.bahn)).toEqual([1, 2]);
  });

  it('collects the competition ids that include the discipline', () => {
    const options = buildBahnOptions(
      [bahnDetail(1, 1, [[10, [100]], [11, [200]], [12, [100]]], ['A'])],
      ctx()
    );
    expect(options[0].competitionIds).toEqual([10, 12]);
    expect(options[0].competitions.map(c => c.id)).toEqual([10, 12]);
  });

  it('counts the squad participants of that Bahn', () => {
    const options = buildBahnOptions(bahnen, ctx());
    expect(options.map(o => o.participantCount)).toEqual([1, 1]);
    const bigger = squad('A', [p(1, [10]), p(2, [10]), p(3, [20])]);
    expect(buildBahnOptions(bahnen, ctx({ squad: bigger })).map(o => o.participantCount)).toEqual([2, 1]);
  });

  it('returns nothing without Bahn data', () => {
    expect(buildBahnOptions([], ctx())).toEqual([]);
  });
});

describe('needsBahnSelection', () => {
  it('only requires a selection for more than one Bahn', () => {
    expect(needsBahnSelection([])).toBe(false);
    expect(needsBahnSelection([{} as any])).toBe(false);
    expect(needsBahnSelection([{} as any, {} as any])).toBe(true);
  });
});
