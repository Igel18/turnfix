/**
 * Competition Filter / Participant-Competition Display Tests
 *
 * Verifies the following behaviour:
 *   1. Participants can be filtered by competition in the event-participants page
 *      (client-side filter on assignedCompetitions[]).
 *   2. The results page's flatMap logic correctly creates one entry per participant
 *      per competition.
 *   3. The competition names column shows the competition name, not just an ID.
 *
 * Rule: Each participant can only be assigned to ONE competition per event.
 * Tests use pure logic helpers (no React renderer) to stay fast.
 */

import { describe, it, expect } from 'vitest';

// ─── Types (minimal, mirroring EventParticipants.types.ts) ───────────────────

interface MockParticipant {
  id: number;
  firstname: string;
  lastname: string;
  isInEvent: boolean;
  assignedCompetitions: number[];
  startet_nicht: boolean;
  age: number;
  gender: string;
  club: string;
}

interface MockCompetition {
  id: number;
  name: string;
}

// ─── Pure logic helpers (mirrors component logic) ────────────────────────────

/**
 * Mirrors the filteredParticipants useMemo competition filter in index.tsx
 */
function applyCompetitionFilter(
  participants: MockParticipant[],
  competitionFilter: string
): MockParticipant[] {
  if (!competitionFilter) return participants;
  const compId = parseInt(competitionFilter);
  return participants.filter((p) => p.assignedCompetitions.includes(compId));
}

/**
 * Mirrors the competition name lookup in ParticipantTable.tsx
 */
function resolveCompetitionNames(
  assignedCompetitions: number[],
  competitions: MockCompetition[]
): string[] {
  return assignedCompetitions.map((compId) => {
    const comp = competitions.find((c) => c.id === compId);
    return comp?.name ?? `#${compId}`;
  });
}

/**
 * Mirrors the flatMap in useResultsData.ts that creates one entry per
 * (participant × competition).
 */
function buildResultsEntries(
  participants: MockParticipant[]
): Array<{ participantId: number; competitionId: number }> {
  return participants
    .filter((p) => !p.startet_nicht)
    .flatMap((p) => {
      const ids = Array.from(
        new Set(p.assignedCompetitions.map(Number).filter((n) => !isNaN(n) && n > 0))
      );
      return ids.map((competitionId) => ({ participantId: p.id, competitionId }));
    });
}

/**
 * Simulates the scoresMap key used in useResultsData.ts
 */
function participantCompetitionKey(participantId: number, competitionId: number): string {
  return `${participantId}:${competitionId}`;
}

// ─── Test data ───────────────────────────────────────────────────────────────

const COMP1: MockCompetition = { id: 10, name: 'AK 8 männlich' };
const COMP2: MockCompetition = { id: 20, name: 'AK 10 männlich' };
const competitions: MockCompetition[] = [COMP1, COMP2];

const alice: MockParticipant = {
  id: 1,
  firstname: 'Alice',
  lastname: 'Müller',
  isInEvent: true,
  assignedCompetitions: [10],      // only Comp1
  startet_nicht: false,
  age: 8,
  gender: 'weiblich',
  club: 'TV Test',
};

const bob: MockParticipant = {
  id: 2,
  firstname: 'Bob',
  lastname: 'Meier',
  isInEvent: true,
  assignedCompetitions: [20],      // only Comp2
  startet_nicht: false,
  age: 10,
  gender: 'männlich',
  club: 'SV Test',
};

const allParticipants: MockParticipant[] = [alice, bob];

// ─── 1. Competition filter (event-participants page) ─────────────────────────

describe('Event-Participants competition filter', () => {
  it('shows all participants when no competition filter is active', () => {
    const result = applyCompetitionFilter(allParticipants, '');
    expect(result).toHaveLength(2);
  });

  it('shows only Comp1 participants when filtered by Comp1', () => {
    const result = applyCompetitionFilter(allParticipants, '10');
    expect(result.map((p) => p.id)).toContain(alice.id);
    expect(result.map((p) => p.id)).not.toContain(bob.id);
  });

  it('shows only Comp2 participants when filtered by Comp2', () => {
    const result = applyCompetitionFilter(allParticipants, '20');
    expect(result.map((p) => p.id)).toContain(bob.id);
    expect(result.map((p) => p.id)).not.toContain(alice.id);
  });

  it('returns empty list for a non-existing competition ID', () => {
    const result = applyCompetitionFilter(allParticipants, '999');
    expect(result).toHaveLength(0);
  });

  it('handles participant with empty assignedCompetitions', () => {
    const p: MockParticipant = { ...alice, id: 99, assignedCompetitions: [] };
    const result = applyCompetitionFilter([p], '10');
    expect(result).toHaveLength(0);
  });
});

// ─── 2. Competition name resolution (ParticipantTable column) ────────────────

describe('Competition name display', () => {
  it('resolves competition name from ID', () => {
    expect(resolveCompetitionNames([10], competitions)).toEqual(['AK 8 männlich']);
  });

  it('resolves single competition name for a normal participant', () => {
    expect(resolveCompetitionNames([20], competitions)).toEqual(['AK 10 männlich']);
  });

  it('falls back to #id when competition is not found', () => {
    expect(resolveCompetitionNames([999], competitions)).toEqual(['#999']);
  });

  it('returns empty array for participant with no competitions', () => {
    expect(resolveCompetitionNames([], competitions)).toEqual([]);
  });
});

// ─── 3. Results page flatMap creates one entry per participant ────────────────

describe('Results page: flatMap creates one entry per participant-competition pair', () => {
  it('creates one entry for a single-competition participant', () => {
    const entries = buildResultsEntries([alice]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ participantId: 1, competitionId: 10 });
  });

  it('creates two entries for two participants each in different competitions', () => {
    const entries = buildResultsEntries([alice, bob]);
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({ participantId: 1, competitionId: 10 });
    expect(entries).toContainEqual({ participantId: 2, competitionId: 20 });
  });

  it('excludes participants with startet_nicht=true from results', () => {
    const dq = { ...alice, id: 5, startet_nicht: true };
    const entries = buildResultsEntries([alice, bob, dq]);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.participantId)).not.toContain(dq.id);
  });

  it('ignores invalid competition IDs (0, NaN)', () => {
    const bad: MockParticipant = { ...alice, assignedCompetitions: [0, NaN, 10] };
    const entries = buildResultsEntries([bad]);
    expect(entries).toHaveLength(1);
    expect(entries[0].competitionId).toBe(10);
  });

  it('returns empty list when no valid competition IDs', () => {
    const none: MockParticipant = { ...alice, assignedCompetitions: [0] };
    const entries = buildResultsEntries([none]);
    expect(entries).toHaveLength(0);
  });
});

// ─── 4. scoresMap key format ─────────────────────────────────────────────────

describe('Results page: scoresMap key format', () => {
  it('generates correct key for single competition', () => {
    expect(participantCompetitionKey(1, 10)).toBe('1:10');
  });

  it('generates distinct keys for different participants in same competition', () => {
    const keyAlice = participantCompetitionKey(1, 10);
    const keyBob   = participantCompetitionKey(2, 10);
    expect(keyAlice).not.toBe(keyBob);
  });

  it('both participant:competition combinations have unique keys', () => {
    const keys = new Set([
      participantCompetitionKey(alice.id, 10),
      participantCompetitionKey(bob.id, 20),
    ]);
    expect(keys.size).toBe(2);
  });
});
