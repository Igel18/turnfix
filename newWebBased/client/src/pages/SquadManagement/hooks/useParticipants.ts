/**
 * useParticipants Hook
 * Manages participant data loading and filtering
 * Extracted from SquadManagement.tsx
 */

import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '@/utils/api';
import type { Participant, FilterState, CompetitionSelection } from '../SquadManagement.types';

interface UseParticipantsReturn {
  availableParticipants: Participant[];
  filteredParticipants: Participant[];
  filterState: FilterState;
  competitionSelection: CompetitionSelection;
  allCompetitions: { id: number; name: string; number: string }[];
  allClubs: string[];
  setSearchTerm: (term: string) => void;
  setGenderFilter: (gender: string) => void;
  setCompetitionFilter: (competition: string) => void;
  setClubFilter: (club: string) => void;
  resetFilters: () => void;
  setCompetitionSelection: (selection: CompetitionSelection) => void;
  loadAvailableParticipants: () => Promise<void>;
  forceLoadAvailableParticipants: () => Promise<void>;
  participantHasSelectedCompetition: (participant: Participant) => boolean;
}

export const useParticipants = (eventId: string | null): UseParticipantsReturn => {
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: '',
    genderFilter: '',
    competitionFilter: '',
    clubFilter: ''
  });
  const [competitionSelection, setCompetitionSelection] = useState<CompetitionSelection>({
    id: null,
    name: null
  });

  /**
   * Load available participants
   */
  const loadAvailableParticipants = async () => {
    if (!eventId) return;
    
    try {
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management/available-participants?eventId=${eventId}&includeAvailable=false&_t=${timestamp}`);
      const newParticipants = data.participants || [];
      console.log('🔄 Loading available participants:', newParticipants.length, 'participants loaded');
      setAvailableParticipants(newParticipants);
    } catch (error) {
      console.error('Error loading available participants:', error);
      setAvailableParticipants([]);
    }
  };

  /**
   * Force reload available participants (bypasses cache)
   */
  const forceLoadAvailableParticipants = async () => {
    if (!eventId) return;
    
    try {
      const timestamp = Date.now();
      const data = await apiGet(`/squad-management/available-participants?eventId=${eventId}&includeAvailable=false&_t=${timestamp}&_force=true`);
      const newParticipants = data.participants || [];
      console.log('🔄 Force loading available participants:', newParticipants.length, 'participants loaded');
      setAvailableParticipants(newParticipants);
    } catch (error) {
      console.error('Error force loading available participants:', error);
      setAvailableParticipants([]);
    }
  };

  /**
   * Check if participant has the selected competition
   */
  const participantHasSelectedCompetition = (participant: Participant): boolean => {
    if (competitionSelection.id === null || !competitionSelection.name) return false;
    return participant.competitions?.some(comp => {
      // Match by both ID and name for robust matching
      return comp.id === competitionSelection.id && comp.name === competitionSelection.name;
    }) || false;
  };

  /**
   * Get unique competitions from all participants
   */
  const allCompetitions = useMemo(() => {
    return availableParticipants
      .flatMap(p => p.competitions || [])
      .filter((comp, index, arr) => arr.findIndex(c => c.id === comp.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableParticipants]);

  /**
   * Get unique clubs from all participants
   */
  const allClubs = useMemo(() => {
    return [...new Set(availableParticipants.map(p => p.club))]
      .filter(club => club && club !== 'Unknown Club')
      .sort((a, b) => a.localeCompare(b));
  }, [availableParticipants]);

  /**
   * Filter participants based on current filter state
   */
  const filteredParticipants = useMemo(() => {
    return availableParticipants.filter(participant => {
      const matchesSearch =
        participant.firstname.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
        participant.lastname.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
        `${participant.firstname} ${participant.lastname}`.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
        participant.club.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
        (participant.competitionNames && participant.competitionNames.toLowerCase().includes(filterState.searchTerm.toLowerCase()));
      
      const matchesGender = !filterState.genderFilter || participant.gender === filterState.genderFilter;
      
      const matchesCompetition = !filterState.competitionFilter || 
        (participant.competitions && participant.competitions.some(comp => 
          comp.name.toLowerCase().includes(filterState.competitionFilter.toLowerCase())
        ));
      
      const matchesClub = !filterState.clubFilter || 
        participant.club.toLowerCase().includes(filterState.clubFilter.toLowerCase());
      
      return matchesSearch && matchesGender && matchesCompetition && matchesClub;
    });
  }, [availableParticipants, filterState]);

  /**
   * Filter setters
   */
  const setSearchTerm = (term: string) => {
    setFilterState(prev => ({ ...prev, searchTerm: term }));
  };

  const setGenderFilter = (gender: string) => {
    setFilterState(prev => ({ ...prev, genderFilter: gender }));
  };

  const setCompetitionFilter = (competition: string) => {
    setFilterState(prev => ({ ...prev, competitionFilter: competition }));
  };

  const setClubFilter = (club: string) => {
    setFilterState(prev => ({ ...prev, clubFilter: club }));
  };

  const resetFilters = () => {
    setFilterState({
      searchTerm: '',
      genderFilter: '',
      competitionFilter: '',
      clubFilter: ''
    });
  };

  // Load participants on mount and when eventId changes
  useEffect(() => {
    if (eventId) {
      loadAvailableParticipants();
    }
  }, [eventId]);

  return {
    availableParticipants,
    filteredParticipants,
    filterState,
    competitionSelection,
    allCompetitions,
    allClubs,
    setSearchTerm,
    setGenderFilter,
    setCompetitionFilter,
    setClubFilter,
    resetFilters,
    setCompetitionSelection,
    loadAvailableParticipants,
    forceLoadAvailableParticipants,
    participantHasSelectedCompetition
  };
};
