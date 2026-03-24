/**
 * ScheduleMatrixView — Pure helper tests
 * Point 85: Time Planning tabular view
 */

import { describe, it, expect } from 'vitest';
import {
  addMinutesToTime,
  calculateRoundTime,
  buildConflictCells,
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
