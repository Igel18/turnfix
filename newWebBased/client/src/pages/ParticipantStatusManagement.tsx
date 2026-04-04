import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import { useEvent } from '@/contexts/EventContext'
import { apiGet, apiRequest } from '@/utils/api'
import getSocket from '@/utils/socket'
import SortableTableHeader, { useTableSort } from '@/components/SortableTableHeader'
import { useFilterPanel } from '@/hooks'
import { StatusBadge } from '@/components/status'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParticipantStatus {
  wertungenId: number
  participantId: number
  competitionId: number
  competitionName: string | null
  startNumber: number | null
  firstName: string | null
  lastName: string | null
  riege: string | null
  statusId: number
  statusName: string | null
  statusColor: string | null
}

interface StatusOption {
  id: number
  name: string
  colorCode: string | null
}

interface Event {
  int_eventid: number
  var_eventname: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ParticipantStatusManagement() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()

  const urlEventId = searchParams.get('eventId')
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId

  // Data
  const [loading, setLoading] = useState(true)
  const [participants, setParticipants] = useState<ParticipantStatus[]>([])
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '')

  // Filters
  const [filterSquad, setFilterSquad] = useState('')
  const [filterCompetition, setFilterCompetition] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const isAnyFilterActive = filterSquad !== '' || filterCompetition !== '' || filterStatus !== '';
  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, () => { setFilterSquad(''); setFilterCompetition(''); setFilterStatus(''); });

  // Editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)

  const { sortKey, sortDirection, handleSort, sortData } = useTableSort()

  // ─── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!selectedEventId) return
    try {
      setLoading(true)
      const [participantData, statusData] = await Promise.all([
        apiGet(`/participant-status?eventId=${selectedEventId}&_cb=${Date.now()}`),
        apiGet('/participant-status/statuses'),
      ])
      setParticipants(participantData.participants || [])
      setStatusOptions(Array.isArray(statusData) ? statusData : [])
    } catch (error) {
      console.error('Error loading participant status data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedEventId])

  useEffect(() => {
    if (selectedEventId) {
      loadData()
    } else {
      apiGet('/events?limit=100')
        .then(d => setEvents(d.events || []))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [selectedEventId, loadData])

  // ─── Socket.IO ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedEventId) return

    const socket = getSocket()
    socket.emit('join-competition', selectedEventId)

    const handleUpdate = (data: any) => {
      if (data.eventId === Number(selectedEventId)) {
        loadData()
      }
    }

    socket.on('participant-status-updated', handleUpdate)
    socket.on('squad-status-updated', handleUpdate)

    return () => {
      socket.emit('leave-competition', selectedEventId)
      socket.off('participant-status-updated', handleUpdate)
      socket.off('squad-status-updated', handleUpdate)
    }
  }, [selectedEventId, loadData])

  // ─── Status update ──────────────────────────────────────────────────────────

  const updateStatus = async (wertungenId: number, newStatusId: number) => {
    try {
      setSavingId(wertungenId)
      await apiRequest(`/participant-status/${wertungenId}`, {
        method: 'PATCH',
        body: JSON.stringify({ statusId: newStatusId }),
      })
      const newOption = statusOptions.find(s => s.id === newStatusId)
      if (newOption) {
        setParticipants(prev =>
          prev.map(p =>
            p.wertungenId === wertungenId
              ? { ...p, statusId: newStatusId, statusName: newOption.name, statusColor: newOption.colorCode }
              : p,
          ),
        )
      }
      setEditingId(null)
    } catch (error) {
      console.error('Error updating participant status:', error)
      alert(t('participantStatus.messages.updateError'))
    } finally {
      setSavingId(null)
    }
  }

  // ─── Derived data ────────────────────────────────────────────────────────────

  const filteredData = participants.filter(p => {
    const matchesSquad = !filterSquad || (p.riege || '').toLowerCase().includes(filterSquad.toLowerCase())
    const matchesComp = !filterCompetition || (p.competitionName || '').toLowerCase().includes(filterCompetition.toLowerCase())
    const matchesStatus = !filterStatus || (p.statusName || '').toLowerCase().includes(filterStatus.toLowerCase())
    return matchesSquad && matchesComp && matchesStatus
  })

  const sortedData = sortData(filteredData)

  const uniqueSquads = [...new Set(participants.map(p => p.riege || '').filter(Boolean))].sort()
  const uniqueCompetitions = [...new Set(participants.map(p => p.competitionName || '').filter(Boolean))].sort()
  const uniqueStatuses = [...new Set(participants.map(p => p.statusName || '').filter(Boolean))].sort()

  // ─── No event selected ───────────────────────────────────────────────────────

  if (!selectedEventId) {
    return (
      <EventManagementTemplate
        title={t('participantStatus.title')}
        subtitle={t('participantStatus.selectEventMessage')}
        icon={UserIcon}
        showEventContext={true}
        showFilters={false}
        showViewToggle={false}
        showExportCSV={false}
        showAddButton={false}
        showImportButton={false}
      >
        {() => (
          <div className="bg-white rounded-lg border p-8">
            <div className="text-center">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {t('participantStatus.noEventSelected')}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t('participantStatus.pleaseSelectEvent')}
              </p>
              {events.length > 0 && (
                <div className="mt-6 max-w-md mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    {t('participantStatus.selectEvent')}
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('participantStatus.chooseEvent')}</option>
                    {events.map(ev => (
                      <option key={ev.int_eventid} value={ev.int_eventid}>
                        {ev.var_eventname}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </EventManagementTemplate>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <EventManagementTemplate
        title={t('participantStatus.title')}
        subtitle={t('participantStatus.subtitle', { count: 0 })}
        icon={UserIcon}
        showEventContext={true}
        loading={true}
        showViewToggle={false}
      >
        {() => null}
      </EventManagementTemplate>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <EventManagementTemplate
      title={t('participantStatus.title')}
      subtitle={t('participantStatus.subtitle', { count: participants.length })}
      icon={UserIcon}
      showEventContext={true}
      searchTerm=""
      onSearchChange={() => {}}
      showFilters={showFilters}
      onToggleFilters={toggleFilters}
      filterSection={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('participantStatus.filters.squad')}
              </label>
              <select
                value={filterSquad}
                onChange={e => setFilterSquad(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">{t('participantStatus.filters.allSquads')}</option>
                {uniqueSquads.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('participantStatus.filters.competition')}
              </label>
              <select
                value={filterCompetition}
                onChange={e => setFilterCompetition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">{t('participantStatus.filters.allCompetitions')}</option>
                {uniqueCompetitions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('participantStatus.filters.status')}
              </label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">{t('participantStatus.filters.allStatuses')}</option>
                {uniqueStatuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterSquad(''); setFilterCompetition(''); setFilterStatus('') }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      }
      showViewToggle={false}
      showAddButton={false}
      showImportButton={false}
      showExportCSV={false}
    >
      {() => (
        <div className="bg-white rounded-lg border">
          {sortedData.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircleIcon className="mx-auto h-10 w-10 text-gray-300 mb-3" />
              <h3 className="text-base font-medium text-gray-900">
                {t('participantStatus.noDataTitle')}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t('participantStatus.noDataForEvent')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTableHeader
                      label={t('common.startNumber')}
                      sortKey="startNumber"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3 text-left"
                    />
                    <SortableTableHeader
                      label={t('participantStatus.table.name')}
                      sortKey="lastName"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3 text-left"
                    />
                    <SortableTableHeader
                      label={t('participantStatus.table.squad')}
                      sortKey="riege"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3 text-left"
                    />
                    <SortableTableHeader
                      label={t('participantStatus.table.competition')}
                      sortKey="competitionName"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3 text-left"
                    />
                    <SortableTableHeader
                      label={t('participantStatus.table.status')}
                      sortKey="statusName"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                      className="px-4 py-3 text-left"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedData.map(p => {
                    const isEditing = editingId === p.wertungenId
                    const isSaving = savingId === p.wertungenId

                    return (
                      <tr key={p.wertungenId} className="hover:bg-gray-50 transition-colors">
                        {/* Start number */}
                        <td className="px-4 py-3 text-gray-500 font-mono">
                          {p.startNumber ?? '—'}
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {[p.firstName, p.lastName].filter(Boolean).join(' ') || '—'}
                        </td>

                        {/* Squad */}
                        <td className="px-4 py-3 text-gray-600">
                          {p.riege || <span className="text-gray-400">—</span>}
                        </td>

                        {/* Competition */}
                        <td className="px-4 py-3 text-gray-600">
                          {p.competitionName || '—'}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <select
                                autoFocus
                                defaultValue={p.statusId}
                                disabled={isSaving}
                                onChange={e => updateStatus(p.wertungenId, Number(e.target.value))}
                                onBlur={() => setEditingId(null)}
                                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
                              >
                                {statusOptions.map(opt => (
                                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                                ))}
                              </select>
                              {isSaving && (
                                <span className="text-xs text-gray-400">{t('common.loading')}</span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingId(p.wertungenId)}
                              title={t('participantStatus.clickToEdit')}
                              className="inline-flex items-center"
                            >
                              <StatusBadge
                                label={p.statusName}
                                colorCode={p.statusColor}
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Summary row */}
              <div className="px-4 py-2 border-t bg-gray-50 text-xs text-gray-500">
                {t('participantStatus.showing', {
                  shown: sortedData.length,
                  total: participants.length,
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </EventManagementTemplate>
  )
}

export default ParticipantStatusManagement
