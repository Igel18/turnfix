/**
 * TDD Unit Tests — participantStatusService
 * ─────────────────────────────────────────────────────────────────────────────
 * No real DB, no Prisma.  Every test drives a mock DbAdapter.
 *
 * Coverage:
 *  1.  resolveStatusIds — all combinations of present/missing status names
 *  2.  areAllSquadParticipantsDone — pure logic, edge cases
 *  3.  onScoreSaved — auto status update + squad propagation
 *  4.  setParticipantStatus — manual update + squad propagation
 *  5.  Squad propagation skipped when status names are missing
 */

import {
  resolveStatusIds,
  areAllSquadParticipantsDone,
  onScoreSaved,
  setParticipantStatus,
  STATUS_NAME_SCORE_CAPTURED,
  STATUS_NAME_NO_SCORE,
  STATUS_NAME_SQUAD_DONE,
  type StatusRow,
  type WertungRow,
  type DbAdapter,
  type WertungWithContext,
} from '../../src/utils/participantStatusService';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const STATUS_CAPTURED = 2;  // maps to "Leistungen erfasst"
const STATUS_NO_SCORE = 99; // maps to "Keine Wertung verfügbar"
const STATUS_NONE     = 1;  // maps to "kein Status"

const ALL_STATUSES: StatusRow[] = [
  { int_statusid: STATUS_NONE,     var_name: 'kein Status' },
  { int_statusid: STATUS_CAPTURED, var_name: 'Leistungen erfasst' },
  { int_statusid: STATUS_NO_SCORE, var_name: 'Keine Wertung verfügbar' },
];

const STATUSES_WITHOUT_NO_SCORE: StatusRow[] = [
  { int_statusid: STATUS_NONE,     var_name: 'kein Status' },
  { int_statusid: STATUS_CAPTURED, var_name: 'Leistungen erfasst' },
];

function makeWertung(wertungenId: number, statusId: number, riege: string | null = 'wBlau'): WertungRow {
  return { wertungenId, statusId, riege, participantId: wertungenId * 10 };
}

function makeContext(wertungenId: number, riege: string | null = 'wBlau', eventId = 42): WertungWithContext {
  return { wertungenId, statusId: STATUS_NONE, riege, eventId };
}

/** Build a minimal mock DbAdapter with sensible defaults. */
function makeMockDb(overrides: Partial<DbAdapter> = {}): DbAdapter & {
  calls: Record<string, any[][]>;
} {
  const calls: Record<string, any[][]> = {
    getAllStatuses:          [],
    setWertungStatus:        [],
    getWertungWithContext:   [],
    getSquadWertungen:       [],
    setSquadDisciplineStatus:[],
    getParticipantStatusesForEvent: [],
  };

  return {
    calls,
    getAllStatuses: async () => {
      calls.getAllStatuses.push([]);
      return overrides.getAllStatuses?.() ?? Promise.resolve(ALL_STATUSES);
    },
    setWertungStatus: async (id, statusId) => {
      calls.setWertungStatus.push([id, statusId]);
      return overrides.setWertungStatus?.(id, statusId);
    },
    getWertungWithContext: async (id) => {
      calls.getWertungWithContext.push([id]);
      return overrides.getWertungWithContext
        ? overrides.getWertungWithContext(id)
        : Promise.resolve(makeContext(id));
    },
    getSquadWertungen: async (eventId, riege) => {
      calls.getSquadWertungen.push([eventId, riege]);
      return overrides.getSquadWertungen
        ? overrides.getSquadWertungen(eventId, riege)
        : Promise.resolve([makeWertung(1, STATUS_CAPTURED), makeWertung(2, STATUS_CAPTURED)]);
    },
    setSquadDisciplineStatus: async (eventId, riege, statusId) => {
      calls.setSquadDisciplineStatus.push([eventId, riege, statusId]);
      return overrides.setSquadDisciplineStatus?.(eventId, riege, statusId);
    },
    getParticipantStatusesForEvent: async (eventId) => {
      calls.getParticipantStatusesForEvent.push([eventId]);
      return overrides.getParticipantStatusesForEvent
        ? overrides.getParticipantStatusesForEvent(eventId)
        : Promise.resolve([]);
    },
  };
}

// ─── 1. resolveStatusIds ──────────────────────────────────────────────────────

describe('resolveStatusIds', () => {
  it('resolves all three IDs when all statuses are present', () => {
    const result = resolveStatusIds(ALL_STATUSES);
    expect(result.scoreCapturedId).toBe(STATUS_CAPTURED);
    expect(result.noScoreId).toBe(STATUS_NO_SCORE);
    expect(result.squadDoneId).toBe(STATUS_CAPTURED); // same name as scoreCaptured
  });

  it('returns null for noScoreId when "Keine Wertung verfügbar" is absent', () => {
    const result = resolveStatusIds(STATUSES_WITHOUT_NO_SCORE);
    expect(result.scoreCapturedId).toBe(STATUS_CAPTURED);
    expect(result.noScoreId).toBeNull();
    expect(result.squadDoneId).toBe(STATUS_CAPTURED);
  });

  it('returns null for scoreCapturedId when DB is empty', () => {
    const result = resolveStatusIds([]);
    expect(result.scoreCapturedId).toBeNull();
    expect(result.noScoreId).toBeNull();
    expect(result.squadDoneId).toBeNull();
  });

  it('is case-insensitive (trims & lowercases names)', () => {
    const statuses: StatusRow[] = [
      { int_statusid: 7, var_name: '  Leistungen Erfasst  ' },
    ];
    const result = resolveStatusIds(statuses);
    expect(result.scoreCapturedId).toBe(7);
  });
});

// ─── 2. areAllSquadParticipantsDone ──────────────────────────────────────────

describe('areAllSquadParticipantsDone', () => {
  it('returns false for empty list', () => {
    expect(areAllSquadParticipantsDone([], STATUS_CAPTURED, STATUS_NO_SCORE)).toBe(false);
  });

  it('returns true when all have scoreCapturedId', () => {
    const wertungen = [makeWertung(1, STATUS_CAPTURED), makeWertung(2, STATUS_CAPTURED)];
    expect(areAllSquadParticipantsDone(wertungen, STATUS_CAPTURED, STATUS_NO_SCORE)).toBe(true);
  });

  it('returns true when all have noScoreId', () => {
    const wertungen = [makeWertung(1, STATUS_NO_SCORE), makeWertung(2, STATUS_NO_SCORE)];
    expect(areAllSquadParticipantsDone(wertungen, STATUS_CAPTURED, STATUS_NO_SCORE)).toBe(true);
  });

  it('returns true for mixed scoreCaptured + noScore', () => {
    const wertungen = [makeWertung(1, STATUS_CAPTURED), makeWertung(2, STATUS_NO_SCORE)];
    expect(areAllSquadParticipantsDone(wertungen, STATUS_CAPTURED, STATUS_NO_SCORE)).toBe(true);
  });

  it('returns false when one participant still has default status', () => {
    const wertungen = [makeWertung(1, STATUS_CAPTURED), makeWertung(2, STATUS_NONE)];
    expect(areAllSquadParticipantsDone(wertungen, STATUS_CAPTURED, STATUS_NO_SCORE)).toBe(false);
  });

  it('treats noScoreId=null strictly: only scoreCapturedId counts', () => {
    const wertungen = [makeWertung(1, STATUS_CAPTURED), makeWertung(2, STATUS_NO_SCORE)];
    // noScoreId is null → STATUS_NO_SCORE does not count as done
    expect(areAllSquadParticipantsDone(wertungen, STATUS_CAPTURED, null)).toBe(false);
  });

  it('returns true for single participant with scoreCaptured', () => {
    expect(areAllSquadParticipantsDone([makeWertung(1, STATUS_CAPTURED)], STATUS_CAPTURED, null)).toBe(true);
  });
});

// ─── 3. onScoreSaved ─────────────────────────────────────────────────────────

describe('onScoreSaved', () => {
  it('sets participant status to scoreCapturedId', async () => {
    const db = makeMockDb();
    await onScoreSaved(10, db);
    expect(db.calls.setWertungStatus).toEqual([[10, STATUS_CAPTURED]]);
  });

  it('propagates squad status when all members are done', async () => {
    const db = makeMockDb();
    const emitCalls: [number, string][] = [];
    await onScoreSaved(10, db, (eid, r) => emitCalls.push([eid, r]));
    expect(db.calls.setSquadDisciplineStatus).toEqual([[42, 'wBlau', STATUS_CAPTURED]]);
    expect(emitCalls).toEqual([[42, 'wBlau']]);
  });

  it('does NOT propagate when one member is not yet done', async () => {
    const db = makeMockDb({
      getSquadWertungen: async () => [
        makeWertung(1, STATUS_CAPTURED),
        makeWertung(2, STATUS_NONE), // still undone
      ],
    });
    await onScoreSaved(10, db);
    expect(db.calls.setSquadDisciplineStatus).toHaveLength(0);
  });

  it('skips participant update when scoreCaptured status is missing from DB', async () => {
    const db = makeMockDb({
      getAllStatuses: async () => [{ int_statusid: 1, var_name: 'kein Status' }],
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await onScoreSaved(10, db);
    expect(db.calls.setWertungStatus).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not found in DB'));
    warnSpy.mockRestore();
  });

  it('does NOT propagate when participant has no squad (riege=null)', async () => {
    const db = makeMockDb({
      getWertungWithContext: async (id) => makeContext(id, null),
    });
    await onScoreSaved(10, db);
    expect(db.calls.setSquadDisciplineStatus).toHaveLength(0);
  });

  it('propagates correctly when noScore status is absent from DB', async () => {
    // "Keine Wertung verfügbar" does not exist → all must have scoreCapturedId
    const db = makeMockDb({
      getAllStatuses: async () => STATUSES_WITHOUT_NO_SCORE,
      getSquadWertungen: async () => [
        makeWertung(1, STATUS_CAPTURED),
        makeWertung(2, STATUS_CAPTURED),
      ],
    });
    await onScoreSaved(10, db);
    expect(db.calls.setSquadDisciplineStatus).toEqual([[42, 'wBlau', STATUS_CAPTURED]]);
  });
});

// ─── 4. setParticipantStatus (manual) ────────────────────────────────────────

describe('setParticipantStatus', () => {
  it('sets the given status on the wertung', async () => {
    const db = makeMockDb();
    await setParticipantStatus(10, STATUS_NO_SCORE, db);
    expect(db.calls.setWertungStatus).toEqual([[10, STATUS_NO_SCORE]]);
  });

  it('propagates squad status when setting noScore completes the squad', async () => {
    // Participant 2 was the last one; now also gets STATUS_NO_SCORE
    const db = makeMockDb({
      getSquadWertungen: async () => [
        makeWertung(1, STATUS_CAPTURED),
        makeWertung(2, STATUS_NO_SCORE),
      ],
    });
    const emitCalls: [number, string][] = [];
    await setParticipantStatus(20, STATUS_NO_SCORE, db, (eid, r) => emitCalls.push([eid, r]));
    expect(db.calls.setSquadDisciplineStatus).toEqual([[42, 'wBlau', STATUS_CAPTURED]]);
    expect(emitCalls).toHaveLength(1);
  });

  it('does NOT propagate if squad still has undone members', async () => {
    const db = makeMockDb({
      getSquadWertungen: async () => [
        makeWertung(1, STATUS_NONE),
        makeWertung(2, STATUS_NO_SCORE),
      ],
    });
    await setParticipantStatus(20, STATUS_NO_SCORE, db);
    expect(db.calls.setSquadDisciplineStatus).toHaveLength(0);
  });

  it('does NOT propagate when participant has no squad', async () => {
    const db = makeMockDb({
      getWertungWithContext: async (id) => makeContext(id, null),
    });
    await setParticipantStatus(10, STATUS_NO_SCORE, db);
    expect(db.calls.setSquadDisciplineStatus).toHaveLength(0);
  });

  it('still sets status even when scoreCaptured is missing from DB', async () => {
    const db = makeMockDb({
      getAllStatuses: async () => [{ int_statusid: 99, var_name: 'Keine Wertung verfügbar' }],
    });
    await setParticipantStatus(10, 99, db);
    // Status is set but squad propagation is skipped (scoreCapturedId=null)
    expect(db.calls.setWertungStatus).toEqual([[10, 99]]);
    expect(db.calls.setSquadDisciplineStatus).toHaveLength(0);
  });
});

// ─── 5. Status name constants sanity check ────────────────────────────────────

describe('Status name constants', () => {
  it('STATUS_NAME_SCORE_CAPTURED matches DB value', () => {
    expect(STATUS_NAME_SCORE_CAPTURED).toBe('Leistungen erfasst');
  });

  it('STATUS_NAME_NO_SCORE is the expected German label', () => {
    expect(STATUS_NAME_NO_SCORE).toBe('Keine Wertung verfügbar');
  });

  it('STATUS_NAME_SQUAD_DONE reuses scoreCaptured name (same status)', () => {
    expect(STATUS_NAME_SQUAD_DONE).toBe(STATUS_NAME_SCORE_CAPTURED);
  });
});
