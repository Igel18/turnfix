import { recalculateLinkedScore } from '@turnfix/shared';

interface ScoreRecordLike {
  score?: number | string | null;
  formula?: string | null;
  juryResults?: Array<any>;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeEffectiveParticipantScore(record: ScoreRecordLike | null | undefined): number | null {
  if (!record) return null;

  // NaN marks "no stored score" so an unchanged result maps back to null
  const result = recalculateLinkedScore(toNumber(record.score) ?? NaN, record.juryResults, record.formula);
  return Number.isNaN(result) ? null : result;
}
