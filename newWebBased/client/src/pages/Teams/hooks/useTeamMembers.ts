/**
 * useTeamMembers Hook - Team Member Management
 * Handles fetching team members and assigning/removing participants
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Team, TeamMember, Participant } from '../Teams.types';

interface UseTeamMembersResult {
  members: TeamMember[];
  availableParticipants: Participant[];
  isLoading: boolean;
  assignParticipant: (participantId: number) => Promise<void>;
  removeParticipant: (participantId: number) => Promise<void>;
  fetchMembers: () => Promise<void>;
}

export const useTeamMembers = (
  selectedTeam: Team | null,
  eventId?: string | null
): UseTeamMembersResult => {
  const { t } = useTranslation();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [availableParticipants, setAvailableParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch team members
  const fetchMembers = useCallback(async () => {
    if (!selectedTeam) {
      setMembers([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const data = await response.json();
      
      // Transform to TeamMember
      const transformedMembers: TeamMember[] = (data.members || []).map((member: any) => {
        const birthdate = member.tfx_teilnehmer.dat_geburtstag;
        const age = birthdate ? new Date().getFullYear() - new Date(birthdate).getFullYear() : undefined;
        
        return {
          id: member.int_teilnehmerid,
          firstName: member.tfx_teilnehmer.var_vorname,
          lastName: member.tfx_teilnehmer.var_nachname,
          clubId: member.tfx_teilnehmer.int_vereineid,
          clubName: member.tfx_teilnehmer.tfx_vereine?.var_name,
          birthdate,
          age,
          gender: member.tfx_teilnehmer.geschlecht_name, // Fixed: use geschlecht_name from API
          startNumber: member.tfx_teilnehmer.int_startnummer
        };
      });

      setMembers(transformedMembers);
      
    } catch (error) {
      console.error('Error fetching team members:', error);
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  // Fetch available participants (for assignment)
  const fetchAvailableParticipants = useCallback(async () => {
    if (!eventId) {
      setAvailableParticipants([]);
      return;
    }

    try {
      const response = await fetch(`/api/participants?eventId=${eventId}&limit=1000`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }

      const data = await response.json();
      
      // Transform to Participant
      const transformedParticipants: Participant[] = (data.participants || []).map((p: any) => {
        const birthdate = p.dat_geburtstag;
        const age = birthdate ? new Date().getFullYear() - new Date(birthdate).getFullYear() : undefined;
        
        return {
          id: p.int_teilnehmerid,
          firstName: p.var_vorname,
          lastName: p.var_nachname,
          clubId: p.int_vereineid,
          clubName: p.verein_name, // Fixed: use verein_name from API
          birthdate,
          age,
          gender: p.geschlecht_name, // Fixed: use geschlecht_name from API
          startNumber: p.int_startnummer
        };
      });

      setAvailableParticipants(transformedParticipants);
      
    } catch (error) {
      console.error('Error fetching participants:', error);
      setAvailableParticipants([]);
    }
  }, [eventId]);

  // Assign participant to team
  const assignParticipant = useCallback(async (participantId: number) => {
    if (!selectedTeam) {
      console.error('No team selected');
      return;
    }

    try {
      const response = await fetch(`/api/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign participant');
      }

      // Reload members
      await fetchMembers();
      
    } catch (error) {
      console.error('Error assigning participant:', error);
      alert(t('teams.messages.assignError'));
    }
  }, [selectedTeam, fetchMembers, t]);

  // Remove participant from team
  const removeParticipant = useCallback(async (participantId: number) => {
    if (!selectedTeam) {
      console.error('No team selected');
      return;
    }

    try {
      const response = await fetch(
        `/api/teams/${selectedTeam.id}/members/${participantId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove participant');
      }

      // Reload members
      await fetchMembers();
      
    } catch (error) {
      console.error('Error removing participant:', error);
      alert(t('teams.messages.removeError'));
    }
  }, [selectedTeam, fetchMembers, t]);

  // Load members when team changes
  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeam?.id]); // Only team ID to prevent loop

  // Load available participants when event changes
  useEffect(() => {
    fetchAvailableParticipants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Only eventId to prevent loop

  return {
    members,
    availableParticipants,
    isLoading,
    assignParticipant,
    removeParticipant,
    fetchMembers
  };
};
