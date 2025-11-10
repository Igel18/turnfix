/**
 * Squad Management Page
 * Refactored with Separation of Concerns (SoC) pattern
 * Main file reduced from 1070 lines to ~200 lines
 */

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { UserGroupIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { useEvent } from '@/contexts/EventContext';

// Hooks
import { useSquads } from './hooks/useSquads';
import { useParticipants } from './hooks/useParticipants';
import { useSquadAssignment } from './hooks/useSquadAssignment';

// Components
import { SquadList } from './components/SquadList';
import { AvailableParticipantsList } from './components/AvailableParticipantsList';
import { SquadDetailPane } from './components/SquadDetailPane';
import { CreateSquadModal } from './components/CreateSquadModal';

// Utils
import { exportSquadsPDF } from './utils/squadPdfExport';

// Types
import type { Squad } from './SquadManagement.types';

const SquadManagement: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // UI state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Custom hooks for data management
  const {
    squads,
    selectedSquad,
    isLoading: squadsLoading,
    setSelectedSquad,
    forceLoadSquads,
    createSquad,
    deleteSquad
  } = useSquads(eventId);

  const {
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
    forceLoadAvailableParticipants,
    participantHasSelectedCompetition
  } = useParticipants(eventId);

  const {
    isLoading: assignmentLoading,
    assignParticipantToSquad,
    removeParticipantFromSquad
  } = useSquadAssignment({
    eventId,
    squads,
    onDataChange: async () => {
      await forceLoadSquads();
      await forceLoadAvailableParticipants();
    }
  });

  // Combined loading state
  const isLoading = squadsLoading || assignmentLoading;

  // Handler for squad selection - reset competition selection when squad changes
  const handleSquadSelection = (squad: Squad) => {
    setSelectedSquad(squad);
    setCompetitionSelection({ id: null, name: null });
  };

  // Handler for competition selection
  const handleCompetitionClick = (competitionId: number, competitionName: string) => {
    const isSameCompetition = competitionSelection.id === competitionId && competitionSelection.name === competitionName;
    setCompetitionSelection({
      id: isSameCompetition ? null : competitionId,
      name: isSameCompetition ? null : competitionName
    });
  };

  // PDF Export Handler
  const handleExportPDF = () => {
    if (!selectedEvent) return;
    exportSquadsPDF({ squads, selectedEvent, t });
  };

  // No event selected state
  if (!eventId) {
    return (
      <EventManagementTemplate
        title={t('squadManagement.title')}
        subtitle={t('squadManagement.noEventSelected.message')}
        icon={UserGroupIcon}
        showEventContext={true}
        showViewToggle={false}
      >
        {() => (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('squadManagement.noEventSelected.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('squadManagement.noEventSelected.message')}
            </p>
          </div>
        )}
      </EventManagementTemplate>
    );
  }

  return (
    <EventManagementTemplate
      title={t('squadManagement.title')}
      subtitle={t('squadManagement.subtitle')}
      icon={UserGroupIcon}
      showEventContext={true}
      searchTerm={filterState.searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t('squadManagement.searchPlaceholder')}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      filterSection={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('squadManagement.filters.gender')}
              </label>
              <select
                value={filterState.genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('squadManagement.filters.all')}</option>
                <option value="male">{t('squadManagement.filters.male')}</option>
                <option value="female">{t('squadManagement.filters.female')}</option>
              </select>
            </div>

            {/* Competition Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('squadManagement.filters.competition')}
              </label>
              <select
                value={filterState.competitionFilter}
                onChange={(e) => setCompetitionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('squadManagement.filters.all')}</option>
                {allCompetitions.map(comp => (
                  <option key={comp.id} value={comp.name}>
                    {comp.name} (Nr. {comp.number})
                  </option>
                ))}
              </select>
            </div>

            {/* Club Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('squadManagement.filters.club')}
              </label>
              <select
                value={filterState.clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('squadManagement.filters.all')}</option>
                {allClubs.map(club => (
                  <option key={club} value={club}>
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      }
      showAddButton={true}
      addButtonText={t('squadManagement.actions.newSquad')}
      onAdd={() => setIsCreateModalOpen(true)}
      showExportCSV={true}
      onExportCSV={() => console.log('Export CSV clicked')}
      showExportPDF={true}
      onExportPDF={handleExportPDF}
      showViewToggle={false}
    >
      {() => (
        <div className="relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">{t('squadManagement.messages.processing')}</span>
              </div>
            </div>
          )}

          {/* Virtual Squad Information */}
          {squads.some(s => s.isVirtual) && (
            <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mx-6 mb-4 rounded">
              <div className="flex items-start">
                <InformationCircleIcon className="h-5 w-5 text-orange-600 mr-2 mt-0.5" />
                <div className="text-sm">
                  <div className="text-orange-800 font-medium mb-1">{t('squadManagement.virtualInfo.title')}</div>
                  <div className="text-orange-700 space-y-1">
                    <p>• <strong>Virtual squads</strong> {t('squadManagement.virtualInfo.point1')}</p>
                    <p>• {t('squadManagement.virtualInfo.point2')}</p>
                    <p>• {t('squadManagement.virtualInfo.point3')}</p>
                    <p>• {t('squadManagement.virtualInfo.point4')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main 3-Column Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Column 1: Squad List (Master) */}
              <SquadList
                squads={squads}
                selectedSquad={selectedSquad}
                onSquadSelect={handleSquadSelection}
                onSquadDelete={deleteSquad}
              />

              {/* Column 2: Available Participants */}
              <AvailableParticipantsList
                participants={filteredParticipants}
                selectedSquad={selectedSquad}
                hasVirtualSquads={squads.some(s => s.isVirtual)}
                competitionSelection={competitionSelection}
                onAssign={assignParticipantToSquad}
                onCompetitionSelectionClear={() => setCompetitionSelection({ id: null, name: null })}
                participantHasSelectedCompetition={participantHasSelectedCompetition}
              />

              {/* Column 3: Squad Details */}
              <SquadDetailPane
                selectedSquad={selectedSquad}
                competitionSelection={competitionSelection}
                onRemoveParticipant={removeParticipantFromSquad}
                onCompetitionClick={handleCompetitionClick}
                participantHasSelectedCompetition={participantHasSelectedCompetition}
              />
            </div>
          </div>

          {/* Create Squad Modal */}
          <CreateSquadModal
            isOpen={isCreateModalOpen}
            isLoading={isLoading}
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={createSquad}
          />
        </div>
      )}
    </EventManagementTemplate>
  );
};

export default SquadManagement;
