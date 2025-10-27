import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  SparklesIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import MatrixView, { MatrixStatusBadge, MatrixColumn, MatrixRow, MatrixCellProps } from '@/components/MatrixView'
import { useEvent } from '@/contexts/EventContext'
import { apiGet, apiPost } from '@/utils/api'
import getSocket from '@/utils/socket'
import SortableTableHeader, { useTableSort } from '@/components/SortableTableHeader'

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
  const [showFilters, setShowFilters] = useState(false)
  
  // View options
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'matrix'>('matrix')
  const [editingItem, setEditingItem] = useState<SquadDisciplineStatus | null>(null)
  const [generating, setGenerating] = useState(false)

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

  // Auto-generate squad-discipline combinations
  const generateCombinations = async () => {
    if (!selectedEventId) return

    try {
      setGenerating(true)
      
      const response = await apiPost('/squad-disciplines/generate', {
        eventId: parseInt(selectedEventId)
      })

      if (response.success) {
        alert(`${t('squadStatus.generateSuccess')}\n\n${t('squadStatus.created')}: ${response.created}\n${t('squadStatus.existing')}: ${response.existing}\n${t('squadStatus.total')}: ${response.total}`)
        await loadData() // Reload data to show new combinations
      }
    } catch (error: any) {
      console.error('Error generating squad disciplines:', error)
      alert(t('squadStatus.generateError') + ': ' + (error.message || 'Unknown error'))
    } finally {
      setGenerating(false)
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

  // Get status color style from actual color code
  const getStatusColor = (colorCode: string): { style: React.CSSProperties; className: string } => {
    if (!colorCode) return { 
      style: {}, 
      className: 'bg-gray-100 text-gray-800 border border-gray-200' 
    }
    
    try {
      // Handle different color code formats
      let rgbValues: number[] = []
      
      if (colorCode.startsWith('{') && colorCode.endsWith('}')) {
        // Format: {255,0,0}
        const cleanCode = colorCode.slice(1, -1)
        rgbValues = cleanCode.split(',').map(v => parseInt(v.trim()))
      } else if (colorCode.startsWith('rgb(') && colorCode.endsWith(')')) {
        // Format: rgb(255,0,0)
        const cleanCode = colorCode.slice(4, -1)
        rgbValues = cleanCode.split(',').map(v => parseInt(v.trim()))
      } else if (colorCode.startsWith('#')) {
        // Format: #ff0000
        const hex = colorCode.slice(1)
        rgbValues = [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16)
        ]
      } else {
        // Try to parse as comma-separated values
        rgbValues = colorCode.split(',').map(v => parseInt(v.trim()))
      }
      
      if (rgbValues.length === 3 && rgbValues.every(v => !isNaN(v) && v >= 0 && v <= 255)) {
        const [r, g, b] = rgbValues
        
        // Calculate brightness to determine if we need light or dark background
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        
        let bgR, bgG, bgB, textR, textG, textB
        
        if (brightness < 128) {
          // Dark color - use lighter background with darker text
          bgR = Math.min(255, r + Math.max(180, 255 - r))
          bgG = Math.min(255, g + Math.max(180, 255 - g))
          bgB = Math.min(255, b + Math.max(180, 255 - b))
          textR = Math.max(0, Math.min(r * 0.3, 80))
          textG = Math.max(0, Math.min(g * 0.3, 80))
          textB = Math.max(0, Math.min(b * 0.3, 80))
        } else {
          // Light color - use the original color as background with white text
          bgR = r
          bgG = g
          bgB = b
          textR = textG = textB = brightness > 180 ? 0 : 255
        }
        
        return {
          style: {
            backgroundColor: `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`,
            color: `rgb(${Math.round(textR)}, ${Math.round(textG)}, ${Math.round(textB)})`,
            borderColor: `rgb(${r}, ${g}, ${b})`
          },
          className: 'border'
        }
      }
    } catch (error) {
      console.warn('Failed to parse color code:', colorCode, error)
    }
    
    // Fallback to generic color mapping
    if (colorCode.includes('255,0,0') || colorCode.includes('#ff0000') || colorCode.includes('red')) {
      return { style: {}, className: 'bg-red-100 text-red-800 border border-red-200' }
    } else if (colorCode.includes('0,255,0') || colorCode.includes('#00ff00') || colorCode.includes('green')) {
      return { style: {}, className: 'bg-green-100 text-green-800 border border-green-200' }
    } else if (colorCode.includes('255,255,0') || colorCode.includes('#ffff00') || colorCode.includes('yellow')) {
      return { style: {}, className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
    } else if (colorCode.includes('0,0,255') || colorCode.includes('#0000ff') || colorCode.includes('blue')) {
      return { style: {}, className: 'bg-blue-100 text-blue-800 border border-blue-200' }
    }
    
    return { style: {}, className: 'bg-gray-100 text-gray-800 border border-gray-200' }
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

  const getFilterOptions = () => [
    {
      value: 'squad',
      label: t('squadStatus.filters.squad'),
      selectedValue: filterSquad,
      options: uniqueSquads.map(squad => ({
        value: squad,
        label: squad
      })),
      onChange: setFilterSquad
    },
    {
      value: 'discipline',
      label: t('squadStatus.filters.discipline'),
      selectedValue: filterDiscipline,
      options: uniqueDisciplines.map(discipline => ({
        value: discipline,
        label: discipline
      })),
      onChange: setFilterDiscipline
    },
    {
      value: 'status',
      label: t('squadStatus.filters.status'),
      selectedValue: filterStatus,
      options: uniqueStatuses.map(status => ({
        value: status,
        label: status
      })),
      onChange: setFilterStatus
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show event selection message if no event is selected
  if (!selectedEventId || selectedEventId === '') {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <UnifiedPageHeader
          title={t('squadStatus.title')}
          subtitle={t('squadStatus.selectEventMessage')}
          icon={UserGroupIcon}
          showEventContext={true}
          searchTerm=""
          onSearchChange={() => {}}
          showFilters={false}
          hasFilters={false}
          showAdd={false}
          showImport={false}
          showExportCSV={false}
        />
        
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
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <UnifiedPageHeader
        title={t('squadStatus.title')}
        subtitle={t('squadStatus.subtitle', { count: squadDisciplines.length })}
        icon={UserGroupIcon}
        showEventContext={true}
        searchTerm=""
        onSearchChange={() => {}}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasFilters={true}
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => {
          setFilterSquad('')
          setFilterDiscipline('')
          setFilterStatus('')
        }}
        showExportCSV={true}
        onExportCSV={() => {
          // TODO: Implement CSV export
          console.log('Export CSV')
        }}
        showAdd={false}
        showImport={false}
        showViewToggle={false}
        customActions={[
          // View Mode Toggle (3 options: Matrix, Table, Grid)
          <div key="view-toggle" className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'matrix'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <TableCellsIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm font-medium border-t border-b ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Grid
            </button>
          </div>,
          <button
            key="generate"
            onClick={generateCombinations}
            disabled={generating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            {generating ? t('squadStatus.generating') : t('squadStatus.generateButton')}
          </button>
        ]}
      />

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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('squadStatus.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFilteredData.map((item: SquadDisciplineStatus) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.squadName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{item.disciplineName}</div>
                        <div className="text-gray-500">{item.disciplineShort}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status.colorCode).className}`}
                          style={getStatusColor(item.status.colorCode).style}
                        >
                          {item.status.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.round || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.isFirstApparatus ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                    <div 
                      className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status.colorCode).className}`}
                      style={getStatusColor(item.status.colorCode).style}
                    >
                      {item.status.name}
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
    </div>
  )
}
