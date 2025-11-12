/**
 * Teams Page - Unified Assignment Modal Implementation
 * Manages team-participant assignments with three-column interface
 * Follows Groups/Squads pattern with column-specific filters
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@heroicons/react/24/outline';

// Context & Hooks
import { useEvent } from '@/contexts/EventContext';
import { useTeams, useTeamMembers } from './hooks';

// Components
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { UnifiedAssignmentModal } from '@/components/assignment';

// Configuration
import { createTeamConfig } from './teamAssignmentConfig';

// Types
import type { Team } from './Teams.types';

/**
 * Main Teams Component
 */
const Teams: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');

  // Event Context
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;

  // State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);

  // Data Hooks
  const {
    teams,
    clubs,
    competitions,
    isLoading: teamsLoading,
    fetchTeams,
    saveTeam,
    deleteTeam
  } = useTeams(eventId, selectedTeam, (updatedTeam) => {
    setSelectedTeam(updatedTeam);
  });

  const {
    members,
    availableParticipants,
    isLoading: membersLoading,
    assignParticipant,
    removeParticipant,
    fetchMembers
  } = useTeamMembers(selectedTeam, eventId);

  // Update selected team with fresh member data
  const selectedTeamWithMembers: Team | null = useMemo(() => {
    if (!selectedTeam) return null;
    return {
      ...selectedTeam,
      members,
      memberCount: members.length
    };
  }, [selectedTeam, members]);

  // Filter out participants who are already team members
  const filteredAvailableParticipants = useMemo(() => {
    if (!selectedTeam || members.length === 0) {
      return availableParticipants;
    }
    
    const memberIds = new Set(members.map(m => m.id));
    return availableParticipants.filter(p => !memberIds.has(p.id));
  }, [availableParticipants, members, selectedTeam]);

  // Create assignment configuration
  const config = useMemo(() => 
    createTeamConfig({
      t,
      clubs,
      competitions,
      saveTeam,
      deleteTeam,
      assignParticipant,
      removeParticipant
    }),
    [t, clubs, competitions, saveTeam, deleteTeam, assignParticipant, removeParticipant]
  );

  // Handlers
  const handleRefresh = async () => {
    await fetchTeams();
    if (selectedTeam) {
      await fetchMembers();
    }
  };

  const handleSelectTeam = (team: Team | null) => {
    setSelectedTeam(team);
  };

  const handleCreateTeam = () => {
    // TODO: Implement team creation dialog
    alert(t('teams.createTeam') + ' - Coming soon!');
  };

  // Column search placeholders (for UnifiedAssignmentModal)
  const columnSearchPlaceholders = useMemo(() => ({
    master: t('teams.columnSearch.master'),
    available: t('teams.columnSearch.available'),
    assigned: t('teams.columnSearch.assigned')
  }), [t]);

  return (
    <EventManagementTemplate
      title={t('teams.title')}
      subtitle={t('teams.subtitle')}
      icon={UsersIcon}
      loading={teamsLoading}
      onRefresh={handleRefresh}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      showHelpPanel={showHelpPanel}
      onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
      helpContent={
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">{t('teams.help.title')}</h3>
          <p className="text-sm text-gray-600">{t('teams.help.description')}</p>
        </div>
      }
      onAdd={handleCreateTeam}
      showAddButton={true}
      addButtonText={t('teams.addTeam')}
      filterSection={
        <div className="p-4">
          <p className="text-sm text-gray-500">{t('teams.filters.comingSoon')}</p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Unified Assignment Modal (three-column layout) */}
        <UnifiedAssignmentModal
          config={config as any} // Type assertion for generic compatibility
          masterItems={teams}
          availableItems={filteredAvailableParticipants}
          assignments={[]} // Not needed for Teams (members stored in team object)
          isLoading={teamsLoading || membersLoading}
          selectedMaster={selectedTeamWithMembers}
          onSelectMaster={handleSelectTeam as any} // Type assertion
          columnSearchPlaceholders={columnSearchPlaceholders}
        />
      </div>
    </EventManagementTemplate>
  );
};

export default Teams;
