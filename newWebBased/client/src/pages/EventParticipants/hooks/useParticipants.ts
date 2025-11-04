/**
 * Custom hook for participant data management
 * Point 122: Separation of Concerns - Extracted from EventParticipants.tsx
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';
import type {
  Participant,
  Competition,
  Club,
  EditParticipantData,
} from '../EventParticipants.types';

interface UseParticipantsProps {
  eventId: string | null;
}

interface UseParticipantsReturn {
  // Data
  allParticipants: Participant[];
  availableParticipants: Participant[];
  competitions: Competition[];
  clubs: Club[];
  totalInEvent: number;

  // Actions
  loadParticipants: () => Promise<void>;
  loadAvailableParticipants: () => Promise<void>;
  loadCompetitions: () => Promise<void>;
  loadClubs: () => Promise<void>;
  addParticipantToEvent: (participantIds: number[]) => Promise<void>;
  removeParticipantFromEvent: (participantId: number) => Promise<void>;
  updateParticipantStatus: (participantId: number, startetNicht: boolean) => Promise<void>;
  updateParticipantDetails: (participantId: number, data: EditParticipantData) => Promise<void>;

  // State setters (for external updates)
  setAllParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  setAvailableParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
}

/**
 * Hook for managing event participants data and operations
 */
export function useParticipants({ eventId }: UseParticipantsProps): UseParticipantsReturn {
  const { t } = useTranslation();

  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [totalInEvent, setTotalInEvent] = useState<number>(0);

  /**
   * Normalize gender value from various formats to 'male' | 'female'
   */
  const normalizeGender = (genderValue: any): 'male' | 'female' => {
    if (!genderValue) return 'male';

    const genderStr = String(genderValue).toLowerCase();

    if (
      genderStr === 'weiblich' ||
      genderStr === 'female' ||
      genderStr === 'w' ||
      genderStr === '2' ||
      genderValue === 2
    ) {
      return 'female';
    }

    if (
      genderStr === 'männlich' ||
      genderStr === 'male' ||
      genderStr === 'm' ||
      genderStr === '1' ||
      genderValue === 1
    ) {
      return 'male';
    }

    if (process.env.DEBUG === 'true') {
      console.warn('⚠️ Unknown gender value, defaulting to male:', genderValue);
    }
    return 'male';
  };

  /**
   * Load participants already in the event
   */
  const loadParticipants = async () => {
    if (!eventId) return;

    try {
      const data = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=false`);

      const normalizedParticipants = (data.participants || []).map((p: any) => ({
        ...p,
        gender: normalizeGender(p.gender || p.geschlecht_name || p.int_geschlecht),
      }));

      setAllParticipants(normalizedParticipants);
      setTotalInEvent(data.totalInEvent || 0);

      if (process.env.DEBUG === 'true') {
        console.log(
          `Loaded ${normalizedParticipants.length} participants (${data.totalInEvent || 0} in event)`
        );
      }
    } catch (error: any) {
      console.error('Error loading participants:', error);

      if (error.message?.includes('429')) {
        console.warn('Rate limited, will retry...');
        return;
      }

      setAllParticipants([]);
    }
  };

  /**
   * Load participants available to add to event
   */
  const loadAvailableParticipants = async () => {
    if (!eventId) return;

    try {
      const data = await apiGet(`/event-participants?eventId=${eventId}&includeAvailable=true`);

      const normalizedParticipants = (data.availableParticipants || []).map((p: any) => ({
        id: p.id || p.int_teilnehmerid,
        firstname: p.firstname || p.var_vorname,
        lastname: p.lastname || p.var_nachname,
        club: p.club || p.verein_name || '',
        clubId: p.clubId || p.int_vereineid || 0,
        gender: normalizeGender(p.gender || p.geschlecht_name || p.int_geschlecht),
        birthYear: p.birthYear || p.int_gebjahr || new Date().getFullYear(),
        age: p.age || 0,
        squad_name: p.squad_name || p.var_riege || '',
        startet_nicht: p.startet_nicht || false,
        bol_ak: p.bol_ak || false,
        var_comment: p.var_comment || '',
        isInEvent: false,
        assignedCompetitions: p.assignedCompetitions || [],
        registrationDate: p.registrationDate,
        startNumber: p.startNumber || p.int_startnummer,
      }));

      setAvailableParticipants(normalizedParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    }
  };

  /**
   * Load competitions for the event
   */
  const loadCompetitions = async () => {
    if (!eventId) return;

    try {
      const data = await apiGet(`/competitions?eventId=${eventId}`);
      setCompetitions(data);
    } catch (error) {
      console.error('Error loading competitions:', error);
      setCompetitions([]);
    }
  };

  /**
   * Load all clubs
   */
  const loadClubs = async () => {
    try {
      const data = await apiGet('/clubs');

      let clubsArray = [];
      if (Array.isArray(data)) {
        clubsArray = data;
      } else if (data && Array.isArray(data.clubs)) {
        clubsArray = data.clubs;
      } else {
        console.warn('Unexpected clubs data structure:', data);
        setClubs([]);
        return;
      }

      const validClubs = clubsArray
        .filter((club: any) => club && typeof club === 'object')
        .map((club: any) => ({
          id: club.id || club.int_vereineid,
          name: club.name || club.var_name || 'Unknown Club',
        }))
        .filter((club: Club) => club.id !== undefined && club.id !== null);

      setClubs(validClubs);
    } catch (error) {
      console.error('Error loading clubs:', error);
      setClubs([]);
    }
  };

  /**
   * Add participants to event
   */
  const addParticipantToEvent = async (participantIds: number[]) => {
    if (!eventId) return;

    try {
      await apiPost('/event-participants/add', {
        eventId: parseInt(eventId),
        participantIds,
      });

      await loadParticipants();
      await loadAvailableParticipants();
    } catch (error) {
      console.error('Error adding participants:', error);
      throw error;
    }
  };

  /**
   * Remove participant from event
   */
  const removeParticipantFromEvent = async (participantId: number) => {
    if (!eventId) return;

    try {
      await apiDelete(`/event-participants/${participantId}?eventId=${eventId}`);

      setAllParticipants((prev) => prev.filter((p) => p.id !== participantId));
      await loadAvailableParticipants();
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  };

  /**
   * Update participant "not starting" status
   */
  const updateParticipantStatus = async (participantId: number, startetNicht: boolean) => {
    if (!eventId) return;

    try {
      await apiPut('/event-participants/update-status', {
        participantId,
        eventId: parseInt(eventId),
        startetNicht,
      });

      setAllParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId ? { ...p, startet_nicht: startetNicht } : p
        )
      );
    } catch (error) {
      console.error('Error updating participant status:', error);
      alert(t('eventParticipants.messages.updateError'));
    }
  };

  /**
   * Update participant details
   */
  const updateParticipantDetails = async (
    participantId: number,
    updatedData: EditParticipantData
  ) => {
    if (!eventId) return;

    try {
      const age = updatedData.birthday
        ? new Date().getFullYear() - new Date(updatedData.birthday).getFullYear()
        : 0;

      await apiPut('/event-participants/update-details', {
        participantId,
        eventId: parseInt(eventId),
        ...updatedData,
        age,
      });

      setAllParticipants((prev) =>
        prev.map((p) =>
          p.id === participantId
            ? {
                ...p,
                firstname: updatedData.firstname,
                lastname: updatedData.lastname,
                clubId: updatedData.clubId,
                club: clubs.find((c) => c.id === updatedData.clubId)?.name || p.club,
                birthYear: updatedData.birthday
                  ? new Date(updatedData.birthday).getFullYear()
                  : p.birthYear,
                age: age,
                gender: updatedData.gender,
                squad_name: updatedData.squad_name,
                startet_nicht: updatedData.startet_nicht,
                bol_ak: updatedData.bol_ak,
                var_comment: updatedData.var_comment,
                assignedCompetitions: updatedData.assignedCompetitions,
              }
            : p
        )
      );
    } catch (error) {
      console.error('Error updating participant details:', error);
      alert(t('eventParticipants.messages.updateError'));
    }
  };

  // Load data when eventId changes
  useEffect(() => {
    if (eventId) {
      const timeoutId = setTimeout(() => {
        loadParticipants();
        loadAvailableParticipants();
        loadCompetitions();
        loadClubs();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [eventId]);

  return {
    allParticipants,
    availableParticipants,
    competitions,
    clubs,
    totalInEvent,
    loadParticipants,
    loadAvailableParticipants,
    loadCompetitions,
    loadClubs,
    addParticipantToEvent,
    removeParticipantFromEvent,
    updateParticipantStatus,
    updateParticipantDetails,
    setAllParticipants,
    setAvailableParticipants,
  };
}
