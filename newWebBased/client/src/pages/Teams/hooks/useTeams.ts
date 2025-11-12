/**
 * useTeams Hook - Data Management for Teams
 * Handles fetching, creating, updating, and deleting teams
 * Server-sync pattern: Updates selectedTeam when data changes
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Team, Club, Competition, TeamFormData } from '../Teams.types';
import { useServerSyncedSelection } from '@/hooks';

export const useTeams = (
  eventId?: string | null,
  selectedTeam: Team | null = null,
  onUpdate?: (updatedTeam: Team | null) => void
) => {
  const { t } = useTranslation();
  
  // State
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Server-synced selection update (like Groups)
  const updateSelectedTeam = useServerSyncedSelection({
    selectedItem: selectedTeam || null,
    onUpdate,
    getId: (team: Team) => team.id,
    getName: (team: Team) => team.name
  });

  // Fetch teams
  const fetchTeams = useCallback(async () => {
    if (!eventId) {
      setTeams([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams?eventId=${eventId}&limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch teams');
      }

      const data = await response.json();
      
      // Transform database teams to UI teams
      const transformedTeams: Team[] = (data.teams || []).map((team: any) => ({
        id: team.int_mannschaftenid,
        name: `${team.tfx_vereine.var_name} - ${t('teams.teamLabel')} ${team.int_nummer}`,
        clubId: team.int_vereineid,
        clubName: team.tfx_vereine.var_name,
        competitionId: team.int_wettkaempfeid,
        competitionName: team.tfx_wettkaempfe.var_name,
        number: team.int_nummer,
        riege: team.var_riege,
        startNumber: team.int_startnummer,
        memberCount: 0, // Will be loaded with members
        members: []
      }));

      setTeams(transformedTeams);
      
      // Update selected team if it exists in new data
      updateSelectedTeam(transformedTeams);
      
    } catch (error) {
      console.error('Error fetching teams:', error);
      setTeams([]);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, updateSelectedTeam, t]);

  // Fetch clubs
  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch('/api/clubs?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch clubs');
      
      const data = await response.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      setClubs([]);
    }
  }, []);

  // Fetch competitions for event
  const fetchCompetitions = useCallback(async () => {
    if (!eventId) {
      setCompetitions([]);
      return;
    }

    try {
      const response = await fetch(`/api/competitions?eventId=${eventId}&limit=1000`);
      if (!response.ok) throw new Error('Failed to fetch competitions');
      
      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
      setCompetitions([]);
    }
  }, [eventId]);

  // Create or update team
  const saveTeam = useCallback(async (
    formData: TeamFormData,
    editingTeam: Team | null
  ): Promise<boolean> => {
    try {
      const url = editingTeam 
        ? `/api/teams/${editingTeam.id}`
        : '/api/teams';
      
      const method = editingTeam ? 'PUT' : 'POST';

      const payload = {
        clubId: parseInt(formData.clubId),
        competitionId: parseInt(formData.competitionId),
        number: parseInt(formData.number),
        riege: formData.riege || null,
        startNumber: formData.startNumber ? parseInt(formData.startNumber) : null
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save team');
      }

      // Reload teams after save
      await fetchTeams();
      
      return true;
    } catch (error) {
      console.error('Error saving team:', error);
      alert(error instanceof Error ? error.message : 'Failed to save team');
      return false;
    }
  }, [fetchTeams]);

  // Delete team
  const deleteTeam = useCallback(async (team: Team): Promise<void> => {
    if (!confirm(t('teams.messages.confirmDelete', { name: team.name }))) {
      return;
    }

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete team');
      }

      await fetchTeams();
      
    } catch (error) {
      console.error('Error deleting team:', error);
      alert(t('teams.messages.deleteError'));
    }
  }, [t, fetchTeams]);

  // Load data on mount and when eventId changes
  useEffect(() => {
    fetchTeams();
    fetchClubs();
    fetchCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Only eventId dependency to prevent infinite loop

  return {
    teams,
    clubs,
    competitions,
    isLoading,
    fetchTeams,
    saveTeam,
    deleteTeam
  };
};
