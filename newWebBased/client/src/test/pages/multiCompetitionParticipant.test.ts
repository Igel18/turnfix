/**
 * Multi-Competition Participant Tests
 *
 * Verifies the following behaviour:
 *   1. Participants assigned to multiple competitions can be filtered by competition
 *      in the event-participants page (client-side filter on assignedCompetitions[]).
 *   2. The results page's flatMap logic correctly creates one entry per competition
 *      for participants assigned to multiple competitions.
 *   3. The competition names column shows actual names, not just a count.
 *
 * Tests use pure logic helpers (no React renderer) to stay fast and
 * dependency-free.
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

const charlie: MockParticipant = {
  id: 3,
  firstname: 'Charlie',
  lastname: 'Schmidt',
  isInEvent: true,
  assignedCompetitions: [10, 20],  // BOTH competitions
  startet_nicht: false,
  age: 9,
  gender: 'männlich',
  club: 'TV Test',
};

const allParticipants: MockParticipant[] = [alice, bob, charlie];

// ─── 1. Competition filter (event-participants page) ─────────────────────────

describe('Event-Participants competition filter', () => {
  it('shows all participants when no competition filter is active', () => {
    const result = applyCompetitionFilter(allParticipants, '');
    expect(result).toHaveLength(3);
  });

  it('shows only Comp1 participants when filtered by Comp1', () => {
    const result = applyCompetitionFilter(allParticipants, '10');
    expect(result.map((p) => p.id)).toContain(alice.id);
    expect(result.map((p) => p.id)).toContain(charlie.id);
    expect(result.map((p) => p.id)).not.toContain(bob.id);
  });

  it('shows only Comp2 participants when filtered by Comp2', () => {
    const result = applyCompetitionFilter(allParticipants, '20');
    expect(result.map((p) => p.id)).toContain(bob.id);
    expect(result.map((p) => p.id)).toContain(charlie.id);
    expect(result.map((p) => p.id)).not.toContain(alice.id);
  });

  it('shows participant assigned to both competitions in BOTH competition filters', () => {
    const inComp1 = applyCompetitionFilter(allParticipants, '10');
    const inComp2 = applyCompetitionFilter(allParticipants, '20');
    expect(inComp1.map((p) => p.id)).toContain(charlie.id);
    expect(inComp2.map((p) => p.id)).toContain(charlie.id);
  });

  it('returns empty list when no participant belongs to a non-existing competition', () => {
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

  it('resolves multiple competition names', () => {
    const names = resolveCompetitionNames([10, 20], competitions);
    expect(names).toContain('AK 8 männlich');
    expect(names).toContain('AK 10 männlich');
    expect(names).toHaveLength(2);
  });

  it('falls back to #id when competition is not found', () => {
    expect(resolveCompetitionNames([999], competitions)).toEqual(['#999']);
  });

  it('returns empty array for participant with no competitions', () => {
    expect(resolveCompetitionNames([], competitions)).toEqual([]);
  });
});

// ─── 3. Results page flatMap creates one entry per competition ────────────────

describe('Results page: multi-competition flatMap', () => {
  it('creates one entry for a single-competition participant', () => {
    const entries = buildResultsEntries([alice]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ participantId: 1, competitionId: 10 });
  });

  it('creates two entries for a participant in two competitions', () => {
    const entries = buildResultsEntries([charlie]);
    expect(entries).toHaveLength(2);
    expect(entries).toContainEqual({ participantId: 3, competitionId: 10 });
    expect(entries).toContainEqual({ participantId: 3, competitionId: 20 });
  });

  it('creates a total of 4 entries for 3 participants (alice:1, bob:1, charlie:2)', () => {
    const entries = buildResultsEntries(allParticipants);
    expect(entries).toHaveLength(4);
  });

  it('excludes participants with startet_nicht=true from results', () => {
    const dq = { ...charlie, startet_nicht: true };
    const entries = buildResultsEntries([alice, bob, dq]);
    expect(entries).toHaveLength(2); // only alice and bob
    expect(entries.map((e) => e.participantId)).not.toContain(dq.id);
  });

  it('deduplices duplicate competition IDs in assignedCompetitions', () => {
    const dup: MockParticipant = { ...charlie, assignedCompetitions: [10, 10, 20] };
    const entries = buildResultsEntries([dup]);
    expect(entries).toHaveLength(2); // deduped to [10, 20]
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

  it('generates distinct keys for same participant in different competitions', () => {
    const keyComp1 = participantCompetitionKey(3, 10);
    const keyComp2 = participantCompetitionKey(3, 20);
    expect(keyComp1).not.toBe(keyComp2);
  });

  it('generates distinct keys for different participants in same competition', () => {
    const keyAlice  = participantCompetitionKey(1, 10);
    const keyBob   = participantCompetitionKey(2, 10);
    expect(keyAlice).not.toBe(keyBob);
  });

  it('all four participant:competition combinations have unique keys', () => {
    const keys = new Set([
      participantCompetitionKey(alice.id, 10),
      participantCompetitionKey(bob.id, 20),
      participantCompetitionKey(charlie.id, 10),
      participantCompetitionKey(charlie.id, 20),
    ]);
    expect(keys.size).toBe(4);
  });
});
