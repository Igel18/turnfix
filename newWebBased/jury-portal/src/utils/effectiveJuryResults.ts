/**
 * Pure function to compute the effective jury results (initialValues)
 * that should be passed to FormulaInput.
 *
 * Extracted from useJuryData's useMemo for unit-testability (TDD).
 *
 * Decision table:
 * ┌────────────────────┬──────────────────┬─────────────────────────────┐
 * │ Formula type       │ Has score?       │ Result                      │
 * ├────────────────────┼──────────────────┼─────────────────────────────┤
 * │ Built-in (1*x)     │ Yes              │ {x: score} (synchronous)    │
 * │ Built-in (1*x)     │ No               │ {} (empty)                  │
 * │ Linked (A+B)       │ —                │ loadedJuryResults (async)   │
 * │ None               │ —                │ {} (empty)                  │
 * └────────────────────┴──────────────────┴─────────────────────────────┘
 *
 * KEY INSIGHT: Built-in formulas (lowercase vars like "x") store the raw
 * input value as currentScore. Discipline fields may exist but are
 * irrelevant for built-in formula mapping — the stored score IS the value.
 */

import { extractFormulaSymbols, getBuiltInFormulaInitialValues } from '@turnfix/shared';

interface EffectiveParticipant {
  currentScore?: number | null;
}

/**
 * Compute the initialValues that FormulaInput should receive.
 *
 * @param currentParticipant  The currently selected participant (may be undefined)
 * @param formula             The discipline's var_formel (e.g. "1*x", "A+B", null)
 * @param disciplineFieldCount Number of enabled discipline fields
 * @param loadedJuryResults   Async-loaded jury detail results (for linked formulas)
 * @returns Record mapping formula symbols to numeric values
 */
export function computeEffectiveJuryResults(
  currentParticipant: EffectiveParticipant | undefined,
  formula: string | null | undefined,
  _disciplineFieldCount: number,
  loadedJuryResults: Record<string, number>
): Record<string, number> {
  if (!currentParticipant) return {};
  if (!formula) return {};

  // Detect formula type by checking for lowercase variables
  const symbols = extractFormulaSymbols(formula);
  const hasLowercaseVars = symbols.some(s => /^[a-z]$/.test(s));

  if (hasLowercaseVars) {
    // Built-in formula: the stored currentScore IS the raw variable value.
    // We compute this synchronously — no need for async jury-results loading.
    // IMPORTANT: Pass disciplineFieldCount=0 to bypass the linked-formula guard
    // in getBuiltInFormulaInitialValues, because built-in formulas should always
    // map from currentScore regardless of whether discipline fields exist.
    if (currentParticipant.currentScore != null) {
      const builtInValues = getBuiltInFormulaInitialValues(
        formula,
        currentParticipant.currentScore,
        0 // Force built-in mapping — discipline fields are irrelevant for built-in formulas
      );
      if (Object.keys(builtInValues).length > 0) {
        return builtInValues;
      }
    }
    return {}; // No score yet
  }

  // Linked formula (uppercase vars like A, B, C): use async-loaded jury results
  return loadedJuryResults;
}
