/**
 * useTeams Hook
 * Handles all data fetching and CRUD operations for teams
 * Event-aware: Filters teams by eventId when provided
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Team, Club, Competition } from '../Teams.types';

interface UseTeamsProps {
  eventId?: string | null;
}

export const useTeams = ({ eventId }: UseTeamsProps = {}) => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<string>('all');

  // Fetch teams from API
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '1000' });
      if (selectedClub !== 'all') params.append('clubId', selectedClub);
      if (eventId) params.append('eventId', eventId);
      
      const response = await fetch(`/api/teams?${params}`);
      if (!response.ok) throw new Error('Failed to fetch teams');
      
      const data = await response.json();
      setTeams(data.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedClub, eventId]);

  // Fetch clubs from API
  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch('/api/clubs?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch clubs');
      
      const data = await response.json();
      setClubs(data.clubs || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  }, []);

  // Fetch competitions from API
  const fetchCompetitions = useCallback(async () => {
    try {
      const response = await fetch('/api/competitions?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch competitions');
      
      const data = await response.json();
      setCompetitions(data.competitions || []);
    } catch (error) {
      console.error('Error fetching competitions:', error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchTeams();
    fetchClubs();
    fetchCompetitions();
  }, [fetchTeams, fetchClubs, fetchCompetitions]);

  // Delete team
  const deleteTeam = async (team: Team): Promise<boolean> => {
    if (!window.confirm(t('teams.messages.confirmDelete'))) {
      return false;
    }

    try {
      const response = await fetch(`/api/teams/${team.int_mannschaftenid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete team');
      }

      await fetchTeams();
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      alert(t('teams.messages.deleteError'));
      return false;
    }
  };

  return {
    teams,
    clubs,
    competitions,
    loading,
    selectedClub,
    setSelectedClub,
    fetchTeams,
    deleteTeam,
  };
};
