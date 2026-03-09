import { buildFieldSymbolsMap, calculateFormula, detectFormulaType } from '@turnfix/shared';

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

  const storedScore = toNumber(record.score);
  const formula = (record.formula || '').trim();

  if (!formula || detectFormulaType(formula) !== 'letter') {
    return storedScore;
  }

  if (!Array.isArray(record.juryResults) || record.juryResults.length === 0) {
    return storedScore;
  }

  const fieldsMap = buildFieldSymbolsMap(record.juryResults, formula);
  const valuesMap: Record<string, number> = {};

  Object.values(fieldsMap).forEach(field => {
    if (field.value !== null) {
      valuesMap[field.symbol] = field.value;
    }
  });

  const calculated = calculateFormula(formula, valuesMap);
  return calculated !== null ? calculated : storedScore;
}
