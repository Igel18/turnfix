/**
 * useSquadWizard
 * Custom hook that owns all business logic for the SquadWizardModal.
 * The component file contains only JSX / layout.
 *
 * Responsibilities:
 * - Load available participants from the API (step 2)
 * - Derive filter option lists (clubs, competitions)
 * - Filter the participant list by search, club, competition, birth year, gender
 * - Manage selection state (Set<number>)
 * - selectAll / deselectAll for current filtered view
 * - Save (create or edit) squad via API calls
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import type { Participant, Squad } from '../SquadManagement.types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WizardFilters {
  searchTerm: string;
  club: string;
  competition: string;
  birthYear: string;
  gender: string;
}

export type SquadWizardStep = 'name' | 'participants';

export interface UseSquadWizardProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  squad?: Squad;
  eventId: string;
  onDone: () => Promise<void>;
  onClose: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSquadWizard({
  isOpen,
  mode,
  squad,
  eventId,
  onDone,
  onClose,
}: UseSquadWizardProps) {
  const { t } = useTranslation();

  // Step navigation
  const [step, setStep] = useState<SquadWizardStep>('name');

  // Step 1: squad name
  const [squadName, setSquadName] = useState('');
  const nameValid = squadName.trim().length > 0 && squadName.trim().length <= 5;

  // Step 2: participant selection
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // IDs of participants already in the squad before editing
  const [currentMemberIds, setCurrentMemberIds] = useState<Set<number>>(new Set());
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filters, setFilters] = useState<WizardFilters>({
    searchTerm: '',
    club: '',
    competition: '',
    birthYear: '',
    gender: '',
  });

  // ── Reset on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setStep('name');
    setSquadName(mode === 'edit' && squad ? squad.name : '');
    setFilters({ searchTerm: '', club: '', competition: '', birthYear: '', gender: '' });
    setSelectedIds(new Set());
    setAllParticipants([]);
    setSaving(false);
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load participants when entering step 2 ───────────────────────────────────
  useEffect(() => {
    if (step === 'participants') {
      loadParticipants();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadParticipants = async () => {
    setLoadingParticipants(true);
    try {
      const data = await apiGet(
        `/squad-management/available-participants?eventId=${eventId}&includeAvailable=false&_t=${Date.now()}`,
      );
      const available: Participant[] = data.participants || [];

      if (mode === 'edit' && squad && squad.participants.length > 0) {
        // Merge current squad members into the list so they are visible and
        // can be deselected (= removed from the squad) by the user.
        const availableIds = new Set(available.map((p) => p.id));
        const currentMembers = squad.participants.filter((p) => !availableIds.has(p.id));
        const merged = [...currentMembers, ...available];
        const memberIdSet = new Set(squad.participants.map((p) => p.id));
        setCurrentMemberIds(memberIdSet);
        setAllParticipants(merged);
        setSelectedIds(new Set(memberIdSet));
      } else {
        setCurrentMemberIds(new Set());
        setAllParticipants(available);
      }
    } catch (err) {
      console.error('useSquadWizard: error loading participants', err);
      setAllParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // ── Filter option lists ──────────────────────────────────────────────────────

  const allClubs = useMemo(
    () => [...new Set(allParticipants.map((p) => p.club).filter(Boolean))].sort(),
    [allParticipants],
  );

  const allCompetitions = useMemo(() => {
    const seen = new Set<number>();
    const list: { id: number; name: string; number: string }[] = [];
    allParticipants.forEach((p) =>
      (p.competitions || []).forEach((c) => {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          list.push({ id: c.id, name: c.name, number: c.number || '' });
        }
      }),
    );
    return list.sort((a, b) => {
      const numA = parseInt(a.number) || 0;
      const numB = parseInt(b.number) || 0;
      if (numA !== numB) return numA - numB;
      return a.name.localeCompare(b.name);
    });
  }, [allParticipants]);

  // ── Filtered participants ────────────────────────────────────────────────────

  const filteredParticipants = useMemo(() => {
    const search = filters.searchTerm.toLowerCase();
    return allParticipants.filter((p) => {
      if (
        search &&
        !`${p.firstname} ${p.lastname}`.toLowerCase().includes(search) &&
        !p.club.toLowerCase().includes(search)
      )
        return false;
      if (filters.club && p.club !== filters.club) return false;
      if (
        filters.competition &&
        !(p.competitions || []).some((c) => c.id === parseInt(filters.competition))
      )
        return false;
      if (filters.birthYear && String(p.birthYear) !== filters.birthYear) return false;
      if (filters.gender && p.gender !== filters.gender) return false;
      return true;
    }).sort((a, b) => {
      // Current squad members appear at the top for easy visibility
      const aIsMember = currentMemberIds.has(a.id) ? 0 : 1;
      const bIsMember = currentMemberIds.has(b.id) ? 0 : 1;
      if (aIsMember !== bIsMember) return aIsMember - bIsMember;
      return `${a.lastname} ${a.firstname}`.localeCompare(`${b.lastname} ${b.firstname}`);
    });
  }, [allParticipants, filters, currentMemberIds]);

  // ── Selection helpers ────────────────────────────────────────────────────────

  const allFilteredSelected =
    filteredParticipants.length > 0 && filteredParticipants.every((p) => selectedIds.has(p.id));

  const toggleParticipant = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredParticipants.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredParticipants.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const trimmedName = squadName.trim();
      const eventIdInt = parseInt(eventId);

      if (mode === 'create') {
        await apiPost('/squad-management/create', { eventId: eventIdInt, name: trimmedName });
        for (const participantId of selectedIds) {
          await apiPost('/squad-management/assign', {
            participantId,
            squadName: trimmedName,
            eventId: eventIdInt,
          });
        }
      } else if (mode === 'edit' && squad) {
        if (trimmedName !== squad.name) {
          await apiPost('/squad-management/update', {
            eventId: eventIdInt,
            oldName: squad.name,
            newName: trimmedName,
          });
        }
        const previousIds = new Set(squad.participants.map((p) => p.id));
        for (const id of [...selectedIds].filter((id) => !previousIds.has(id))) {
          await apiPost('/squad-management/assign', {
            participantId: id,
            squadName: trimmedName,
            eventId: eventIdInt,
          });
        }
        for (const id of [...previousIds].filter((id) => !selectedIds.has(id))) {
          await apiDelete(`/squad-management/unassign?participantId=${id}&eventId=${eventId}`);
        }
      }

      await onDone();
      onClose();
    } catch (err) {
      console.error('useSquadWizard: save error', err);
      alert(err instanceof Error ? err.message : t('squadManagement.messages.creationFailed', { message: '' }));
    } finally {
      setSaving(false);
    }
  };

  // ── Wizard config ─────────────────────────────────────────────────────────────

  const title =
    step === 'name'
      ? mode === 'create'
        ? t('squadManagement.wizard.titleCreate')
        : t('squadManagement.wizard.titleEdit')
      : t('squadManagement.wizard.stepParticipantsTitle');

  const wizardSteps = [
    { key: 'name', label: t('squadManagement.wizard.stepNameShort') },
    { key: 'participants', label: t('squadManagement.wizard.stepParticipantsShort') },
  ];

  return {
    // navigation
    step,
    setStep,
    title,
    wizardSteps,
    // step 1
    squadName,
    setSquadName,
    nameValid,
    // step 2
    allParticipants,
    selectedIds,
    currentMemberIds,
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
  };
}
