/**
 * Tests for useTimePlanningData – groupCompetitionsBySessions logic
 *
 * We cannot easily test the async loadData function without a full MSW setup,
 * so we focus on the grouping logic which is the most complex pure transformation.
 * We expose it by rendering the hook with a stubbed eventId and inspecting the
 * groupCompetitionsBySessions function directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTimePlanningData } from '../hooks/useTimePlanningData';

// ---------------------------------------------------------------------------
// Mock apiGet so the hook never makes real network calls
// ---------------------------------------------------------------------------
vi.mock('@/utils/api', () => ({
  apiGet: vi.fn().mockResolvedValue({ competitions: [], squads: [], squadDisciplines: [] }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeComp = (id: number, round: number, startTime: string | null = null) => ({
  id,
  name: `Comp ${id}`,
  number: String(id),
  round,
  startTime,
  startDate: null,
  warmupTime: null,
  warmupDate: null,
  disciplineCount: 1,
  participantCount: 0,
  int_bahn: null,
});

const makeSquad = (name: string, competitionIds: number[]) => ({
  name,
  participantCount: 4,
  competitions: [],
  competitionIds,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTimePlanningData – groupCompetitionsBySessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('groups competitions by round', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.groupCompetitionsBySessions(
        [makeComp(1, 1), makeComp(2, 1), makeComp(3, 2)],
        []
      );
    });

    const groups = result.current.sessionGroups;
    expect(groups).toHaveLength(2);
    expect(groups.find(g => g.session === 1)?.competitions).toHaveLength(2);
    expect(groups.find(g => g.session === 2)?.competitions).toHaveLength(1);
  });

  it('sorts groups by session number ascending', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.groupCompetitionsBySessions(
        [makeComp(3, 3), makeComp(1, 1), makeComp(2, 2)],
        []
      );
    });

    expect(result.current.sessionGroups.map(g => g.session)).toEqual([1, 2, 3]);
  });

  it('assigns the earliest startTime from competitions in the group', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.groupCompetitionsBySessions(
        [makeComp(1, 1, '10:00'), makeComp(2, 1, '09:00'), makeComp(3, 1, '11:00')],
        []
      );
    });

    expect(result.current.sessionGroups[0].startTime).toBe('09:00');
  });

  it('handles competitions with no startTime (startTime is null)', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.groupCompetitionsBySessions([makeComp(1, 1, null)], []);
    });

    expect(result.current.sessionGroups[0].startTime).toBeNull();
  });

  it('adds extra rounds as empty groups', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.groupCompetitionsBySessions([makeComp(1, 1)], [], [2, 3]);
    });

    const sessions = result.current.sessionGroups.map(g => g.session);
    expect(sessions).toContain(2);
    expect(sessions).toContain(3);
    expect(result.current.sessionGroups.find(g => g.session === 2)?.competitions).toHaveLength(0);
  });

  it('assigns squads to sessions based on competitionIds', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const squads = [
      makeSquad('A', [1]),   // belongs to session 1
      makeSquad('B', [3]),   // belongs to session 2
      makeSquad('C', [1, 3]), // belongs to both
    ];

    act(() => {
      result.current.groupCompetitionsBySessions(
        [makeComp(1, 1), makeComp(3, 2)],
        squads
      );
    });

    const session1 = result.current.sessionGroups.find(g => g.session === 1)!;
    const session2 = result.current.sessionGroups.find(g => g.session === 2)!;
    expect(session1.squads.map(s => s.name)).toContain('A');
    expect(session1.squads.map(s => s.name)).toContain('C');
    expect(session2.squads.map(s => s.name)).toContain('B');
    expect(session2.squads.map(s => s.name)).toContain('C');
  });

  it('does not assign squad to a session where its competition is absent', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const squads = [makeSquad('X', [999])]; // No competition 999 in any session

    act(() => {
      result.current.groupCompetitionsBySessions([makeComp(1, 1)], squads);
    });

    expect(result.current.sessionGroups[0].squads).toHaveLength(0);
  });

  it('competitions with round=0 fall back to session 1', async () => {
    const { result } = renderHook(() => useTimePlanningData({ eventId: '1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.groupCompetitionsBySessions([{ ...makeComp(1, 0) }], []);
    });

    expect(result.current.sessionGroups[0].session).toBe(1);
  });
});
