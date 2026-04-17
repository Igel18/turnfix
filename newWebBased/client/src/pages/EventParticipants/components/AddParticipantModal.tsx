/**
 * AddParticipantModal — thin presentation component.
 * All business logic lives in hooks/useAddParticipantWizard.ts.
 *
 * Point 131: Extracted from EventParticipants for SoC
 * Point 77: Two-step wizard — 1) Select participant, 2) Select competition
 */

import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Filter, ArrowLeft, ArrowRight, Check, Trophy } from 'lucide-react';
import WizardModal from '@/components/WizardModal';
import { GenderBadge } from '@/components/GenderBadge';
import type { Competition } from '../EventParticipants.types';
import { useAddParticipantWizard } from '../hooks/useAddParticipantWizard';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  competitions: Competition[];
  onParticipantAdded: () => void;
}

export function AddParticipantModal({
  isOpen,
  onClose,
  eventId,
  competitions,
  onParticipantAdded,
}: AddParticipantModalProps) {
  const { t } = useTranslation();

  const {
    step,
    setStep,
    modalTitle,
    wizardSteps,
    searchTerm,
    setSearchTerm,
    loading,
    filteredParticipants,
    handleSelectParticipant,
    handleGoToCreateAthlete,
    createForm,
    createErrors,
    clubs,
    creatingAthlete,
    handleCreateFormChange,
    handleCreateAndAdd,
    selectedParticipant,
    setSelectedParticipant,
    selectedCompetitionId,
    setSelectedCompetitionId,
    filterByGender,
    setFilterByGender,
    filterByAge,
    setFilterByAge,
    activeFilterCount,
    filteredCompetitions,
    adding,
    handleConfirmAdd,
  } = useAddParticipantWizard({ isOpen, eventId, competitions, onParticipantAdded, onClose });

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      steps={wizardSteps}
      currentStep={step}
      size="2xl"
      fullHeight={true}
    >

      {/* ═══════════════════ STEP 1: Select Participant ═══════════════════ */}
      {step === 'participant' && (
        <>
          {/* Search Field */}
          <div className="mb-4">
            <input
              type="text"
              placeholder={t('eventParticipants.addModal.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Results count */}
          <div className="mb-2 text-sm text-gray-500">
            {filteredParticipants.length} {t('eventParticipants.addModal.resultsCount')}
          </div>

          {/* Participant List */}
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                <p>{t('common.loading')}</p>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="mx-auto h-8 w-8 mb-2" />
                <p>{t('eventParticipants.addModal.noParticipants')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredParticipants.map((participant) => (
                  <div key={participant.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">
                        {participant.firstname} {participant.lastname}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        {participant.club} • <GenderBadge value={participant.gender} /> • {t('eventParticipants.card.years', { count: participant.age })}
                      </p>
                    </div>
                    {participant.isInEvent ? (
                      <span className="text-sm text-gray-400 italic">{t('eventParticipants.addModal.alreadyInEvent')}</span>
                    ) : (
                      <button
                        onClick={() => handleSelectParticipant(participant)}
                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-sm transition-colors"
                      >
                        {t('eventParticipants.addModal.select')}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create New Person Button */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={handleGoToCreateAthlete}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-500 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {t('eventParticipants.addModal.createNewPerson')}
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════ STEP createAthlete: Create New Person ═══════════════════ */}
      {step === 'createAthlete' && (
        <>
          <div className="space-y-4">
            {/* Firstname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eventParticipants.addModal.createFirstname')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.firstname}
                onChange={(e) => handleCreateFormChange('firstname', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${createErrors.firstname ? 'border-red-500' : 'border-gray-300'}`}
                autoFocus
              />
              {createErrors.firstname && (
                <p className="mt-1 text-xs text-red-600">{t('common.fieldRequired')}</p>
              )}
            </div>

            {/* Lastname */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eventParticipants.addModal.createLastname')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={createForm.lastname}
                onChange={(e) => handleCreateFormChange('lastname', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${createErrors.lastname ? 'border-red-500' : 'border-gray-300'}`}
              />
              {createErrors.lastname && (
                <p className="mt-1 text-xs text-red-600">{t('common.fieldRequired')}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('eventParticipants.addModal.createGender')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.gender}
                  onChange={(e) => handleCreateFormChange('gender', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${createErrors.gender ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">{t('eventParticipants.addModal.selectGender')}</option>
                  <option value="1">{t('common.gender.male')}</option>
                  <option value="2">{t('common.gender.female')}</option>
                </select>
                {createErrors.gender && (
                  <p className="mt-1 text-xs text-red-600">{t('common.fieldRequired')}</p>
                )}
              </div>

              {/* Club */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('eventParticipants.addModal.createClub')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.clubId}
                  onChange={(e) => handleCreateFormChange('clubId', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${createErrors.clubId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">{t('eventParticipants.addModal.selectClub')}</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {createErrors.clubId && (
                  <p className="mt-1 text-xs text-red-600">{t('common.fieldRequired')}</p>
                )}
              </div>
            </div>

            {/* Birthday (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('eventParticipants.addModal.createBirthday')}
                <span className="ml-1 text-xs text-gray-400">({t('common.optional')})</span>
              </label>
              <input
                type="date"
                value={createForm.birthday}
                onChange={(e) => handleCreateFormChange('birthday', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setStep('participant')}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </span>
            </button>
            <button
              onClick={handleCreateAndAdd}
              disabled={creatingAthlete}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {creatingAthlete
                ? t('common.loading')
                : t('eventParticipants.addModal.createAndAdd')}
            </button>
          </div>
        </>
      )}

      {/* ═══════════════════ STEP 2: Select Competition ═══════════════════ */}
      {step === 'competition' && selectedParticipant && (
        <>
          {/* Selected Participant Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">
                {selectedParticipant.firstname} {selectedParticipant.lastname}
              </p>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                {selectedParticipant.club} • <GenderBadge value={selectedParticipant.gender} /> • {t('eventParticipants.card.years', { count: selectedParticipant.age })}
              </p>
            </div>
            <button
              onClick={() => { setStep('participant'); setSelectedParticipant(null); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('eventParticipants.addModal.changeParticipant')}
            </button>
          </div>

          {/* Smart Filters */}
          <div className="mb-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Filter className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-blue-700">
              {t('eventParticipants.addModal.smartFilters')}
            </span>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filterByGender}
                onChange={(e) => setFilterByGender(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('eventParticipants.addModal.filterGender')}</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filterByAge}
                onChange={(e) => setFilterByAge(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{t('eventParticipants.addModal.filterAge')}</span>
            </label>
            {activeFilterCount > 0 && (
              <span className="text-xs text-blue-500">
                ({activeFilterCount} {activeFilterCount === 1
                  ? t('eventParticipants.addModal.filterActive')
                  : t('eventParticipants.addModal.filtersActive')})
              </span>
            )}
          </div>

          {/* Competition List */}
          <div className="mb-2 text-sm text-gray-500">
            {filteredCompetitions.length} {filteredCompetitions.length === 1
              ? t('eventParticipants.addModal.competitionAvailable')
              : t('eventParticipants.addModal.competitionsAvailable')}
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-lg">
            {filteredCompetitions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="mx-auto h-8 w-8 mb-2" />
                <p>{t('eventParticipants.addModal.noMatchingCompetitions')}</p>
                <p className="text-xs mt-1">{t('eventParticipants.addModal.tryDisablingFilters')}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCompetitions.map((comp) => {
                  const isSelected = selectedCompetitionId === comp.id;
                  const genderIcon = comp.gender === 'männlich' ? '♂' : comp.gender === 'weiblich' ? '♀' : '♂♀';
                  return (
                    <div
                      key={comp.id}
                      onClick={() => setSelectedCompetitionId(isSelected ? null : comp.id)}
                      className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-l-4 border-l-blue-500'
                          : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {comp.number ? `${comp.number} - ` : ''}{comp.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {genderIcon} {comp.gender} • {t('eventParticipants.addModal.age')} {comp.ageFrom}-{comp.ageTo}
                          {comp.participantCount > 0 && (
                            <span className="ml-2">• {comp.participantCount} {t('eventParticipants.addModal.participantsInComp')}</span>
                          )}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => { setStep('participant'); setSelectedParticipant(null); }}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span className="flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                {t('common.back')}
              </span>
            </button>
            <button
              onClick={() => handleConfirmAdd(null, selectedCompetitionId)}
              disabled={adding || !selectedCompetitionId}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {adding
                ? t('common.loading')
                : t('eventParticipants.addModal.addToCompetition')}
            </button>
          </div>
        </>
      )}
    </WizardModal>
  );
}
