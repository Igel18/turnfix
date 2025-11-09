/**
 * Teams Page - Main Component
 * Refactored with Separation of Concerns (SoC) + EventManagementTemplate
 * 
 * This component orchestrates team management functionality.
 * Uses EventManagementTemplate for consistent UI/UX.
 * Event-aware: Filters teams by selected event from EventContext.
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, AlertCircle } from 'lucide-react';
import { UsersIcon } from '@heroicons/react/24/outline';

// Context & Hooks
import { useEvent } from '@/contexts/EventContext';

// Template & Components
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { Button } from '@/components/ui/button';

// Local Hooks & Types
import { useTeams } from './hooks';
import type { Team, SortField, SortDirection } from './Teams.types';

// Modal Components
import { TeamFormModal, TeamPenaltiesModal } from './components';

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
  
  // Custom hook for data management
  const {
    teams,
    clubs,
    competitions,
    loading,
    selectedClub,
    setSelectedClub,
    fetchTeams,
    deleteTeam
  } = useTeams({ eventId });
  
  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('club');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isPenaltiesModalOpen, setIsPenaltiesModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeamForPenalties, setSelectedTeamForPenalties] = useState<Team | null>(null);

  // Handle edit
  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsFormModalOpen(true);
  };

  // Handle delete
  const handleDelete = async (team: Team) => {
    await deleteTeam(team);
  };

  // Handle penalties
  const handleManagePenalties = (team: Team) => {
    setSelectedTeamForPenalties(team);
    setIsPenaltiesModalOpen(true);
  };

  // Handle form modal close
  const handleFormModalClose = (saved: boolean) => {
    setIsFormModalOpen(false);
    setEditingTeam(null);
    if (saved) fetchTeams();
  };

  // Handle penalties modal close
  const handlePenaltiesModalClose = () => {
    setIsPenaltiesModalOpen(false);
    setSelectedTeamForPenalties(null);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort teams
  const filteredAndSortedTeams = teams
    .filter((team) => {
      const matchesSearch = searchTerm === '' || 
        team.tfx_vereine.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.tfx_wettkaempfe.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (team.var_riege && team.var_riege.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'club':
          comparison = a.tfx_vereine.var_name.localeCompare(b.tfx_vereine.var_name);
          break;
        case 'competition':
          comparison = a.tfx_wettkaempfe.var_name.localeCompare(b.tfx_wettkaempfe.var_name);
          break;
        case 'number':
          comparison = (a.int_nummer || 0) - (b.int_nummer || 0);
          break;
        case 'startNumber':
          comparison = (a.int_startnummer || 0) - (b.int_startnummer || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Handle reset filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClub('all');
  };

  // Filter section component (matching EventParticipants style)
  const FilterSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('teams.searchPlaceholder')}
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('teams.searchPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Club Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('teams.filters.allClubs')}
        </label>
        <select
          value={selectedClub}
          onChange={(e) => setSelectedClub(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">{t('teams.filters.allClubs')}</option>
          {clubs.map((club) => (
            <option key={club.int_vereineid} value={club.int_vereineid.toString()}>
              {club.var_name}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <div className="flex items-end">
        <button
          onClick={handleResetFilters}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {t('common.reset')}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <EventManagementTemplate
        title={t('teams.title')}
        subtitle={t('teams.subtitle')}
        icon={UsersIcon}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        filterSection={<FilterSection />}
        showAddButton={true}
        addButtonText={t('teams.addTeam')}
        onAdd={() => {
          setEditingTeam(null);
          setIsFormModalOpen(true);
        }}
        viewStorageKey="teams-view"
        showViewToggle={true}
      >
        {() => (
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">{t('teams.loadingTeams')}</p>
              </div>
            ) : filteredAndSortedTeams.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t('teams.noTeams')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('club')}
                      >
                        {t('teams.table.club')}
                        {sortField === 'club' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('competition')}
                      >
                        {t('teams.table.competition')}
                        {sortField === 'competition' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('number')}
                      >
                        {t('teams.table.number')}
                        {sortField === 'number' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('teams.table.squad')}
                      </th>
                      <th
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('startNumber')}
                      >
                        {t('teams.table.startNumber')}
                        {sortField === 'startNumber' && (sortDirection === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('teams.table.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAndSortedTeams.map((team) => (
                      <tr key={team.int_mannschaftenid} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {team.tfx_vereine.var_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.tfx_wettkaempfe.var_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.int_nummer || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.var_riege || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {team.int_startnummer || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManagePenalties(team)}
                              title={t('teams.managePenalties')}
                            >
                              <AlertCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(team)}
                              title={t('teams.editTeam')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(team)}
                              title={t('teams.deleteTeam')}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </EventManagementTemplate>

      {/* Modals */}
      {isFormModalOpen && (
        <TeamFormModal
          team={editingTeam}
          clubs={clubs}
          competitions={competitions}
          onClose={handleFormModalClose}
        />
      )}

      {isPenaltiesModalOpen && selectedTeamForPenalties && (
        <TeamPenaltiesModal
          team={selectedTeamForPenalties}
          onClose={handlePenaltiesModalClose}
        />
      )}
    </>
  );
};

export default Teams;
