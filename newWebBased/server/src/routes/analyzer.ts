/**
 * Analyzer Routes – Event Configuration Health Checks.
 *
 * Routes:
 *   GET /event/:eventId  - Run all configuration checks for an event
 *
 * Returns structured check results with affected counts, sample details,
 * action routes for the frontend, and optional quick-action identifiers.
 *
 * Checks performed:
 *   1. missing_start_numbers         – participants without startnummer
 *   2. competitions_without_disciplines – competitions with no disciplines
 *   3. disciplines_without_max_score – discipline entries with rel_max = 0
 *   4. gender_age_mismatch           – participants assigned to wrong competition
 *   5. participants_without_squad    – participants with no var_riege set
 *   6. missing_score_details         – wertungen missing detail rows for disciplines
 *   7. squad_combination_not_generated – squads defined but riegen_x_disziplinen empty
 *   8. duplicate_top_placements      – tied ranks 1–3 in any competition
 *   9. schedule_missing_start_times  – competitions without tim_startzeit (Point 110i)
 *  10. schedule_matrix_incomplete    – squad/discipline rotation matrix incomplete (Point 122i)
 */

import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { isDebug } from '../utils/debug'

const router = Router()

// ============================================================================
// Types (also exported for tests)
// ============================================================================

export interface AnalyzerDetail {
  id: number
  label: string
}

export interface AnalyzerCheckResult {
  id: string
  category: 'setup' | 'schedule' | 'capture' | 'squads' | 'results'
  severity: 'error' | 'warning' | 'info'
  status: 'ok' | 'error' | 'warning' | 'info'
  affectedCount: number
  details: AnalyzerDetail[]
  actionRoute: string
  quickActionId?: string
}

export interface AnalyzerSummary {
  errors: number
  warnings: number
  infos: number
  ok: number
  total: number
}

export interface AnalyzerResponse {
  checks: AnalyzerCheckResult[]
  summary: AnalyzerSummary
}

// ============================================================================
// Main Endpoint
// ============================================================================

router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.params.eventId)
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' })
    }

    if (isDebug()) {
      console.log(`🔍 DEBUG Analyzer: Running checks for event ${eventId}`)
    }

    // Run all checks in parallel for performance
    const [
      missingStartNumbers,
      competitionsWithoutDisciplines,
      disciplinesWithoutMaxScore,
      genderAgeMismatch,
      participantsWithoutSquad,
      missingScoreDetails,
      squadCombinationCheck,
      duplicateTopPlacements,
      missingStartTimes,
      scheduleMatrixIncomplete,
      participantsWithoutCompetition,
      competitionsWithoutParticipants,
      competitionsWithoutRound,
    ] = await Promise.all([
      checkMissingStartNumbers(eventId),
      checkCompetitionsWithoutDisciplines(eventId),
      checkDisciplinesWithoutMaxScore(eventId),
      checkGenderAgeMismatch(eventId),
      checkParticipantsWithoutSquad(eventId),
      checkMissingScoreDetails(eventId),
      checkSquadCombination(eventId),
      checkDuplicateTopPlacements(eventId),
      checkMissingStartTimes(eventId),
      checkScheduleMatrixIncomplete(eventId),
      checkParticipantsWithoutCompetition(eventId),
      checkCompetitionsWithoutParticipants(eventId),
      checkCompetitionsWithoutRound(eventId),
    ])

    const checks: AnalyzerCheckResult[] = [
      missingStartNumbers,
      competitionsWithoutDisciplines,
      disciplinesWithoutMaxScore,
      genderAgeMismatch,
      participantsWithoutSquad,
      missingScoreDetails,
      squadCombinationCheck,
      duplicateTopPlacements,
      missingStartTimes,
      scheduleMatrixIncomplete,
      participantsWithoutCompetition,
      competitionsWithoutParticipants,
      competitionsWithoutRound,
    ]

    const summary: AnalyzerSummary = {
      errors:   checks.filter(c => c.status === 'error').length,
      warnings: checks.filter(c => c.status === 'warning').length,
      infos:    checks.filter(c => c.status === 'info').length,
      ok:       checks.filter(c => c.status === 'ok').length,
      total:    checks.length,
    }

    return res.json({ checks, summary } as AnalyzerResponse)
  } catch (error) {
    console.error('Analyzer error:', error)
    return res.status(500).json({ error: 'Analyzer check failed' })
  }
})

// ============================================================================
// Check: Missing start numbers
// ============================================================================

export async function checkMissingStartNumbers(eventId: number): Promise<AnalyzerCheckResult> {
  const countRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) AS c
    FROM tfx_wertungen w
    JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    WHERE wk.int_veranstaltungenid = $1
      AND w.int_teilnehmerid IS NOT NULL
      AND (w.int_startnummer IS NULL OR w.int_startnummer = 0)
      AND w.bol_startet_nicht IS NOT TRUE
  `, eventId)

  const count = Number(countRows[0]?.c ?? 0)

  let details: AnalyzerDetail[] = []
  if (count > 0) {
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT w.int_wertungenid AS id,
             COALESCE(t.var_vorname, '') || ' ' || COALESCE(t.var_nachname, '') AS label
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1
        AND w.int_teilnehmerid IS NOT NULL
        AND (w.int_startnummer IS NULL OR w.int_startnummer = 0)
        AND w.bol_startet_nicht IS NOT TRUE
      ORDER BY t.var_nachname
      LIMIT 5
    `, eventId)
    details = rows.map(r => ({ id: Number(r.id), label: String(r.label).trim() }))
  }

  return {
    id: 'missing_start_numbers',
    category: 'setup',
    severity: 'warning',
    status: count === 0 ? 'ok' : 'warning',
    affectedCount: count,
    details,
    actionRoute: '/event-participants',
    quickActionId: 'generate_start_numbers',
  }
}

// ============================================================================
// Check: Competitions without disciplines
// ============================================================================

export async function checkCompetitionsWithoutDisciplines(eventId: number): Promise<AnalyzerCheckResult> {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT wk.int_wettkaempfeid AS id, COALESCE(wk.var_name, 'WK ' || wk.int_wettkaempfeid) AS label
    FROM tfx_wettkaempfe wk
    LEFT JOIN tfx_wettkaempfe_x_disziplinen wxd
      ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
    WHERE wk.int_veranstaltungenid = $1
    GROUP BY wk.int_wettkaempfeid, wk.var_name
    HAVING COUNT(wxd.int_disziplinenid) = 0
    ORDER BY wk.var_name
  `, eventId)

  const count = rows.length

  return {
    id: 'competitions_without_disciplines',
    category: 'setup',
    severity: 'error',
    status: count === 0 ? 'ok' : 'error',
    affectedCount: count,
    details: rows.slice(0, 5).map(r => ({ id: Number(r.id), label: String(r.label) })),
    actionRoute: '/competitions',
  }
}

// ============================================================================
// Check: Disciplines without max score
// ============================================================================

export async function checkDisciplinesWithoutMaxScore(eventId: number): Promise<AnalyzerCheckResult> {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT wxd.int_wettkaempfe_x_disziplinenid AS id,
           COALESCE(d.var_name, 'Disziplin') || ' (' || COALESCE(wk.var_name, 'WK') || ')' AS label
    FROM tfx_wettkaempfe_x_disziplinen wxd
    JOIN tfx_wettkaempfe wk ON wxd.int_wettkaempfeid = wk.int_wettkaempfeid
    JOIN tfx_disziplinen d   ON wxd.int_disziplinenid = d.int_disziplinenid
    WHERE wk.int_veranstaltungenid = $1
      AND (wxd.rel_max IS NULL OR wxd.rel_max = 0)
    ORDER BY wk.var_name, d.var_name
  `, eventId)

  const count = rows.length

  return {
    id: 'disciplines_without_max_score',
    category: 'setup',
    severity: 'warning',
    status: count === 0 ? 'ok' : 'warning',
    affectedCount: count,
    details: rows.slice(0, 5).map(r => ({ id: Number(r.id), label: String(r.label) })),
    actionRoute: '/competitions',
  }
}

// ============================================================================
// Check: Gender / age mismatch
// ============================================================================

export async function checkGenderAgeMismatch(eventId: number): Promise<AnalyzerCheckResult> {
  const countRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) AS c
    FROM tfx_wertungen w
    JOIN tfx_wettkaempfe wk  ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    JOIN tfx_bereiche b       ON wk.int_bereicheid = b.int_bereicheid
    JOIN tfx_teilnehmer t     ON w.int_teilnehmerid = t.int_teilnehmerid
    WHERE wk.int_veranstaltungenid = $1
      AND w.int_teilnehmerid IS NOT NULL
      AND w.bol_startet_nicht IS NOT TRUE
      AND (
        (t.int_geschlecht = 1 AND b.bol_maennlich IS NOT TRUE)
        OR (t.int_geschlecht = 2 AND b.bol_weiblich IS NOT TRUE)
        OR (
          t.dat_geburtstag IS NOT NULL
          AND EXTRACT(YEAR FROM t.dat_geburtstag)::INTEGER < wk.yer_von
        )
        OR (
          t.dat_geburtstag IS NOT NULL
          AND wk.yer_bis IS NOT NULL
          AND EXTRACT(YEAR FROM t.dat_geburtstag)::INTEGER > wk.yer_bis
        )
      )
  `, eventId)

  const count = Number(countRows[0]?.c ?? 0)

  let details: AnalyzerDetail[] = []
  if (count > 0) {
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT w.int_wertungenid AS id,
             COALESCE(t.var_vorname, '') || ' ' || COALESCE(t.var_nachname, '')
               || ' → ' || COALESCE(wk.var_name, 'WK') AS label
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe wk  ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      JOIN tfx_bereiche b       ON wk.int_bereicheid = b.int_bereicheid
      JOIN tfx_teilnehmer t     ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1
        AND w.int_teilnehmerid IS NOT NULL
        AND w.bol_startet_nicht IS NOT TRUE
        AND (
          (t.int_geschlecht = 1 AND b.bol_maennlich IS NOT TRUE)
          OR (t.int_geschlecht = 2 AND b.bol_weiblich IS NOT TRUE)
          OR (
            t.dat_geburtstag IS NOT NULL
            AND EXTRACT(YEAR FROM t.dat_geburtstag)::INTEGER < wk.yer_von
          )
          OR (
            t.dat_geburtstag IS NOT NULL
            AND wk.yer_bis IS NOT NULL
            AND EXTRACT(YEAR FROM t.dat_geburtstag)::INTEGER > wk.yer_bis
          )
        )
      ORDER BY t.var_nachname
      LIMIT 5
    `, eventId)
    details = rows.map(r => ({ id: Number(r.id), label: String(r.label).trim() }))
  }

  return {
    id: 'gender_age_mismatch',
    category: 'setup',
    severity: 'error',
    status: count === 0 ? 'ok' : 'error',
    affectedCount: count,
    details,
    actionRoute: '/event-participants',
  }
}

// ============================================================================
// Check: Participants without squad (var_riege empty)
// ============================================================================

export async function checkParticipantsWithoutSquad(eventId: number): Promise<AnalyzerCheckResult> {
  const countRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) AS c
    FROM tfx_wertungen w
    JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    WHERE wk.int_veranstaltungenid = $1
      AND w.int_teilnehmerid IS NOT NULL
      AND w.bol_startet_nicht IS NOT TRUE
      AND (w.var_riege IS NULL OR TRIM(w.var_riege) = '')
  `, eventId)

  const count = Number(countRows[0]?.c ?? 0)

  let details: AnalyzerDetail[] = []
  if (count > 0) {
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT w.int_wertungenid AS id,
             COALESCE(t.var_vorname, '') || ' ' || COALESCE(t.var_nachname, '') AS label
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      JOIN tfx_teilnehmer t   ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE wk.int_veranstaltungenid = $1
        AND w.int_teilnehmerid IS NOT NULL
        AND w.bol_startet_nicht IS NOT TRUE
        AND (w.var_riege IS NULL OR TRIM(w.var_riege) = '')
      ORDER BY t.var_nachname
      LIMIT 5
    `, eventId)
    details = rows.map(r => ({ id: Number(r.id), label: String(r.label).trim() }))
  }

  return {
    id: 'participants_without_squad',
    category: 'squads',
    severity: 'warning',
    status: count === 0 ? 'ok' : 'warning',
    affectedCount: count,
    details,
    actionRoute: '/squads',
  }
}

// ============================================================================
// Check: Missing score details (participants missing at least one discipline)
// ============================================================================

export async function checkMissingScoreDetails(eventId: number): Promise<AnalyzerCheckResult> {
  const countRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(DISTINCT w.int_wertungenid) AS c
    FROM tfx_wertungen w
    JOIN tfx_wettkaempfe wk             ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
    LEFT JOIN tfx_wertungen_details wd
      ON wd.int_wertungenid  = w.int_wertungenid
     AND wd.int_disziplinenid = wxd.int_disziplinenid
    WHERE wk.int_veranstaltungenid = $1
      AND w.int_teilnehmerid IS NOT NULL
      AND w.bol_startet_nicht IS NOT TRUE
      AND wd.int_wertungen_detailsid IS NULL
  `, eventId)

  const count = Number(countRows[0]?.c ?? 0)

  let details: AnalyzerDetail[] = []
  if (count > 0) {
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT DISTINCT w.int_wertungenid AS id,
             COALESCE(t.var_vorname, '') || ' ' || COALESCE(t.var_nachname, '') AS label
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe wk             ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
      JOIN tfx_teilnehmer t               ON w.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_wertungen_details wd
        ON wd.int_wertungenid  = w.int_wertungenid
       AND wd.int_disziplinenid = wxd.int_disziplinenid
      WHERE wk.int_veranstaltungenid = $1
        AND w.int_teilnehmerid IS NOT NULL
        AND w.bol_startet_nicht IS NOT TRUE
        AND wd.int_wertungen_detailsid IS NULL
      ORDER BY label
      LIMIT 5
    `, eventId)
    details = rows.map(r => ({ id: Number(r.id), label: String(r.label).trim() }))
  }

  return {
    id: 'missing_score_details',
    category: 'capture',
    severity: 'info',
    status: count === 0 ? 'ok' : 'info',
    affectedCount: count,
    details,
    actionRoute: '/score-capture',
  }
}

// ============================================================================
// Check: Squad-discipline combination not generated
// ============================================================================

export async function checkSquadCombination(eventId: number): Promise<AnalyzerCheckResult> {
  // Count distinct squads that have been assigned to participants (var_riege set)
  const squadRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(DISTINCT w.var_riege) AS squad_count
    FROM tfx_wertungen w
    JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
    WHERE wk.int_veranstaltungenid = $1
      AND w.var_riege IS NOT NULL
      AND TRIM(w.var_riege) <> ''
  `, eventId)

  const squadCount = Number(squadRows[0]?.squad_count ?? 0)

  // No squads defined yet → ok (different check covers that)
  if (squadCount === 0) {
    return {
      id: 'squad_combination_not_generated',
      category: 'squads',
      severity: 'warning',
      status: 'ok',
      affectedCount: 0,
      details: [],
      actionRoute: '/squads',
      quickActionId: 'generate_squad_combination',
    }
  }

  // Check if any combination rows exist for this event
  const combinationRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) AS c
    FROM tfx_riegen_x_disziplinen
    WHERE int_veranstaltungenid = $1
  `, eventId)

  const combinationCount = Number(combinationRows[0]?.c ?? 0)
  const notGenerated = combinationCount === 0

  return {
    id: 'squad_combination_not_generated',
    category: 'squads',
    severity: 'warning',
    status: notGenerated ? 'warning' : 'ok',
    affectedCount: notGenerated ? squadCount : 0,
    details: [],
    actionRoute: '/squads',
    quickActionId: 'generate_squad_combination',
  }
}

// ============================================================================
// Check: Duplicate top-3 placements (tied ranks 1–3)
// ============================================================================

export async function checkDuplicateTopPlacements(eventId: number): Promise<AnalyzerCheckResult> {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`
    WITH scores AS (
      SELECT
        w.int_wertungenid,
        wk.int_wettkaempfeid,
        wk.var_name AS wk_name,
        SUM(wd.rel_leistung) AS total_score,
        RANK() OVER (
          PARTITION BY wk.int_wettkaempfeid
          ORDER BY SUM(wd.rel_leistung) DESC
        ) AS rnk
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe wk    ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      JOIN tfx_wertungen_details wd ON wd.int_wertungenid = w.int_wertungenid
      WHERE wk.int_veranstaltungenid = $1
        AND w.int_teilnehmerid IS NOT NULL
        AND w.bol_startet_nicht IS NOT TRUE
      GROUP BY w.int_wertungenid, wk.int_wettkaempfeid, wk.var_name
    ),
    tied AS (
      SELECT int_wettkaempfeid, wk_name, rnk, COUNT(*) AS tie_count
      FROM scores
      WHERE rnk <= 3
      GROUP BY int_wettkaempfeid, wk_name, rnk
      HAVING COUNT(*) > 1
    )
    SELECT int_wettkaempfeid AS id,
           COALESCE(wk_name, 'WK') || ' – Platz ' || rnk AS label
    FROM tied
    ORDER BY wk_name, rnk
  `, eventId)

  const count = rows.length

  return {
    id: 'duplicate_top_placements',
    category: 'results',
    severity: 'info',
    status: count === 0 ? 'ok' : 'info',
    affectedCount: count,
    details: rows.slice(0, 5).map(r => ({ id: Number(r.id), label: String(r.label) })),
    actionRoute: '/results',
  }
}

// ============================================================================
// Check: Competitions without start time (Point 110i)
// ============================================================================

export async function checkMissingStartTimes(eventId: number): Promise<AnalyzerCheckResult> {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT wk.int_wettkaempfeid AS id,
           COALESCE(wk.var_name, 'WK ' || wk.int_wettkaempfeid) AS label
    FROM tfx_wettkaempfe wk
    WHERE wk.int_veranstaltungenid = $1
      AND wk.tim_startzeit IS NULL
    ORDER BY wk.var_name
  `, eventId)

  const count = rows.length

  return {
    id: 'schedule_missing_start_times',
    category: 'schedule',
    severity: 'info',
    status: count === 0 ? 'ok' : 'info',
    affectedCount: count,
    details: rows.slice(0, 5).map(r => ({ id: Number(r.id), label: String(r.label) })),
    actionRoute: '/time-planning',
  }
}

// ============================================================================
// Check: Squad-discipline rotation matrix incomplete (Point 122i)
// ============================================================================

export async function checkScheduleMatrixIncomplete(eventId: number): Promise<AnalyzerCheckResult> {
  // Only relevant if the matrix has been generated at all
  const generatedRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) AS c FROM tfx_riegen_x_disziplinen WHERE int_veranstaltungenid = $1
  `, eventId)
  const generatedCount = Number(generatedRows[0]?.c ?? 0)

  if (generatedCount === 0) {
    // Matrix not generated yet → handled by squad_combination_not_generated check
    return {
      id: 'schedule_matrix_incomplete',
      category: 'schedule',
      severity: 'warning',
      status: 'ok',
      affectedCount: 0,
      details: [],
      actionRoute: '/time-planning',
    }
  }

  // Compare expected count (squads × disciplines) vs actual assignments
  const countRows: any[] = await (prisma as any).$queryRawUnsafe(`
    WITH expected_squads AS (
      SELECT DISTINCT w.var_riege
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
        AND w.var_riege IS NOT NULL AND TRIM(w.var_riege) <> ''
    ),
    expected_disciplines AS (
      SELECT DISTINCT wxd.int_disziplinenid
      FROM tfx_wettkaempfe_x_disziplinen wxd
      JOIN tfx_wettkaempfe wk ON wxd.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
    ),
    actual_assignments AS (
      SELECT DISTINCT var_riege, int_disziplinenid
      FROM tfx_riegen_x_disziplinen
      WHERE int_veranstaltungenid = $1
        AND var_riege IS NOT NULL
    )
    SELECT
      (SELECT COUNT(*) FROM expected_squads) * (SELECT COUNT(*) FROM expected_disciplines) AS expected,
      (SELECT COUNT(*) FROM actual_assignments) AS actual
  `, eventId)

  const expected = Number(countRows[0]?.expected ?? 0)
  const actual   = Number(countRows[0]?.actual ?? 0)
  const missing  = expected > actual ? expected - actual : 0

  let details: AnalyzerDetail[] = []
  if (missing > 0) {
    const detailRows: any[] = await (prisma as any).$queryRawUnsafe(`
      WITH expected_squads AS (
        SELECT DISTINCT w.var_riege
        FROM tfx_wertungen w
        JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
        WHERE wk.int_veranstaltungenid = $1
          AND w.var_riege IS NOT NULL AND TRIM(w.var_riege) <> ''
      ),
      expected_disciplines AS (
        SELECT DISTINCT wxd.int_disziplinenid, d.var_name AS disziplin_name
        FROM tfx_wettkaempfe_x_disziplinen wxd
        JOIN tfx_wettkaempfe wk ON wxd.int_wettkaempfeid = wk.int_wettkaempfeid
        JOIN tfx_disziplinen d  ON wxd.int_disziplinenid = d.int_disziplinenid
        WHERE wk.int_veranstaltungenid = $1
      ),
      expected_pairs AS (
        SELECT s.var_riege, ed.int_disziplinenid, ed.disziplin_name
        FROM expected_squads s CROSS JOIN expected_disciplines ed
      ),
      actual_assignments AS (
        SELECT DISTINCT var_riege, int_disziplinenid
        FROM tfx_riegen_x_disziplinen
        WHERE int_veranstaltungenid = $1 AND var_riege IS NOT NULL
      )
      SELECT ROW_NUMBER() OVER () AS id,
             ep.var_riege || ' → ' || ep.disziplin_name AS label
      FROM expected_pairs ep
      LEFT JOIN actual_assignments aa
        ON ep.var_riege = aa.var_riege AND ep.int_disziplinenid = aa.int_disziplinenid
      WHERE aa.var_riege IS NULL
      ORDER BY ep.var_riege, ep.disziplin_name
      LIMIT 5
    `, eventId)
    details = detailRows.map(r => ({ id: Number(r.id), label: String(r.label) }))
  }

  return {
    id: 'schedule_matrix_incomplete',
    category: 'schedule',
    severity: 'warning',
    status: missing === 0 ? 'ok' : 'warning',
    affectedCount: missing,
    details,
    actionRoute: '/time-planning',
  }
}

// ============================================================================
// Check: Participants without valid competition assignment (data integrity)
// ============================================================================

export async function checkParticipantsWithoutCompetition(eventId: number): Promise<AnalyzerCheckResult> {
  const countRows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COUNT(*) AS c
    FROM tfx_wertungen w
    WHERE w.int_teilnehmerid IS NOT NULL
      AND w.bol_startet_nicht IS NOT TRUE
      AND NOT EXISTS (
        SELECT 1 FROM tfx_wettkaempfe wk
        WHERE wk.int_wettkaempfeid = w.int_wettkaempfeid
          AND wk.int_veranstaltungenid = $1
      )
  `, eventId)

  const count = Number(countRows[0]?.c ?? 0)

  let details: AnalyzerDetail[] = []
  if (count > 0) {
    const rows: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT w.int_wertungenid AS id,
             COALESCE(t.var_vorname, '') || ' ' || COALESCE(t.var_nachname, '') AS label
      FROM tfx_wertungen w
      JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      WHERE w.int_teilnehmerid IS NOT NULL
        AND w.bol_startet_nicht IS NOT TRUE
        AND NOT EXISTS (
          SELECT 1 FROM tfx_wettkaempfe wk
          WHERE wk.int_wettkaempfeid = w.int_wettkaempfeid
            AND wk.int_veranstaltungenid = $1
        )
      ORDER BY t.var_nachname
      LIMIT 5
    `, eventId)
    details = rows.map(r => ({ id: Number(r.id), label: String(r.label).trim() }))
  }

  return {
    id: 'participants_without_competition',
    category: 'setup',
    severity: 'error',
    status: count === 0 ? 'ok' : 'error',
    affectedCount: count,
    details,
    actionRoute: '/event-participants',
  }
}

// ============================================================================
// Check: Competitions without participants
// ============================================================================

export async function checkCompetitionsWithoutParticipants(eventId: number): Promise<AnalyzerCheckResult> {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT wk.int_wettkaempfeid AS id,
           COALESCE(wk.var_name, 'WK ' || wk.int_wettkaempfeid) AS label
    FROM tfx_wettkaempfe wk
    WHERE wk.int_veranstaltungenid = $1
      AND NOT EXISTS (
        SELECT 1 FROM tfx_wertungen w
        WHERE w.int_wettkaempfeid = wk.int_wettkaempfeid
          AND w.int_teilnehmerid IS NOT NULL
          AND w.bol_startet_nicht IS NOT TRUE
      )
    ORDER BY wk.var_name
  `, eventId)

  const count = rows.length

  return {
    id: 'competitions_without_participants',
    category: 'setup',
    severity: 'warning',
    status: count === 0 ? 'ok' : 'warning',
    affectedCount: count,
    details: rows.slice(0, 5).map(r => ({ id: Number(r.id), label: String(r.label) })),
    actionRoute: '/event-participants',
  }
}

// ============================================================================
// Check: Competitions without a round (Durchgang) configured
// ============================================================================

export async function checkCompetitionsWithoutRound(eventId: number): Promise<AnalyzerCheckResult> {
  const rows: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT wk.int_wettkaempfeid AS id,
           COALESCE(wk.var_name, 'WK ' || wk.int_wettkaempfeid) AS label
    FROM tfx_wettkaempfe wk
    WHERE wk.int_veranstaltungenid = $1
      AND (wk.int_durchgang IS NULL OR wk.int_durchgang = 0)
    ORDER BY wk.var_name
  `, eventId)

  const count = rows.length

  return {
    id: 'competitions_without_round',
    category: 'schedule',
    severity: 'info',
    status: count === 0 ? 'ok' : 'info',
    affectedCount: count,
    details: rows.slice(0, 5).map(r => ({ id: Number(r.id), label: String(r.label) })),
    actionRoute: '/time-planning',
  }
}

export default router
