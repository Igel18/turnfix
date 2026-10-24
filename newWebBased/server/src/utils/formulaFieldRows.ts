import type { PrismaClient } from '@prisma/client';

// Rows are ordered so the newest row of a field comes last (buildFieldSymbolsMap keeps the last per fieldId).
export const FORMULA_FIELD_ROWS_SQL = `
  SELECT
    jr.rel_leistung as performance,
    df.int_disziplinen_felderid as "fieldId",
    df.var_name as "fieldName",
    df.var_name as "fieldShortName",
    df.int_sortierung as "sortOrder",
    df.bol_endwert as "isFinalScore",
    df.bol_ausgangswert as "isStartingScore"
  FROM tfx_jury_results jr
  INNER JOIN tfx_disziplinen_felder df ON jr.int_disziplinen_felderid = df.int_disziplinen_felderid
  WHERE jr.int_wertungenid = $1
    AND df.int_disziplinenid = $2
    AND jr.int_versuch = $3
    AND df.bol_enabled = true
  ORDER BY df.int_sortierung ASC, df.int_disziplinen_felderid ASC, jr.int_juryresultsid ASC
`;

export const fetchFormulaFieldRows = (
  prisma: Pick<PrismaClient, '$queryRawUnsafe'>,
  wertungenId: number,
  disciplineId: number,
  attempt: number
): Promise<any[]> =>
  prisma.$queryRawUnsafe(FORMULA_FIELD_ROWS_SQL, wertungenId, disciplineId, attempt) as Promise<any[]>;
