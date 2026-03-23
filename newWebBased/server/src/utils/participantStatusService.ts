/**
 * participantStatusService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Single responsibility: all business logic for the *participant* status
 * (tfx_wertungen.int_statusid) and the automatic propagation to the
 * *squad-discipline* status (tfx_riegen_x_disziplinen.int_statusid).
 *
 * Design principles (Issue #115):
 *  - Zero direct Prisma/SQL calls inside this file.
 *    Every DB access goes through the injected `DbAdapter` interface.
 *  - Status IDs are never hardcoded.
 *    The service resolves them at runtime by name via `findStatusByName()`
 *    from the existing `squadStatusUtils` helper.
 *  - All exported functions (except the three top-level entry points) are
 *    pure and can be unit-tested without any mocks.
 *
 * Status name constants (match tfx_status.var_name values in the DB):
 *  - "Leistungen erfasst"     ← set automatically when a score is saved
 *  - "Keine Wertung verfügbar" ← set manually when no score can be entered
 *  - "kein Status"            ← the default / initial state
 *
 * NOTE: "Keine Wertung verfügbar" does not exist in the DB by default.
 * It must be created once via the Status Management UI
 * (http://localhost:5173/status-management) before this feature works fully.
 * The service degrades gracefully: if the status name is not found it logs a
 * warning and skips that operation without throwing.
 */

import { findStatusByName, type StatusRow } from './squadStatusUtils';
// Re-export so callers (including tests) only need one import
export type { StatusRow } from './squadStatusUtils';

// ─── Status name constants ────────────────────────────────────────────────────

export const STATUS_NAME_SCORE_CAPTURED   = 'Leistungen erfasst';
export const STATUS_NAME_NO_SCORE         = 'Keine Wertung verfügbar';
export const STATUS_NAME_DEFAULT          = 'kein Status';
export const STATUS_NAME_SQUAD_DONE       = 'Leistungen erfasst'; // same status for squad

// ─── DB Adapter interface (Dependency Injection) ──────────────────────────────

/**
 * Minimal data shapes returned by the DB adapter.
 * Using plain types keeps the service portable and easy to test.
 */

export interface WertungRow {
  /** tfx_wertungen.int_wertungenid */
  wertungenId: number;
  /** tfx_wertungen.int_statusid */
  statusId: number;
  /** tfx_wertungen.var_riege — may be null when participant has no squad */
  riege: string | null;
  /** tfx_wertungen.int_teilnehmerid */
  participantId: number;
}

export interface ParticipantStatusRow {
  wertungenId: number;
  participantId: number;
  competitionId: number;
  competitionName: string | null;
  startNumber: number | null;
  firstName: string | null;
  lastName: string | null;
  riege: string | null;
  statusId: number;
  statusName: string | null;
  statusColor: string | null;
}

export interface SquadDisciplineKey {
  eventId: number;
  riege: string;
  disciplineId: number;
}

/**
 * DbAdapter: all database interactions required by the service.
 * Implement once with Prisma (see `makeDbAdapter` below), mock in tests.
 */
export interface DbAdapter {
  /** Fetch all available status rows from tfx_status */
  getAllStatuses(): Promise<StatusRow[]>;

  /** Update int_statusid on a single tfx_wertungen row */
  setWertungStatus(wertungenId: number, statusId: number): Promise<void>;

  /**
   * Return the wertung row for a given wertungenId, including the squad name
   * and event/discipline context needed for squad propagation.
   */
  getWertungWithContext(wertungenId: number): Promise<WertungWithContext | null>;

  /**
   * Fetch all wertungs rows for participants in the same squad and event.
   * Used to check whether every participant in the squad is "done".
   */
  getSquadWertungen(eventId: number, riege: string): Promise<WertungRow[]>;

  /**
   * Update all tfx_riegen_x_disziplinen rows for a given riege in an event
   * that have the given disciplineIds.
   */
  setSquadDisciplineStatus(eventId: number, riege: string, statusId: number): Promise<void>;

  /**
   * Fetch all participant statuses for an event (for the UI page).
   */
  getParticipantStatusesForEvent(eventId: number): Promise<ParticipantStatusRow[]>;
}

export interface WertungWithContext {
  wertungenId: number;
  statusId: number;
  riege: string | null;
  eventId: number;
}

// ─── Pure business logic ──────────────────────────────────────────────────────

/**
 * Determine whether all participants in a squad are "done" — i.e. every
 * wertung has a status of either scoreCapturedId or noScoreId.
 *
 * Pure function — no DB access.
 */
export function areAllSquadParticipantsDone(
  wertungen: WertungRow[],
  scoreCapturedId: number,
  noScoreId: number | null,
): boolean {
  if (wertungen.length === 0) return false;
  return wertungen.every(
    w => w.statusId === scoreCapturedId || (noScoreId !== null && w.statusId === noScoreId),
  );
}

/**
 * Resolve the status IDs needed for the service to operate.
 * Returns `null` for `noScoreId` when the "Keine Wertung verfügbar" status
 * does not yet exist in the DB (non-fatal).
 *
 * Pure function — consumes already-fetched statuses list.
 */
export function resolveStatusIds(statuses: StatusRow[]): {
  scoreCapturedId: number | null;
  noScoreId: number | null;
  squadDoneId: number | null;
} {
  const scoreCaptured  = findStatusByName(statuses, STATUS_NAME_SCORE_CAPTURED);
  const noScore        = findStatusByName(statuses, STATUS_NAME_NO_SCORE);
  const squadDone      = findStatusByName(statuses, STATUS_NAME_SQUAD_DONE);

  return {
    scoreCapturedId: scoreCaptured?.int_statusid ?? null,
    noScoreId:       noScore?.int_statusid ?? null,
    squadDoneId:     squadDone?.int_statusid ?? null,
  };
}

// ─── Entry-point functions (use DbAdapter) ────────────────────────────────────

/**
 * Automatically set a participant's status to "Leistungen erfasst" after a
 * score has been saved.  Then checks whether the whole squad is done and
 * propagates to squad-discipline status if so.
 *
 * Call this inside the score-save handler after the score is persisted.
 *
 * @param wertungenId  The tfx_wertungen.int_wertungenid whose score was saved.
 * @param db           Injected DB adapter.
 * @param emitSquadUpdate  Optional callback invoked when the squad status is
 *                          updated (e.g. emit a Socket.IO event).
 */
export async function onScoreSaved(
  wertungenId: number,
  db: DbAdapter,
  emitSquadUpdate?: (eventId: number, riege: string) => void,
): Promise<void> {
  const statuses = await db.getAllStatuses();
  const { scoreCapturedId, noScoreId, squadDoneId } = resolveStatusIds(statuses);

  if (scoreCapturedId === null) {
    console.warn(`[participantStatusService] Status "${STATUS_NAME_SCORE_CAPTURED}" not found in DB — skipping participant status update.`);
    return;
  }

  // 1. Update the participant's status
  await db.setWertungStatus(wertungenId, scoreCapturedId);

  // 2. Check squad propagation
  await _checkAndPropagateSquadStatus(
    wertungenId, db, statuses, scoreCapturedId, noScoreId, squadDoneId, emitSquadUpdate,
  );
}

/**
 * Manually set a participant's status (e.g. "Keine Wertung verfügbar").
 * Subsequently propagates to squad-discipline status if all squad members done.
 *
 * Call this from the PATCH /api/participant-status/:wertungenId endpoint.
 *
 * @param wertungenId  The wertagen row to update.
 * @param statusId     The target status ID (validated by the route).
 * @param db           Injected DB adapter.
 * @param emitSquadUpdate  Optional Socket.IO emit callback.
 */
export async function setParticipantStatus(
  wertungenId: number,
  statusId: number,
  db: DbAdapter,
  emitSquadUpdate?: (eventId: number, riege: string) => void,
): Promise<void> {
  await db.setWertungStatus(wertungenId, statusId);

  const statuses = await db.getAllStatuses();
  const { scoreCapturedId, noScoreId, squadDoneId } = resolveStatusIds(statuses);

  await _checkAndPropagateSquadStatus(
    wertungenId, db, statuses, scoreCapturedId, noScoreId, squadDoneId, emitSquadUpdate,
  );
}

/**
 * Internal helper: load squad members and propagate to squad status if all done.
 */
async function _checkAndPropagateSquadStatus(
  wertungenId: number,
  db: DbAdapter,
  statuses: StatusRow[],
  scoreCapturedId: number | null,
  noScoreId: number | null,
  squadDoneId: number | null,
  emitSquadUpdate?: (eventId: number, riege: string) => void,
): Promise<void> {
  const ctx = await db.getWertungWithContext(wertungenId);
  if (!ctx || !ctx.riege) return; // No squad assigned — nothing to propagate

  if (scoreCapturedId === null || squadDoneId === null) return;

  const squadWertungen = await db.getSquadWertungen(ctx.eventId, ctx.riege);
  if (areAllSquadParticipantsDone(squadWertungen, scoreCapturedId, noScoreId)) {
    await db.setSquadDisciplineStatus(ctx.eventId, ctx.riege, squadDoneId);
    emitSquadUpdate?.(ctx.eventId, ctx.riege);
  }
}

// ─── Prisma DB Adapter factory ────────────────────────────────────────────────
//
// Import this in routes; do NOT import in tests.
// Keeping the Prisma dependency here means the service itself has zero DB imports.

import type { PrismaClient } from '@prisma/client';

/**
 * Create a Prisma-backed DbAdapter.
 * The only place in the codebase where Prisma is used for participant-status
 * operations.
 */
export function makeDbAdapter(prisma: PrismaClient): DbAdapter {
  return {
    async getAllStatuses() {
      const rows = await prisma.tfx_status.findMany({ orderBy: { int_statusid: 'asc' } });
      return rows.map(r => ({ int_statusid: r.int_statusid, var_name: r.var_name ?? '' }));
    },

    async setWertungStatus(wertungenId, statusId) {
      await prisma.tfx_wertungen.update({
        where: { int_wertungenid: wertungenId },
        data:  { int_statusid: statusId },
      });
    },

    async getWertungWithContext(wertungenId) {
      type Row = { wertungenid: number; statusid: number; riege: string | null; eventid: number };
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT
          w.int_wertungenid  AS wertungenid,
          w.int_statusid     AS statusid,
          w.var_riege        AS riege,
          wk.int_veranstaltungenid AS eventid
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = w.int_wettkaempfeid
        WHERE w.int_wertungenid = ${wertungenId}
      `;
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        wertungenId: Number(r.wertungenid),
        statusId:    Number(r.statusid),
        riege:       r.riege,
        eventId:     Number(r.eventid),
      };
    },

    async getSquadWertungen(eventId, riege) {
      type Row = { wertungenid: number; statusid: number; riege: string | null; participantid: number };
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT
          w.int_wertungenid  AS wertungenid,
          w.int_statusid     AS statusid,
          w.var_riege        AS riege,
          w.int_teilnehmerid AS participantid
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = w.int_wettkaempfeid
        WHERE wk.int_veranstaltungenid = ${eventId}
          AND w.var_riege = ${riege}
      `;
      return rows.map(r => ({
        wertungenId:   Number(r.wertungenid),
        statusId:      Number(r.statusid),
        riege:         r.riege,
        participantId: Number(r.participantid),
      }));
    },

    async setSquadDisciplineStatus(eventId, riege, statusId) {
      await prisma.tfx_riegen_x_disziplinen.updateMany({
        where: { int_veranstaltungenid: eventId, var_riege: riege },
        data:  { int_statusid: statusId },
      });
    },

    async getParticipantStatusesForEvent(eventId) {
      type Row = {
        wertungenid:      number;
        participantid:    number;
        competitionid:    number;
        competition_name: string | null;
        start_number:     number | null;
        firstname:        string | null;
        lastname:         string | null;
        riege:            string | null;
        statusid:         number;
        status_name:      string | null;
        status_color:     string | null;
      };
      const rows = await prisma.$queryRaw<Row[]>`
        SELECT
          w.int_wertungenid      AS wertungenid,
          w.int_teilnehmerid     AS participantid,
          w.int_wettkaempfeid    AS competitionid,
          wk.var_name            AS competition_name,
          w.int_startnummer      AS start_number,
          t.var_vorname          AS firstname,
          t.var_nachname         AS lastname,
          w.var_riege            AS riege,
          w.int_statusid         AS statusid,
          s.var_name             AS status_name,
          s.ary_colorcode        AS status_color
        FROM tfx_wertungen w
        INNER JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = w.int_wettkaempfeid
        LEFT  JOIN tfx_teilnehmer  t  ON t.int_teilnehmerid   = w.int_teilnehmerid
        INNER JOIN tfx_status      s  ON s.int_statusid       = w.int_statusid
        WHERE wk.int_veranstaltungenid = ${eventId}
          AND w.int_teilnehmerid IS NOT NULL
        ORDER BY w.int_startnummer ASC NULLS LAST, t.var_nachname ASC
      `;
      return rows.map(r => ({
        wertungenId:     Number(r.wertungenid),
        participantId:   Number(r.participantid),
        competitionId:   Number(r.competitionid),
        competitionName: r.competition_name,
        startNumber:     r.start_number !== null ? Number(r.start_number) : null,
        firstName:       r.firstname,
        lastName:        r.lastname,
        riege:           r.riege,
        statusId:        Number(r.statusid),
        statusName:      r.status_name,
        statusColor:     r.status_color,
      }));
    },
  };
}
