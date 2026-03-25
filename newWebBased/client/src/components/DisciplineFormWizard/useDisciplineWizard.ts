/**
 * useDisciplineWizard
 *
 * Business logic hook for the 3-step DisciplineFormWizard.
 * Steps:
 *   basic       → name, shortName, displayName
 *   calculation → formula / formulaId / calculationType / shouldCalculate /
 *                 inputMask / attempts / unit
 *   advanced    → icon, shortcut, sportId, maleAllowed, femaleAllowed,
 *                 lanesDivision + DisciplineConfigTester
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiPost, apiPut } from '@/utils/api';
import type { WizardStepDef } from '@/components/WizardModal';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DisciplineWizardStep = 'basic' | 'calculation' | 'advanced';

export interface DisciplineFormData {
  name: string;
  shortName: string;
  displayName: string;
  formula: string;
  inputMask: string;
  attempts: number;
  icon: string;
  shortcut: string;
  calculationType: number;
  unit: string;
  lanesDivision: boolean;
  maleAllowed: boolean;
  femaleAllowed: boolean;
  sportId: number;
  formulaId: number | undefined;
  shouldCalculate: boolean;
}

export interface EditingDiscipline {
  id: number;
  name: string;
  short_name: string;
  display_name?: string;
  formula?: string;
  input_mask?: string;
  attempts: number;
  icon?: string;
  shortcut?: string;
  calculation_type: number;
  unit?: string;
  lanes_division: boolean;
  male_allowed: boolean;
  female_allowed: boolean;
  sport_id: number;
  formula_id?: number;
  should_calculate: boolean;
  [key: string]: unknown;
}

export interface UseDisciplineWizardProps {
  isOpen: boolean;
  editingDiscipline: EditingDiscipline | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
}

const DEFAULT_FORM_DATA: DisciplineFormData = {
  name: '',
  shortName: '',
  displayName: '',
  formula: '',
  inputMask: '',
  attempts: 1,
  icon: '',
  shortcut: '',
  calculationType: 2,
  unit: '',
  lanesDivision: false,
  maleAllowed: true,
  femaleAllowed: true,
  sportId: 0,
  formulaId: undefined,
  shouldCalculate: true,
};

const STEP_ORDER: DisciplineWizardStep[] = ['basic', 'calculation', 'advanced'];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDisciplineWizard({
  isOpen,
  editingDiscipline,
  onSaved,
  onClose,
}: UseDisciplineWizardProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<DisciplineWizardStep>('basic');
  const [formData, setFormData] = useState<DisciplineFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Reset when opened ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('basic');
    setError(null);
    setSaving(false);

    if (editingDiscipline) {
      setFormData({
        name: editingDiscipline.name,
        shortName: editingDiscipline.short_name,
        displayName: editingDiscipline.display_name ?? '',
        formula: editingDiscipline.formula ?? '',
        inputMask: editingDiscipline.input_mask ?? '',
        attempts: editingDiscipline.attempts,
        icon: editingDiscipline.icon ?? '',
        shortcut: editingDiscipline.shortcut ?? '',
        calculationType: editingDiscipline.calculation_type,
        unit: editingDiscipline.unit ?? '',
        lanesDivision: editingDiscipline.lanes_division,
        maleAllowed: editingDiscipline.male_allowed,
        femaleAllowed: editingDiscipline.female_allowed,
        sportId: editingDiscipline.sport_id,
        formulaId: editingDiscipline.formula_id,
        shouldCalculate: editingDiscipline.should_calculate,
      });
    } else {
      setFormData({ ...DEFAULT_FORM_DATA });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step validation ────────────────────────────────────────────────────────
  const canGoNext = (atStep: DisciplineWizardStep): boolean => {
    switch (atStep) {
      case 'basic':
        return formData.name.trim().length > 0 && formData.shortName.trim().length > 0;
      case 'calculation':
        return true; // all fields optional
      case 'advanced':
        return formData.sportId > 0;
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1 && canGoNext(step)) {
      setStep(STEP_ORDER[idx + 1]);
    }
  };

  const goBack = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const isFirstStep = step === STEP_ORDER[0];
  const isLastStep = step === STEP_ORDER[STEP_ORDER.length - 1];

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canGoNext(step)) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: formData.name,
        shortName: formData.shortName,
        displayName: formData.displayName || null,
        formula: formData.formula || null,
        inputMask: formData.inputMask || null,
        attempts: formData.attempts,
        icon: formData.icon || null,
        shortcut: formData.shortcut || null,
        calculationType: formData.calculationType,
        unit: formData.unit || null,
        lanesDivision: formData.lanesDivision,
        maleAllowed: formData.maleAllowed,
        femaleAllowed: formData.femaleAllowed,
        sportId: formData.sportId,
        formulaId: formData.formulaId || null,
        shouldCalculate: formData.shouldCalculate,
      };

      if (editingDiscipline) {
        await apiPut(`/disciplines/${editingDiscipline.id}`, payload);
      } else {
        await apiPost('/disciplines', payload);
      }

      await onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('disciplines.messages.error');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Wizard step definitions ────────────────────────────────────────────────
  const wizardSteps: WizardStepDef[] = [
    { key: 'basic', label: t('disciplines.wizard.steps.basic') },
    { key: 'calculation', label: t('disciplines.wizard.steps.calculation') },
    { key: 'advanced', label: t('disciplines.wizard.steps.advanced') },
  ];

  const title = editingDiscipline
    ? t('disciplines.wizard.title.edit')
    : t('disciplines.wizard.title.create');

  return {
    step,
    setStep,
    formData,
    setFormData,
    wizardSteps,
    title,
    canGoNext: canGoNext(step),
    goNext,
    goBack,
    isFirstStep,
    isLastStep,
    saving,
    error,
    handleSave,
  };
}
