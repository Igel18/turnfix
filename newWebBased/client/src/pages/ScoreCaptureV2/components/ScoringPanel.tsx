/**
 * ScoringPanel – Right-side input panel for ScoreCaptureV2.
 * Mirrors the visual style of the Jury Portal's ScoreInputPanel.
 * Supports all 3 scoring modes: builtInFormula, linkedFormula, simple.
 * Point 125: Jury-style split-view score capture.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  resolveScoringInputMode,
  BuiltInFormulaInput,
  LinkedFormulaInput,
  applyBuiltInFormula,
  detectFormulaType,
  normalizeValueForCalculation,
  extractFormulaSymbols,
} from '@turnfix/shared';
import { normalizeScoreInput, getScorePlaceholder } from '@/utils/scoreFormatter';
import type { Discipline, DisciplineField, Status } from '@/types/ScoreCapture.types';
import type { ParticipantListItem } from '../ScoreCaptureV2.types';

const linkedFormulaCache = new Map<number, string>();

export interface ScoringPanelProps {
  participant: ParticipantListItem | undefined;
  discipline: Discipline | null;
  disciplineFields: DisciplineField[];
  /** Current score string (for simple / builtInFormula modes) */
  score: string;
  /** wertungenId needed for loading jury results in linkedFormula mode */
  wertungenId?: number;
  /**
   * Existing per-field scores for the current participant, keyed by field ID.
   * Used to pre-fill LinkedFormulaInput when navigating between participants.
   */
  fieldScores?: Record<number, number>;
  participantCount: number;
  currentIndex: number;
  loading: boolean;
  onScoreChange: (value: string) => void;
  onFieldChange: (fieldId: number, value: string) => void;
  /**
   * Called when user clicks "Wertung speichern".
   * Receives the score to save. For builtInFormula the calculated result is
   * passed; for simple mode the raw score string; for linkedFormula null
   * (fields were already auto-saved, only endwert is needed).
   */
  onSave: (scoreOverride?: string | number) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  getScoreValidation: (value: string) => { isValid: boolean; message: string };
  /** All available status options — kept for future re-activation; see TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC */
  statuses: Status[];
  /** Status change handler — kept for future re-activation; see TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC */
  onStatusChange: (wertungenId: number, statusId: number) => Promise<void>;
}

export const ScoringPanel: React.FC<ScoringPanelProps> = ({
  participant,
  discipline,
  disciplineFields,
  score,
  wertungenId: _wertungenId,
  fieldScores = {},
  participantCount,
  currentIndex,
  loading,
  onScoreChange,
  onFieldChange,
  onSave,
  onNavigate,
  getScoreValidation,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  statuses: _statuses,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStatusChange: _onStatusChange,
}) => {
  const { t } = useTranslation();

  // Resolve linked formula (with caching)
  const [resolvedFormula, setResolvedFormula] = useState<string>(
    (discipline as any)?.var_formel || ''
  );
  const [formulaLoading, setFormulaLoading] = useState(false);

  // Track calculated result for builtInFormula and linkedFormula modes
  const [linkedCalcResult, setLinkedCalcResult] = useState<number | null>(null);

  // Focus refs
  const simpleInputRef = useRef<HTMLInputElement>(null);
  const builtInInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when participant changes
  useEffect(() => {
    const id = setTimeout(() => {
      simpleInputRef.current?.focus();
      builtInInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(id);
  }, [currentIndex]);

  // Resolve linked formula
  useEffect(() => {
    let active = true;
    const formula: string = (discipline as any)?.var_formel || '';
    const formulaId: number | undefined = (discipline as any)?.int_formelid;

    if (!formulaId) {
      if (active) setResolvedFormula(formula);
      return;
    }

    if (linkedFormulaCache.has(formulaId)) {
      if (active) setResolvedFormula(linkedFormulaCache.get(formulaId) || formula);
      return;
    }

    setFormulaLoading(true);
    fetch(`/api/formulas/${formulaId}`)
      .then(r => r.json())
      .then(data => {
        const linked = data?.var_formel || formula;
        linkedFormulaCache.set(formulaId, linked);
        if (active) setResolvedFormula(linked);
      })
      .catch(() => { if (active) setResolvedFormula(formula); })
      .finally(() => { if (active) setFormulaLoading(false); });

    return () => { active = false; };
  }, [discipline?.int_disziplinid, (discipline as any)?.int_formelid, (discipline as any)?.var_formel]);

  if (!participant) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6">
        <div className="text-center text-gray-500">
          <Trophy className="w-14 h-14 mx-auto mb-4 opacity-40" />
          <p className="text-base">{t('scoreCaptureV2.selectParticipant')}</p>
        </div>
      </div>
    );
  }

  const decimalPlaces = discipline?.int_berechnung ?? 2;
  const inputMode = resolveScoringInputMode({
    formula: resolvedFormula,
    formulaId: (discipline as any)?.int_formelid ?? null,
  });
  const validation = getScoreValidation(score);
  const unit: string = (discipline as any)?.var_einheit || '';
  const maxScore = discipline?.maxScore;

  // Build initialValues for LinkedFormulaInput from the saved field scores.
  // symbol[i] maps to nonFinalFields[i] (positional, same order as extractFormulaSymbols).
  const linkedInitialValues: Record<string, number> = (() => {
    if (!resolvedFormula || !fieldScores || Object.keys(fieldScores).length === 0) return {};
    const symbols = extractFormulaSymbols(resolvedFormula);
    const nonFinal = disciplineFields.filter(f => !f.isFinalScore && !f.isStartingScore);
    const init: Record<string, number> = {};
    symbols.forEach((sym, idx) => {
      const f = nonFinal[idx];
      if (f && fieldScores[f.id] !== undefined) init[sym] = fieldScores[f.id];
    });
    return init;
  })();

  // Calculated result for builtInFormula
  const builtInCalcResult =
    inputMode === 'builtInFormula' && resolvedFormula && score.trim() !== '' &&
    detectFormulaType(resolvedFormula) === 'variable'
      ? applyBuiltInFormula(resolvedFormula, parseFloat(normalizeValueForCalculation(score)) || 0)
      : null;

  const handleSaveClick = () => {
    if (inputMode === 'builtInFormula') {
      // Persist the raw user input, consistent with ScoreCapture/Jury Portal.
      // Formula transformation is applied for ranking display, not DB storage.
      onSave(score);
    } else if (inputMode === 'linkedFormula') {
      // Fields already auto-saved; save the endwert from the calculated result
      onSave(linkedCalcResult !== null ? linkedCalcResult : undefined);
    } else {
      onSave();
    }
  };

  const isSaveDisabled = loading || (
    inputMode === 'simple' ? score.trim() === '' :
    inputMode === 'builtInFormula' ? score.trim() === '' :
    linkedCalcResult === null
  );

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-3 sm:p-5">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-4 sm:p-6">

        {/* Participant header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white text-lg font-bold mb-2">
            {participant.startNumber ?? '?'}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{participant.name}</h2>
          <p className="text-sm text-gray-600">{participant.clubName}</p>

          {/* STATUS SELECTOR — hidden, tech debt
               @see TECH_DEBT_STATUS_NOT_DEVICE_SPECIFIC in @turnfix/shared/statusColorUtils
               tfx_wertungen.statusId is NOT per-device; showing it here is misleading.
               Re-enable once the DB carries a per-device status column.
          */}
        </div>

        {/* Discipline formula display */}
        {resolvedFormula && inputMode !== 'simple' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
              {t('scoreCaptureV2.formula')}
            </div>
            <div className="text-base font-mono text-purple-900 mt-1">{resolvedFormula}</div>
            {unit && (
              <div className="text-xs text-purple-700 mt-0.5">
                {t('scoreCaptureV2.unit')}: {unit}
              </div>
            )}
          </div>
        )}

        {/* Score input */}
        <div className="space-y-3">
          {inputMode === 'linkedFormula' ? (
            formulaLoading ? (
              <div className="text-center text-sm text-gray-500 py-6">
                {t('scoreCaptureV2.formulaLoading')}
              </div>
            ) : (
              <LinkedFormulaInput
                key={`formula-p${participant.id}`}
                formula={resolvedFormula}
                decimals={decimalPlaces}
                disciplineFields={disciplineFields
                  .filter(f => !f.isFinalScore && !f.isStartingScore)
                  .map(f => ({ id: f.id, name: f.name }))}
                initialValues={linkedInitialValues}
                onScoreChange={(result, fieldValues) => {
                  setLinkedCalcResult(result);
                  // Notify parent for per-field API saves (symbol[i] → field[i].id)
                  const symbols = extractFormulaSymbols(resolvedFormula);
                  const nonFinal = disciplineFields.filter(f => !f.isFinalScore && !f.isStartingScore);
                  symbols.forEach((sym, idx) => {
                    const f = nonFinal[idx];
                    if (f && fieldValues[sym] !== undefined) {
                      onFieldChange(f.id, String(fieldValues[sym]));
                    }
                  });
                }}
                disabled={loading}
                autoFocusFirst={true}
              />
            )
          ) : inputMode === 'builtInFormula' ? (
            <BuiltInFormulaInput
              inputRef={builtInInputRef}
              formula={resolvedFormula}
              variable="x"
              value={score}
              calculatedResult={builtInCalcResult}
              decimalPlaces={decimalPlaces}
              unit={unit}
              maxScore={maxScore}
              placeholder={getScorePlaceholder(decimalPlaces)}
              onChange={onScoreChange}
              onBlur={() => {
                const n = normalizeScoreInput(score, decimalPlaces);
                if (n !== score) onScoreChange(n);
              }}
              onEnter={handleSaveClick}
              validation={validation}
              variant="jury"
              autoFocus={false}
              disabled={loading}
              showFormulaDisplay={false}
            />
          ) : (
            /* Simple input */
            <div className={validation.isValid ? '' : 'mb-6'}>
              <label className="block text-xs font-medium text-gray-700 mb-1 text-center">
                {t('scoreCaptureV2.enterScore')}
                {maxScore && maxScore > 0 && (
                  <span className="ml-2 text-blue-600">(max. {maxScore.toFixed(2)})</span>
                )}
              </label>
              <div className="relative">
                <input
                  ref={simpleInputRef}
                  type="text"
                  inputMode="decimal"
                  data-testid="score-input"
                  value={score}
                  onChange={e => onScoreChange(e.target.value)}
                  onBlur={e => {
                    const n = normalizeScoreInput(e.target.value, decimalPlaces);
                    if (n !== e.target.value) onScoreChange(n);
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveClick(); }}
                  placeholder={getScorePlaceholder(decimalPlaces)}
                  className={`w-full text-3xl sm:text-4xl text-center p-2 sm:p-3 border-2 rounded-lg focus:outline-none font-bold transition-colors ${
                    validation.isValid
                      ? 'border-gray-300 focus:border-blue-500 text-blue-900 bg-blue-50'
                      : 'border-red-300 focus:border-red-500 text-red-900 bg-red-50'
                  }`}
                  autoFocus
                />
                {!validation.isValid && (
                  <div className="absolute left-0 right-0 mt-1 text-xs text-red-600 bg-red-100 border border-red-200 rounded px-2 py-1 text-center">
                    ⚠️ {validation.message}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save button */}
          <button
            data-testid="save-score-button"
            onClick={handleSaveClick}
            disabled={isSaveDisabled}
            className="w-full bg-green-600 text-white py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-lg font-bold hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
          >
            {loading ? `💾 ${t('scoreCaptureV2.saving')}...` : `✓ ${t('scoreCaptureV2.saveScore')}`}
          </button>

          {/* Navigation */}
          <div className="grid grid-cols-2 gap-2">
            <button
              data-testid="nav-prev-button"
              onClick={() => onNavigate('prev')}
              disabled={currentIndex <= 0}
              className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs sm:text-sm"
            >
              ← {t('scoreCaptureV2.prev')}
            </button>
            <button
              data-testid="nav-next-button"
              onClick={() => onNavigate('next')}
              disabled={currentIndex >= participantCount - 1}
              className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs sm:text-sm"
            >
              {t('scoreCaptureV2.next')} →
            </button>
          </div>

          <p className="text-center text-xs text-gray-500">
            {t('scoreCaptureV2.participantCounter', {
              current: currentIndex + 1,
              total: participantCount,
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
