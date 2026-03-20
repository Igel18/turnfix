/**
 * SquadWizardModal — thin presentation component.
 * All business logic lives in hooks/useSquadWizard.ts.
 *
 * Two-step wizard for creating or editing a squad.
 *   Step 1 – Enter / confirm squad name
 *   Step 2 – Select participants with filters (Verein, Wettkampf, Jahrgang, Geschlecht)
 */

import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Users, UserPlus } from 'lucide-react';
import WizardModal from '@/components/WizardModal';
import { GenderBadge } from '@/components/GenderBadge';
import type { Squad } from '../SquadManagement.types';
import { useSquadWizard } from '../hooks/useSquadWizard';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SquadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  squad?: Squad;
  eventId: string;
  onDone: () => Promise<void>;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SquadWizardModal({
  isOpen,
  onClose,
  mode,
  squad,
  eventId,
  onDone,
}: SquadWizardModalProps) {
  const { t } = useTranslation();

  const {
    step,
    setStep,
    title,
    wizardSteps,
    squadName,
    setSquadName,
    nameValid,
    selectedIds,
    loadingParticipants,
    saving,
    filters,
    setFilters,
    allClubs,
    allCompetitions,
    filteredParticipants,
    allFilteredSelected,
    toggleParticipant,
    toggleSelectAllFiltered,
    handleSave,
  } = useSquadWizard({ isOpen, mode, squad, eventId, onDone, onClose });

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      steps={wizardSteps}
      currentStep={step}
      size="3xl"
      fullHeight={true}
    >

      {/* ══════════════════ STEP 1: Squad name ══════════════════ */}
      {step === 'name' && (
        <>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('squadManagement.createModal.squadName')}{' '}
            <span className="text-red-500">*</span>{' '}
            <span className="text-gray-400 font-normal">{t('squadManagement.createModal.maxCharacters')}</span>
          </label>
          <input
            type="text"
            value={squadName}
            onChange={(e) => setSquadName(e.target.value)}
            maxLength={5}
            placeholder={t('squadManagement.createModal.placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && nameValid) setStep('participants'); }}
          />
          <p className="mt-1 text-xs text-gray-400">
            {t('squadManagement.createModal.characterCount', { count: squadName.length })}
          </p>
          <p className="mt-2 text-sm text-gray-500">{t('squadManagement.createModal.hint')}</p>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep('participants')}
              disabled={!nameValid}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('squadManagement.wizard.next')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* ══════════════════ STEP 2: Select participants ══════════════════ */}
      {step === 'participants' && (
        <>
          {/* Squad name summary bar */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{squadName}</p>
              <p className="text-sm text-gray-500">{t('squadManagement.wizard.selectedCount', { count: selectedIds.size })}</p>
            </div>
            <button
              onClick={() => setStep('name')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('squadManagement.wizard.changeName')}
            </button>
          </div>

          {/* Filter bar */}
          <div className="mb-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => setFilters((f) => ({ ...f, searchTerm: e.target.value }))}
              placeholder={t('squadManagement.wizard.filters.search')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filters.club}
              onChange={(e) => setFilters((f) => ({ ...f, club: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('squadManagement.wizard.filters.allClubs')}</option>
              {allClubs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.competition}
              onChange={(e) => setFilters((f) => ({ ...f, competition: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('squadManagement.wizard.filters.allCompetitions')}</option>
              {allCompetitions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.number ? `Nr. ${c.number} – ${c.name}` : c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={filters.birthYear}
              onChange={(e) => setFilters((f) => ({ ...f, birthYear: e.target.value }))}
              placeholder={t('squadManagement.filters.birthYearPlaceholder')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={filters.gender}
              onChange={(e) => setFilters((f) => ({ ...f, gender: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('squadManagement.filters.all')}</option>
              <option value="male">{t('squadManagement.filters.male')}</option>
              <option value="female">{t('squadManagement.filters.female')}</option>
            </select>
          </div>

          {/* Count + select-all */}
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>
              {filteredParticipants.length} {t('eventParticipants.addModal.resultsCount')}
              {' · '}
              <span className="font-medium text-blue-700">
                {t('squadManagement.wizard.selectedCount', { count: selectedIds.size })}
              </span>
            </span>
            <button
              onClick={toggleSelectAllFiltered}
              className="text-blue-600 hover:text-blue-800 text-xs underline"
            >
              {allFilteredSelected ? t('squadManagement.wizard.deselectAll') : t('squadManagement.wizard.selectAll')}
            </button>
          </div>

          {/* Participant list */}
          <div className="border rounded-lg overflow-auto" style={{ maxHeight: '42vh' }}>
            {loadingParticipants ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Users className="h-5 w-5 mr-2 animate-pulse" />
                {t('common.loading')}
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <UserPlus className="mx-auto h-8 w-8 mb-2" />
                <p>{t('squadManagement.wizard.noParticipants')}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} className="rounded" />
                    </th>
                    <th className="px-3 py-2.5 text-left">{t('squadManagement.pdf.name')}</th>
                    <th className="px-3 py-2.5 text-left">{t('squadManagement.filters.club')}</th>
                    <th className="px-3 py-2.5 text-center">{t('squadManagement.filters.birthYear')}</th>
                    <th className="px-3 py-2.5 text-center">{t('squadManagement.filters.gender')}</th>
                    <th className="px-3 py-2.5 text-left">{t('squadManagement.filters.competition')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredParticipants.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => toggleParticipant(p.id)}
                      className={`cursor-pointer hover:bg-blue-50 transition-colors ${
                        selectedIds.has(p.id)
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleParticipant(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{p.firstname} {p.lastname}</td>
                      <td className="px-3 py-2 text-gray-600">{p.club || '–'}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{p.birthYear || '–'}</td>
                      <td className="px-3 py-2 text-center"><GenderBadge value={p.gender} /></td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {(p.competitions || []).length === 0
                          ? '–'
                          : (p.competitions || []).map((c) =>
                              c.number ? `Nr. ${c.number} – ${c.name}` : c.name
                            ).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setStep('name')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('squadManagement.wizard.back')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              <Check className="h-4 w-4" />
              {saving ? t('squadManagement.messages.processing') : t('squadManagement.wizard.save')}
            </button>
          </div>
        </>
      )}
    </WizardModal>
  );
}

export default SquadWizardModal;
