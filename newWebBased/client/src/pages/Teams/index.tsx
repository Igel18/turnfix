/**
 * Teams Page - Unified Assignment Modal Implementation
 * Manages team-participant assignments with three-column interface
 * Follows Groups/Squads pattern with column-specific filters
 */

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '@heroicons/react/24/outline';
import { useFilterPanel } from '@/hooks';

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
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Filter State
  const [filterClub, setFilterClub] = useState('');
  const [filterCompetition, setFilterCompetition] = useState('');

  // useFilterPanel: auto-show when active, reset on close
  const isAnyFilterActiveTeams = filterClub !== '' || filterCompetition !== '';
  const resetTeamFilters = () => { setFilterClub(''); setFilterCompetition(''); };
  const { showFilters, toggleFilters: toggleTeamFilters } = useFilterPanel(isAnyFilterActiveTeams, resetTeamFilters);
  
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
    updateMemberFlags,
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
      updateMemberFlags,
      filters,
      onToggleHidePlanned: setHidePlanned,
      onToggleHideOtherClubs: setHideOtherClubs,
      onResetFilters: resetFilters
    }),
    [t, clubs, competitions, saveTeam, deleteTeam, assignParticipant, removeParticipant, updateMemberFlags, filters, setHidePlanned, setHideOtherClubs, resetFilters]
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

  // Filter teams by club and competition
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      if (filterClub && team.clubId.toString() !== filterClub) return false;
      if (filterCompetition && team.competitionId.toString() !== filterCompetition) return false;
      return true;
    });
  }, [teams, filterClub, filterCompetition]);

  // Unique clubs and competitions for filter dropdowns (from loaded teams)
  const uniqueClubs = useMemo(() => {
    const clubMap = new Map<number, string>();
    teams.forEach(team => clubMap.set(team.clubId, team.clubName));
    return Array.from(clubMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const uniqueCompetitions = useMemo(() => {
    const compMap = new Map<number, string>();
    teams.forEach(team => compMap.set(team.competitionId, team.competitionName));
    return Array.from(compMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const handleClearFilters = () => {
    setFilterClub('');
    setFilterCompetition('');
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
      onToggleFilters={toggleTeamFilters}
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
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('teams.filters.club')}
              </label>
              <select
                value={filterClub}
                onChange={(e) => setFilterClub(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('teams.filters.allClubs')}</option>
                {uniqueClubs.map(club => (
                  <option key={club.id} value={club.id.toString()}>{club.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('teams.filters.competition')}
              </label>
              <select
                value={filterCompetition}
                onChange={(e) => setFilterCompetition(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('teams.filters.allCompetitions')}</option>
                {uniqueCompetitions.map(comp => (
                  <option key={comp.id} value={comp.id.toString()}>{comp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Unified Assignment Modal (three-column layout) */}
        <UnifiedAssignmentModal
          config={enhancedConfig as any} // Use enhanced config with edit/delete handlers
          masterItems={filteredTeams}
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
