/**
 * CriteriaForm + ToggleRow
 * Step 1 sub-components for AutoAssignDialog.
 *
 * CriteriaForm: Full criteria configuration panel (grid inputs + toggles).
 * ToggleRow: Reusable labelled toggle switch used inside CriteriaForm.
 */

import React, { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

// ── ToggleRow ─────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, hint, checked, onChange }) => (
  <div className="flex items-start gap-3">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
    <div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  </div>
);

// ── CriteriaForm ──────────────────────────────────────────────────────────────

export interface CriteriaFormProps {
  criteria: any;
  setCriteria: React.Dispatch<React.SetStateAction<any>>;
  onGenerate: () => void;
  isGenerating: boolean;
  onCancel: () => void;
  t: any;
}

export const CriteriaForm: React.FC<CriteriaFormProps> = ({
  criteria,
  setCriteria,
  onGenerate,
  isGenerating,
  onCancel,
  t,
}) => {
  const updateField = (field: string, value: any) =>
    setCriteria((prev: any) => ({ ...prev, [field]: value }));

  // ── Local string state for numeric inputs ────────────────────────────────
  // This allows the field to be fully cleared without immediately snapping back
  // to a fallback value, and lets us show a red border when invalid.
  const [maxStr, setMaxStr]       = useState(String(criteria.maxParticipantsPerSquad ?? 12));
  const [propsStr, setPropsStr]   = useState(String(criteria.numberOfProposals ?? 3));
  const [breakStr, setBreakStr]   = useState(String(criteria.breakCount ?? 0));

  // Sync local strings when the parent criteria object changes externally (e.g. reset).
  useEffect(() => { setMaxStr(String(criteria.maxParticipantsPerSquad ?? 12)); }, [criteria.maxParticipantsPerSquad]);
  useEffect(() => { setPropsStr(String(criteria.numberOfProposals ?? 3)); }, [criteria.numberOfProposals]);
  useEffect(() => { setBreakStr(String(criteria.breakCount ?? 0)); }, [criteria.breakCount]);

  // Validation helpers
  const maxValid   = /^\d+$/.test(maxStr)   && Number(maxStr) >= 2  && Number(maxStr) <= 50;
  const propsValid = /^\d+$/.test(propsStr) && Number(propsStr) >= 1 && Number(propsStr) <= 10;
  const breakValid = /^\d+$/.test(breakStr) && Number(breakStr) >= 0 && Number(breakStr) <= 99;

  const fieldClass = (valid: boolean, hasValue: boolean) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent ${
      !valid && hasValue
        ? 'border-red-400 focus:ring-red-500'
        : 'border-gray-300 focus:ring-blue-500'
    }`;

  // Commit a numeric field to the criteria store on blur / when valid.
  const commitMax   = (raw: string) => { if (/^\d+$/.test(raw) && Number(raw) >= 2  && Number(raw) <= 50)  updateField('maxParticipantsPerSquad', Number(raw)); };
  const commitProps = (raw: string) => { if (/^\d+$/.test(raw) && Number(raw) >= 1  && Number(raw) <= 10)  updateField('numberOfProposals', Number(raw)); };
  const commitBreak = (raw: string) => { if (/^\d+$/.test(raw) && Number(raw) >= 0  && Number(raw) <= 99)  updateField('breakCount', Number(raw)); };

  // Generate is disabled when any required numeric field is invalid.
  const canGenerate = maxValid && propsValid && breakValid && !isGenerating;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {t('squadManagement.autoAssign.criteriaDescription')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Max participants per squad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.maxPerSquad')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={maxStr}
            onChange={e => { setMaxStr(e.target.value); commitMax(e.target.value); }}
            onBlur={() => { if (!maxValid) setMaxStr(String(criteria.maxParticipantsPerSquad ?? 12)); }}
            className={fieldClass(maxValid, maxStr !== '')}
          />
          {!maxValid && maxStr !== '' && (
            <p className="text-xs text-red-500 mt-1">{t('squadManagement.autoAssign.validation.maxPerSquad')}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.maxPerSquad')}</p>
        </div>

        {/* Number of proposals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.numberOfProposals')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={propsStr}
            onChange={e => { setPropsStr(e.target.value); commitProps(e.target.value); }}
            onBlur={() => { if (!propsValid) setPropsStr(String(criteria.numberOfProposals ?? 3)); }}
            className={fieldClass(propsValid, propsStr !== '')}
          />
          {!propsValid && propsStr !== '' && (
            <p className="text-xs text-red-500 mt-1">{t('squadManagement.autoAssign.validation.numberOfProposals')}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.numberOfProposals')}</p>
        </div>

        {/* Naming prefix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.namingPrefix')}
          </label>
          <select
            value={criteria.namingPrefix}
            onChange={e => updateField('namingPrefix', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gender">{t('squadManagement.autoAssign.namingOptions.gender')}</option>
            <option value="number">{t('squadManagement.autoAssign.namingOptions.number')}</option>
            <option value="none">{t('squadManagement.autoAssign.namingOptions.none')}</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.namingPrefix')}</p>
        </div>

        {/* Break count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.breakCount')}
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={breakStr}
            onChange={e => { setBreakStr(e.target.value); commitBreak(e.target.value); }}
            onBlur={() => { if (!breakValid) setBreakStr(String(criteria.breakCount ?? 0)); }}
            className={fieldClass(breakValid, breakStr !== '')}
          />
          {!breakValid && breakStr !== '' && (
            <p className="text-xs text-red-500 mt-1">{t('squadManagement.autoAssign.validation.breakCount')}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.breakCount')}</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-3 pt-2">
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.keepExistingSquads')}
          hint={t('squadManagement.autoAssign.hints.keepExistingSquads')}
          checked={criteria.keepExistingSquads}
          onChange={val => updateField('keepExistingSquads', val)}
        />
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.separateGenders')}
          hint={t('squadManagement.autoAssign.hints.separateGenders')}
          checked={criteria.separateGenders}
          onChange={val => updateField('separateGenders', val)}
        />
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.keepClubsTogether')}
          hint={t('squadManagement.autoAssign.hints.keepClubsTogether')}
          checked={criteria.keepClubsTogether}
          onChange={val => updateField('keepClubsTogether', val)}
        />
        <ToggleRow
          label={t('squadManagement.autoAssign.fields.groupByAgeCategory')}
          hint={t('squadManagement.autoAssign.hints.groupByAgeCategory')}
          checked={criteria.groupByAgeCategory}
          onChange={val => updateField('groupByAgeCategory', val)}
        />

        {criteria.groupByAgeCategory && (
          <div className="ml-12">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('squadManagement.autoAssign.fields.ageCategoryRanges')}
            </label>
            <input
              type="text"
              value={criteria.ageCategoryRanges}
              onChange={e => updateField('ageCategoryRanges', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="6-8,9-10,11-12,13-14,15-18"
            />
            <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.ageCategoryRanges')}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={onGenerate}
          disabled={!canGenerate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              {t('squadManagement.autoAssign.generating')}
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4" />
              {t('squadManagement.autoAssign.generateButton')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
