/**
 * DisciplineFormWizard
 *
 * A guided 3-step wizard for creating and editing disciplines.
 * Replaces the flat DisciplineFormModal for complex creation flows while
 * the original DisciplineFormModal remains available for quick inline editing.
 *
 * Steps:
 *   1. basic       → Name, Kurzname, Anzeigename
 *   2. calculation → Formel, Berechnungstyp, Einheit, Eingabemaske, Versuche
 *   3. advanced    → Icon, Tastenkürzel, Sport, Geschlecht, Bahnenteilung
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import WizardModal from '@/components/WizardModal';
import DisciplineConfigTester from '@/components/DisciplineConfigTester';
import ImagePicker from '@/components/ImagePicker';
import { useDisciplineWizard, type EditingDiscipline, type DisciplineFormData } from './useDisciplineWizard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Formula {
  int_formelid: number;
  var_name: string;
  var_formel?: string;
  int_typ?: number;
  discipline_count: number;
}

interface Sport {
  int_sportid: number;
  var_name: string;
  discipline_count: number;
}

export interface DisciplineFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingDiscipline: EditingDiscipline | null;
  formulas: Formula[];
  sports: Sport[];
  onSaved: () => Promise<void>;
}

// ── Sub-step components ───────────────────────────────────────────────────────

interface StepBasicProps {
  formData: DisciplineFormData;
  setFormData: React.Dispatch<React.SetStateAction<DisciplineFormData>>;
}

function StepBasic({ formData, setFormData }: StepBasicProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('disciplines.form.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          autoFocus
          value={formData.name}
          onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('disciplines.form.namePlaceholder')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('disciplines.form.shortName')} <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-gray-500 ml-1">(max&nbsp;5)</span>
        </label>
        <input
          type="text"
          maxLength={5}
          value={formData.shortName}
          onChange={(e) => setFormData((f) => ({ ...f, shortName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('disciplines.form.shortNamePlaceholder')}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('disciplines.form.displayName')}
          <span className="text-xs font-normal text-gray-500 ml-1">(max&nbsp;20)</span>
        </label>
        <input
          type="text"
          maxLength={20}
          value={formData.displayName}
          onChange={(e) => setFormData((f) => ({ ...f, displayName: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('disciplines.form.displayNamePlaceholder')}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface StepCalculationProps {
  formData: DisciplineFormData;
  setFormData: React.Dispatch<React.SetStateAction<DisciplineFormData>>;
  formulas: Formula[];
}

function StepCalculation({ formData, setFormData, formulas }: StepCalculationProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Formula guide */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-2">
        <h4 className="font-medium text-blue-900">{t('disciplines.form.formulaGuide.title')}</h4>
        <p>
          <strong>{t('disciplines.form.formulaGuide.variableX').split(':')[0]}:</strong>{' '}
          {t('disciplines.form.formulaGuide.variableX').split(':').slice(1).join(':')}
        </p>
        <p className="font-medium">{t('disciplines.form.formulaGuide.twoOptions')}</p>
        <ul className="text-xs ml-4 space-y-1">
          <li>
            •{' '}
            <strong>{t('disciplines.form.formulaGuide.customFormulaOption').split(':')[0]}:</strong>{' '}
            {t('disciplines.form.formulaGuide.customFormulaOption').split(':').slice(1).join(':')}
          </li>
          <li>
            •{' '}
            <strong>
              {t('disciplines.form.formulaGuide.predefinedFormulaOption').split(':')[0]}:
            </strong>{' '}
            {t('disciplines.form.formulaGuide.predefinedFormulaOption')
              .split(':')
              .slice(1)
              .join(':')}
          </li>
        </ul>
        <p className="text-xs mt-2">
          <strong>{t('disciplines.form.formulaGuide.priority').split(':')[0]}:</strong>{' '}
          {t('disciplines.form.formulaGuide.priority').split(':').slice(1).join(':')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Custom formula */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.customFormula')}
            <span className="text-xs text-gray-500 ml-1">
              ({t('disciplines.form.help.mathematicalExpression')})
            </span>
          </label>
          <textarea
            maxLength={300}
            rows={3}
            value={formData.formula}
            onChange={(e) => setFormData((f) => ({ ...f, formula: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('disciplines.form.customFormulaPlaceholder')}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.formulaId ? (
              <span className="text-orange-600">{t('disciplines.form.help.customFormulaIgnored')}</span>
            ) : (
              <span className="text-green-600">{t('disciplines.form.help.customFormulaActive')}</span>
            )}
          </p>
        </div>

        <div className="space-y-4">
          {/* Calculation type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('disciplines.form.calculationType')}
            </label>
            <select
              value={formData.calculationType}
              onChange={(e) =>
                setFormData((f) => ({ ...f, calculationType: parseInt(e.target.value) }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>{t('disciplines.form.help.decimals0')}</option>
              <option value={1}>{t('disciplines.form.help.decimals1')}</option>
              <option value={2}>{t('disciplines.form.help.decimals2')}</option>
              <option value={3}>{t('disciplines.form.help.decimals3')}</option>
            </select>
          </div>

          {/* Predefined formula */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('disciplines.form.formula')}
            </label>
            <select
              value={formData.formulaId ?? ''}
              onChange={(e) =>
                setFormData((f) => ({
                  ...f,
                  formulaId: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('disciplines.form.help.noPredefinedFormula')}</option>
              {formulas.map((formula) => (
                <option key={formula.int_formelid} value={formula.int_formelid}>
                  {formula.var_name}
                  {formula.var_formel &&
                    ` - ${formula.var_formel.length > 30 ? formula.var_formel.substring(0, 30) + '...' : formula.var_formel}`}
                </option>
              ))}
            </select>
          </div>

          {/* Should calculate */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.shouldCalculate}
              onChange={(e) => setFormData((f) => ({ ...f, shouldCalculate: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('disciplines.form.shouldCalculate')}</span>
          </label>
        </div>
      </div>

      {/* Technical settings row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.inputMask')}
          </label>
          <input
            type="text"
            maxLength={50}
            value={formData.inputMask}
            onChange={(e) => setFormData((f) => ({ ...f, inputMask: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('disciplines.form.inputMaskPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.attempts')}
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={formData.attempts}
            onChange={(e) => setFormData((f) => ({ ...f, attempts: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.unit')}
          </label>
          <input
            type="text"
            maxLength={5}
            value={formData.unit}
            onChange={(e) => setFormData((f) => ({ ...f, unit: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('disciplines.form.unitPlaceholder')}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface StepAdvancedProps {
  formData: DisciplineFormData;
  setFormData: React.Dispatch<React.SetStateAction<DisciplineFormData>>;
  sports: Sport[];
  editingDisciplineId?: number;
}

function StepAdvanced({ formData, setFormData, sports, editingDisciplineId }: StepAdvancedProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Icon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.icon')}
          </label>
          <ImagePicker
            value={formData.icon}
            onChange={(icon) => setFormData((f) => ({ ...f, icon }))}
            category="icons"
            placeholder={t('disciplines.form.iconPlaceholder')}
          />
        </div>

        {/* Shortcut */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.shortcut')}
          </label>
          <input
            type="text"
            maxLength={5}
            value={formData.shortcut}
            onChange={(e) => setFormData((f) => ({ ...f, shortcut: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={t('disciplines.form.shortcutPlaceholder')}
          />
        </div>

        {/* Sport */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('disciplines.form.sport')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.sportId}
            onChange={(e) => setFormData((f) => ({ ...f, sportId: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>— Sport wählen —</option>
            {sports.map((sport) => (
              <option key={sport.int_sportid} value={sport.int_sportid}>
                {sport.var_name} ({sport.discipline_count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gender & config */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">{t('disciplines.form.gender')}</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.maleAllowed}
              onChange={(e) => setFormData((f) => ({ ...f, maleAllowed: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('disciplines.form.maleAllowed')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.femaleAllowed}
              onChange={(e) => setFormData((f) => ({ ...f, femaleAllowed: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('disciplines.form.femaleAllowed')}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.lanesDivision}
              onChange={(e) => setFormData((f) => ({ ...f, lanesDivision: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">{t('disciplines.form.lanesDivision')}</span>
          </label>
        </div>
      </div>

      {/* Config tester */}
      {(formData.inputMask || formData.formula || formData.formulaId) && (
        <DisciplineConfigTester
          inputMask={formData.inputMask}
          formula={formData.formula}
          formulaId={formData.formulaId}
          calculationType={formData.calculationType}
          unit={formData.unit}
          disciplineId={editingDisciplineId}
        />
      )}
    </div>
  );
}

// ── Main wizard component ─────────────────────────────────────────────────────

// ── Navigation bar (shared by all steps) ─────────────────────────────────────

interface NavBarProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onClose: () => void;
}

function NavBar({
  isFirstStep,
  isLastStep,
  canGoNext,
  saving,
  error,
  onBack,
  onNext,
  onSave,
  onClose,
}: NavBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={isFirstStep ? onClose : onBack}
        disabled={saving}
        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
      >
        {isFirstStep ? t('common.cancel') : t('disciplines.wizard.back')}
      </button>

      <div className="flex items-center gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {isLastStep ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canGoNext}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '…' : t('disciplines.wizard.save')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {t('disciplines.wizard.next')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main wizard component ─────────────────────────────────────────────────────

export default function DisciplineFormWizard({
  isOpen,
  onClose,
  editingDiscipline,
  formulas,
  sports,
  onSaved,
}: DisciplineFormWizardProps) {
  const {
    step,
    formData,
    setFormData,
    wizardSteps,
    title,
    canGoNext,
    goNext,
    goBack,
    isFirstStep,
    isLastStep,
    saving,
    error,
    handleSave,
  } = useDisciplineWizard({ isOpen, editingDiscipline, onSaved, onClose });

  const navBar = (
    <NavBar
      isFirstStep={isFirstStep}
      isLastStep={isLastStep}
      canGoNext={canGoNext}
      saving={saving}
      error={error}
      onBack={goBack}
      onNext={goNext}
      onSave={handleSave}
      onClose={onClose}
    />
  );

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      steps={wizardSteps}
      currentStep={step}
      size="3xl"
    >
      {step === 'basic' && (
        <>
          <StepBasic formData={formData} setFormData={setFormData} />
          {navBar}
        </>
      )}
      {step === 'calculation' && (
        <>
          <StepCalculation formData={formData} setFormData={setFormData} formulas={formulas} />
          {navBar}
        </>
      )}
      {step === 'advanced' && (
        <>
          <StepAdvanced
            formData={formData}
            setFormData={setFormData}
            sports={sports}
            editingDisciplineId={editingDiscipline?.id}
          />
          {navBar}
        </>
      )}
    </WizardModal>
  );
}
