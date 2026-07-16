/**
 * Event scoring mode policy helpers.
 *
 * The scoring mode is stored in tfx_veranstaltungen.var_verwendungszweck as:
 *   TFX_SCORING_MODE:<mode>
 *
 * This avoids schema changes while keeping the policy event-scoped.
 */

import prisma from '../lib/prisma';

export type EventScoringMode = 'formula_based' | 'final_only';

export const EVENT_SCORING_MODE_TOKEN = 'TFX_SCORING_MODE:';
export const DEFAULT_EVENT_SCORING_MODE: EventScoringMode = 'formula_based';

export function normalizeImportScoringMode(value: unknown): EventScoringMode {
  if (value === 'final_only') return 'final_only';
  return 'formula_based';
}

export function parseEventScoringMode(rawPurpose: string | null | undefined): EventScoringMode {
  if (!rawPurpose) return DEFAULT_EVENT_SCORING_MODE;

  const match = rawPurpose.match(/TFX_SCORING_MODE:(formula_based|final_only)/i);
  if (!match || !match[1]) return DEFAULT_EVENT_SCORING_MODE;

  return normalizeImportScoringMode(match[1].toLowerCase());
}

export function withEventScoringMode(rawPurpose: string | null | undefined, mode: EventScoringMode): string {
  const source = (rawPurpose || '').trim();
  const cleaned = source
    .replace(/\s*;?\s*TFX_SCORING_MODE:(formula_based|final_only)\s*;?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const token = `${EVENT_SCORING_MODE_TOKEN}${mode}`;
  return cleaned ? `${cleaned}; ${token}` : token;
}

export async function getEventScoringModeByCompetitionId(competitionId: number): Promise<EventScoringMode> {
  if (!competitionId || Number.isNaN(competitionId)) return DEFAULT_EVENT_SCORING_MODE;

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT v.var_verwendungszweck
      FROM tfx_wettkaempfe w
      INNER JOIN tfx_veranstaltungen v ON v.int_veranstaltungenid = w.int_veranstaltungenid
      WHERE w.int_wettkaempfeid = $1
      LIMIT 1
    `,
    competitionId
  ) as Array<{ var_verwendungszweck: string | null }>;

  return parseEventScoringMode(rows[0]?.var_verwendungszweck);
}

export async function getEventScoringModeByWertungenId(wertungenId: number): Promise<EventScoringMode> {
  if (!wertungenId || Number.isNaN(wertungenId)) return DEFAULT_EVENT_SCORING_MODE;

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT v.var_verwendungszweck
      FROM tfx_wertungen wr
      INNER JOIN tfx_wettkaempfe w ON w.int_wettkaempfeid = wr.int_wettkaempfeid
      INNER JOIN tfx_veranstaltungen v ON v.int_veranstaltungenid = w.int_veranstaltungenid
      WHERE wr.int_wertungenid = $1
      LIMIT 1
    `,
    wertungenId
  ) as Array<{ var_verwendungszweck: string | null }>;

  return parseEventScoringMode(rows[0]?.var_verwendungszweck);
}

export function shouldUseFormulaCalculation(mode: EventScoringMode): boolean {
  return mode === 'formula_based';
}
