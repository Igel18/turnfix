import prisma from '../lib/prisma';
import { effectiveDisciplineScore, recalculateLinkedScore, type EffectiveScoreJuryResult } from '@turnfix/shared';
import { parseEventScoringMode, shouldUseFormulaCalculation } from './eventScoringMode';

export interface EffectiveDisciplineScoreRow {
  competitionId: number;
  wertungenId: number;
  participantId: number;
  disciplineId: number;
  rawScore: number | null;
  /** Final score after the linked formula (A+B-C) is recalculated from the jury fields */
  calculatedScore: number | null;
  /** Calculated score with the built-in formula applied, as on the results page */
  effectiveScore: number | null;
}

/** Latest score per participant and discipline of the given competitions, with effective values. */
export async function loadEffectiveDisciplineScores(competitionIds: number[]): Promise<EffectiveDisciplineScoreRow[]> {
  if (competitionIds.length === 0) return [];

  const [scoreRows, modeRows] = await Promise.all([
    prisma.$queryRawUnsafe(`
      WITH latest_scores AS (
        SELECT
          wr.int_wettkaempfeid,
          wr.int_wertungenid,
          wr.int_teilnehmerid,
          wd.int_disziplinenid,
          wd.rel_leistung,
          ROW_NUMBER() OVER (
            PARTITION BY wr.int_wettkaempfeid, wr.int_teilnehmerid, wd.int_disziplinenid
            ORDER BY COALESCE(wd.int_versuch, 0) DESC, wd.int_wertungen_detailsid DESC
          ) AS rn
        FROM tfx_wertungen_details wd
        JOIN tfx_wertungen wr ON wr.int_wertungenid = wd.int_wertungenid
        WHERE wr.int_wettkaempfeid = ANY($1::int[])
          AND COALESCE(wd.int_kp, 0) = 0
      )
      SELECT
        ls.int_wettkaempfeid,
        ls.int_wertungenid,
        ls.int_teilnehmerid,
        ls.int_disziplinenid,
        ls.rel_leistung,
        COALESCE(f.var_formel, d.var_formel) AS linked_formula,
        d.var_formel AS builtin_formula
      FROM latest_scores ls
      JOIN tfx_disziplinen d ON d.int_disziplinenid = ls.int_disziplinenid
      LEFT JOIN tfx_formeln f ON f.int_formelid = d.int_formelid
      WHERE ls.rn = 1
      ORDER BY ls.int_wettkaempfeid, ls.int_teilnehmerid, ls.int_disziplinenid
    `, competitionIds) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      SELECT w.int_wettkaempfeid, v.var_verwendungszweck
      FROM tfx_wettkaempfe w
      JOIN tfx_veranstaltungen v ON v.int_veranstaltungenid = w.int_veranstaltungenid
      WHERE w.int_wettkaempfeid = ANY($1::int[])
    `, competitionIds) as Promise<any[]>,
  ]);

  const formulasEnabledByCompetition = new Map<number, boolean>(
    modeRows.map(row => [row.int_wettkaempfeid, shouldUseFormulaCalculation(parseEventScoringMode(row.var_verwendungszweck))])
  );

  const wertungenIds = [...new Set(scoreRows.map(row => row.int_wertungenid as number))];
  const juryRows: any[] = wertungenIds.length === 0 ? [] : await prisma.$queryRawUnsafe(`
    SELECT
      jr.int_wertungenid,
      df.int_disziplinenid,
      jr.rel_leistung AS performance,
      df.var_name,
      df.bol_endwert,
      df.bol_ausgangswert,
      df.int_sortierung
    FROM tfx_jury_results jr
    JOIN tfx_disziplinen_felder df ON df.int_disziplinen_felderid = jr.int_disziplinen_felderid
    WHERE jr.int_wertungenid = ANY($1::int[])
    ORDER BY df.int_sortierung ASC, df.bol_ausgangswert DESC, df.bol_endwert DESC, df.int_disziplinen_felderid
  `, wertungenIds) as any[];

  const juryByWertungAndDiscipline = new Map<string, EffectiveScoreJuryResult[]>();
  for (const row of juryRows) {
    const key = `${row.int_wertungenid}:${row.int_disziplinenid}`;
    const results = juryByWertungAndDiscipline.get(key) ?? [];
    results.push({
      fieldName: row.var_name,
      fieldShortName: row.var_name,
      performance: row.performance === null || row.performance === undefined ? null : Number(row.performance),
      isFinalScore: row.bol_endwert === true,
      isStartingScore: row.bol_ausgangswert === true,
      sortOrder: row.int_sortierung ?? undefined,
    });
    juryByWertungAndDiscipline.set(key, results);
  }

  return scoreRows.map(row => {
    const rawScore = row.rel_leistung === null || row.rel_leistung === undefined ? null : Number(row.rel_leistung);
    const formulasEnabled = formulasEnabledByCompetition.get(row.int_wettkaempfeid) ?? true;
    const juryResults = juryByWertungAndDiscipline.get(`${row.int_wertungenid}:${row.int_disziplinenid}`);

    return {
      competitionId: row.int_wettkaempfeid,
      wertungenId: row.int_wertungenid,
      participantId: row.int_teilnehmerid,
      disciplineId: row.int_disziplinenid,
      rawScore,
      calculatedScore: rawScore === null ? null : recalculateLinkedScore(rawScore, juryResults, row.linked_formula),
      effectiveScore: rawScore === null ? null : effectiveDisciplineScore({
        storedScore: rawScore,
        juryResults,
        linkedFormula: row.linked_formula,
        builtInFormula: formulasEnabled ? row.builtin_formula : null,
      }),
    };
  });
}
