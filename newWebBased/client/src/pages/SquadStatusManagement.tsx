import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { StatusBadge, ViewModeToggle, getStatusColor } from '@/components/status'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import MatrixView, { MatrixStatusBadge, MatrixColumn, MatrixRow, MatrixCellProps } from '@/components/MatrixView'
import { exportToCSV, getSquadStatusCSVData } from '@/utils/csvExport'
import { useEvent } from '@/contexts/EventContext'
import { apiGet } from '@/utils/api'
import getSocket from '@/utils/socket'
import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'
import SortableTableHeader, { useTableSort } from '@/components/SortableTableHeader'
import { useFilterPanel } from '@/hooks'

// Types
interface SquadDisciplineStatus {
  id: number
  eventId: number
  squadName: string
  disciplineId: number
  disciplineName: string
  disciplineShort: string
  statusId: number
  status: {
    id: number
    name: string
    colorCode: string
  }
  round: number | null
  isFirstApparatus: boolean
}

interface Status {
  int_statusid: number
  var_name: string
  ary_colorcode: string
}

interface Event {
  int_eventid: number
  var_eventname: string
}

export function SquadStatusManagement() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()
  
  // URL parameters as fallback
  const urlEventId = searchParams.get('eventId')
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId

  // State management
  const [loading, setLoading] = useState(true)
  const [squadDisciplines, setSquadDisciplines] = useState<SquadDisciplineStatus[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '')
  
  // Filters
  const [filterSquad, setFilterSquad] = useState('')
  const [filterDiscipline, setFilterDiscipline] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const isAnyFilterActive = filterSquad !== '' || filterDiscipline !== '' || filterStatus !== '';
  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, () => { setFilterSquad(''); setFilterDiscipline(''); setFilterStatus(''); });

  // View options - 3-option toggle (matrix/table/grid)
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'matrix'>('matrix')

  const [editingItem, setEditingItem] = useState<SquadDisciplineStatus | null>(null)

  // Sorting hook
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort()

  // Load initial data
  useEffect(() => {
    if (selectedEventId && selectedEventId !== '') {
      loadData()
    } else {
      // Load events list if no event is selected
      loadEvents()
      setLoading(false)
    }
  }, [selectedEventId])

  // Socket.IO: Listen for real-time status updates
  useEffect(() => {
    if (!selectedEventId || selectedEventId === '') return;

    const socket = getSocket();
    socket.emit('join-competition', selectedEventId);

    const handleStatusUpdate = (data: any) => {
      if (data.eventId === Number(selectedEventId)) {
        console.log('🔔 Squad or Competition status updated, reloading data...');
        loadData();
      }
    };

    socket.on('squad-status-updated', handleStatusUpdate);
    socket.on('competition-status-updated', handleStatusUpdate);

    return () => {
      socket.emit('leave-competition', selectedEventId);
      socket.off('squad-status-updated', handleStatusUpdate);
      socket.off('competition-status-updated', handleStatusUpdate);
    };
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      const eventsData = await apiGet('/events?limit=100')
      setEvents(eventsData.events || [])
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      const cacheBuster = Date.now()
      // Load squad disciplines
      const squadDisciplinesData = await apiGet(`/squad-disciplines?eventId=${selectedEventId}&_cb=${cacheBuster}`)
      setSquadDisciplines(squadDisciplinesData.squadDisciplines || [])

      // Load statuses
      const statusesData = await apiGet('/statuses?limit=100')
      setStatuses(statusesData.statuses || [])

      // Load events if not selected
      if (!selectedEvent) {
        const eventsData = await apiGet('/events?limit=100')
        setEvents(eventsData.events || [])
      }

    } catch (error) {
      console.error('Error loading squad status data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update status
  const updateStatus = async (item: SquadDisciplineStatus, newStatusId: number) => {
    try {
      const response = await fetch(`/api/squad-disciplines/${encodeURIComponent(item.squadName)}/${item.disciplineId}/status?eventId=${item.eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusId: newStatusId
        }),
      })

      if (response.ok) {
        // Update local state
        const newStatus = statuses.find(s => s.int_statusid === newStatusId)
        if (newStatus) {
          setSquadDisciplines(prev => prev.map(sd => 
            sd.id === item.id ? {
              ...sd,
              statusId: newStatusId,
              status: {
                id: newStatus.int_statusid,
                name: newStatus.var_name,
                colorCode: newStatus.ary_colorcode
              }
            } : sd
          ))
        }
        setEditingItem(null)
      } else {
        const errorData = await response.json()
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status due to network error')
    }
  }

  // Filter data
  const filteredData = squadDisciplines.filter(item => {
    const matchesSquad = !filterSquad || item.squadName.toLowerCase().includes(filterSquad.toLowerCase())
    const matchesDiscipline = !filterDiscipline || item.disciplineName.toLowerCase().includes(filterDiscipline.toLowerCase())
    const matchesStatus = !filterStatus || item.status.name.toLowerCase().includes(filterStatus.toLowerCase())
    
    return matchesSquad && matchesDiscipline && matchesStatus
  })

  // Sort filtered data with custom value extractor for nested properties
  const sortedFilteredData = sortData(filteredData, (item: SquadDisciplineStatus, key: string) => {
    if (key === 'status.name') return item.status.name
    return (item as any)[key]
  })

  // Get unique values for filter dropdowns
  const uniqueSquads = [...new Set(squadDisciplines.map(item => item.squadName))].sort()
  const uniqueDisciplines = [...new Set(squadDisciplines.map(item => item.disciplineName))].sort()
  const uniqueStatuses = [...new Set(squadDisciplines.map(item => item.status.name))].sort()

  if (loading) {
    return (
      <EventManagementTemplate
        title={t('squadStatus.title')}
        subtitle={t('squadStatus.subtitle', { count: 0 })}
        icon={UserGroupIcon}
        showEventContext={true}
        loading={true}
        showViewToggle={false}
      >
        {() => null}
      </EventManagementTemplate>
    )
  }

  // Show event selection message if no event is selected
  if (!selectedEventId || selectedEventId === '') {
    return (
      <EventManagementTemplate
        title={t('squadStatus.title')}
        subtitle={t('squadStatus.selectEventMessage')}
        icon={UserGroupIcon}
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
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                {t('squadStatus.noEventSelected')}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t('squadStatus.pleaseSelectEvent')}
              </p>
              
              {!selectedEvent && events.length > 0 && (
                <div className="mt-6 max-w-md mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    {t('squadStatus.selectEvent')}
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">{t('squadStatus.chooseEvent')}</option>
                    {events.map((event) => (
                      <option key={event.int_eventid} value={event.int_eventid}>
                        {event.var_eventname}
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

  return (
    <EventManagementTemplate
      title={t('squadStatus.title')}
      subtitle={t('squadStatus.subtitle', { count: squadDisciplines.length })}
      icon={UserGroupIcon}
      showEventContext={true}
      searchTerm=""
      onSearchChange={() => {}}
      showFilters={showFilters}
      onToggleFilters={toggleFilters}
      filterSection={
        showFilters ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('squadStatus.filters.squad')}
                </label>
                <select
                  value={filterSquad}
                  onChange={(e) => setFilterSquad(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common.all')}</option>
                  {uniqueSquads.map(squad => (
                    <option key={squad} value={squad}>{squad}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('squadStatus.filters.discipline')}
                </label>
                <select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common.all')}</option>
                  {uniqueDisciplines.map(discipline => (
                    <option key={discipline} value={discipline}>{discipline}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('squadStatus.filters.status')}
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common.all')}</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterSquad('')
                    setFilterDiscipline('')
                    setFilterStatus('')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.resetFilters')}
                </button>
              </div>
            </div>
          </div>
        ) : undefined
      }
      showExportCSV={true}
      onExportCSV={() => {
        exportToCSV(getSquadStatusCSVData(sortedFilteredData))
      }}
      showAddButton={false}
      showImportButton={false}
      showViewToggle={false}
      customActions={[
        // Live Update Indicator
        <LiveUpdateIndicator key="live-indicator" label={t('common.liveUpdates')} />,
        // View Mode Toggle (3 options: Matrix, Table, Grid)
        <ViewModeToggle key="view-toggle" viewMode={viewMode} onChange={setViewMode} />,
      ]}
    >
      {() => (
        <>

      {/* Event Selection */}
      {!selectedEvent && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('squadStatus.selectEvent')}
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('squadStatus.chooseEvent')}</option>
            {events.map((event) => (
              <option key={event.int_eventid} value={event.int_eventid}>
                {event.var_eventname}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Data Display */}
      {viewMode === 'matrix' ? (
        /* Matrix View - Using MatrixView Template */
        <MatrixView
          columns={uniqueDisciplines.map((disciplineName) => {
            const discipline = squadDisciplines.find(sd => sd.disciplineName === disciplineName)
            return {
              id: disciplineName,
              label: discipline?.disciplineShort || disciplineName,
              subLabel: disciplineName,
              minWidth: '120px'
            } as MatrixColumn
          })}
          rows={uniqueSquads.map((squadName) => {
            // Build data object for this row
            const rowData: Record<string, SquadDisciplineStatus | undefined> = {}
            uniqueDisciplines.forEach((disciplineName) => {
              const item = squadDisciplines.find(
                sd => sd.squadName === squadName && sd.disciplineName === disciplineName
              )
              rowData[disciplineName] = item
            })
            
            return {
              id: squadName,
              label: squadName,
              data: rowData
            } as MatrixRow
          })}
          renderCell={({ data, isEditing }: MatrixCellProps) => {
            const item = data as SquadDisciplineStatus | undefined
            
            if (!item) {
              return <span className="text-gray-300 text-xs">-</span>
            }

            const statusColor = getStatusColor(item.status.colorCode)

            if (isEditing) {
              return (
                <div className="flex flex-col items-center space-y-1">
                  <select
                    value={item.statusId}
                    onChange={(e) => {
                      updateStatus(item, parseInt(e.target.value))
                    }}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  >
                    {statuses.map(status => (
                      <option key={status.int_statusid} value={status.int_statusid}>
                        {status.var_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingItem(null)
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              )
            }

            return (
              <MatrixStatusBadge
                label={item.status.name}
                colorClass={statusColor.className}
                style={statusColor.style}
              />
            )
          }}
          stickyFirstColumn={true}
          stickyHeader={true}
          onCellClick={(rowId, columnId) => {
            const item = squadDisciplines.find(
              sd => sd.squadName === rowId && sd.disciplineName === columnId
            )
            if (item) {
              setEditingItem(item)
            }
          }}
          editingCell={editingItem ? {
            rowId: editingItem.squadName,
            columnId: editingItem.disciplineName
          } : null}
          emptyMessage={t('squadStatus.noDataForEvent')}
        />
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTableHeader
                    label={t('squadStatus.table.squad')}
                    sortKey="squadName"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('squadStatus.table.discipline')}
                    sortKey="disciplineName"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('squadStatus.table.status')}
                    sortKey="status.name"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('squadStatus.table.round')}
                    sortKey="round"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableTableHeader
                    label={t('squadStatus.table.firstApparatus')}
                    sortKey="isFirstApparatus"
                    currentSortKey={sortKey}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('squadStatus.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFilteredData.map((item: SquadDisciplineStatus) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.squadName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{item.disciplineName}</div>
                        <div className="text-gray-500">{item.disciplineShort}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingItem?.id === item.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            defaultValue={item.statusId}
                            onChange={(e) => updateStatus(item, parseInt(e.target.value))}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            {statuses.map(status => (
                              <option key={status.int_statusid} value={status.int_statusid}>
                                {status.var_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <StatusBadge label={item.status.name} colorCode={item.status.colorCode} />
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.round || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {item.isFirstApparatus ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      {editingItem?.id !== item.id && (
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedFilteredData.map((item: SquadDisciplineStatus) => (
            <div key={item.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.squadName}</h3>
                  <p className="text-sm text-gray-500">{item.disciplineName}</p>
                  <p className="text-xs text-gray-400">{item.disciplineShort}</p>
                </div>
                <button
                  onClick={() => setEditingItem(item)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                  {editingItem?.id === item.id ? (
                    <select
                      defaultValue={item.statusId}
                      onChange={(e) => updateStatus(item, parseInt(e.target.value))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statuses.map(status => (
                        <option key={status.int_statusid} value={status.int_statusid}>
                          {status.var_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-1">
                      <StatusBadge label={item.status.name} colorCode={item.status.colorCode} />
                    </div>
                  )}
                </div>
                
                {item.round && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Round</label>
                    <p className="mt-1 text-sm text-gray-900">{item.round}</p>
                  </div>
                )}
                
                {item.isFirstApparatus && (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">{t('squadStatus.firstApparatus')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('squadStatus.noDataTitle')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {squadDisciplines.length === 0 ? 
              t('squadStatus.noDataForEvent') : 
              t('squadStatus.adjustFilters')
            }
          </p>
          {squadDisciplines.length === 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-2xl mx-auto text-left">
              <h4 className="text-sm font-medium text-blue-900 mb-2">{t('squadStatus.howToCreateData')}</h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>{t('squadStatus.step1')}</li>
                <li>{t('squadStatus.step2')}</li>
                <li>{t('squadStatus.step3')}</li>
              </ol>
              <p className="mt-3 text-xs text-blue-700">
                {t('squadStatus.note')}
              </p>
            </div>
          )}
        </div>
      )}
        </>
      )}
    </EventManagementTemplate>
  )
}
