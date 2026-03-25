/**
 * useCompetitionWizard
 *
 * Business logic hook for the 4-step CompetitionFormWizard.
 * Steps:
 *   basicInfo   → number, name, description
 *   category    → type, area, ageFrom, ageTo
 *   disciplines → discipline selection (reuses useCompetitionFormDisciplines)
 *   settings    → round, track, times, qualifiers, evaluations, dropCount, flags
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiPost, apiPut, invalidateCache } from '@/utils/api';
import {
  useCompetitionFormDisciplines,
  getDisciplineGenderLabel,
} from '@/components/useCompetitionFormDisciplines';
import type { CompetitionFormData } from '@/components/CompetitionFormModal.types';
import type { Competition } from '@/pages/Competitions/Competitions.types';
import type { WizardStepDef } from '@/components/WizardModal';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompetitionWizardStep = 'basicInfo' | 'category' | 'disciplines' | 'settings';

const STEP_ORDER: CompetitionWizardStep[] = ['basicInfo', 'category', 'disciplines', 'settings'];

export const INITIAL_FORM_DATA: CompetitionFormData = {
  number: '',
  name: '',
  description: '',
  gender: 'gemischt',
  areaId: null,
  ageFrom: 6,
  ageTo: 18,
  disciplines: [],
  round: 1,
  track: 1,
  competitionType: 0,
  startTime: '08:30',
  warmupTime: '08:00',
  qualifiers: 0,
  evaluations: 3,
  dropWorstScore: false,
  showAgeGroup: false,
  isOptionalCompetition: false,
  showInfo: false,
  useCompulsoryProgram: false,
  sortAscending: false,
  manualSort: false,
  useApparatusPoints: false,
  dropCount: 0,
};

export interface UseCompetitionWizardProps {
  isOpen: boolean;
  editingCompetition: Competition | null;
  eventId?: string | null;
  onSaved: () => Promise<void>;
  onClose: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCompetitionWizard({
  isOpen,
  editingCompetition,
  eventId,
  onSaved,
  onClose,
}: UseCompetitionWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<CompetitionWizardStep>('basicInfo');
  const [formData, setFormData] = useState<CompetitionFormData>({ ...INITIAL_FORM_DATA });
  const [bulkMaxScore, setBulkMaxScore] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delegate discipline/area loading to the shared hook
  const disciplineManager = useCompetitionFormDisciplines({
    isOpen,
    formData,
    setFormData,
    bulkMaxScore,
  });

  // ── Reset when dialog opens ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('basicInfo');
    setError(null);
    setSaving(false);
    setBulkMaxScore('');

    if (editingCompetition) {
      setFormData({
        number: editingCompetition.number ?? '',
        name: editingCompetition.name,
        description: editingCompetition.description ?? '',
        gender: editingCompetition.gender as 'männlich' | 'weiblich' | 'gemischt',
        areaId: editingCompetition.areaId ?? null,
        ageFrom: editingCompetition.ageFrom,
        ageTo: editingCompetition.ageTo,
        disciplines: editingCompetition.disciplines.map((d) => ({
          disciplineId: d.disciplineId,
          maxScore: d.maxScore,
        })),
        round: editingCompetition.round,
        track: editingCompetition.track,
        competitionType: editingCompetition.competitionType,
        startTime: editingCompetition.startTime ?? '',
        warmupTime: editingCompetition.warmupTime ?? '',
        qualifiers: editingCompetition.qualifiers,
        evaluations: editingCompetition.evaluations ?? 3,
        dropWorstScore: editingCompetition.dropWorstScore,
        showAgeGroup: editingCompetition.showAgeGroup,
        isOptionalCompetition: editingCompetition.isOptionalCompetition,
        showInfo: editingCompetition.showInfo,
        useCompulsoryProgram: editingCompetition.useCompulsoryProgram,
        sortAscending: editingCompetition.sortAscending,
        manualSort: editingCompetition.manualSort,
        useApparatusPoints: editingCompetition.useApparatusPoints,
        dropCount: editingCompetition.dropCount,
      });
    } else {
      setFormData({ ...INITIAL_FORM_DATA });
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Per-step validation ────────────────────────────────────────────────────
  const canGoNext = (atStep: CompetitionWizardStep): boolean => {
    switch (atStep) {
      case 'basicInfo':
        return formData.name.trim().length > 0;
      case 'category':
        return (
          formData.areaId !== null &&
          formData.ageFrom >= 1 &&
          formData.ageTo >= formData.ageFrom
        );
      case 'disciplines':
        return formData.disciplines.length > 0;
      case 'settings':
        return true;
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
    if (formData.disciplines.length === 0) {
      setError(t('competitionForm.validation.disciplinesRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...(formData.number ? { number: formData.number } : {}),
        name: formData.name,
        description: formData.description,
        gender: formData.gender,
        ageFrom: Number(formData.ageFrom),
        ageTo: Number(formData.ageTo),
        disciplines: formData.disciplines.map((d) => ({
          disciplineId: Number(d.disciplineId),
          maxScore: Number(d.maxScore),
        })),
        ...(eventId ? { eventId: parseInt(eventId) } : {}),
        round: Number(formData.round),
        track: Number(formData.track),
        competitionType: Number(formData.competitionType),
        ...(formData.startTime ? { startTime: formData.startTime } : {}),
        ...(formData.warmupTime ? { warmupTime: formData.warmupTime } : {}),
        qualifiers: Number(formData.qualifiers),
        evaluations: Number(formData.evaluations ?? 3),
        dropWorstScore: Boolean(formData.dropWorstScore),
        showAgeGroup: Boolean(formData.showAgeGroup),
        isOptionalCompetition: Boolean(formData.isOptionalCompetition),
        showInfo: Boolean(formData.showInfo),
        useCompulsoryProgram: Boolean(formData.useCompulsoryProgram),
        sortAscending: Boolean(formData.sortAscending),
        manualSort: Boolean(formData.manualSort),
        useApparatusPoints: Boolean(formData.useApparatusPoints),
        dropCount: Number(formData.dropCount),
      };

      if (editingCompetition) {
        await apiPut(`/competitions/${editingCompetition.id}`, payload);
      } else {
        await apiPost('/competitions', payload);
      }

      invalidateCache('/competitions');
      await onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('competitionForm.messages.error');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Wizard step definitions ────────────────────────────────────────────────
  const wizardSteps: WizardStepDef[] = [
    { key: 'basicInfo', label: t('competitionForm.wizard.steps.basicInfo') },
    { key: 'category', label: t('competitionForm.wizard.steps.category') },
    { key: 'disciplines', label: t('competitionForm.wizard.steps.disciplines') },
    { key: 'settings', label: t('competitionForm.wizard.steps.settings') },
  ];

  const title = editingCompetition
    ? t('competitionForm.wizard.title.edit')
    : t('competitionForm.wizard.title.create');

  const getGenderText = (maleAllowed: boolean, femaleAllowed: boolean) =>
    getDisciplineGenderLabel(maleAllowed, femaleAllowed, {
      both: t('competitionForm.disciplines.genderCompatibility.both'),
      male: t('competitionForm.disciplines.genderCompatibility.male'),
      female: t('competitionForm.disciplines.genderCompatibility.female'),
    });

  return {
    step,
    setStep,
    formData,
    setFormData,
    bulkMaxScore,
    setBulkMaxScore,
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
    // From discipline manager
    ...disciplineManager,
    getGenderText,
  };
}
