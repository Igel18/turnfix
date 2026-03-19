/**
 * ScheduleMatrixView — Pure helper tests
 * Point 85: Time Planning tabular view
 */

import { describe, it, expect } from 'vitest';
import {
  addMinutesToTime,
  calculateRoundTime,
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
