import {
  applyBuiltInFormula,
  buildFieldSymbolsMap,
  calculateFormula,
  detectFormulaType,
} from './formulaUtils';

export interface EffectiveScoreJuryResult {
  fieldId?: number;
  fieldName?: string;
  fieldShortName?: string;
  performance: number | null;
  isFinalScore?: boolean;
  isStartingScore?: boolean;
  sortOrder?: number;
}

export interface EffectiveDisciplineScoreInput {
  /** rel_leistung as stored */
  storedScore: number;
  juryResults?: EffectiveScoreJuryResult[];
  /** Linked formula with uppercase fields (A+B-C) or a variable formula (x) */
  linkedFormula?: string | null;
  /** The discipline's own var_formel, applied at ranking time */
  builtInFormula?: string | null;
}

/** Recalculates a linked formula (A+B-C) from the jury fields; otherwise returns the stored score. */
export function recalculateLinkedScore(
  storedScore: number,
  juryResults: EffectiveScoreJuryResult[] | undefined,
  linkedFormula: string | null | undefined
): number {
  const formula = (linkedFormula || '').trim();
  if (!formula || detectFormulaType(formula) !== 'letter') return storedScore;
  if (!Array.isArray(juryResults) || juryResults.length === 0) return storedScore;

  const fields = Object.values(buildFieldSymbolsMap(juryResults, formula));
  if (fields.length === 0) return storedScore;

  const values: Record<string, number> = {};
  fields.forEach(field => {
    if (field.value !== null) values[field.symbol] = field.value;
  });

  const calculated = calculateFormula(formula, values);
  return calculated !== null ? calculated : storedScore;
}

/**
 * The score of one discipline as used for totals and placements:
 * stored score, linked formula recalculated from the jury fields, then the built-in formula.
 * Results view, exports and medals must all use this.
 */
export function effectiveDisciplineScore({
  storedScore,
  juryResults,
  linkedFormula,
  builtInFormula,
}: EffectiveDisciplineScoreInput): number {
  const recalculated = recalculateLinkedScore(storedScore, juryResults, linkedFormula);
  return builtInFormula ? applyBuiltInFormula(builtInFormula, recalculated) : recalculated;
}
