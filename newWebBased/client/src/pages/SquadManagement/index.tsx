/**
 * Squad Management Page - Unified Version
 * Using UnifiedAssignmentModal for generic M:N assignment UI
 * Reduced from 298 lines to ~150 lines (50% reduction)
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { UserGroupIcon, InformationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import { useEvent } from '@/contexts/EventContext';
import { UnifiedAssignmentModal } from '@/components/assignment';

// Hooks
import { useFilterPanel } from '@/hooks';
import { useSquads } from './hooks/useSquads';
import { useParticipants } from './hooks/useParticipants';
import { useSquadAssignment } from './hooks/useSquadAssignment';

// Components
import { CreateSquadModal } from './components/CreateSquadModal';
import { AutoAssignDialog } from './components/AutoAssignDialog';
import { SquadWizardModal } from './components/SquadWizardModal';

// Utils
import { exportSquadsPDF } from './utils/squadPdfExport';
import { createSquadConfig } from './squadAssignmentConfig';

// Types
import type { Participant, Squad } from './SquadManagement.types';

const SquadManagementUnified: React.FC = () => {
    // Track selected squad for detail pane (by id)
    const [selectedSquadId, setSelectedSquadId] = useState<number | string | null>(null);
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');
  
  // Use EventContext for unified event management
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;
  
  // UI state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Squad | null>(null);
  const [isAutoAssignOpen, setIsAutoAssignOpen] = useState(false);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  const [wizardSquad, setWizardSquad] = useState<Squad | null>(null);

  // Custom hooks for data management
  const {
    squads,
    isLoading: squadsLoading,
    forceLoadSquads,
    createSquad,
    updateSquad,
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
    setAssignmentStatus,
    setBirthYear,
    resetFilters,
    setCompetitionSelection,
    forceLoadAvailableParticipants,
    participantHasSelectedCompetition
  } = useParticipants(eventId);

  // useFilterPanel: auto-show when active, reset on close
  const isAnyFilterActive =
    filterState.searchTerm !== '' ||
    filterState.genderFilter !== '' ||
    filterState.competitionFilter !== '' ||
    filterState.clubFilter !== '' ||
    filterState.assignmentStatus !== 'all' ||
    filterState.birthYear !== '';
  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, resetFilters);

  // Pre-fill search from ?prefillSearch= URL param (set by EventSearchPalette navigation)
  useEffect(() => {
    const prefill = searchParams.get('prefillSearch');
    if (prefill) setSearchTerm(prefill);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Handler for competition selection
  const handleCompetitionClick = (competitionId: number, competitionName: string) => {
    const isSameCompetition = competitionSelection.id === competitionId && competitionSelection.name === competitionName;
    setCompetitionSelection({
      id: isSameCompetition ? null : competitionId,
      name: isSameCompetition ? null : competitionName
    });
  };

  // Handler for participant removal
  const handleRemoveParticipant = async (participantId: number) => {
    await removeParticipantFromSquad(participantId);
    // After reload, keep the same squad selected (if it still exists)
    if (selectedSquadId) {
      const stillExists = squads.find(s => s.id === selectedSquadId);
      if (!stillExists && squads.length > 0) {
        setSelectedSquadId(squads[0].id);
      }
    }
  };

  // Handler for assignment
  const handleAssign = async (participant: Participant, squadId: number | string) => {
    await assignParticipantToSquad(participant, squadId);
    setSelectedSquadId(squadId);
  };

  // Handler for unassignment
  const handleUnassign = async (_squadId: number | string, participantId: number | string) => {
    await removeParticipantFromSquad(Number(participantId));
  };

  // Auto-assign applied handler: refresh squad and participant data
  const handleAutoAssignApplied = async () => {
    await forceLoadSquads();
    await forceLoadAvailableParticipants();
  };

  // PDF Export Handler
  const handleExportPDF = () => {
    if (!selectedEvent) return;
    exportSquadsPDF({ squads, selectedEvent, t });
  };

  // Open wizard for editing a squad
  const handleEditSquadWizard = (squad: Squad) => {
    setWizardSquad(squad);
    setWizardMode('edit');
    setIsWizardOpen(true);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingSquad(null);
  };

  // Create squad configuration with callbacks
  const squadConfig = createSquadConfig({
    t,
    competitionSelection,
    onCompetitionClick: handleCompetitionClick,
    onRemoveParticipant: handleRemoveParticipant,
    participantHasSelectedCompetition
  });

  // Override config callbacks
  const config = {
    ...squadConfig,
    onAssign: handleAssign,
    onUnassign: handleUnassign,
    onCreateMaster: () => {
      setWizardMode('create');
      setWizardSquad(null);
      setIsWizardOpen(true);
    },
    onEditMaster: handleEditSquadWizard,
    onDeleteMaster: deleteSquad,
    onExportPDF: handleExportPDF
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
      onToggleFilters={toggleFilters}
      filterSection={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Assignment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('squadManagement.filters.assignmentStatus')}
              </label>
              <select
                value={filterState.assignmentStatus}
                onChange={e => setAssignmentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('squadManagement.filters.all')}</option>
                <option value="assigned">{t('squadManagement.filters.assigned')}</option>
                <option value="unassigned">{t('squadManagement.filters.unassigned')}</option>
              </select>
            </div>

            {/* Name Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('squadManagement.filters.name')}
              </label>
              <input
                type="text"
                value={filterState.searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('squadManagement.filters.namePlaceholder')}
              />
            </div>

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

            {/* Birth Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('squadManagement.filters.birthYear')}
              </label>
              <input
                type="text"
                value={filterState.birthYear}
                onChange={e => setBirthYear(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('squadManagement.filters.birthYearPlaceholder')}
              />
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
      onAdd={() => {
        setWizardMode('create');
        setWizardSquad(null);
        setIsWizardOpen(true);
      }}
      customActions={
        <button
          onClick={() => setIsAutoAssignOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
        >
          <SparklesIcon className="h-4 w-4" />
          {t('squadManagement.autoAssign.button')}
        </button>
      }
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

          {/* UnifiedAssignmentModal replaces the 3-column layout */}
          <UnifiedAssignmentModal
            masterItems={squads}
            availableItems={filteredParticipants}
            assignments={[]}
            config={config}
            isLoading={isLoading}
            eventId={eventId}
            columnSearchPlaceholders={{
              master: t('squadManagement.columnSearch.master'),
              available: t('squadManagement.columnSearch.available')
            }}
            selectedMaster={selectedSquadId ? squads.find(s => s.id === selectedSquadId) || null : null}
            onSelectMaster={squad => setSelectedSquadId(squad ? squad.id : null)}
          />

          {/* Create Squad Modal */}
          <CreateSquadModal
            isOpen={isCreateModalOpen}
            isLoading={isLoading}
            mode="create"
            onClose={() => setIsCreateModalOpen(false)}
            onCreate={createSquad}
          />

          {/* Edit Squad Modal */}
          <CreateSquadModal
            isOpen={isEditModalOpen}
            isLoading={isLoading}
            mode="edit"
            initialName={editingSquad?.name || ''}
            onClose={handleCloseEditModal}
            onUpdate={updateSquad}
          />

          {/* Auto-Assign Dialog */}
          <AutoAssignDialog
            isOpen={isAutoAssignOpen}
            onClose={() => setIsAutoAssignOpen(false)}
            eventId={eventId ? parseInt(eventId) : 0}
            onApplied={handleAutoAssignApplied}
          />

          {/* Squad Wizard (create / edit) */}
          {eventId && (
            <SquadWizardModal
              isOpen={isWizardOpen}
              onClose={() => setIsWizardOpen(false)}
              mode={wizardMode}
              squad={wizardSquad ?? undefined}
              eventId={eventId}
              onDone={async () => {
                await forceLoadSquads();
                await forceLoadAvailableParticipants();
              }}
            />
          )}
        </div>
      )}
    </EventManagementTemplate>
  );
};

export default SquadManagementUnified;
