import { describe, it, expect } from 'vitest';
import {
  getSelectableDurchgaenge,
  needsDurchgangSelection,
  filterSquadsByDurchgang,
  filterSquadForDurchgang,
  getDurchgangStatus,
  sortDurchgaenge,
  formatDurchgangStartTime,
} from '../utils/durchgangHelpers';
import type { Durchgang, Squad, ActiveSquadInfo } from '../components/JuryPortal/JuryPortal.types';

const dg = (durchgang: number, squadNames: string[], extra: Partial<Durchgang> = {}): Durchgang => ({
  durchgang,
  startTime: null,
  competitions: [{ id: durchgang * 10, name: `WK ${durchgang}`, number: String(durchgang) }],
  squads: squadNames.map(name => ({ name, participantCount: 1 })),
  ...extra,
});

const squad = (name: string, participants: any[] = []): Squad => ({
  id: Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)),
  name,
  participants,
});

const info = (squadName: string, status: ActiveSquadInfo['status']): ActiveSquadInfo => ({
  squadName,
  status,
  currentDeviceName: null,
  currentDisciplineId: null,
  timeInfo: '',
});

describe('getSelectableDurchgaenge / needsDurchgangSelection', () => {
  it('only offers Durchgänge that contain squads', () => {
    const list = [dg(1, ['A']), dg(2, [])];
    expect(getSelectableDurchgaenge(list).map(d => d.durchgang)).toEqual([1]);
  });

  it('does not require a selection for zero or one Durchgang', () => {
    expect(needsDurchgangSelection([])).toBe(false);
    expect(needsDurchgangSelection([dg(1, ['A'])])).toBe(false);
    expect(needsDurchgangSelection([dg(1, ['A']), dg(2, [])])).toBe(false);
  });

  it('requires a selection as soon as there is more than one Durchgang with squads', () => {
    expect(needsDurchgangSelection([dg(1, ['A']), dg(2, ['B'])])).toBe(true);
  });
});

describe('filterSquadsByDurchgang', () => {
  const squads = [squad('A'), squad('B'), squad('C')];

  it('returns all squads when no Durchgang is selected', () => {
    expect(filterSquadsByDurchgang(squads, null)).toEqual(squads);
  });

  it('returns only the squads of the selected Durchgang', () => {
    expect(filterSquadsByDurchgang(squads, dg(1, ['A', 'C'])).map(s => s.name)).toEqual(['A', 'C']);
  });

  it('returns nothing when the Durchgang has no matching squads', () => {
    expect(filterSquadsByDurchgang(squads, dg(1, ['Z']))).toEqual([]);
  });
});

describe('filterSquadForDurchgang', () => {
  const durchgang = dg(1, ['A'], { competitions: [{ id: 10, name: 'WK 1', number: '1' }] });

  it('keeps all participants without a Durchgang', () => {
    const s = squad('A', [{ id: 1 }, { id: 2 }]);
    expect(filterSquadForDurchgang(s, null)).toBe(s);
  });

  it('keeps only participants that compete in the Durchgang (competitions[].id)', () => {
    const s = squad('A', [
      { id: 1, competitions: [{ id: 10 }] },
      { id: 2, competitions: [{ id: 20 }] },
      { id: 3, competitions: [{ id: 20 }, { id: 10 }] },
    ]);
    expect(filterSquadForDurchgang(s, durchgang).participants.map(p => p.id)).toEqual([1, 3]);
  });

  it('supports assignedCompetitions as well', () => {
    const s = squad('A', [
      { id: 1, assignedCompetitions: [10] },
      { id: 2, assignedCompetitions: [20] },
    ]);
    expect(filterSquadForDurchgang(s, durchgang).participants.map(p => p.id)).toEqual([1]);
  });

  it('keeps participants without any competition information (cannot be assigned)', () => {
    const s = squad('A', [{ id: 1 }, { id: 2, competitions: [{ id: 20 }] }]);
    expect(filterSquadForDurchgang(s, durchgang).participants.map(p => p.id)).toEqual([1]);
  });

  it('does not mutate the original squad', () => {
    const s = squad('A', [{ id: 2, competitions: [{ id: 20 }] }]);
    filterSquadForDurchgang(s, durchgang);
    expect(s.participants).toHaveLength(1);
  });
});

describe('getDurchgangStatus', () => {
  const d = dg(1, ['A', 'B']);

  it('is unknown without time planning data', () => {
    expect(getDurchgangStatus(d, [])).toBe('unknown');
  });

  it('is active when any squad is active (even if another is upcoming)', () => {
    expect(getDurchgangStatus(d, [info('A', 'upcoming'), info('B', 'active')])).toBe('active');
  });

  it('is upcoming when no squad is active but one is upcoming', () => {
    expect(getDurchgangStatus(d, [info('A', 'unknown'), info('B', 'upcoming')])).toBe('upcoming');
  });

  it('is past only when all squads are past', () => {
    expect(getDurchgangStatus(d, [info('A', 'past'), info('B', 'past')])).toBe('past');
    expect(getDurchgangStatus(d, [info('A', 'past')])).toBe('unknown');
  });

  it('ignores infos of squads in other Durchgänge', () => {
    expect(getDurchgangStatus(d, [info('Z', 'active')])).toBe('unknown');
  });
});

describe('sortDurchgaenge', () => {
  it('keeps numeric order without time planning data', () => {
    const list = [dg(3, ['C']), dg(1, ['A']), dg(2, ['B'])];
    expect(sortDurchgaenge(list, []).map(d => d.durchgang)).toEqual([1, 2, 3]);
  });

  it('puts active first, then upcoming, then unknown, then past (like the squad list)', () => {
    const list = [dg(1, ['A']), dg(2, ['B']), dg(3, ['C']), dg(4, ['D'])];
    const infos = [info('A', 'past'), info('B', 'unknown'), info('C', 'upcoming'), info('D', 'active')];
    expect(sortDurchgaenge(list, infos).map(d => d.durchgang)).toEqual([4, 3, 2, 1]);
  });

  it('does not mutate its input', () => {
    const list = [dg(2, ['B']), dg(1, ['A'])];
    sortDurchgaenge(list, []);
    expect(list.map(d => d.durchgang)).toEqual([2, 1]);
  });
});

describe('formatDurchgangStartTime', () => {
  it('formats HH:MM as "ab HH:MM Uhr"', () => {
    expect(formatDurchgangStartTime('09:30')).toBe('ab 09:30 Uhr');
  });

  it('returns an empty string without start time', () => {
    expect(formatDurchgangStartTime(null)).toBe('');
  });
});
