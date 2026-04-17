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
import { ageMatchesByBirthYear } from '@turnfix/shared';
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
 *
 * @deprecated Prefer `ageMatchesByBirthYear` from `@turnfix/shared` for the
 *   standard year-only check.  This function is kept for backward compatibility.
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

export type AddParticipantWizardStep = 'participant' | 'competition' | 'createAthlete';

export interface CreateAthleteForm {
  firstname: string;
  lastname: string;
  gender: string;   // '1' = male, '2' = female
  clubId: string;
  birthday: string; // 'YYYY-MM-DD' or ''
}

export type CreateAthleteErrors = Partial<Record<keyof CreateAthleteForm, string>>;

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

  // Step createAthlete: create new person
  const [createForm, setCreateForm] = useState<CreateAthleteForm>({
    firstname: '', lastname: '', gender: '', clubId: '', birthday: '',
  });
  const [createErrors, setCreateErrors] = useState<CreateAthleteErrors>({});
  const [clubs, setClubs] = useState<{ id: number; name: string }[]>([]);
  const [creatingAthlete, setCreatingAthlete] = useState(false);
  const [isCreatingNewPerson, setIsCreatingNewPerson] = useState(false);

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
    setCreateForm({ firstname: '', lastname: '', gender: '', clubId: '', birthday: '' });
    setCreateErrors({});
    setIsCreatingNewPerson(false);
    loadAvailableParticipants();
    loadClubs();
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

  const loadClubs = async () => {
    try {
      const data = await apiGet('/clubs');
      const list: any[] = Array.isArray(data) ? data : (data?.clubs ?? []);
      setClubs(list.map((c: any) => ({ id: c.id ?? c.int_vereineid, name: c.name ?? c.var_name ?? '' })));
    } catch (err) {
      console.error('useAddParticipantWizard: error loading clubs', err);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /** Step 1 → navigate to the "create new person" step. */
  const handleGoToCreateAthlete = () => {
    setCreateForm({ firstname: '', lastname: '', gender: '', clubId: '', birthday: '' });
    setCreateErrors({});
    setIsCreatingNewPerson(true);
    setStep('createAthlete');
  };

  /** createAthlete step: update a single form field. */
  const handleCreateFormChange = (field: keyof CreateAthleteForm, value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (createErrors[field]) {
      setCreateErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  /** createAthlete step: POST new participant and then proceed to competition selection. */
  const handleCreateAndAdd = async () => {
    // Validate required fields
    const errors: CreateAthleteErrors = {};
    if (!createForm.firstname.trim()) errors.firstname = 'required';
    if (!createForm.lastname.trim()) errors.lastname = 'required';
    if (!createForm.gender) errors.gender = 'required';
    if (!createForm.clubId) errors.clubId = 'required';
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreatingAthlete(true);
    try {
      const payload: Record<string, unknown> = {
        var_vorname: createForm.firstname.trim(),
        var_nachname: createForm.lastname.trim(),
        int_geschlecht: parseInt(createForm.gender, 10),
        int_vereineid: parseInt(createForm.clubId, 10),
      };
      if (createForm.birthday) {
        payload.dat_geburtstag = createForm.birthday;
      }

      const created = await apiPost('/participants', payload);

      // Compute age / birthYear from the provided birthday
      const birthYear = createForm.birthday
        ? new Date(createForm.birthday).getFullYear()
        : created.dat_geburtstag
          ? new Date(created.dat_geburtstag).getFullYear()
          : 0;
      const age = birthYear ? new Date().getFullYear() - birthYear : 0;
      const clubName = clubs.find((c) => c.id === parseInt(createForm.clubId, 10))?.name
        ?? created.verein_name ?? '';

      const newParticipant: Participant = {
        id: created.int_teilnehmerid ?? created.id,
        firstname: created.var_vorname ?? createForm.firstname.trim(),
        lastname: created.var_nachname ?? createForm.lastname.trim(),
        club: clubName,
        clubId: created.int_vereineid ?? parseInt(createForm.clubId, 10),
        gender: normalizeGender(created.geschlecht_name ?? created.int_geschlecht),
        age,
        birthYear,
        squad_name: '',
        startet_nicht: false,
        bol_ak: false,
        var_comment: '',
        isInEvent: false,
        assignedCompetitions: [],
        registrationDate: '',
        startNumber: null,
      };

      // Add the new person to the available-participants list so it appears if the
      // user navigates back, then proceed exactly like selecting an existing person.
      setAvailableParticipants((prev) => [newParticipant, ...prev]);
      handleSelectParticipant(newParticipant);
    } catch (err) {
      console.error('useAddParticipantWizard: error creating athlete', err);
      alert(t('eventParticipants.messages.createError'));
    } finally {
      setCreatingAthlete(false);
    }
  };

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
      if (filterByAge) {
        // DEFAULT: year-only check (Jahrgangsprüfung)
        const birthYear = selectedParticipant.birthYear;
        if (birthYear && birthYear > 0) {
          if (!ageMatchesByBirthYear(birthYear, comp.ageFrom, comp.ageTo)) return false;
        } else {
          // Fallback to computed age when birthYear is not available
          if (!ageMatchesCompetition(selectedParticipant.age, comp)) return false;
        }
      }
      return true;
    });
  }, [competitions, selectedParticipant, filterByGender, filterByAge]);

  const activeFilterCount = (filterByGender ? 1 : 0) + (filterByAge ? 1 : 0);

  // ── WizardModal config ────────────────────────────────────────────────────────

  const modalTitle =
    step === 'participant'
      ? t('eventParticipants.addModal.title')
      : step === 'createAthlete'
        ? t('eventParticipants.addModal.createAthleteTitle')
        : t('eventParticipants.addModal.stepCompetition');

  // When going through the "create new person" path show 3 steps; otherwise 2.
  const wizardSteps = isCreatingNewPerson
    ? [
        { key: 'participant', label: t('eventParticipants.addModal.stepParticipant') },
        { key: 'createAthlete', label: t('eventParticipants.addModal.stepCreateAthlete') },
        { key: 'competition', label: t('eventParticipants.addModal.stepCompetitionShort') },
      ]
    : [
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
    handleGoToCreateAthlete,
    // step createAthlete
    createForm,
    createErrors,
    clubs,
    creatingAthlete,
    handleCreateFormChange,
    handleCreateAndAdd,
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
