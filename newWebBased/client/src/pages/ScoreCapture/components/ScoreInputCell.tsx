/**
 * ScoreInputCell Component
 * Point 135: Formula-based Score Input
 * 
 * Renders by formula mode:
 * - linkedFormula: FormulaInput with all configured fields
 * - builtInFormula: BuiltInFormulaInput (shared component) with x + formula + result
 * - simple: Direct endwert input
 */

import { memo, useState, useEffect, useRef } from 'react';
import { FormulaInput } from '@/components/FormulaInput';
import { applyBuiltInFormula, detectFormulaType } from '@/utils/formulaUtils';
import { normalizeValueForCalculation } from '@/utils/formulaCalculator';
import { resolveScoringInputMode, BuiltInFormulaInput } from '@turnfix/shared';
import type { Discipline, DisciplineField } from '@/types/ScoreCapture.types';

const linkedFormulaCache = new Map<number, string>();
const linkedFormulaInFlight = new Map<number, Promise<string>>();

type JuryResultsByParticipant = Record<number, Record<number, string>>;
const juryResultsRequestCache = new Map<string, { timestamp: number; byParticipant: JuryResultsByParticipant }>();
const juryResultsInFlight = new Map<string, Promise<JuryResultsByParticipant>>();
const JURY_RESULTS_CACHE_TTL_MS = 10000;

async function fetchJuryResultsByEventAndDiscipline(eventId: string | number, disciplineId: number | string): Promise<JuryResultsByParticipant> {
  const cacheKey = `${eventId}-${disciplineId}`;
  const now = Date.now();
  const cached = juryResultsRequestCache.get(cacheKey);

  if (cached && (now - cached.timestamp) < JURY_RESULTS_CACHE_TTL_MS) {
    return cached.byParticipant;
  }

  const inFlight = juryResultsInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    const limit = 500;
    let offset = 0;
    let hasMore = true;
    const byParticipant: JuryResultsByParticipant = {};

    while (hasMore) {
      const response = await fetch(`/api/jury-results?eventId=${eventId}&disciplineId=${disciplineId}&limit=${limit}&offset=${offset}`);
      const data = await response.json();
      const pageResults = Array.isArray(data?.results) ? data.results : [];

      for (const result of pageResults) {
        const participantId = Number(result?.participantId);
        const fieldId = Number(result?.disciplineFieldId);
        if (!participantId || !fieldId) continue;

        if (!byParticipant[participantId]) {
          byParticipant[participantId] = {};
        }
        byParticipant[participantId][fieldId] = result?.performance?.toString() || '';
      }

      if (data?.pagination?.hasMore && pageResults.length > 0) {
        offset += limit;
      } else {
        hasMore = false;
      }
    }

    juryResultsRequestCache.set(cacheKey, { timestamp: Date.now(), byParticipant });
    return byParticipant;
  })();

  juryResultsInFlight.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    juryResultsInFlight.delete(cacheKey);
  }
}

export function parseBuiltInFormulaInputValue(scoreValue: string): number {
  if (!scoreValue || scoreValue.trim() === '') {
    return 0;
  }

  const normalized = normalizeValueForCalculation(scoreValue);
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? 0 : parsed;
}

interface ScoreInputCellProps {
  participantId: number;
  eventId?: string | number;
  discipline: Discipline;
  disciplineFields: DisciplineField[];
  scoreValue: string;
  wertungenId?: number; // Added: needed to load/save jury results
  onScoreChange: (participantId: number, disciplineId: number | string, value: string) => void;
  onSave: (participantId: number, disciplineId: number | string, overrideScoreValue?: string | number) => Promise<number | null | void>;
  onFieldSave: (participantId: number, field: DisciplineField, value: string) => Promise<void>;
  normalizeScoreInput: (value: string, decimalPlaces: number) => string;
  getScorePlaceholder: (decimalPlaces: number) => string;
  validation: { isValid: boolean; message?: string };
}

export const ScoreInputCell = memo(({
  participantId,
  eventId,
  discipline,
  disciplineFields,
  scoreValue,
  wertungenId,
  onScoreChange,
  onSave,
  onFieldSave: _onFieldSave,
  normalizeScoreInput,
  getScorePlaceholder,
  validation
}: ScoreInputCellProps) => {
  const disciplineId = discipline.int_disziplinid || discipline.var_name;
  const decimalPlaces = discipline.int_berechnung || 2;
  const enabledFields = disciplineFields.filter(
    (field) => field.disciplineId === disciplineId && field.enabled
  );
  const formula = (discipline as any).var_formel as string | undefined;
  const formulaId = (discipline as any).int_formelid as number | null | undefined;
  const [resolvedFormula, setResolvedFormula] = useState<string>(formula || '');

  useEffect(() => {
    let isActive = true;

    const loadResolvedFormula = async () => {
      if (!formulaId) {
        if (isActive) {
          setResolvedFormula(formula || '');
        }
        return;
      }

      if (linkedFormulaCache.has(formulaId)) {
        if (isActive) {
          setResolvedFormula(linkedFormulaCache.get(formulaId) || formula || '');
        }
        return;
      }

      const inflight = linkedFormulaInFlight.get(formulaId);
      if (inflight) {
        try {
          const linkedFormula = await inflight;
          if (isActive) {
            setResolvedFormula(linkedFormula || formula || '');
          }
        } catch {
          if (isActive) {
            setResolvedFormula(formula || '');
          }
        }
        return;
      }

      try {
        const request = fetch(`/api/formulas/${formulaId}`)
          .then(response => response.json())
          .then(formulaData => formulaData?.var_formel || formula || '');

        linkedFormulaInFlight.set(formulaId, request);
        const linkedFormula = await request;
        linkedFormulaCache.set(formulaId, linkedFormula);
        if (isActive) {
          setResolvedFormula(linkedFormula);
        }
      } catch {
        if (isActive) {
          setResolvedFormula(formula || '');
        }
      } finally {
        linkedFormulaInFlight.delete(formulaId);
      }
    };

    loadResolvedFormula();

    return () => {
      isActive = false;
    };
  }, [formulaId, formula]);

  const mode = resolveScoringInputMode({
    formula: resolvedFormula || '',
      formulaId: formulaId || null
  });

  // Formula fields are always shown based on scoring mode (Point 62)
  const isLinkedFormulaMode = mode === 'linkedFormula';
  const isBuiltInFormulaMode = mode === 'builtInFormula';
  const [initialFieldValues, setInitialFieldValues] = useState<Record<number, string>>({});
  const [loadingValues, setLoadingValues] = useState(false);
  const lastCalculatedValue = useRef<string | null>(null);

  // Load existing jury results in linked formula mode
  useEffect(() => {
    if (!isLinkedFormulaMode || !wertungenId || enabledFields.length === 0) {
      return;
    }

    setLoadingValues(true);
    
    const loadResults = eventId
      ? fetchJuryResultsByEventAndDiscipline(eventId, disciplineId)
      : fetch(`/api/jury-results?participantId=${wertungenId}&disciplineId=${disciplineId}`)
          .then(res => res.json())
          .then(data => {
            const results = Array.isArray(data?.results) ? data.results : [];
            const byParticipant: JuryResultsByParticipant = {};
            for (const result of results) {
              const participantId = Number(result?.participantId);
              const fieldId = Number(result?.disciplineFieldId);
              if (!participantId || !fieldId) continue;

              if (!byParticipant[participantId]) {
                byParticipant[participantId] = {};
              }
              byParticipant[participantId][fieldId] = result?.performance?.toString() || '';
            }
            return byParticipant;
          });

    loadResults
      .then((byParticipant) => {
        const values = byParticipant[Number(wertungenId)] || {};
        setInitialFieldValues(values);
      })
      .catch(error => {
        console.error('❌ Error loading jury results:', error);
      })
      .finally(() => {
        setLoadingValues(false);
      });
  }, [isLinkedFormulaMode, wertungenId, disciplineId, enabledFields.length, eventId]);

  // Detect built-in formula (lowercase variable like "x" in "20-x", "(((1000/x)-2,158)/0,006)/49")
  const activeFormula = resolvedFormula || formula || '';
  const hasBuiltInFormula = isBuiltInFormulaMode && activeFormula && detectFormulaType(activeFormula) === 'variable';

  const rawNumericValue = parseBuiltInFormulaInputValue(scoreValue);
  const calculatedResult = hasBuiltInFormula && scoreValue !== ''
    ? applyBuiltInFormula(activeFormula, rawNumericValue)
    : null;

  // builtInFormula: Use shared BuiltInFormulaInput component
  if (isBuiltInFormulaMode && hasBuiltInFormula) {
    return (
      <BuiltInFormulaInput
        formula={activeFormula}
        variable="x"
        value={scoreValue}
        calculatedResult={calculatedResult}
        decimalPlaces={decimalPlaces}
        unit={(discipline as any).var_einheit || ''}
        maxScore={discipline.maxScore}
        placeholder={getScorePlaceholder(decimalPlaces)}
        onChange={(value) => onScoreChange(participantId, disciplineId, value)}
        onBlur={() => {
          const normalized = normalizeScoreInput(scoreValue, decimalPlaces);
          if (normalized !== scoreValue) {
            onScoreChange(participantId, disciplineId, normalized);
          }
          onSave(participantId, disciplineId, normalized);
        }}
        onEnter={() => {
          const normalized = normalizeScoreInput(scoreValue, decimalPlaces);
          if (normalized !== scoreValue) {
            onScoreChange(participantId, disciplineId, normalized);
          }
          onSave(participantId, disciplineId, normalized);
        }}
        validation={validation}
        variant="capture"
        compact={true}
        showFormulaDisplay={false}
        dataParticipant={participantId}
        dataDiscipline={disciplineId}
      />
    );
  }

  // simple: direct input; no formula
  if (!isLinkedFormulaMode) {
    return (
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={scoreValue}
          onChange={(e) => onScoreChange(participantId, disciplineId, e.target.value)}
          onBlur={(e) => {
            // Normalize score to show all decimal places
            const normalized = normalizeScoreInput(e.target.value, decimalPlaces);
            if (normalized !== e.target.value) {
              onScoreChange(participantId, disciplineId, normalized);
            }
            onSave(participantId, disciplineId, normalized);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Normalize and save
              const normalized = normalizeScoreInput(e.currentTarget.value, decimalPlaces);
              if (normalized !== e.currentTarget.value) {
                onScoreChange(participantId, disciplineId, normalized);
              }
              onSave(participantId, disciplineId, normalized);
              // Blur the input field
              e.currentTarget.blur();
            }
          }}
          data-participant={participantId}
          data-discipline={disciplineId}
          className={`w-20 px-2 py-1 text-sm border rounded focus:ring-2 focus:border-transparent ${
            validation.isValid
              ? 'border-gray-300 focus:ring-blue-500'
              : 'border-red-300 bg-red-50 focus:ring-red-500'
          }`}
          placeholder={getScorePlaceholder(decimalPlaces)}
          title={!validation.isValid ? validation.message : ''}
        />
        {!validation.isValid && (
          <div className="absolute -bottom-6 left-0 right-0 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 z-10 whitespace-nowrap">
            ⚠️ {validation.message}
          </div>
        )}
        {discipline.maxScore && discipline.maxScore > 0 && (
          <div className="absolute -top-6 left-0 right-0 text-xs text-gray-500 whitespace-nowrap">
            Max: {discipline.maxScore.toFixed(2)}
          </div>
        )}
      </div>
    );
  }

  // linkedFormula mode: Multi-field input with formula

  if (enabledFields.length === 0) {
    return (
      <div className="text-xs text-gray-400 text-center italic">
        Keine Felder konfiguriert
      </div>
    );
  }

  if (loadingValues) {
    return (
      <div className="text-xs text-gray-500 text-center italic">
        Lade Werte...
      </div>
    );
  }

  // Use FormulaInput for inline display (same as Formula Calculation Test)
  return (
    <div className="w-full">
      <FormulaInput
        inputMask={(discipline as any).var_eingabemaske || ''}
        formula={activeFormula}
        formulaId={(discipline as any).int_formelid}
        calculationType={decimalPlaces}
        unit={(discipline as any).var_einheit || ''}
        disciplineId={disciplineId as number}
        showTitle={false}
        compact={false}
        initialValues={initialFieldValues}
        onFieldChange={(fieldId, value) => {
          console.log('🔵 onFieldChange called:', { fieldId, value, wertungenId, participantId });
          
          // Save individual field value
          // NOTE: We must pass the real participantId (int_teilnehmerid), NOT wertungenId.
          // The /save-field-score endpoint expects participantId and derives wertungenId itself.
          const field = disciplineFields.find(f => f.id === fieldId);
          if (field && participantId) {
            _onFieldSave(participantId, field, value).catch(error => {
              console.error('❌ Error saving field value:', error);
            });
          } else {
            console.warn('⚠️ Cannot save: field or participantId missing', { field, participantId, fieldId });
          }
        }}
        onCalculationComplete={(result) => {
          if (result !== null) {
            const normalized = normalizeScoreInput(result.toString(), decimalPlaces);
            
            // Only update if value actually changed (prevent infinite loop)
            if (normalized !== lastCalculatedValue.current) {
              lastCalculatedValue.current = normalized;
              onScoreChange(participantId, disciplineId, normalized);
              onSave(participantId, disciplineId, normalized);
            }
          }
        }}
      />
    </div>
  );
});

ScoreInputCell.displayName = 'ScoreInputCell';
