/**
 * Events page – main orchestrating component.
 *
 * Refactored from a single 908-line file into focused modules:
 *   Events.types.ts                 – interfaces & constants       (~60 lines)
 *   hooks/useEventsData.ts          – data fetching, CRUD, filters (~210 lines)
 *   components/EventFormModal.tsx   – create / edit dialog         (~150 lines)
 *   components/EventImportWizard/   – GymNet XML import wizard     (~4 steps)
 *   components/EventCard.tsx        – card view                    (~100 lines)
 *   components/EventTableRow.tsx    – table row                    (~85 lines)
 *   index.tsx (this file)           – orchestration                (~130 lines)
 */

import React, { useState } from 'react'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { DatabaseManagementTemplate } from '../../components/DatabaseManagementTemplate'
import { SortableTableHeader } from '../../components/SortableTableHeader'
import { UnifiedConfirmModal } from '../../components/UnifiedModal'
import { exportToCSV, getEventCSVData } from '../../utils/csvExport'

import { useEventsData } from './hooks/useEventsData'
import EventFormModal from './components/EventFormModal'
import EventImportWizard from './components/EventImportWizard'
import EventCard from './components/EventCard'
import EventTableRow from './components/EventTableRow'
import type { Event } from './Events.types'

const Events: React.FC = () => {
  const { t } = useTranslation()

  const {
    events,
    venues,
    isLoading,
    errorMessage,
    editingEvent,
    isModalOpen,
    isImportModalOpen,
    openEditModal,
    openCreateModal,
    openImportModal,
    closeModal,
    closeImportModal,
    handleSubmit,
    handleDelete,
    fetchEvents,
    searchTerm,
    setSearchTerm,
    showFilters,
    toggleFilters,
    getFilterConfig,
    handleClearAllFilters,
    sortKey,
    sortDirection,
    handleSort,
    sortData,
    getSortValue,
  } = useEventsData()

  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<Event | null>(null)

  const requestDelete = (event: Event) => {
    setPendingDeleteEvent(event)
  }

  const executeDelete = async () => {
    if (!pendingDeleteEvent) return
    await handleDelete(pendingDeleteEvent.int_eventid, true)
    setPendingDeleteEvent(null)
  }

  const handleExportCSV = () => {
    const csvData = getEventCSVData(events)
    exportToCSV(csvData)
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <DatabaseManagementTemplate
        title={t('events.title')}
        subtitle={t('events.subtitleWithCount', { count: events.length })}
        icon={CalendarDaysIcon}
        data={sortData(events, getSortValue)}
        isLoading={isLoading}
        error={errorMessage}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('events.searchPlaceholder')}
        showFilters={showFilters}
        onToggleFilters={toggleFilters}
        filterOptions={getFilterConfig()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        viewStorageKey="events"
        defaultView="table"
        onAdd={openCreateModal}
        addLabel={t('events.addEvent')}
        onEdit={openEditModal}
        onDelete={(event) => requestDelete(event)}
        renderTableHeaders={() => (
          <tr>
            <SortableTableHeader
              label={t('events.table.eventName')}
              sortKey="var_eventname"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('events.table.dates')}
              sortKey="dat_eventstartdate"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('events.table.location')}
              sortKey="var_location"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('events.table.participants')}
              sortKey="participant_count"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHeader
              label={t('events.table.clubs')}
              sortKey="club_count"
              currentSortKey={sortKey}
              currentSortDirection={sortDirection}
              onSort={handleSort}
            />
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('events.table.actions')}
            </th>
          </tr>
        )}
        renderTableRow={(event: Event) => (
          <EventTableRow
            key={event.int_eventid}
            event={event}
            onEdit={openEditModal}
            onDelete={(id) => {
              const target = events.find(e => e.int_eventid === id)
              if (target) requestDelete(target)
            }}
          />
        )}
        renderCard={(event: Event) => (
          <EventCard
            key={event.int_eventid}
            event={event}
            onEdit={openEditModal}
            onDelete={(id) => {
              const target = events.find(e => e.int_eventid === id)
              if (target) requestDelete(target)
            }}
          />
        )}
        additionalContent={
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => { void openImportModal() }}
              className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              {t('events.importWizard.openButton')}
            </button>
          </div>
        }
      />

      {/* Create/Edit Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingEvent={editingEvent}
        venues={venues}
        onSubmit={handleSubmit}
      />

      {/* GymNet Import Wizard */}
      <EventImportWizard
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        venues={venues}
        onImportComplete={fetchEvents}
      />

      <UnifiedConfirmModal
        isOpen={!!pendingDeleteEvent}
        onClose={() => setPendingDeleteEvent(null)}
        onConfirm={() => { void executeDelete() }}
        title={t('common.confirmDeleteTitle')}
        message={
          <div className="space-y-2 text-sm">
            <p>
              {t('events.messages.confirmDelete')}
            </p>
            <p className="text-red-700 font-medium">
              Beim Löschen werden alle zugehörigen Daten (Wertungen, Wettkämpfe und Veranstaltung) dauerhaft entfernt.
            </p>
            <p className="text-gray-700">
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
        }
        confirmLabel={t('events.card.delete')}
        confirmStyle="danger"
      />
    </div>
  )
}

export default Events
