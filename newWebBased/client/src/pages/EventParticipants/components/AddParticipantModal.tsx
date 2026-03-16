/**
 * Add Participant Modal Component (Wizard)
 * Point 131: Extracted from EventParticipants for SoC
 * Point 77: Two-step wizard — 1) Select participant, 2) Select competition
 * 
 * Step 1: Search and select which participant to add
 * Step 2: Choose the target competition (smart-filtered by participant gender/age)
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Filter, ArrowLeft, ArrowRight, Check, Trophy } from 'lucide-react';
import UnifiedModal from '@/components/UnifiedModal';
import { GenderBadge } from '@/components/GenderBadge';
import { apiGet, apiPost } from '@/utils/api';
import { normalizeGender } from '@/utils/genderHelpers';
import type { GenderValue } from '@/utils/genderHelpers';
import type { Participant, Competition } from '../EventParticipants.types';

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  competitions: Competition[];
  onParticipantAdded: () => void;
}

/**
 * Check if a participant's gender matches a competition's gender.
 * Competition gender uses German DB values: 'männlich', 'weiblich', 'gemischt'
 * Participant gender uses normalized values: 'male', 'female', 'both', 'unknown'
 */
function genderMatchesCompetition(participantGender: GenderValue, competitionGender: string): boolean {
  if (competitionGender === 'gemischt') return true;
  if (competitionGender === 'männlich' && participantGender === 'male') return true;
  if (competitionGender === 'weiblich' && participantGender === 'female') return true;
  if (participantGender === 'unknown' || participantGender === 'both') return true;
  return false;
}

/**
 * Check if a participant's age falls within a competition's age range.
 */
function ageMatchesCompetition(participantAge: number, competition: Competition): boolean {
  if (!participantAge || participantAge <= 0) return true;
  const minAge = Math.min(competition.ageFrom, competition.ageTo);
  const maxAge = Math.max(competition.ageFrom, competition.ageTo);
  return participantAge >= minAge && participantAge <= maxAge;
}

// Wizard step type
type WizardStep = 'participant' | 'competition';

export function AddParticipantModal({
  isOpen,
  onClose,
  eventId,
  competitions,
  onParticipantAdded,
}: AddParticipantModalProps) {
  const { t } = useTranslation();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('participant');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Step 1 state
  const [searchTerm, setSearchTerm] = useState('');
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [filterByGender, setFilterByGender] = useState(true);
  const [filterByAge, setFilterByAge] = useState(true);
  const [adding, setAdding] = useState(false);

  // Reset all state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('participant');
      setSelectedParticipant(null);
      setSelectedCompetitionId(null);
      setSearchTerm('');
      setFilterByGender(true);
      setFilterByAge(true);
      setAdding(false);
      loadAvailableParticipants();
    }
  }, [isOpen]);

  const loadAvailableParticipants = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      // Use event-participants endpoint with includeAvailable to get isInEvent flag
      const data = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=true&_t=${timestamp}`);

      let participants = [];
      if (Array.isArray(data)) {
        participants = data;
      } else if (data && Array.isArray(data.participants)) {
        participants = data.participants;
      }

      const normalizedParticipants = participants.map((p: any) => ({
        id: p.id || p.int_teilnehmerid,
        firstname: p.firstname || p.var_vorname,
        lastname: p.lastname || p.var_nachname,
        club: p.club || p.verein_name || '',
        clubId: p.clubId || p.int_vereineid || 0,
        gender: normalizeGender(p.gender || p.geschlecht_name || p.int_geschlecht),
        age: p.age || 0,
        birthYear: p.birthYear || (p.dat_geburtstag ? new Date(p.dat_geburtstag).getFullYear() : null),
        squad_name: p.squad_name || '',
        startet_nicht: p.startet_nicht || false,
        bol_ak: p.bol_ak || false,
        var_comment: p.var_comment || '',
        isInEvent: p.isInEvent || false,
        assignedCompetitions: p.assignedCompetitions || [],
        registrationDate: p.registrationDate || '',
        startNumber: p.startNumber || p.int_startnummer || null,
      }));

      setAvailableParticipants(normalizedParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select participant → move to step 2
  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setSelectedCompetitionId(null);
    setFilterByGender(true);
    setFilterByAge(true);

    // If only one competition, skip step 2 and add directly
    if (competitions.length === 1) {
      handleConfirmAdd(participant, competitions[0].id);
      return;
    }
    // If no competitions, add without competition selection
    if (competitions.length === 0) {
      handleConfirmAdd(participant, null);
      return;
    }

    setStep('competition');
  };

  // Final: Add participant to event with selected competition
  const handleConfirmAdd = async (participant: Participant | null, competitionId: number | null) => {
    const p = participant || selectedParticipant;
    if (!p) return;

    setAdding(true);
    try {
      const payload: { eventId: number; participantId: number; competitionId?: number } = {
        eventId: parseInt(eventId),
        participantId: p.id,
      };
      if (competitionId) {
        payload.competitionId = competitionId;
      }

      await apiPost('/event-participants/add', payload);
      onParticipantAdded();
      onClose();
    } catch (error) {
      console.error('Error adding participant to event:', error);
      alert(t('eventParticipants.messages.addError'));
    } finally {
      setAdding(false);
    }
  };

  // Step 1: Filter participants by search
  const filteredParticipants = useMemo(() => {
    return availableParticipants.filter((participant) => {
      if (!participant || typeof participant !== 'object') return false;
      const firstname = participant.firstname || '';
      const lastname = participant.lastname || '';
      const club = participant.club || '';
      const lowerSearch = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        firstname.toLowerCase().includes(lowerSearch) ||
        lastname.toLowerCase().includes(lowerSearch) ||
        `${firstname} ${lastname}`.toLowerCase().includes(lowerSearch) ||
        club.toLowerCase().includes(lowerSearch)
      );
    });
  }, [availableParticipants, searchTerm]);

  // Step 2: Filter competitions by selected participant's gender/age
  const filteredCompetitions = useMemo(() => {
    if (!selectedParticipant) return competitions;
    return competitions.filter((comp) => {
      if (filterByGender && !genderMatchesCompetition(selectedParticipant.gender, comp.gender)) {
        return false;
      }
      if (filterByAge && !ageMatchesCompetition(selectedParticipant.age, comp)) {
        return false;
      }
      return true;
    });
  }, [competitions, selectedParticipant, filterByGender, filterByAge]);

  const activeFilterCount = (filterByGender ? 1 : 0) + (filterByAge ? 1 : 0);

  // Dynamic title based on step
  const modalTitle = step === 'participant'
    ? t('eventParticipants.addModal.title')
    : t('eventParticipants.addModal.stepCompetition');

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="2xl"
      showFooter={false}
      fullHeight={true}
    >
      {/* Wizard Step Indicator */}
      <div className="mb-5 flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === 'participant'
            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
            : 'bg-green-100 text-green-700'
        }`}>
          {step === 'competition' ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs">1</span>
          )}
          {t('eventParticipants.addModal.stepParticipant')}
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
          step === 'competition'
            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
            : 'bg-gray-100 text-gray-400'
        }`}>
          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-current text-white text-xs"
            style={{ backgroundColor: step === 'competition' ? '#2563eb' : '#9ca3af' }}>2</span>
          {t('eventParticipants.addModal.stepCompetitionShort')}
        </div>
      </div>

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
    </UnifiedModal>
  );
}
