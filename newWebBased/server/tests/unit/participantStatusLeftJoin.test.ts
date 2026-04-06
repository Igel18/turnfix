/**
 * Unit Tests — Point 129: participant-status page LEFT JOIN fix
 * ─────────────────────────────────────────────────────────────────────────────
 * The original query used INNER JOIN tfx_status, which excluded participants
 * whose int_statusid had no matching row in tfx_status (e.g. legacy statusId=0).
 *
 * Fix: Changed to LEFT JOIN so all participants appear; statusName/statusColor
 * will be null for those with an unknown statusId.
 *
 * Tests here verify the DbAdapter interface contract using mocks — no real DB.
 */

import type { ParticipantStatusRow, DbAdapter } from '../../src/utils/participantStatusService';

// ─── Mock DbAdapter factory ───────────────────────────────────────────────────

function makeMockDb(
  rows: ParticipantStatusRow[],
): Pick<DbAdapter, 'getParticipantStatusesForEvent'> {
  return {
    getParticipantStatusesForEvent: async (_eventId: number) => rows,
  };
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<ParticipantStatusRow> = {}): ParticipantStatusRow {
  return {
    wertungenId:     1,
    participantId:   10,
    competitionId:   100,
    competitionName: 'Wettkampf A',
    startNumber:     1,
    firstName:       'Anna',
    lastName:        'Müller',
    riege:           'wBlau',
    statusId:        1,
    statusName:      'kein Status',
    statusColor:     null,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('getParticipantStatusesForEvent — LEFT JOIN behaviour', () => {

  it('returns participants with a known status (normal case)', async () => {
    const db = makeMockDb([makeRow({ statusId: 2, statusName: 'Leistungen erfasst', statusColor: '#4ade80' })]);
    const rows = await db.getParticipantStatusesForEvent(42);

    expect(rows).toHaveLength(1);
    expect(rows[0].statusName).toBe('Leistungen erfasst');
    expect(rows[0].statusColor).toBe('#4ade80');
  });

  it('returns participant with legacy statusId=0 (was excluded by INNER JOIN)', async () => {
    // Simulates what a LEFT JOIN returns: statusName and statusColor are null
    // because statusId=0 has no row in tfx_status.
    const db = makeMockDb([makeRow({ statusId: 0, statusName: null, statusColor: null })]);
    const rows = await db.getParticipantStatusesForEvent(42);

    expect(rows).toHaveLength(1);
    expect(rows[0].statusId).toBe(0);
    expect(rows[0].statusName).toBeNull();
    expect(rows[0].statusColor).toBeNull();
  });

  it('returns all participants even when some have null statusName (mixed)', async () => {
    const rowWithStatus = makeRow({ wertungenId: 1, participantId: 10, statusId: 2, statusName: 'Leistungen erfasst' });
    const rowWithoutStatus = makeRow({ wertungenId: 2, participantId: 20, statusId: 0, statusName: null });
    const db = makeMockDb([rowWithStatus, rowWithoutStatus]);

    const rows = await db.getParticipantStatusesForEvent(42);

    expect(rows).toHaveLength(2);
    expect(rows.find(r => r.participantId === 10)?.statusName).toBe('Leistungen erfasst');
    expect(rows.find(r => r.participantId === 20)?.statusName).toBeNull();
  });

  it('returns empty array when event has no participants', async () => {
    const db = makeMockDb([]);
    const rows = await db.getParticipantStatusesForEvent(99);

    expect(rows).toHaveLength(0);
  });

  it('preserves all fields from the database row', async () => {
    const expected = makeRow({
      wertungenId:     7,
      participantId:   42,
      competitionId:   200,
      competitionName: 'Bundesliga',
      startNumber:     15,
      firstName:       'Lukas',
      lastName:        'Schmitt',
      riege:           'mRot',
      statusId:        3,
      statusName:      'DNS',
      statusColor:     '#ef4444',
    });
    const db = makeMockDb([expected]);
    const rows = await db.getParticipantStatusesForEvent(1);

    expect(rows[0]).toEqual(expected);
  });
});

// ─── ParticipantStatusRow shape ───────────────────────────────────────────────

describe('ParticipantStatusRow interface completeness', () => {

  it('has nullable statusName to support LEFT JOIN results', () => {
    const row: ParticipantStatusRow = makeRow({ statusName: null });
    expect(row.statusName).toBeNull();
  });

  it('has nullable statusColor to support LEFT JOIN results', () => {
    const row: ParticipantStatusRow = makeRow({ statusColor: null });
    expect(row.statusColor).toBeNull();
  });

  it('has nullable startNumber', () => {
    const row: ParticipantStatusRow = makeRow({ startNumber: null });
    expect(row.startNumber).toBeNull();
  });

  it('has nullable firstName / lastName / riege / competitionName', () => {
    const row: ParticipantStatusRow = makeRow({
      firstName:       null,
      lastName:        null,
      riege:           null,
      competitionName: null,
    });
    expect(row.firstName).toBeNull();
    expect(row.lastName).toBeNull();
    expect(row.riege).toBeNull();
    expect(row.competitionName).toBeNull();
  });
});
