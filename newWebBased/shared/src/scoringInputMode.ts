import { detectFormulaType } from './formulaUtils';

export type ScoringInputMode = 'linkedFormula' | 'builtInFormula' | 'simple';

export interface ResolveScoringInputModeOptions {
  formula?: string | null;
  formulaId?: number | null;
}

export function resolveScoringInputMode(options: ResolveScoringInputModeOptions): ScoringInputMode {
  const formula = options.formula || '';
  const hasLinkedFormula = Boolean(options.formulaId);
  const formulaType = detectFormulaType(formula);

  if (formulaType === 'letter') {
    return 'linkedFormula';
  }

  if (formulaType === 'variable') {
    return 'builtInFormula';
  }

  if (hasLinkedFormula) {
    return 'linkedFormula';
  }

  return 'simple';
}
