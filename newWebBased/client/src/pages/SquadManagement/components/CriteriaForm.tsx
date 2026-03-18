/**
 * CriteriaForm + ToggleRow
 * Step 1 sub-components for AutoAssignDialog.
 *
 * CriteriaForm: Full criteria configuration panel (grid inputs + toggles).
 * ToggleRow: Reusable labelled toggle switch used inside CriteriaForm.
 */

import React from 'react';
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
            type="number"
            min={2}
            max={50}
            value={criteria.maxParticipantsPerSquad}
            onChange={e => updateField('maxParticipantsPerSquad', parseInt(e.target.value) || 12)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{t('squadManagement.autoAssign.hints.maxPerSquad')}</p>
        </div>

        {/* Number of proposals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.autoAssign.fields.numberOfProposals')} <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={criteria.numberOfProposals}
            onChange={e => updateField('numberOfProposals', parseInt(e.target.value) || 3)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
            type="number"
            min={0}
            max={10}
            value={criteria.breakCount}
            onChange={e => updateField('breakCount', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
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
          disabled={isGenerating}
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
