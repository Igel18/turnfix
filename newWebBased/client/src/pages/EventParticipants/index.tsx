/**
 * Event Participants Page - Main Component
 * Point 122: Refactored with Separation of Concerns
 * 
 * This component orchestrates the participant management for events.
 * All business logic, validation, and UI components are extracted to separate files.
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { TagIcon } from '@heroicons/react/24/outline';

// Context & Hooks
import { useEvent } from '@/contexts/EventContext';
import { usePagination } from '@/hooks/usePagination';
import { useTableSort } from '@/components/SortableTableHeader';

// Local Hooks & Types
import { useParticipants, useLabelPrinting } from './hooks';
import type { Participant, EditParticipantData } from './EventParticipants.types';

// Components
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate';
import SmartPagination from '@/components/SmartPagination';
import UnifiedModal from '@/components/UnifiedModal';
import {
  ParticipantTable,
  ParticipantFilters,
  EditParticipantForm,
  AddParticipantModal,
  LabelConfigModal,
} from './components';

// Utilities
import { setupPDFWithHeaderFooter, addPDFHeaderFooter, getUnifiedTableStyles, createPDFDocument } from '@/utils/pdfUtils';
import autoTable from 'jspdf-autotable';

/**
 * Main EventParticipants Component
 */
export default function EventParticipants() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const urlEventId = searchParams.get('eventId');

  // Event Context
  const { selectedEvent } = useEvent();
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId;

  // Data Management Hook
  const {
    allParticipants,
    competitions,
    clubs,
    removeParticipantFromEvent,
    updateParticipantStatus,
    updateParticipantDetails,
  } = useParticipants({ eventId });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [clubFilter, setClubFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // UI States
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);

  // Pagination Hook
  const pagination = usePagination({
    itemsPerPage: 50,
    resetDependencies: [searchTerm, genderFilter, clubFilter, ageFilter],
  });

  // Sorting Hook
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('lastname', 'asc');

  // Filter participants
  const filteredParticipants = useMemo(() => {
    let filtered = allParticipants.filter((p) => p.isInEvent);

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.firstname.toLowerCase().includes(term) ||
          p.lastname.toLowerCase().includes(term) ||
          p.club.toLowerCase().includes(term)
      );
    }

    // Gender filter
    if (genderFilter) {
      filtered = filtered.filter((p) => p.gender === genderFilter);
    }

    // Club filter
    if (clubFilter) {
      filtered = filtered.filter((p) => p.club === clubFilter);
    }

    // Age filter
    if (ageFilter) {
      const [min, max] = ageFilter.split('-').map((v) => (v === '+' ? 999 : parseInt(v)));
      filtered = filtered.filter((p) => p.age >= min && (max ? p.age <= max : true));
    }

    return filtered;
  }, [allParticipants, searchTerm, genderFilter, clubFilter, ageFilter]);

  // Sort and paginate
  const sortedParticipants = sortData(filteredParticipants);
  const totalParticipants = sortedParticipants.length;
  const totalPages = Math.ceil(totalParticipants / pagination.itemsPerPage);
  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
  const endIndex = startIndex + pagination.itemsPerPage;
  const paginatedParticipants = sortedParticipants.slice(startIndex, endIndex);

  // Label Printing Hook
  const { generateLabelsPDF } = useLabelPrinting({
    participants: filteredParticipants,
    competitions,
    eventId: eventId || '',
  });

  // Handlers
  const handleResetFilters = () => {
    setSearchTerm('');
    setGenderFilter('');
    setClubFilter('');
    setAgeFilter('');
  };

  const handleEditParticipant = (participant: Participant) => {
    setSelectedParticipant(participant);
    setShowEditModal(true);
  };

  const handleSaveParticipant = async (data: EditParticipantData) => {
    if (!selectedParticipant) return;

    await updateParticipantDetails(selectedParticipant.id, data);
    setShowEditModal(false);
    setSelectedParticipant(null);
  };

  const handleDeleteParticipant = async (participantId: number) => {
    if (confirm(t('eventParticipants.confirmDelete'))) {
      await removeParticipantFromEvent(participantId);
    }
  };

  // PDF Export: Participants List (landscape for wider tables)
  const exportParticipantsListPDF = () => {
    if (!selectedEvent) return;

    const { doc } = createPDFDocument('landscape');
    
    // Setup PDF with header/footer
    setupPDFWithHeaderFooter(doc, selectedEvent, t('eventParticipants.pageTitle'));

    const tableData = sortedParticipants.map((p) => [
      `${p.firstname} ${p.lastname}`,
      p.startNumber?.toString() || '-',
      p.club,
      p.age.toString(),
      t(`common.gender.${p.gender}`),
      p.squad_name || '-',
      p.startet_nicht ? t('eventParticipants.status.notStarting') : t('eventParticipants.status.active'),
    ]);

    autoTable(doc, {
      head: [
        [
          t('eventParticipants.table.name'),
          t('eventParticipants.table.startNumber'),
          t('eventParticipants.table.club'),
          t('eventParticipants.table.age'),
          t('eventParticipants.table.gender'),
          t('eventParticipants.table.squad'),
          t('eventParticipants.table.status'),
        ],
      ],
      body: tableData,
      ...getUnifiedTableStyles(),
      startY: 40,
      didDrawPage: () => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        addPDFHeaderFooter({ doc, event: selectedEvent, documentTitle: t('eventParticipants.pageTitle'), pageWidth, pageHeight });
      },
    });

    doc.save(`participants-${eventId}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // CSV Export Function
  const exportParticipantsCSV = () => {
    if (!selectedEvent || filteredParticipants.length === 0) {
      alert(t('eventParticipants.messages.noParticipantsToExport'));
      return;
    }

    // CSV Header
    const headers = [
      t('eventParticipants.table.name'),
      t('eventParticipants.table.startNumber'),
      t('eventParticipants.table.club'),
      t('eventParticipants.table.age'),
      t('eventParticipants.table.gender'),
      t('eventParticipants.table.squad'),
      t('eventParticipants.table.status'),
    ].join(',');

    // CSV Rows
    const rows = filteredParticipants.map((p) => [
      `"${p.firstname} ${p.lastname}"`,
      p.startNumber || '',
      `"${p.club}"`,
      p.age,
      t(`common.gender.${p.gender}`),
      `"${p.squad_name || '-'}"`,
      p.startet_nicht ? t('eventParticipants.status.notStarting') : t('eventParticipants.status.active'),
    ].join(','));

    // Combine headers and rows
    const csvContent = [headers, ...rows].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `participants-${eventId}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handlers for modals
  const handleParticipantAdded = () => {
    // Reload participants after adding new one
    window.location.reload();
  };

  // Render
  return (
    <EventManagementTemplate
      title={t('eventParticipants.pageTitle')}
      subtitle={t('eventParticipants.subtitle')}
      icon={Users}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      filterSection={
        <ParticipantFilters
          participants={allParticipants}
          searchTerm={searchTerm}
          genderFilter={genderFilter}
          clubFilter={clubFilter}
          ageFilter={ageFilter}
          onSearchChange={setSearchTerm}
          onGenderChange={setGenderFilter}
          onClubChange={setClubFilter}
          onAgeChange={setAgeFilter}
          onReset={handleResetFilters}
        />
      }
      showExportPDF={filteredParticipants.length > 0}
      onExportPDF={exportParticipantsListPDF}
      showExportCSV={filteredParticipants.length > 0}
      onExportCSV={exportParticipantsCSV}
      showAddButton={true}
      addButtonText={t('eventParticipants.addParticipant')}
      onAdd={() => setShowAddModal(true)}
      customActions={
        filteredParticipants.length > 0
          ? [
              <button
                key="print-labels"
                onClick={() => setShowLabelModal(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TagIcon className="h-4 w-4 mr-2" />
                {t('eventParticipants.actions.printLabels')}
              </button>,
            ]
          : []
      }
      viewStorageKey="eventParticipants-view"
      showViewToggle={true}
    >
      {() => (
        <div className="p-6">
          <div className="space-y-6">
            {/* Participants Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('eventParticipants.title')} ({totalParticipants})
                  {totalPages > 1 && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      {t('eventParticipants.pagination.showing')} {startIndex + 1}-
                      {Math.min(endIndex, totalParticipants)} {t('common.of')} {totalParticipants} (
                      {t('eventParticipants.pagination.page')} {pagination.currentPage}{' '}
                      {t('common.of')} {totalPages})
                    </span>
                  )}
                </h3>
              </div>

              <div className="bg-white rounded-lg border">
                <div className="overflow-y-auto">
                  {filteredParticipants.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="mx-auto h-12 w-12 mb-4" />
                      <p className="text-lg font-medium mb-2">
                        {t('eventParticipants.empty.title')}
                      </p>
                      <p className="text-sm">{t('eventParticipants.empty.subtitle')}</p>
                    </div>
                  ) : (
                    <ParticipantTable
                      participants={paginatedParticipants}
                      sortKey={sortKey || 'lastname'}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      onEdit={handleEditParticipant}
                      onDelete={handleDeleteParticipant}
                      onToggleStatus={updateParticipantStatus}
                    />
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <SmartPagination
                    currentPage={pagination.currentPage}
                    totalPages={totalPages}
                    onPageChange={pagination.setCurrentPage}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Edit Participant Modal */}
          {showEditModal && selectedParticipant && (
            <UnifiedModal
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setSelectedParticipant(null);
              }}
              title={t('eventParticipants.editParticipant.title')}
              size="xl"
              showFooter={false}
            >
              <EditParticipantForm
                participant={selectedParticipant}
                eventId={eventId || ''}
                clubs={clubs}
                competitions={competitions}
                onSave={handleSaveParticipant}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedParticipant(null);
                }}
              />
            </UnifiedModal>
          )}

          {/* Add Participant Modal */}
          <AddParticipantModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            eventId={eventId || ''}
            onParticipantAdded={handleParticipantAdded}
          />

          {/* Label Configuration Modal */}
          <LabelConfigModal
            isOpen={showLabelModal}
            onClose={() => setShowLabelModal(false)}
            onPrint={generateLabelsPDF}
          />
        </div>
      )}
    </EventManagementTemplate>
  );
}
