/**
 * useAddParticipantWizard
 * Custom hook that owns all business logic for the AddParticipantModal wizard.
 * The component file contains only JSX / layout.
 *
 * Responsibilities:
 * - Load available participants from the API
 * - Filter participants by search term (Step 1)
 * - Filter competitions by participant gender/age with toggle switches (Step 2)
 * - Manage wizard step navigation
 * - Submit the add-participant action to the API
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '@/utils/api';
import { normalizeGender } from '@/utils/genderHelpers';
import type { GenderValue } from '@/utils/genderHelpers';
import type { Participant, Competition } from '../EventParticipants.types';

// ── Exported pure helpers (for unit testing) ─────────────────────────────────

/**
 * Returns true when a participant's gender is compatible with a competition's
 * gender requirement.
 * Competition gender uses German DB values: 'männlich', 'weiblich', 'gemischt'
 * Participant gender uses normalised values: 'male', 'female', 'both', 'unknown'
 */
export function genderMatchesCompetition(
  participantGender: GenderValue,
  competitionGender: string,
): boolean {
  if (competitionGender === 'gemischt') return true;
  if (competitionGender === 'männlich' && participantGender === 'male') return true;
  if (competitionGender === 'weiblich' && participantGender === 'female') return true;
  if (participantGender === 'unknown' || participantGender === 'both') return true;
  return false;
}

/**
 * Returns true when the participant's age falls inside the competition's
 * age window (inclusive).  Ages <= 0 are treated as "unknown" and always pass.
 */
export function ageMatchesCompetition(
  participantAge: number,
  competition: Pick<Competition, 'ageFrom' | 'ageTo'>,
): boolean {
  if (!participantAge || participantAge <= 0) return true;
  const minAge = Math.min(competition.ageFrom, competition.ageTo);
  const maxAge = Math.max(competition.ageFrom, competition.ageTo);
  return participantAge >= minAge && participantAge <= maxAge;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AddParticipantWizardStep = 'participant' | 'competition';

export interface UseAddParticipantWizardProps {
  isOpen: boolean;
  eventId: string;
  competitions: Competition[];
  onParticipantAdded: () => void;
  onClose: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAddParticipantWizard({
  isOpen,
  eventId,
  competitions,
  onParticipantAdded,
  onClose,
}: UseAddParticipantWizardProps) {
  const { t } = useTranslation();

  // Wizard navigation
  const [step, setStep] = useState<AddParticipantWizardStep>('participant');
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Step 1: participant search
  const [searchTerm, setSearchTerm] = useState('');
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 2: competition selection
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<number | null>(null);
  const [filterByGender, setFilterByGender] = useState(true);
  const [filterByAge, setFilterByAge] = useState(true);
  const [adding, setAdding] = useState(false);

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('participant');
    setSelectedParticipant(null);
    setSelectedCompetitionId(null);
    setSearchTerm('');
    setFilterByGender(true);
    setFilterByAge(true);
    setAdding(false);
    loadAvailableParticipants();
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data loading ─────────────────────────────────────────────────────────────
  const loadAvailableParticipants = async () => {
    setLoading(true);
    try {
      const data = await apiGet(
        `/event-participants?eventId=${eventId}&includeAvailable=true&_t=${Date.now()}`,
      );

      let participants: any[] = [];
      if (Array.isArray(data)) {
        participants = data;
      } else if (data && Array.isArray(data.participants)) {
        participants = data.participants;
      }

      const normalised = participants.map((p: any) => ({
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

      setAvailableParticipants(normalised);
    } catch (err) {
      console.error('useAddParticipantWizard: error loading participants', err);
      setAvailableParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Step 1 → select a participant and decide whether to proceed to step 2. */
  const handleSelectParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setSelectedCompetitionId(null);
    setFilterByGender(true);
    setFilterByAge(true);

    // Skip step 2 when there is exactly one (or zero) competitions
    if (competitions.length === 1) {
      handleConfirmAdd(participant, competitions[0].id);
      return;
    }
    if (competitions.length === 0) {
      handleConfirmAdd(participant, null);
      return;
    }
    setStep('competition');
  };

  /** Final step: POST the participant + competition to the API. */
  const handleConfirmAdd = async (
    participant: Participant | null,
    competitionId: number | null,
  ) => {
    const p = participant ?? selectedParticipant;
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
    } catch (err) {
      console.error('useAddParticipantWizard: error adding participant', err);
      alert(t('eventParticipants.messages.addError'));
    } finally {
      setAdding(false);
    }
  };

  // ── Computed / derived ────────────────────────────────────────────────────────

  const filteredParticipants = useMemo(() => {
    return availableParticipants.filter((p) => {
      if (!p || typeof p !== 'object') return false;
      const fn = p.firstname || '';
      const ln = p.lastname || '';
      const club = p.club || '';
      const lowerSearch = searchTerm.toLowerCase();
      return (
        !searchTerm ||
        fn.toLowerCase().includes(lowerSearch) ||
        ln.toLowerCase().includes(lowerSearch) ||
        `${fn} ${ln}`.toLowerCase().includes(lowerSearch) ||
        club.toLowerCase().includes(lowerSearch)
      );
    });
  }, [availableParticipants, searchTerm]);

  const filteredCompetitions = useMemo(() => {
    if (!selectedParticipant) return competitions;
    return competitions.filter((comp) => {
      if (filterByGender && !genderMatchesCompetition(selectedParticipant.gender, comp.gender)) return false;
      if (filterByAge && !ageMatchesCompetition(selectedParticipant.age, comp)) return false;
      return true;
    });
  }, [competitions, selectedParticipant, filterByGender, filterByAge]);

  const activeFilterCount = (filterByGender ? 1 : 0) + (filterByAge ? 1 : 0);

  // ── WizardModal config ────────────────────────────────────────────────────────

  const modalTitle =
    step === 'participant'
      ? t('eventParticipants.addModal.title')
      : t('eventParticipants.addModal.stepCompetition');

  const wizardSteps = [
    { key: 'participant', label: t('eventParticipants.addModal.stepParticipant') },
    { key: 'competition', label: t('eventParticipants.addModal.stepCompetitionShort') },
  ];

  return {
    // navigation
    step,
    setStep,
    modalTitle,
    wizardSteps,
    // step 1
    searchTerm,
    setSearchTerm,
    loading,
    filteredParticipants,
    handleSelectParticipant,
    // step 2
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
  };
}
