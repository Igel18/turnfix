/**
 * ScheduleMatrixView — Pure helper tests
 * Point 85: Time Planning tabular view
 */

import { describe, it, expect } from 'vitest';
import {
  addMinutesToTime,
  calculateRoundTime,
  buildConflictCells,
  buildRoundTimeMap,
  getSessionSquads,
  getSessionVisibleColumns,
} from '../../pages/TimePlanning/components/ScheduleMatrixView';

// ── addMinutesToTime ──────────────────────────────────────────────────────────

describe('addMinutesToTime', () => {
  it('adds minutes within same hour', () => {
    expect(addMinutesToTime('09:00', 15)).toBe('09:15');
  });

  it('crosses an hour boundary', () => {
    expect(addMinutesToTime('09:50', 20)).toBe('10:10');
  });

  it('works with zero minutes', () => {
    expect(addMinutesToTime('08:30', 0)).toBe('08:30');
  });

  it('wraps past midnight', () => {
    expect(addMinutesToTime('23:50', 15)).toBe('00:05');
  });

  it('pads single-digit hours and minutes', () => {
    expect(addMinutesToTime('00:00', 5)).toBe('00:05');
    expect(addMinutesToTime('00:00', 65)).toBe('01:05');
  });

  it('handles exactly 60 minutes', () => {
    expect(addMinutesToTime('08:00', 60)).toBe('09:00');
  });

  it('handles large minute values', () => {
    expect(addMinutesToTime('10:00', 120)).toBe('12:00');
  });
});

// ── calculateRoundTime ────────────────────────────────────────────────────────

describe('calculateRoundTime', () => {
  const BASE = '09:00';
  const INTERVAL = 20;

  it('round 1 equals the base start time', () => {
    expect(calculateRoundTime(BASE, 1, INTERVAL)).toBe('09:00');
  });

  it('round 2 is baseTime + one interval', () => {
    expect(calculateRoundTime(BASE, 2, INTERVAL)).toBe('09:20');
  });

  it('round 3 is baseTime + two intervals', () => {
    expect(calculateRoundTime(BASE, 3, INTERVAL)).toBe('09:40');
  });

  it('increments correctly with 30-minute interval', () => {
    expect(calculateRoundTime('08:00', 1, 30)).toBe('08:00');
    expect(calculateRoundTime('08:00', 2, 30)).toBe('08:30');
    expect(calculateRoundTime('08:00', 3, 30)).toBe('09:00');
  });

  it('wraps past midnight correctly', () => {
    expect(calculateRoundTime('23:30', 2, 45)).toBe('00:15');
  });

  it('handles interval of 0 (all rounds same time)', () => {
    expect(calculateRoundTime('10:00', 5, 0)).toBe('10:00');
  });
});

// ── buildConflictCells ────────────────────────────────────────────────────────

describe('buildConflictCells', () => {
  it('returns empty set when there are no assignments', () => {
    const result = buildConflictCells([]);
    expect(result.size).toBe(0);
  });

  it('returns empty set when every squad appears only once per round', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: 'wBlu' },
      { disciplineId: 2, round: 1, squadName: 'wRot' },
      { disciplineId: 1, round: 2, squadName: 'wRot' },
      { disciplineId: 2, round: 2, squadName: 'wBlu' },
    ];
    expect(buildConflictCells(assignments).size).toBe(0);
  });

  it('detects a squad assigned to two disciplines in the same round', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: 'wBlu' },
      { disciplineId: 2, round: 1, squadName: 'wBlu' }, // conflict
    ];
    const result = buildConflictCells(assignments);
    expect(result.has('1_1')).toBe(true);
    expect(result.has('2_1')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('detects a squad assigned to three disciplines in the same round', () => {
    const assignments = [
      { disciplineId: 1, round: 2, squadName: 'wBlu' },
      { disciplineId: 2, round: 2, squadName: 'wBlu' },
      { disciplineId: 3, round: 2, squadName: 'wBlu' },
    ];
    const result = buildConflictCells(assignments);
    expect(result.has('1_2')).toBe(true);
    expect(result.has('2_2')).toBe(true);
    expect(result.has('3_2')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('does not flag the same squad in different rounds', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: 'wBlu' },
      { disciplineId: 2, round: 2, squadName: 'wBlu' }, // different round — no conflict
    ];
    expect(buildConflictCells(assignments).size).toBe(0);
  });

  it('only flags the conflicting squad, not others in the same round', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: 'wBlu' },
      { disciplineId: 2, round: 1, squadName: 'wBlu' }, // conflict
      { disciplineId: 3, round: 1, squadName: 'wRot' }, // no conflict
    ];
    const result = buildConflictCells(assignments);
    expect(result.has('1_1')).toBe(true);
    expect(result.has('2_1')).toBe(true);
    expect(result.has('3_1')).toBe(false);
  });

  it('handles multiple conflicting squads in the same round independently', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: 'wBlu' },
      { disciplineId: 2, round: 1, squadName: 'wBlu' }, // wBlu conflict
      { disciplineId: 3, round: 1, squadName: 'wRot' },
      { disciplineId: 4, round: 1, squadName: 'wRot' }, // wRot conflict
    ];
    const result = buildConflictCells(assignments);
    expect(result.has('1_1')).toBe(true);
    expect(result.has('2_1')).toBe(true);
    expect(result.has('3_1')).toBe(true);
    expect(result.has('4_1')).toBe(true);
    expect(result.size).toBe(4);
  });

  it('ignores assignments with empty squadName', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: '' },
      { disciplineId: 2, round: 1, squadName: '' },
    ];
    expect(buildConflictCells(assignments).size).toBe(0);
  });

  it('handles conflicts across multiple rounds independently', () => {
    const assignments = [
      { disciplineId: 1, round: 1, squadName: 'wBlu' },
      { disciplineId: 2, round: 1, squadName: 'wBlu' }, // conflict round 1
      { disciplineId: 1, round: 2, squadName: 'wRot' },
      { disciplineId: 2, round: 2, squadName: 'wRot' }, // conflict round 2
      { disciplineId: 3, round: 3, squadName: 'wGrn' }, // no conflict
    ];
    const result = buildConflictCells(assignments);
    expect(result.has('1_1')).toBe(true);
    expect(result.has('2_1')).toBe(true);
    expect(result.has('1_2')).toBe(true);
    expect(result.has('2_2')).toBe(true);
    expect(result.has('3_3')).toBe(false);
    expect(result.size).toBe(4);
  });
});

// ── buildRoundTimeMap ─────────────────────────────────────────────────────────

// Helper: create a minimal squad object for test inputs
const squad = (name: string, participantCount: number) => ({
  name,
  participantCount,
  competitions: [],
  competitionIds: [],
});

describe('buildRoundTimeMap', () => {
  it('returns empty map when sessionGroups is empty', () => {
    const result = buildRoundTimeMap(5, [], 3, 20);
    expect(result.size).toBe(0);
  });

  it('returns empty map when no session has a startTime', () => {
    const sg = [{ session: 1, startTime: null, squads: [squad('wBlu', 5)] }];
    const result = buildRoundTimeMap(3, sg, 3, 20);
    expect(result.size).toBe(0);
  });

  it('single session: interval = maxParticipants × exerciseDuration', () => {
    // 6 participants × 3 min = 18 min interval
    const sg = [{ session: 1, startTime: '09:00', squads: [squad('wBlu', 6), squad('wRot', 4)] }];
    const result = buildRoundTimeMap(3, sg, 3, 20);
    expect(result.get(1)).toBe('09:00');
    expect(result.get(2)).toBe('09:18'); // +18 min
    expect(result.get(3)).toBe('09:36'); // +36 min
  });

  it('single session with one squad: covers all rounds', () => {
    // 5 participants × 3 min = 15 min interval
    const sg = [{ session: 1, startTime: '08:00', squads: [squad('wGrn', 5)] }];
    const result = buildRoundTimeMap(4, sg, 3, 20);
    expect(result.get(1)).toBe('08:00');
    expect(result.get(2)).toBe('08:15');
    expect(result.get(3)).toBe('08:30');
    expect(result.get(4)).toBe('08:45');
  });

  it('two sessions: each session uses its own interval and start time', () => {
    // Session 1: 6 participants × 3 min = 18 min, starts 09:00, window = 3h = 180 min → 10 rounds
    // Session 2: 4 participants × 3 min = 12 min, starts 12:00
    const sg = [
      { session: 1, startTime: '09:00', squads: [squad('wBlu', 6)] },
      { session: 2, startTime: '12:00', squads: [squad('wRot', 4)] },
    ];
    // 180 min / 18 min = 10 rounds in session 1
    const result = buildRoundTimeMap(14, sg, 3, 20);
    expect(result.get(1)).toBe('09:00');
    expect(result.get(2)).toBe('09:18');
    expect(result.get(10)).toBe('11:42'); // 09:00 + 9×18min = 09:00 + 162min = 11:42
    // Session 2 starts at round 11
    expect(result.get(11)).toBe('12:00');
    expect(result.get(12)).toBe('12:12'); // +12 min
    expect(result.get(14)).toBe('12:36'); // +36 min
  });

  it('two sessions: session with no squads falls back to 1×exerciseDuration', () => {
    const sg = [
      { session: 1, startTime: '09:00', squads: [] },               // no squads → maxPart=1 → interval=3
      { session: 2, startTime: '09:30', squads: [squad('wBlu', 5)] }, // 5×3=15
    ];
    // Session 1: 30 min / 3 = 10 rounds; but totalRounds=4 so session 1 gets 4 (min of window and total remaining)
    const result = buildRoundTimeMap(4, sg, 3, 20);
    // Actually 30 min / 3 = 10 rounds → session 1 gets min(10, 4) = 4... all go to session 1
    expect(result.get(1)).toBe('09:00');
    expect(result.get(2)).toBe('09:03');
    expect(result.get(3)).toBe('09:06');
    expect(result.get(4)).toBe('09:09');
  });

  it('falls back to fallbackInterval when squads have 0 participants', () => {
    // participantCount=0 → maxParticipants=1 (Math.max(1,...)), interval = 1×3 = 3
    const sg = [{ session: 1, startTime: '10:00', squads: [squad('wBlu', 0)] }];
    const result = buildRoundTimeMap(2, sg, 3, 20);
    expect(result.get(1)).toBe('10:00');
    expect(result.get(2)).toBe('10:03'); // 1×3 = 3 min interval
  });

  it('covers exactly totalRounds even if computed session capacity exceeds it', () => {
    const sg = [{ session: 1, startTime: '09:00', squads: [squad('wBlu', 3)] }]; // interval=9
    const result = buildRoundTimeMap(3, sg, 3, 20);
    expect(result.size).toBe(3);
    expect(result.get(3)).toBe('09:18');
  });
});

describe('getSessionSquads', () => {
  it('returns only the squads of the current session', () => {
    const result = getSessionSquads(2, [
      { session: 1, squads: [{ name: 'wBlu' } as any] },
      { session: 2, squads: [{ name: 'mRot' } as any, { name: 'mGruen' } as any] },
    ], ['wBlu', 'mRot', 'mGruen']);

    expect(result).toEqual(['mRot', 'mGruen']);
  });

  it('falls back to the global squads when no session match exists', () => {
    expect(getSessionSquads(3, [{ session: 1, squads: [{ name: 'wBlu' } as any] }], ['wBlu', 'mRot'])).toEqual(['wBlu', 'mRot']);
  });
});

describe('getSessionVisibleColumns', () => {
  const columns = [
    { kind: 'discipline', id: 1, name: 'Boden' },
    { kind: 'discipline', id: 2, name: 'Sprung' },
    { kind: 'discipline', id: 3, name: 'Reck' },
  ];

  it('filters visible columns to the current session disciplines', () => {
    const result = getSessionVisibleColumns(columns, { '2': [2, 3] }, 2);

    expect(result).toEqual([
      { kind: 'discipline', id: 2, name: 'Sprung' },
      { kind: 'discipline', id: 3, name: 'Reck' },
    ]);
  });

  it('falls back to all columns when no session mapping exists', () => {
    expect(getSessionVisibleColumns(columns, undefined, 2)).toEqual(columns);
  });
});
