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
import TeamFormModal from '@/components/TeamFormModal';

// Configuration
import { createTeamConfig } from './teamAssignmentConfig';

// Types
import type { Team, TeamFormData } from './Teams.types';

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
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState<TeamFormData>({
    clubId: '',
    competitionId: '',
    number: '1',
    riege: null,
    startNumber: ''
  });

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
    filters,
    isLoading: membersLoading,
    assignParticipant,
    removeParticipant,
    fetchMembers,
    setHidePlanned,
    setHideOtherClubs,
    resetFilters
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
      removeParticipant,
      filters,
      onToggleHidePlanned: setHidePlanned,
      onToggleHideOtherClubs: setHideOtherClubs,
      onResetFilters: resetFilters
    }),
    [t, clubs, competitions, saveTeam, deleteTeam, assignParticipant, removeParticipant, filters, setHidePlanned, setHideOtherClubs, resetFilters]
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
    setEditingTeam(null);
    setFormData({
      clubId: '',
      competitionId: '',
      number: '1',
      riege: null,
      startNumber: ''
    });
    setShowFormModal(true);
  };

  // Handler: Edit Team
  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      clubId: team.clubId.toString(),
      competitionId: team.competitionId.toString(),
      number: team.number.toString(),
      riege: team.riege,
      startNumber: team.startNumber?.toString() || ''
    });
    setShowFormModal(true);
  };

  // Handler: Form Submit
  const handleFormSubmit = async () => {
    const success = await saveTeam(formData, editingTeam);
    if (success) {
      setShowFormModal(false);
      setEditingTeam(null);
      setFormData({
        clubId: '',
        competitionId: '',
        number: '1',
        riege: null,
        startNumber: ''
      });
    }
  };

  // Handler: Delete Team
  const handleDeleteTeam = async (teamId: number | string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    
    await deleteTeam(team);
    // Clear selection if deleted team was selected
    if (selectedTeam?.id === teamId) {
      setSelectedTeam(null);
    }
  };

  // Enhanced config with edit/delete handlers
  const enhancedConfig = useMemo(() => ({
    ...config,
    onEditMaster: handleEditTeam,
    onDeleteMaster: handleDeleteTeam,
  }), [config, teams, selectedTeam]);

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
          config={enhancedConfig as any} // Use enhanced config with edit/delete handlers
          masterItems={teams}
          availableItems={filteredAvailableParticipants}
          assignments={[]} // Not needed for Teams (members stored in team object)
          isLoading={teamsLoading || membersLoading}
          selectedMaster={selectedTeamWithMembers}
          onSelectMaster={handleSelectTeam as any} // Type assertion
          columnSearchPlaceholders={columnSearchPlaceholders}
        />

        {/* Team Form Modal */}
        {showFormModal && (
          <TeamFormModal
            isOpen={showFormModal}
            onClose={() => {
              setShowFormModal(false);
              setEditingTeam(null);
            }}
            onSubmit={handleFormSubmit}
            formData={formData}
            setFormData={setFormData}
            clubs={clubs}
            competitions={competitions}
            isEditing={!!editingTeam}
          />
        )}
      </div>
    </EventManagementTemplate>
  );
};

export default Teams;
