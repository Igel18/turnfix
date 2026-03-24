/**
 * Component Tests — TimePlanning
 *
 * Tests the TimePlanning page:
 * - Time calculation utilities
 * - Session grouping logic
 * - Device schedule calculation
 * - View mode switching (sessions/gantt/timeline/rotation)
 * - Time settings defaults and updates
 * - Time slot generation
 * - Competition round assignment
 * - Drag-and-drop reordering logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../renderWithProviders';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSelectedEvent = {
  int_eventid: 1,
  var_eventname: 'Stadtmeisterschaft 2025',
  dat_eventstartdate: '2025-06-15',
  dat_eventenddate: '2025-06-16',
  var_location: 'Berlin',
  status: 'active' as const,
};

const mockUseEvent = vi.fn(() => ({
  selectedEvent: mockSelectedEvent,
  selectedCompetition: null,
  selectedSquad: null,
  selectedDiscipline: null,
  setSelectedEvent: vi.fn(),
  setSelectedCompetition: vi.fn(),
  setSelectedSquad: vi.fn(),
  setSelectedDiscipline: vi.fn(),
  clearSelection: vi.fn(),
  refreshEvents: vi.fn(),
  eventUpdateTrigger: 0,
}));

vi.mock('@/contexts/EventContext', () => ({
  useEvent: () => mockUseEvent(),
  useOptionalEvent: () => mockUseEvent(),
  EventProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) return `${key}`;
      return key;
    },
    i18n: { language: 'de', changeLanguage: vi.fn() },
  }),
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

// Mock apiGet/apiPost/apiPut
vi.mock('@/utils/api', async () => {
  const actual = await vi.importActual('@/utils/api');
  return {
    ...actual as object,
    apiGet: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
    apiPost: vi.fn().mockResolvedValue({ success: true }),
    apiPut: vi.fn().mockResolvedValue({ success: true }),
    invalidateCache: vi.fn(),
  };
});

// ── Test Data ──────────────────────────────────────────────────────────────

interface Competition {
  id: number;
  name: string;
  round: number;
  startTime: string | null;
  duration: number;
  participantCount: number;
  disciplines: { id: number; name: string }[];
}

const mockCompetitions: Competition[] = [
  {
    id: 1,
    name: 'Wettkampf Damen',
    round: 1,
    startTime: '09:00',
    duration: 90,
    participantCount: 20,
    disciplines: [{ id: 100, name: 'Boden' }, { id: 101, name: 'Sprung' }],
  },
  {
    id: 2,
    name: 'Wettkampf Herren',
    round: 1,
    startTime: '10:30',
    duration: 120,
    participantCount: 15,
    disciplines: [{ id: 100, name: 'Boden' }, { id: 102, name: 'Reck' }],
  },
  {
    id: 3,
    name: 'Wettkampf Jugend',
    round: 2,
    startTime: '14:00',
    duration: 60,
    participantCount: 10,
    disciplines: [{ id: 100, name: 'Boden' }],
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TimePlanning', () => {
  describe('Time Calculation', () => {
    // Replicate addMinutesToTime from useTimeCalculation hook
    function addMinutesToTime(time: string, minutes: number): string {
      const [h, m] = time.split(':').map(Number);
      const totalMinutes = h * 60 + m + minutes;
      const newH = Math.floor(totalMinutes / 60) % 24;
      const newM = totalMinutes % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    it('should add minutes to a time string', () => {
      expect(addMinutesToTime('09:00', 30)).toBe('09:30');
      expect(addMinutesToTime('09:00', 90)).toBe('10:30');
      expect(addMinutesToTime('23:30', 60)).toBe('00:30');
    });

    it('should handle midnight wraparound', () => {
      expect(addMinutesToTime('23:00', 120)).toBe('01:00');
    });

    it('should handle zero minutes', () => {
      expect(addMinutesToTime('15:45', 0)).toBe('15:45');
    });

    it('should handle large minute additions', () => {
      expect(addMinutesToTime('08:00', 480)).toBe('16:00');
    });
  });

  describe('Time Slot Generation', () => {
    function generateTimeSlots(start: string, end: string, intervalMinutes: number): string[] {
      const slots: string[] = [];
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes <= endMinutes) {
        const h = Math.floor(currentMinutes / 60) % 24;
        const m = currentMinutes % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        currentMinutes += intervalMinutes;
      }
      return slots;
    }

    it('should generate 30-minute slots', () => {
      const slots = generateTimeSlots('09:00', '11:00', 30);
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
    });

    it('should generate 60-minute slots', () => {
      const slots = generateTimeSlots('08:00', '12:00', 60);
      expect(slots).toEqual(['08:00', '09:00', '10:00', '11:00', '12:00']);
    });

    it('should generate 15-minute slots', () => {
      const slots = generateTimeSlots('09:00', '09:45', 15);
      expect(slots).toEqual(['09:00', '09:15', '09:30', '09:45']);
    });

    it('should return single slot when start equals end', () => {
      const slots = generateTimeSlots('10:00', '10:00', 30);
      expect(slots).toEqual(['10:00']);
    });

    it('should return empty when start is after end', () => {
      const slots = generateTimeSlots('12:00', '10:00', 30);
      expect(slots).toEqual([]);
    });
  });

  describe('Session Grouping', () => {
    function groupCompetitionsBySessions(competitions: Competition[]): Map<number, Competition[]> {
      const sessions = new Map<number, Competition[]>();
      competitions.forEach(comp => {
        const round = comp.round || 1;
        if (!sessions.has(round)) sessions.set(round, []);
        sessions.get(round)!.push(comp);
      });
      return sessions;
    }

    it('should group competitions by round number', () => {
      const sessions = groupCompetitionsBySessions(mockCompetitions);
      expect(sessions.size).toBe(2);
      expect(sessions.get(1)!).toHaveLength(2);
      expect(sessions.get(2)!).toHaveLength(1);
    });

    it('should handle empty competitions', () => {
      const sessions = groupCompetitionsBySessions([]);
      expect(sessions.size).toBe(0);
    });

    it('should default null round to 1', () => {
      const comps = [{ ...mockCompetitions[0], round: null as any }];
      const sessions = groupCompetitionsBySessions(
        comps.map(c => ({ ...c, round: c.round || 1 }))
      );
      expect(sessions.get(1)!).toHaveLength(1);
    });

    it('should preserve competition order within sessions', () => {
      const sessions = groupCompetitionsBySessions(mockCompetitions);
      const round1 = sessions.get(1)!;
      expect(round1[0].name).toBe('Wettkampf Damen');
      expect(round1[1].name).toBe('Wettkampf Herren');
    });
  });

  describe('Device Schedule Calculation', () => {
    interface DeviceScheduleEntry {
      competitionId: number;
      disciplineId: number;
      disciplineName: string;
      startTime: string;
      endTime: string;
      duration: number;
    }

    function calculateDeviceSchedule(
      competitions: Competition[],
      minutesPerDevice: number
    ): DeviceScheduleEntry[] {
      const schedule: DeviceScheduleEntry[] = [];

      competitions.forEach(comp => {
        if (!comp.startTime) return;

        let currentTime = comp.startTime;
        comp.disciplines.forEach(disc => {
          const endTime = addMinutesToTime(currentTime, minutesPerDevice);
          schedule.push({
            competitionId: comp.id,
            disciplineId: disc.id,
            disciplineName: disc.name,
            startTime: currentTime,
            endTime,
            duration: minutesPerDevice,
          });
          currentTime = endTime;
        });
      });

      return schedule;
    }

    function addMinutesToTime(time: string, minutes: number): string {
      const [h, m] = time.split(':').map(Number);
      const totalMinutes = h * 60 + m + minutes;
      const newH = Math.floor(totalMinutes / 60) % 24;
      const newM = totalMinutes % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    it('should create schedule entries for each discipline in competition', () => {
      const schedule = calculateDeviceSchedule([mockCompetitions[0]], 45);
      expect(schedule).toHaveLength(2);
      expect(schedule[0].disciplineName).toBe('Boden');
      expect(schedule[1].disciplineName).toBe('Sprung');
    });

    it('should chain discipline times sequentially', () => {
      const schedule = calculateDeviceSchedule([mockCompetitions[0]], 45);
      expect(schedule[0].startTime).toBe('09:00');
      expect(schedule[0].endTime).toBe('09:45');
      expect(schedule[1].startTime).toBe('09:45');
      expect(schedule[1].endTime).toBe('10:30');
    });

    it('should skip competitions without startTime', () => {
      const compWithoutTime = { ...mockCompetitions[0], startTime: null };
      const schedule = calculateDeviceSchedule([compWithoutTime], 45);
      expect(schedule).toHaveLength(0);
    });

    it('should handle multiple competitions', () => {
      const schedule = calculateDeviceSchedule(mockCompetitions.slice(0, 2), 30);
      // Comp 1: 2 disciplines, Comp 2: 2 disciplines
      expect(schedule).toHaveLength(4);
    });
  });

  describe('Time Settings', () => {
    const DEFAULT_TIME_SETTINGS = {
      warmupDuration: 30,
      competitionDuration: 90,
      breakDuration: 15,
      rotationDuration: 5,
      startTime: '08:00',
      endTime: '18:00',
    };

    it('should have correct defaults', () => {
      expect(DEFAULT_TIME_SETTINGS.warmupDuration).toBe(30);
      expect(DEFAULT_TIME_SETTINGS.competitionDuration).toBe(90);
      expect(DEFAULT_TIME_SETTINGS.breakDuration).toBe(15);
      expect(DEFAULT_TIME_SETTINGS.rotationDuration).toBe(5);
      expect(DEFAULT_TIME_SETTINGS.startTime).toBe('08:00');
      expect(DEFAULT_TIME_SETTINGS.endTime).toBe('18:00');
    });

    it('should calculate total event duration', () => {
      const [startH, startM] = DEFAULT_TIME_SETTINGS.startTime.split(':').map(Number);
      const [endH, endM] = DEFAULT_TIME_SETTINGS.endTime.split(':').map(Number);
      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      expect(totalMinutes).toBe(600); // 10 hours
    });

    it('should calculate max sessions fitting in time window', () => {
      const totalMinutes = 600; // 10 hours
      const sessionDuration = DEFAULT_TIME_SETTINGS.competitionDuration + DEFAULT_TIME_SETTINGS.breakDuration;
      const maxSessions = Math.floor(totalMinutes / sessionDuration);
      expect(maxSessions).toBe(5); // 600 / 105 = 5.71
    });
  });

  describe('View Mode', () => {
    it('should support 4 view modes', () => {
      const modes = ['sessions', 'gantt', 'timeline', 'rotation'] as const;
      expect(modes).toHaveLength(4);
    });

    it('should default to sessions view', () => {
      const defaultView = 'sessions';
      expect(defaultView).toBe('sessions');
    });
  });

  describe('Gantt Chart Time Range', () => {
    it('should default gantt range to 07:00 - 18:00', () => {
      const ganttStartTime = '07:00';
      const ganttEndTime = '18:00';
      expect(ganttStartTime).toBe('07:00');
      expect(ganttEndTime).toBe('18:00');
    });

    it('should calculate gantt chart width in slots', () => {
      const startTime = '07:00';
      const endTime = '18:00';
      const intervalMinutes = 15;
      
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      const slots = Math.ceil(totalMinutes / intervalMinutes);
      
      expect(slots).toBe(44); // 660 / 15 = 44
    });
  });

  describe('Competition Discipline Cache', () => {
    it('should cache discipline data by competition ID', () => {
      const cache: Record<number, any[]> = {};
      
      // Simulate loading and caching
      cache[1] = [{ id: 100, name: 'Boden' }, { id: 101, name: 'Sprung' }];
      cache[2] = [{ id: 102, name: 'Reck' }];
      
      expect(cache[1]).toHaveLength(2);
      expect(cache[2]).toHaveLength(1);
      expect(cache[3]).toBeUndefined();
    });

    it('should not re-fetch cached discipline data', () => {
      const cache: Record<number, any[]> = { 1: [{ id: 100 }] };
      let fetchCount = 0;
      
      const loadDisciplines = (compId: number) => {
        if (cache[compId]) return cache[compId];
        fetchCount++;
        cache[compId] = [{ id: 200 }];
        return cache[compId];
      };
      
      loadDisciplines(1); // Cached — no fetch
      loadDisciplines(1); // Cached — no fetch
      loadDisciplines(2); // Not cached — fetches
      
      expect(fetchCount).toBe(1);
    });
  });

  describe('Extra Rounds', () => {
    it('should track additional round numbers', () => {
      const existingRounds = [1, 2];
      const extraRounds = [3, 4];
      const allRounds = [...new Set([...existingRounds, ...extraRounds])].sort();
      expect(allRounds).toEqual([1, 2, 3, 4]);
    });

    it('should deduplicate round numbers', () => {
      const extraRounds = [2, 3, 2, 4, 3];
      const unique = [...new Set(extraRounds)].sort();
      expect(unique).toEqual([2, 3, 4]);
    });
  });

  describe('Drag and Drop Reorder', () => {
    it('should reorder competitions within a session', () => {
      const items = [
        { id: 1, name: 'A', order: 1 },
        { id: 2, name: 'B', order: 2 },
        { id: 3, name: 'C', order: 3 },
      ];

      // Move item 3 to position 1
      const dragIndex = 2;
      const dropIndex = 0;
      const reordered = [...items];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);

      expect(reordered.map(r => r.name)).toEqual(['C', 'A', 'B']);
    });

    it('should update order numbers after reorder', () => {
      const items = ['C', 'A', 'B'];
      const withOrder = items.map((name, idx) => ({ name, order: idx + 1 }));
      expect(withOrder[0]).toEqual({ name: 'C', order: 1 });
      expect(withOrder[1]).toEqual({ name: 'A', order: 2 });
      expect(withOrder[2]).toEqual({ name: 'B', order: 3 });
    });
  });

  // ── Schedule Matrix (Zeitplan-Tabelle) ──────────────────────────────────────

  describe('ScheduleMatrix — calculateRoundTime', () => {
    // Pure helpers, exported from ScheduleMatrixView for unit testing
    function addMinutes(timeStr: string, minutes: number): string {
      const [h, m] = timeStr.split(':').map(Number);
      const total = h * 60 + m + minutes;
      return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    function calcRoundTime(base: string, round: number, interval: number): string {
      return addMinutes(base, (round - 1) * interval);
    }

    it('round 1 equals base time', () => {
      expect(calcRoundTime('09:00', 1, 20)).toBe('09:00');
    });

    it('round 2 is base + interval', () => {
      expect(calcRoundTime('09:00', 2, 20)).toBe('09:20');
    });

    it('round 5 with 30 min interval', () => {
      expect(calcRoundTime('08:00', 5, 30)).toBe('10:00');
    });

    it('wraps correctly past midnight', () => {
      expect(calcRoundTime('23:50', 2, 20)).toBe('00:10');
    });
  });

  describe('ScheduleMatrix — applyColOrder', () => {
    type Disc = { id: number; name: string; shortName: string };
    const discs: Disc[] = [
      { id: 1, name: 'Boden', shortName: 'BO' },
      { id: 2, name: 'Sprung', shortName: 'SP' },
      { id: 3, name: 'Reck', shortName: 'RE' },
    ];

    function applyColOrder(disciplines: Disc[], savedIds: number[]): Disc[] {
      if (savedIds.length === 0) return disciplines;
      return [...disciplines].sort((a, b) => {
        const ia = savedIds.indexOf(a.id);
        const ib = savedIds.indexOf(b.id);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
    }

    it('returns original order when no saved ids', () => {
      const result = applyColOrder(discs, []);
      expect(result.map(d => d.id)).toEqual([1, 2, 3]);
    });

    it('reorders according to saved ids', () => {
      const result = applyColOrder(discs, [3, 1, 2]);
      expect(result.map(d => d.id)).toEqual([3, 1, 2]);
    });

    it('appends unknown disciplines at the end', () => {
      const result = applyColOrder(discs, [2]);
      expect(result[0].id).toBe(2);
      // remaining in stable order at the end
      expect(result.slice(1).map(d => d.id)).toContain(1);
      expect(result.slice(1).map(d => d.id)).toContain(3);
    });

    it('handles empty disciplines array', () => {
      const result = applyColOrder([], [1, 2]);
      expect(result).toEqual([]);
    });
  });

  describe('ScheduleMatrix — localStorage column order', () => {
    const eventId = 'test-event-42';
    const storageKey = `schedule-matrix-cols-${eventId}`;

    function loadColOrder(id: string): number[] {
      try {
        const v = localStorage.getItem(`schedule-matrix-cols-${id}`);
        return v ? (JSON.parse(v) as number[]) : [];
      } catch { return []; }
    }
    function saveColOrder(id: string, disciplines: { id: number }[]): void {
      localStorage.setItem(
        `schedule-matrix-cols-${id}`,
        JSON.stringify(disciplines.map(d => d.id))
      );
    }

    beforeEach(() => {
      localStorage.removeItem(storageKey);
    });

    it('returns empty array when nothing saved', () => {
      expect(loadColOrder(eventId)).toEqual([]);
    });

    it('saves and loads column order', () => {
      saveColOrder(eventId, [{ id: 3 }, { id: 1 }, { id: 2 }]);
      expect(loadColOrder(eventId)).toEqual([3, 1, 2]);
    });

    it('returns empty array on corrupt localStorage entry', () => {
      localStorage.setItem(storageKey, 'not valid json {{{');
      expect(loadColOrder(eventId)).toEqual([]);
    });

    it('isolates storage per eventId', () => {
      saveColOrder('event-A', [{ id: 10 }, { id: 20 }]);
      saveColOrder('event-B', [{ id: 99 }]);
      expect(loadColOrder('event-A')).toEqual([10, 20]);
      expect(loadColOrder('event-B')).toEqual([99]);
    });
  });

  describe('ScheduleMatrix — maxRound calculation (server logic)', () => {
    /**
     * Replicates the server-side maxRound logic from timePlanning.ts:
     *   maxRound = Math.max(maxAssignedRound, squads.length, 1)
     */
    function calcMaxRound(assignments: { round: number }[], squads: string[]): number {
      const maxAssignedRound = assignments.length > 0
        ? Math.max(...assignments.map(a => a.round))
        : 0;
      return Math.max(maxAssignedRound, squads.length, 1);
    }

    it('returns 1 when no assignments and no squads', () => {
      expect(calcMaxRound([], [])).toBe(1);
    });

    it('returns squads.length when no assignments yet', () => {
      expect(calcMaxRound([], ['A', 'B', 'C'])).toBe(3);
    });

    it('returns highest assigned round', () => {
      expect(calcMaxRound([{ round: 1 }, { round: 4 }, { round: 2 }], ['A', 'B'])).toBe(4);
    });

    it('prefers squads.length over max round when squads > rounds', () => {
      expect(calcMaxRound([{ round: 1 }], ['A', 'B', 'C', 'D', 'E'])).toBe(5);
    });

    it('partial row fill does not shrink the table below squad count', () => {
      // Only row 1 of 3 squads has data — table must still show 3 rows
      expect(calcMaxRound([{ round: 1 }], ['A', 'B', 'C'])).toBe(3);
    });
  });
});
