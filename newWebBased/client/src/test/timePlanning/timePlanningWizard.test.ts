/**
 * Client-side tests — Time Planning Wizard
 *
 * Tests for:
 *  - Round-robin generation logic (client-side pure functions mirroring server)
 *  - useTimePlanningWizard hook state transitions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimePlanningWizard } from '../../pages/TimePlanning/hooks/useTimePlanningWizard';
import type { Competition, TimeSettings } from '../../pages/TimePlanning/TimePlanning.types';
import { DEFAULT_TIME_SETTINGS } from '../../pages/TimePlanning/TimePlanning.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Client-side round-robin helper — mirrors the server implementation.
 * Defined here so we can unit-test the algorithm itself independently of
 * the network layer.
 */
function generateRoundRobinMatrix(
  squads: string[],
  disciplineIds: number[],
  startAssignments: Record<string, number>,
  startRound = 1,
) {
  if (squads.length === 0 || disciplineIds.length === 0) return [];
  const cells: { squadName: string; disciplineId: number; round: number; isFirstDevice: boolean }[] = [];
  squads.forEach((squadName, squadIdx) => {
    const assignedDiscId = startAssignments[squadName];
    const assignedIdx = assignedDiscId !== undefined ? disciplineIds.indexOf(assignedDiscId) : -1;
    const startIdx = assignedIdx >= 0 ? assignedIdx : squadIdx % disciplineIds.length;
    for (let r = 0; r < disciplineIds.length; r++) {
      const discIdx = (startIdx + r) % disciplineIds.length;
      cells.push({
        squadName,
        disciplineId: disciplineIds[discIdx],
        round: startRound + r,
        isFirstDevice: r === 0,
      });
    }
  });
  return cells;
}

// ── Round-robin algorithm tests ───────────────────────────────────────────────

describe('generateRoundRobin (client-side)', () => {
  it('returns empty array for zero squads', () => {
    expect(generateRoundRobinMatrix([], [1, 2, 3], {})).toEqual([]);
  });

  it('returns empty array for zero disciplines', () => {
    expect(generateRoundRobinMatrix(['A', 'B'], [], {})).toEqual([]);
  });

  it('3 squads × 3 disciplines — 9 cells, correct rotation', () => {
    const cells = generateRoundRobinMatrix(
      ['A', 'B', 'C'],
      [10, 20, 30],
      { A: 10, B: 20, C: 30 },
    );
    expect(cells).toHaveLength(9);

    // Round 1 — each squad at starting device
    expect(cells.find(c => c.squadName === 'A' && c.round === 1)?.disciplineId).toBe(10);
    expect(cells.find(c => c.squadName === 'B' && c.round === 1)?.disciplineId).toBe(20);
    expect(cells.find(c => c.squadName === 'C' && c.round === 1)?.disciplineId).toBe(30);

    // Round 3 — wrap-around
    expect(cells.find(c => c.squadName === 'A' && c.round === 3)?.disciplineId).toBe(30);
    expect(cells.find(c => c.squadName === 'B' && c.round === 3)?.disciplineId).toBe(10);
    expect(cells.find(c => c.squadName === 'C' && c.round === 3)?.disciplineId).toBe(20);
  });

  it('3 squads × 4 disciplines — 12 cells total', () => {
    const cells = generateRoundRobinMatrix(
      ['P', 'Q', 'R'],
      [1, 2, 3, 4],
      { P: 1, Q: 2, R: 3 },
    );
    expect(cells).toHaveLength(12);
    expect(cells.every(c => c.round >= 1 && c.round <= 4)).toBe(true);
  });

  it('startRound offset is respected', () => {
    const cells = generateRoundRobinMatrix(['X', 'Y'], [5, 6], { X: 5, Y: 6 }, 10);
    expect(cells.every(c => c.round >= 10)).toBe(true);
    expect(Math.max(...cells.map(c => c.round))).toBe(11);
  });

  it('isFirstDevice is true only at round = startRound for each squad', () => {
    const cells = generateRoundRobinMatrix(['A', 'B'], [1, 2], {}, 3);
    const firstDeviceCells = cells.filter(c => c.isFirstDevice);
    expect(firstDeviceCells).toHaveLength(2); // one per squad
    firstDeviceCells.forEach(c => expect(c.round).toBe(3));
  });

  it('auto-assigns default start index when squad not in startAssignments', () => {
    // Squad index 0 → discIds[0], index 1 → discIds[1]
    const cells = generateRoundRobinMatrix(['M', 'N'], [100, 200], {});
    const mRound1 = cells.find(c => c.squadName === 'M' && c.isFirstDevice);
    const nRound1 = cells.find(c => c.squadName === 'N' && c.isFirstDevice);
    expect(mRound1?.disciplineId).toBe(100);
    expect(nRound1?.disciplineId).toBe(200);
  });
});

// ── Wizard hook tests ─────────────────────────────────────────────────────────

const mockCompetitions: Competition[] = [
  { id: 1, name: 'Gerätvierkampf männlich', number: 'WK01', round: 1, int_bahn: 1, startTime: null, startDate: null, warmupTime: null, warmupDate: null, disciplineCount: 3, participantCount: 10 },
  { id: 2, name: 'Gerätvierkampf weiblich', number: 'WK02', round: 2, int_bahn: 1, startTime: null, startDate: null, warmupTime: null, warmupDate: null, disciplineCount: 4, participantCount: 8 },
];

const mockTimeSettings: TimeSettings = { ...DEFAULT_TIME_SETTINGS };

// Mock API utilities — prevent real network calls
vi.mock('@/utils/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ durchgaenge: [] }),
  apiPost: vi.fn().mockResolvedValue({ success: true, totalCells: 6, durchgaengeCount: 1, message: 'OK' }),
  apiPut: vi.fn().mockResolvedValue({}),
  invalidateCache: vi.fn(),
}));

describe('useTimePlanningWizard', () => {
  const onRefetch = vi.fn();
  const onClose = vi.fn();
  const setTimeSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeWrapper() {
    return renderHook(() =>
      useTimePlanningWizard({
        eventId: '42',
        competitions: mockCompetitions,
        timeSettings: mockTimeSettings,
        setTimeSettings,
        onRefetch,
        onClose,
      }),
    );
  }

  it('starts on startTime step', () => {
    const { result } = makeWrapper();
    expect(result.current.currentStep).toBe('startTime');
  });

  it('isFirstStep is true on the first step', () => {
    const { result } = makeWrapper();
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);
  });

  it('goNext advances to timing step', async () => {
    const { result } = makeWrapper();
    await act(async () => {
      await result.current.goNext();
    });
    expect(result.current.currentStep).toBe('timing');
  });

  it('goBack does nothing on the first step', () => {
    const { result } = makeWrapper();
    act(() => {
      result.current.goBack();
    });
    expect(result.current.currentStep).toBe('startTime');
  });

  it('goBack returns to previous step', async () => {
    const { result } = makeWrapper();
    await act(async () => {
      await result.current.goNext(); // → timing
    });
    act(() => {
      result.current.goBack(); // → startTime
    });
    expect(result.current.currentStep).toBe('startTime');
  });

  it('setCompetitionRound updates pendingRounds', () => {
    const { result } = makeWrapper();
    expect(result.current.pendingRounds[1]).toBe(1);
    act(() => {
      result.current.setCompetitionRound(1, 3);
    });
    expect(result.current.pendingRounds[1]).toBe(3);
  });

  it('setCompetitionBahn updates pendingBahnen', () => {
    const { result } = makeWrapper();
    act(() => {
      result.current.setCompetitionBahn(2, 4);
    });
    expect(result.current.pendingBahnen[2]).toBe(4);
  });

  it('setSessionLabel updates session labels', () => {
    const { result } = makeWrapper();
    act(() => {
      result.current.setSessionLabel(1, 'Vormittag');
    });
    expect(result.current.sessionLabels[1]).toBe('Vormittag');
  });

  it('setBahnLabel updates bahn labels', () => {
    const { result } = makeWrapper();
    act(() => {
      result.current.setBahnLabel(2, 'Boden 2');
    });
    expect(result.current.bahnLabels[2]).toBe('Boden 2');
  });

  it('setStartTime updates startTime', () => {
    const { result } = makeWrapper();
    act(() => {
      result.current.setStartTime('09:30');
    });
    expect(result.current.startTime).toBe('09:30');
  });

  it('reset returns to startTime step', async () => {
    const { result } = makeWrapper();
    await act(async () => {
      await result.current.goNext(); // → timing
      await result.current.goNext(); // → rounds
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.currentStep).toBe('startTime');
  });

  it('maxRound derives from pendingRounds', () => {
    const { result } = makeWrapper();
    // Initially competitions have rounds 1 and 2 → maxRound = 2
    expect(result.current.maxRound).toBe(2);
    act(() => {
      result.current.setCompetitionRound(1, 5);
    });
    expect(result.current.maxRound).toBe(5);
  });
});
