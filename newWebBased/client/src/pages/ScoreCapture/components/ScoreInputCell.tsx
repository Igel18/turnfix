/**
 * ScoreInputCell Component
 * Point 135: Formula-based Score Input
 * 
 * Renders either:
 * - Simple input field (showJuryScores = false): Direct endwert input
 * - FormulaInput component (showJuryScores = true): Multi-field input with formula calculation
 */

import { useState, useEffect, useRef } from 'react';
import { FormulaInput } from '@/components/FormulaInput';
import type { Discipline, DisciplineField } from '@/types/ScoreCapture.types';

interface ScoreInputCellProps {
  participantId: number;
  discipline: Discipline;
  disciplineFields: DisciplineField[];
  scoreValue: string;
  showJuryScores: boolean;
  wertungenId?: number; // Added: needed to load/save jury results
  onScoreChange: (participantId: number, disciplineId: number | string, value: string) => void;
  onSave: (participantId: number, disciplineId: number | string) => Promise<void>;
  onFieldSave: (participantId: number, field: DisciplineField, value: string) => Promise<void>;
  normalizeScoreInput: (value: string, decimalPlaces: number) => string;
  getScorePlaceholder: (decimalPlaces: number) => string;
  validation: { isValid: boolean; message?: string };
}

export const ScoreInputCell = ({
  participantId,
  discipline,
  disciplineFields,
  scoreValue,
  showJuryScores,
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
  const [initialFieldValues, setInitialFieldValues] = useState<Record<number, string>>({});
  const [loadingValues, setLoadingValues] = useState(false);
  const lastCalculatedValue = useRef<string | null>(null);

  // Load existing jury results when in jury score mode
  useEffect(() => {
    if (!showJuryScores || !wertungenId || disciplineFields.length === 0) {
      console.log('🔵 Skipping load:', { showJuryScores, wertungenId, disciplineFieldsLength: disciplineFields.length });
      return;
    }

    console.log('🔵 Loading jury results:', { wertungenId, disciplineId, disciplineFields });
    setLoadingValues(true);
    
    // Load jury results for this participant and discipline
    fetch(`/api/jury-results?participantId=${wertungenId}&disciplineId=${disciplineId}`)
      .then(res => res.json())
      .then(data => {
        console.log('🔵 Loaded jury results from API:', data);
        if (data.results && Array.isArray(data.results)) {
          const values: Record<number, string> = {};
          data.results.forEach((result: any) => {
            if (result.disciplineFieldId) {
              values[result.disciplineFieldId] = result.performance?.toString() || '';
              console.log(`🔵 Mapping field ${result.disciplineFieldId} = ${result.performance}`);
            }
          });
          console.log('🔵 Final initialFieldValues:', values);
          setInitialFieldValues(values);
        } else {
          console.warn('⚠️ No results array in response:', data);
        }
      })
      .catch(error => {
        console.error('❌ Error loading jury results:', error);
      })
      .finally(() => {
        setLoadingValues(false);
      });
  }, [showJuryScores, wertungenId, disciplineId, disciplineFields.length]);

  // Simple mode: Direct endwert input
  if (!showJuryScores) {
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
            onSave(participantId, disciplineId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              // Normalize and save
              const normalized = normalizeScoreInput(e.currentTarget.value, decimalPlaces);
              if (normalized !== e.currentTarget.value) {
                onScoreChange(participantId, disciplineId, normalized);
              }
              onSave(participantId, disciplineId);
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

  // Advanced mode: Multi-field input with formula
  const enabledFields = disciplineFields.filter(
    (f) => f.disciplineId === disciplineId && f.enabled
  );

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
        formula={(discipline as any).var_formel || ''}
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
          const field = disciplineFields.find(f => f.id === fieldId);
          if (field && wertungenId) {
            // Convert comma to dot for correct parsing (German decimal format: 4,15 → 4.15)
            const normalizedValue = value.replace(',', '.');
            const performanceValue = parseFloat(normalizedValue) || 0;
            
            console.log('💾 Saving jury result:', {
              participantId: wertungenId,
              disciplineFieldId: fieldId,
              performance: performanceValue,
              originalValue: value,
              normalizedValue
            });
            
            // Use API to save jury result
            fetch('/api/jury-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                participantId: wertungenId,
                disciplineFieldId: fieldId,
                performance: performanceValue,
                attempt: 1,
                type: 0
              })
            })
            .then(res => {
              console.log('✅ Save response status:', res.status);
              return res.json();
            })
            .then(data => console.log('✅ Save response data:', data))
            .catch(error => console.error('❌ Error saving field value:', error));
          } else {
            console.warn('⚠️ Cannot save: field or wertungenId missing', { field, wertungenId });
          }
        }}
        onCalculationComplete={(result) => {
          if (result !== null) {
            const normalized = normalizeScoreInput(result.toString(), decimalPlaces);
            
            // Only update if value actually changed (prevent infinite loop)
            if (normalized !== lastCalculatedValue.current) {
              lastCalculatedValue.current = normalized;
              onScoreChange(participantId, disciplineId, normalized);
              onSave(participantId, disciplineId);
            }
          }
        }}
      />
    </div>
  );
};
