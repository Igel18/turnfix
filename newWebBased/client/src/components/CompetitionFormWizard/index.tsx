/**
 * CompetitionFormWizard
 *
 * A guided 4-step wizard for creating and editing competitions.
 * Replaces the flat CompetitionFormModalNew for complex creation flows.
 *
 * Steps:
 *   1. basicInfo   → Wettkampfnummer, Name, Beschreibung
 *   2. category    → Typ, Bereich, Altersklasse (von/bis)
 *   3. disciplines → Disziplinauswahl
 *   4. settings    → Zeitplanung, Qualifikation, Verhalten & Anzeige
 */

import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import WizardModal from '@/components/WizardModal';
import { BlueInfoBox } from '@/components/InfoBoxes';
import type { Competition } from '@/pages/Competitions/Competitions.types';
import { useCompetitionWizard } from './useCompetitionWizard';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompetitionFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingCompetition: Competition | null;
  eventId?: string | null;
  onSaved: () => Promise<void>;
}

// ── Shared navigation bar ─────────────────────────────────────────────────────

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

function NavBar({ isFirstStep, isLastStep, canGoNext, saving, error, onBack, onNext, onSave, onClose }: NavBarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
      <button
        type="button"
        onClick={isFirstStep ? onClose : onBack}
        disabled={saving}
        className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
      >
        {isFirstStep ? t('common.cancel') : t('competitionForm.wizard.back')}
      </button>
      <div className="flex items-center gap-3">
        {error && <p className="text-sm text-red-600 max-w-xs truncate">{error}</p>}
        {isLastStep ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canGoNext}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '…' : t('competitionForm.wizard.save')}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="px-5 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {t('competitionForm.wizard.next')}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 1: Basic info ────────────────────────────────────────────────────────

function StepBasicInfo({ wizard }: { wizard: ReturnType<typeof useCompetitionWizard> }) {
  const { t } = useTranslation();
  const { formData, setFormData } = wizard;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('competitionForm.fields.number.label')}
          </label>
          <input
            type="text"
            value={formData.number ?? ''}
            onChange={(e) => e.target.value.length <= 5 && setFormData((f) => ({ ...f, number: e.target.value }))}
            maxLength={5}
            placeholder={t('competitionForm.fields.number.placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">{(formData.number ?? '').length}/5</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('competitionForm.fields.name.label')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={formData.name}
            onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
            placeholder={t('competitionForm.fields.name.placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('competitionForm.fields.description.label')}
        </label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
          placeholder={t('competitionForm.fields.description.placeholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

// ── Step 2: Category ──────────────────────────────────────────────────────────

function StepCategory({ wizard }: { wizard: ReturnType<typeof useCompetitionWizard> }) {
  const { t } = useTranslation();
  const { formData, setFormData, areas } = wizard;

  const ageGroups = Array.from({ length: 50 }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <BlueInfoBox>
        <p>📅 {t('competitionForm.basicInfo.description')}</p>
      </BlueInfoBox>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Competition type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('competitionForm.categorySettings.competitionType.label')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.competitionType}
            onChange={(e) => setFormData((f) => ({ ...f, competitionType: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>{t('competitionForm.categorySettings.competitionType.individual')}</option>
            <option value={1}>{t('competitionForm.categorySettings.competitionType.team')}</option>
            <option value={2}>{t('competitionForm.categorySettings.competitionType.group')}</option>
          </select>
        </div>

        {/* Area / Bereich */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('competitionForm.fields.area.label')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.areaId ?? ''}
            onChange={(e) => {
              const areaId = e.target.value ? parseInt(e.target.value) : null;
              const area = areas.find((a) => a.int_bereicheid === areaId);
              let gender: 'männlich' | 'weiblich' | 'gemischt' = 'gemischt';
              if (area) {
                const m = area.bol_maennlich ?? true;
                const w = area.bol_weiblich ?? true;
                if (m && w) gender = 'gemischt';
                else if (m) gender = 'männlich';
                else if (w) gender = 'weiblich';
              }
              setFormData((f) => ({ ...f, areaId, gender }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('competitionForm.fields.area.placeholder')}</option>
            {areas.map((area) => {
              const m = area.bol_maennlich ?? true;
              const w = area.bol_weiblich ?? true;
              const gLabel = m && w ? t('competitionForm.fields.gender.options.mixed')
                : m ? t('competitionForm.fields.gender.options.male')
                : t('competitionForm.fields.gender.options.female');
              return (
                <option key={area.int_bereicheid} value={area.int_bereicheid}>
                  {area.var_name || t('areas.unnamed')} ({gLabel})
                </option>
              );
            })}
          </select>
        </div>

        {/* Age from */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('competitionForm.fields.ageFrom.label')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.ageFrom}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setFormData((f) => ({ ...f, ageFrom: v, ageTo: f.ageTo < v ? v : f.ageTo }));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ageGroups.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Age to */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('competitionForm.fields.ageTo.label')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.ageTo ?? ''}
            onChange={(e) => setFormData((f) => ({ ...f, ageTo: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ageGroups.filter((a) => a >= formData.ageFrom).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Disciplines ───────────────────────────────────────────────────────

function StepDisciplines({ wizard }: { wizard: ReturnType<typeof useCompetitionWizard> }) {
  const { t } = useTranslation();
  const {
    formData,
    setFormData,
    disciplineGroups,
    selectedDisciplineGroup,
    displayedDisciplines,
    filteredDisciplines,
    showIncompatibleMessage,
    disciplineSearch,
    setDisciplineSearch,
    showSelectedOnly,
    setShowSelectedOnly,
    handleDisciplineGroupChange,
    handleDisciplineToggle,
    handleSelectAllVisible,
    handleDeselectAllVisible,
    handleBulkSelectGroup,
    bulkMaxScore,
    setBulkMaxScore,
    getGenderText,
  } = wizard;

  return (
    <div className="space-y-4">
      <BlueInfoBox>{t('competitionForm.disciplines.description')}</BlueInfoBox>

      {/* Group filter + bulk max score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('competitionForm.disciplines.filterByGroup')}
          </label>
          <select
            value={selectedDisciplineGroup ?? ''}
            onChange={(e) => handleDisciplineGroupChange(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('competitionForm.disciplines.selectGroup')}</option>
            {disciplineGroups.map((g) => (
              <option key={g.int_disziplinen_gruppenid} value={g.int_disziplinen_gruppenid}>{g.var_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {t('competitionForm.disciplines.bulkMaxScore')}
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={bulkMaxScore}
            onChange={(e) => setBulkMaxScore(e.target.value)}
            placeholder="10.0"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleBulkSelectGroup}
            className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {selectedDisciplineGroup
              ? t('competitionForm.disciplines.selectGroupAndApply')
              : t('competitionForm.disciplines.applyToAll')}
          </button>
        </div>
      </div>

      {showIncompatibleMessage && (
        <div className="p-3 bg-orange-100 border border-orange-300 rounded-md text-sm text-orange-700">
          ⚠️ {t('competitionForm.disciplines.validation.incompatibleRemoved')}
        </div>
      )}

      {/* Search + toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={disciplineSearch}
            onChange={(e) => setDisciplineSearch(e.target.value)}
            placeholder={t('competitionForm.disciplines.searchPlaceholder')}
            className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {disciplineSearch && (
            <button type="button" onClick={() => setDisciplineSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowSelectedOnly(!showSelectedOnly)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap transition-colors ${
            showSelectedOnly ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {showSelectedOnly
            ? t('competitionForm.disciplines.showAll')
            : t('competitionForm.disciplines.showSelected', { count: formData.disciplines.length })}
        </button>
      </div>

      {/* Select / deselect all controls */}
      {displayedDisciplines.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={handleSelectAllVisible} className="text-blue-600 hover:underline">
            {t('competitionForm.disciplines.selectAllVisible')}
          </button>
          <span className="text-gray-300">|</span>
          <button type="button" onClick={handleDeselectAllVisible} className="text-gray-500 hover:underline">
            {t('competitionForm.disciplines.deselectAllVisible')}
          </button>
          <span className="ml-auto text-gray-400">{displayedDisciplines.length} {t('competitionForm.disciplines.filterStatus.shown')}</span>
        </div>
      )}

      {/* Discipline list */}
      <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto bg-gray-50">
        {filteredDisciplines.length === 0 ? (
          <p className="text-gray-500 text-sm p-4">{t('competitionForm.disciplines.noDisciplines')}</p>
        ) : displayedDisciplines.length === 0 ? (
          <p className="text-gray-500 text-sm p-4">
            {disciplineSearch ? t('competitionForm.disciplines.noSearchResults') : t('competitionForm.disciplines.noSelectedDisciplines')}
          </p>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayedDisciplines.map((disc) => {
              const isSelected = formData.disciplines.some((d) => d.disciplineId === disc.id);
              const selDisc = formData.disciplines.find((d) => d.disciplineId === disc.id);
              return (
                <label key={disc.id} className={`flex items-center gap-3 cursor-pointer px-3 py-2 transition-colors ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-white'}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleDisciplineToggle(disc.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-800 flex-1 min-w-0">
                    <span className="font-medium">{disc.display_name}</span>
                    {disc.short_name && <span className="text-gray-400 ml-2 text-xs">[{disc.short_name}]</span>}
                    <span className="text-gray-400 ml-2 text-xs">({getGenderText(disc.male_allowed, disc.female_allowed)})</span>
                  </span>
                  {isSelected && (
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={selDisc?.maxScore ?? 0}
                      onChange={(e) => {
                        e.stopPropagation();
                        const maxScore = parseFloat(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          disciplines: prev.disciplines.map((d) => d.disciplineId === disc.id ? { ...d, maxScore } : d),
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 px-2 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {formData.disciplines.length > 0 ? (
        <div className="p-2.5 bg-blue-50 rounded-md border border-blue-200 text-sm text-blue-800">
          {t('competitionForm.disciplines.selectedCount', { count: formData.disciplines.length })}
        </div>
      ) : (
        <div className="p-3 bg-red-100 border border-red-300 rounded-md text-sm text-red-700">
          ⚠️ {t('competitionForm.disciplines.validation.noneSelected')}
        </div>
      )}
    </div>
  );
}

// ── Step 4: Settings ──────────────────────────────────────────────────────────

function StepSettings({ wizard }: { wizard: ReturnType<typeof useCompetitionWizard> }) {
  const { t } = useTranslation();
  const { formData, setFormData } = wizard;

  const boolField = (key: keyof typeof formData, labelKey: string, descKey: string) => (
    <div className="space-y-0.5">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={Boolean(formData[key])}
          onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.checked }))}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">{t(labelKey)}</span>
      </label>
      <p className="text-xs text-gray-500 ml-6">{t(descKey)}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Scheduling */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('competitionForm.scheduling.title')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.scheduling.round.label')}</label>
            <input type="number" min={1} max={10} value={formData.round} onChange={(e) => setFormData((f) => ({ ...f, round: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.scheduling.track.label')}</label>
            <input type="number" min={1} max={20} value={formData.track} onChange={(e) => setFormData((f) => ({ ...f, track: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.scheduling.startTime.label')}</label>
            <input type="time" value={formData.startTime ?? ''} onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.scheduling.warmupTime.label')}</label>
            <input type="time" value={formData.warmupTime ?? ''} onChange={(e) => setFormData((f) => ({ ...f, warmupTime: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Qualification */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('competitionForm.qualification.title')}</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.qualification.qualifiers.label')}</label>
            <input type="number" min={0} max={999} value={formData.qualifiers} onChange={(e) => setFormData((f) => ({ ...f, qualifiers: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.qualification.evaluations.label')}</label>
            <input type="number" min={1} max={10} value={formData.evaluations ?? 3} onChange={(e) => setFormData((f) => ({ ...f, evaluations: parseInt(e.target.value) || 3 }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('competitionForm.qualification.dropCount.label')}</label>
            <input type="number" min={0} max={5} value={formData.dropCount} onChange={(e) => setFormData((f) => ({ ...f, dropCount: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      {/* Behavior flags */}
      <div>
        <h4 className="text-sm font-semibold text-gray-800 mb-3">{t('competitionForm.behavior.title')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {boolField('dropWorstScore', 'competitionForm.behavior.dropWorstScore.label', 'competitionForm.behavior.dropWorstScore.description')}
          {boolField('showAgeGroup', 'competitionForm.behavior.showAgeGroup.label', 'competitionForm.behavior.showAgeGroup.description')}
          {boolField('isOptionalCompetition', 'competitionForm.behavior.isOptionalCompetition.label', 'competitionForm.behavior.isOptionalCompetition.description')}
          {boolField('showInfo', 'competitionForm.behavior.showInfo.label', 'competitionForm.behavior.showInfo.description')}
          {boolField('useCompulsoryProgram', 'competitionForm.behavior.useCompulsoryProgram.label', 'competitionForm.behavior.useCompulsoryProgram.description')}
          {boolField('sortAscending', 'competitionForm.behavior.sortAscending.label', 'competitionForm.behavior.sortAscending.description')}
          {boolField('manualSort', 'competitionForm.behavior.manualSort.label', 'competitionForm.behavior.manualSort.description')}
          {boolField('useApparatusPoints', 'competitionForm.behavior.useApparatusPoints.label', 'competitionForm.behavior.useApparatusPoints.description')}
          <div className="space-y-0.5 opacity-50 cursor-not-allowed">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked readOnly disabled className="rounded border-gray-300 cursor-not-allowed" />
              <span className="text-sm font-medium text-gray-500">{t('competitionForm.behavior.ageCheckByYearOnly.label')}</span>
            </label>
            <p className="text-xs text-gray-400 ml-6">{t('competitionForm.behavior.ageCheckByYearOnly.description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CompetitionFormWizard({
  isOpen,
  onClose,
  editingCompetition,
  eventId,
  onSaved,
}: CompetitionFormWizardProps) {
  const wizard = useCompetitionWizard({ isOpen, editingCompetition, eventId, onSaved, onClose });
  const { step, wizardSteps, title, canGoNext, goNext, goBack, isFirstStep, isLastStep, saving, error, handleSave } = wizard;

  const nav = (
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
    <WizardModal isOpen={isOpen} onClose={onClose} title={title} steps={wizardSteps} currentStep={step} size="4xl">
      {step === 'basicInfo' && <><StepBasicInfo wizard={wizard} />{nav}</>}
      {step === 'category' && <><StepCategory wizard={wizard} />{nav}</>}
      {step === 'disciplines' && <><StepDisciplines wizard={wizard} />{nav}</>}
      {step === 'settings' && <><StepSettings wizard={wizard} />{nav}</>}
    </WizardModal>
  );
}
