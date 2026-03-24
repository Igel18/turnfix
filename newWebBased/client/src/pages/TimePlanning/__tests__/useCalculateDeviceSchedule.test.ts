import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useCalculateDeviceSchedule } from '../hooks/useCalculateDeviceSchedule';
import type { SessionGroup, TimeSettings } from '../TimePlanning.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: TimeSettings = {
  exerciseDurationMinutes: 5,
  breakBetweenDevicesMinutes: 2,
  warmupDurationMinutes: 10,
  rotationIntervalMinutes: 7,
};

/** Simple HH:MM → HH:MM time adder (mirrors the real implementation) */
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

function makeHook(
  squadDisciplines: any[] = [],
  cache: { [id: number]: any[] } = {},
  settings: TimeSettings = DEFAULT_SETTINGS
) {
  const { result } = renderHook(() => {
    const disciplineCache = useRef<{ [id: number]: any[] }>(cache);
    return useCalculateDeviceSchedule({
      squadDisciplines,
      disciplineCache,
      timeSettings: settings,
      addMinutesToTime: addMinutes,
    });
  });
  return result.current.calculateDeviceSchedule;
}

// ---------------------------------------------------------------------------
// Minimal fixtures
// ---------------------------------------------------------------------------

const BASE_COMPETITION = {
  id: 1,
  name: 'Gerätturnen K3',
  number: '1',
  round: 1,
  startTime: '09:00',
  startDate: '2026-03-24',
  warmupTime: null,
  warmupDate: null,
  disciplineCount: 2,
  participantCount: 0,
  int_bahn: null,
};

const makeSquad = (name: string, participantCount = 4, competitionIds = [1]) => ({
  name,
  participantCount,
  competitions: [],
  competitionIds,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCalculateDeviceSchedule – calculateDeviceSchedule', () => {
  describe('empty / no-op cases', () => {
    it('returns empty array when sessionGroup has no startTime', () => {
      const calc = makeHook();
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: null, startDate: null, squads: [] });
      expect(result).toEqual([]);
    });

    it('returns empty array when there are no squads', () => {
      const calc = makeHook();
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [] });
      expect(result).toEqual([]);
    });

    it('returns empty when no squad is assigned to the competition', () => {
      const calc = makeHook();
      const unassignedSquad = makeSquad('A', 4, [999]); // different competitionId
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [unassignedSquad] });
      expect(result).toEqual([]);
    });
  });

  describe('fallback to generic device names', () => {
    it('uses "Device N" names when no disciplineCache or squadDisciplines', () => {
      const calc = makeHook();
      const squad = makeSquad('Alpha', 2);
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [squad] });
      const deviceNames = [...new Set(result.map(e => e.deviceName))];
      expect(deviceNames.every(n => n.startsWith('Device'))).toBe(true);
    });

    it('generates one entry per device for the squad', () => {
      const calc = makeHook();
      const squad = makeSquad('Alpha', 2);
      const result = calc({
        session: 1,
        competitions: [{ ...BASE_COMPETITION, disciplineCount: 3 }],
        startTime: '09:00',
        startDate: null,
        squads: [squad],
      });
      expect(result.filter(e => !e.isWarmup)).toHaveLength(3);
    });
  });

  describe('schedules from disciplineCache', () => {
    it('uses cached discipline names', () => {
      const cache = {
        1: [
          { var_name: 'Boden', var_reihenfolge: 1 },
          { var_name: 'Barren', var_reihenfolge: 2 },
        ],
      };
      const calc = makeHook([], cache);
      const squad = makeSquad('Omega', 3);
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [squad] });
      const names = result.filter(e => !e.isWarmup).map(e => e.deviceName);
      expect(names).toContain('Boden');
      expect(names).toContain('Barren');
    });
  });

  describe('schedules from squadDisciplines (preferred path)', () => {
    it('prefers squadDisciplines over disciplineCache', () => {
      const squadDisciplines = [
        { tfx_wettkaempfeid: 1, bol_erstes_geraet: true,  tfx_disziplinen: { var_name: 'Reck',  var_reihenfolge: 1 } },
        { tfx_wettkaempfeid: 1, bol_erstes_geraet: false, tfx_disziplinen: { var_name: 'Boden', var_reihenfolge: 2 } },
      ];
      const cache = { 1: [{ var_name: 'ShouldNotAppear', var_reihenfolge: 1 }] };
      const calc = makeHook(squadDisciplines, cache);
      const squad = makeSquad('Gamma', 2);
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [squad] });
      const names = result.filter(e => !e.isWarmup).map(e => e.deviceName);
      expect(names).not.toContain('ShouldNotAppear');
      expect(names).toContain('Reck');
      expect(names).toContain('Boden');
    });
  });

  describe('warm-up entries', () => {
    it('adds a warm-up entry when warmupTime is set on competition', () => {
      const calc = makeHook();
      const compWithWarmup = { ...BASE_COMPETITION, warmupTime: '08:45' };
      const squad = makeSquad('Beta', 2);
      const result = calc({ session: 1, competitions: [compWithWarmup], startTime: '09:00', startDate: null, squads: [squad] });
      const warmups = result.filter(e => e.isWarmup);
      expect(warmups).toHaveLength(1);
      expect(warmups[0].deviceName).toBe('Warm-up Area');
      expect(warmups[0].startTime).toBe('08:45');
    });

    it('calculates warm-up end time from warmupDurationMinutes', () => {
      const settings: TimeSettings = { ...DEFAULT_SETTINGS, warmupDurationMinutes: 15 };
      const calc = makeHook([], {}, settings);
      const compWithWarmup = { ...BASE_COMPETITION, warmupTime: '08:45' };
      const squad = makeSquad('Beta', 2);
      const result = calc({ session: 1, competitions: [compWithWarmup], startTime: '09:00', startDate: null, squads: [squad] });
      const warmup = result.find(e => e.isWarmup)!;
      expect(warmup.endTime).toBe('09:00');
    });

    it('does not duplicate warm-up for the same squad/time', () => {
      const calc = makeHook();
      const compWithWarmup = { ...BASE_COMPETITION, warmupTime: '08:45' };
      const squad = makeSquad('Beta', 2);
      // Two competitions both sharing the same squad — warm-up should appear only once
      const session: SessionGroup = {
        session: 1,
        competitions: [compWithWarmup, { ...BASE_COMPETITION, id: 2, name: 'K4', warmupTime: null }],
        startTime: '09:00',
        startDate: null,
        squads: [{ ...squad, competitionIds: [1, 2] }],
      };
      const result = calc(session);
      expect(result.filter(e => e.isWarmup)).toHaveLength(1);
    });
  });

  describe('timing correctness', () => {
    it('start/end times are set correctly for each rotation slot', () => {
      const settings: TimeSettings = { exerciseDurationMinutes: 5, breakBetweenDevicesMinutes: 0, warmupDurationMinutes: 10, rotationIntervalMinutes: 5 };
      const cache = { 1: [{ var_name: 'A', var_reihenfolge: 1 }, { var_name: 'B', var_reihenfolge: 2 }] };
      const calc = makeHook([], cache, settings);
      const squad = makeSquad('Delta', 1); // 1 participant → 5 min per device
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [squad] });
      const entries = result.filter(e => !e.isWarmup).sort((a, b) => a.startTime.localeCompare(b.startTime));
      expect(entries[0].startTime).toBe('09:00');
      expect(entries[0].endTime).toBe('09:05');
      expect(entries[1].startTime).toBe('09:05');
      expect(entries[1].endTime).toBe('09:10');
    });

    it('result is sorted by startTime ascending', () => {
      const cache = { 1: [{ var_name: 'A', var_reihenfolge: 1 }, { var_name: 'B', var_reihenfolge: 2 }] };
      const calc = makeHook([], cache);
      const squad = makeSquad('Epsilon', 2);
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [squad] });
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startTime >= result[i - 1].startTime).toBe(true);
      }
    });
  });

  describe('multiple squads', () => {
    it('distributes two squads across devices so they start on different devices', () => {
      // Use squadDisciplines with bol_erstes_geraet=false so that startDeviceIndex=-1
      // and the fallback (squadIndex % numDevices) distributes squads.
      const squadDisciplines = [
        { tfx_wettkaempfeid: 1, bol_erstes_geraet: false, tfx_disziplinen: { var_name: 'Boden', var_reihenfolge: 1 } },
        { tfx_wettkaempfeid: 1, bol_erstes_geraet: false, tfx_disziplinen: { var_name: 'Barren', var_reihenfolge: 2 } },
      ];
      const calc = makeHook(squadDisciplines, {});
      const squadA = makeSquad('SquadA', 1);
      const squadB = makeSquad('SquadB', 1);
      const result = calc({ session: 1, competitions: [BASE_COMPETITION], startTime: '09:00', startDate: null, squads: [squadA, squadB] });
      const aStart = result.find(e => e.squadName === 'SquadA' && e.startTime === '09:00');
      const bStart = result.find(e => e.squadName === 'SquadB' && e.startTime === '09:00');
      // Both squads start at 09:00 but on different devices
      expect(aStart).toBeDefined();
      expect(bStart).toBeDefined();
      expect(aStart!.deviceName).not.toBe(bStart!.deviceName);
    });
  });
});
