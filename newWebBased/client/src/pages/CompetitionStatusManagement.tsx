import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  TrophyIcon,
  ExclamationTriangleIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'
import { EventManagementTemplate } from '@/components/templates/EventManagementTemplate'
import MatrixView, { MatrixColumn, MatrixRow } from '@/components/MatrixView'
import { GenderBadge } from '@/components/GenderBadge'
import LiveUpdateIndicator from '@/components/LiveUpdateIndicator'
import { useEvent } from '@/contexts/EventContext'
import { apiGet } from '@/utils/api'
import getSocket from '@/utils/socket'
import SortableTableHeader, { useTableSort } from '@/components/SortableTableHeader'

// Types
interface CompetitionStatus {
  id: number
  name: string
  number: string
  round: number
  eventId: number
  gender: string
  ageFrom: number
  ageTo: number
  disciplines: number[]
  participantCount: number
  totalSquadDisciplines: number
  completedSquadDisciplines: number
  inProgressSquadDisciplines: number
  notStartedSquadDisciplines: number
  overallStatus: 'not_started' | 'in_progress' | 'completed'
  statusDistribution: Array<{
    statusId: number
    statusName: string
    colorCode: string
    count: number
    percentage: number
  }>
  disciplines_detail: Array<{
    disciplineId: number
    disciplineName: string
    disciplineShort: string
    totalSquads: number
    statusDistribution: Array<{
      statusId: number
      statusName: string
      colorCode: string
      count: number
    }>
  }>
}

const CompetitionStatusManagement = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const eventIdParam = searchParams.get('eventId')
  const { selectedEvent, setSelectedEvent } = useEvent()

  // Data states
  const [competitionStatuses, setCompetitionStatuses] = useState<CompetitionStatus[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // View options
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'matrix'>('matrix')

  // Sorting hook
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort()

  const selectedEventId = eventIdParam ? parseInt(eventIdParam) : selectedEvent?.int_eventid

  // Load initial data
  useEffect(() => {
    if (selectedEventId) {
      loadData()
    }
  }, [selectedEventId])

  // Socket.IO: Listen for real-time status updates
  useEffect(() => {
    if (!selectedEventId) return;

    const socket = getSocket();
    socket.emit('join-competition', selectedEventId);

    const handleStatusUpdate = (data: any) => {
      if (data.eventId === Number(selectedEventId)) {
        console.log('🔔 Competition or Squad status updated, reloading data...');
        loadData();
      }
    };

    socket.on('competition-status-updated', handleStatusUpdate);
    socket.on('squad-status-updated', handleStatusUpdate);

    return () => {
      socket.emit('leave-competition', selectedEventId);
      socket.off('competition-status-updated', handleStatusUpdate);
      socket.off('squad-status-updated', handleStatusUpdate);
    };
  }, [selectedEventId]);

  const loadData = async () => {
    try {
      setLoading(true)

      // Load competition status data from our new aggregated endpoint
      const cacheBuster = Date.now()
      const competitionStatusData = await apiGet(`/competition-status?eventId=${selectedEventId}&_cb=${cacheBuster}`)
      setCompetitionStatuses(competitionStatusData.competitions || [])

      // Load events data separately for the dropdown
      const eventsData = await apiGet('/events?limit=100')
      setEvents(eventsData.events || [])
      
      // Find and set the current event if eventId is provided
      if (eventIdParam && eventsData.events) {
        const currentEvent = eventsData.events.find((e: any) => e.int_eventid === parseInt(eventIdParam))
        if (currentEvent && !selectedEvent) {
          setSelectedEvent(currentEvent)
        }
      }

    } catch (error) {
      console.error('Error loading competition status data:', error)
    } finally {
      setLoading(false)
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
    return { style: {}, className: 'bg-gray-100 text-gray-800 border border-gray-200' }
  }

  // Get overall status color based on status
  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '{4,172,39}' // Green
      case 'in_progress':
        return '{249,105,5}' // Orange  
      case 'not_started':
      default:
        return '{200,200,200}' // Gray
    }
  }

  // Calculate completion percentage
  const getCompletionPercentage = (item: CompetitionStatus) => {
    if (item.totalSquadDisciplines === 0) return 0
    return Math.round((item.completedSquadDisciplines / item.totalSquadDisciplines) * 100)
  }

  // Classify a single squad status name into a coarse bucket
  const classifySquadState = (
    name: string,
    id?: number
  ): 'completed' | 'in_progress' | 'not_started' | 'unknown' => {
    // Prefer well-known IDs if schema is consistent
    if (id === 9) return 'completed'
    if (id === 1) return 'not_started'
    const n = (name || '').toLowerCase()
    // Completed keywords (DE/EN)
    if (/(abgeschlossen|fertig|beendet|completed|complete|done)\b/.test(n)) return 'completed'
    // Not started keywords (DE/EN)
    if (/(nicht\s*gestartet|offen|not\s*started|open)\b/.test(n)) return 'not_started'
    // In progress keywords (DE/EN)
    if (/(in\s*bearbeitung|läuft|laufend|running|in\s*progress|aktiv|ongoing)\b/.test(n)) return 'in_progress'
    return 'unknown'
  }

  // Aggregate overall status from all squads' states
  const getAggregatedOverallStatus = (item: CompetitionStatus): 'not_started' | 'in_progress' | 'completed' => {
    const total = item.statusDistribution?.reduce((sum, s) => sum + (s.count || 0), 0) || 0
    if (total === 0) return 'not_started'

    let completed = 0
    let notStarted = 0
    let inProgress = 0
    let unknown = 0

    for (const s of item.statusDistribution || []) {
      const bucket = classifySquadState(s.statusName, s.statusId)
      const c = s.count || 0
      if (bucket === 'completed') completed += c
      else if (bucket === 'not_started') notStarted += c
      else if (bucket === 'in_progress') inProgress += c
      else unknown += c
    }

    // If all are clearly in one bucket, use that; otherwise treat mixed/unknown as in_progress
    if (completed === total) return 'completed'
    if (notStarted === total) return 'not_started'
    // If there are unknowns but they dominate exclusively, consider in_progress for safety
    return 'in_progress'
  }

  // Get exact status names and counts from Status Management for display
  const getStatusManagementSummary = (item: CompetitionStatus) => {
    return item.statusDistribution || []
  }

  // Filter competitions
  const filteredCompetitions = competitionStatuses.filter(item => {
    if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (filterStatus && !getAggregatedOverallStatus(item).toLowerCase().includes(filterStatus.toLowerCase())) {
      return false
    }
    if (filterGender && item.gender.toLowerCase() !== filterGender.toLowerCase()) {
      return false
    }
    return true
  })

  // Sort filtered data with custom value extractor for nested properties
  const sortedFilteredCompetitions = sortData(filteredCompetitions, (item: CompetitionStatus, key: string) => {
    if (key === 'name') return item.name
    if (key === 'number') return item.number
    if (key === 'round') return item.round
    if (key === 'ageFrom') return item.ageFrom
    if (key === 'gender') return item.gender
    if (key === 'overallStatus') return item.overallStatus
    if (key === 'progress') return getCompletionPercentage(item)
    return (item as any)[key]
  })

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterGender('')
  }

  if (loading) {
    return (
      <EventManagementTemplate
        title={t('competitionStatus.title')}
        subtitle={t('competitionStatus.subtitle', { eventName: selectedEvent?.var_eventname || t('competitionStatus.selectedEvent') })}
        icon={TrophyIcon}
        showEventContext={true}
        loading={true}
        showViewToggle={false}
      >
        {() => null}
      </EventManagementTemplate>
    )
  }

  return (
    <EventManagementTemplate
      title={t('competitionStatus.title')}
      subtitle={t('competitionStatus.subtitle', { eventName: selectedEvent?.var_eventname || t('competitionStatus.selectedEvent') })}
      icon={TrophyIcon}
      showEventContext={true}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t('competitionStatus.searchPlaceholder')}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      filterSection={
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('competitionStatus.filters.status')}
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.all')}</option>
                <option value="completed">{t('competitionStatus.filters.completed')}</option>
                <option value="in_progress">{t('competitionStatus.filters.inProgress')}</option>
                <option value="not_started">{t('competitionStatus.filters.notStarted')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('competitionStatus.filters.gender')}
              </label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.all')}</option>
                <option value="männlich">{t('competitionStatus.filters.male')}</option>
                <option value="weiblich">{t('competitionStatus.filters.female')}</option>
                <option value="gemischt">{t('competitionStatus.filters.mixed')}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleClearAllFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.resetFilters')}
              </button>
            </div>
          </div>
        </div>
      }
      showExportCSV={true}
      onExportCSV={() => {
        // TODO: Implement CSV export
        console.log('Export CSV')
      }}
      showAddButton={false}
      showImportButton={false}
      showViewToggle={false}
      customActions={[
          // Live Update Indicator
          <LiveUpdateIndicator key="live-indicator" label={t('common.liveUpdates')} />,
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
              title="Matrix View"
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
              title="Table View"
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
              title="Grid View"
            >
              Grid
            </button>
          </div>
        ]}
      >
        {() => (
          <>
            {/* Event Selection */}
            {!selectedEvent && (
              <div className="bg-white rounded-lg border p-6 mx-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('competitionStatus.selectEvent')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {events.map(event => (
                    <button
                      key={event.int_eventid}
                      onClick={() => setSelectedEvent(event)}
                      className="p-4 border rounded-lg text-left hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                    >
                      <h4 className="font-medium text-gray-900">{event.var_eventname}</h4>
                      <p className="text-sm text-gray-500">ID: {event.int_eventid}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

      {/* Competition Status Display */}
      {selectedEventId && (
        <div className="mx-6">
          {viewMode === 'matrix' ? (
            // Matrix View - Rows: Competitions, Columns: Disciplines, Cells: Progress %
            (() => {
              // Get all unique disciplines across all competitions
              const allDisciplines = new Map<number, { id: number; short: string; name: string }>()
              sortedFilteredCompetitions.forEach(comp => {
                comp.disciplines_detail.forEach((d: any) => {
                  if (!allDisciplines.has(d.disciplineId)) {
                    allDisciplines.set(d.disciplineId, {
                      id: d.disciplineId,
                      short: d.disciplineShort,
                      name: d.disciplineName
                    })
                  }
                })
              })
              const disciplineList = Array.from(allDisciplines.values()).sort((a, b) => a.id - b.id)

              return (
                <MatrixView
                  columns={[
                    ...disciplineList.map((discipline): MatrixColumn => ({
                      id: discipline.id,
                      label: discipline.short,
                      subLabel: discipline.name,
                      minWidth: '100px'
                    })),
                    // Summary column
                    {
                      id: 'summary',
                      label: t('competitionStatus.grid.progress'),
                      subLabel: 'Gesamt',
                      minWidth: '120px'
                    }
                  ]}
                  rows={[
                    // Competition rows
                    ...sortedFilteredCompetitions.map((comp): MatrixRow => {
                      const rowData: Record<string | number, any> = {}
                      
                      // Add discipline progress data
                      disciplineList.forEach((discipline) => {
                        const disciplineDetail = comp.disciplines_detail.find((d: any) => d.disciplineId === discipline.id)
                        if (disciplineDetail) {
                          // Calculate completion for this discipline
                          const completed = disciplineDetail.statusDistribution?.find((s: any) => classifySquadState(s.statusName, s.statusId) === 'completed')?.count || 0
                          const total = disciplineDetail.totalSquads || 0
                          const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
                          
                          rowData[discipline.id] = {
                            percentage,
                            completed,
                            total,
                            statusDistribution: disciplineDetail.statusDistribution
                          }
                        } else {
                          rowData[discipline.id] = null
                        }
                      })
                      
                      // Add summary data
                      rowData['summary'] = {
                        percentage: getCompletionPercentage(comp),
                        completed: comp.completedSquadDisciplines,
                        total: comp.totalSquadDisciplines
                      }
                      
                      return {
                        id: comp.id,
                        label: `${comp.name}${comp.number ? ` (${comp.number})` : ''}`,
                        data: rowData
                      }
                    }),
                    // Summary row
                    {
                      id: 'summary-row',
                      label: 'Gesamt',
                      isHighlighted: true,
                      data: (() => {
                        const summaryData: Record<string | number, any> = {}
                        
                        // Calculate totals for each discipline
                        disciplineList.forEach((discipline) => {
                          let totalCompleted = 0
                          let totalSquads = 0
                          
                          sortedFilteredCompetitions.forEach(comp => {
                            const disciplineDetail = comp.disciplines_detail.find((d: any) => d.disciplineId === discipline.id)
                            if (disciplineDetail) {
                              const completed = disciplineDetail.statusDistribution?.find((s: any) => classifySquadState(s.statusName, s.statusId) === 'completed')?.count || 0
                              totalCompleted += completed
                              totalSquads += disciplineDetail.totalSquads || 0
                            }
                          })
                          
                          summaryData[discipline.id] = {
                            percentage: totalSquads > 0 ? Math.round((totalCompleted / totalSquads) * 100) : 0,
                            completed: totalCompleted,
                            total: totalSquads
                          }
                        })
                        
                        // Grand total
                        const grandTotal = sortedFilteredCompetitions.reduce((sum, comp) => sum + comp.totalSquadDisciplines, 0)
                        const grandCompleted = sortedFilteredCompetitions.reduce((sum, comp) => sum + comp.completedSquadDisciplines, 0)
                        summaryData['summary'] = {
                          percentage: grandTotal > 0 ? Math.round((grandCompleted / grandTotal) * 100) : 0,
                          completed: grandCompleted,
                          total: grandTotal
                        }
                        
                        return summaryData
                      })()
                    }
                  ]}
                  renderCell={({ rowId, columnId, data }) => {
                    if (data === null) {
                      return <span className="text-gray-300 text-xs">-</span>
                    }
                    
                    const isSummaryRow = rowId === 'summary-row'
                    const isSummaryColumn = columnId === 'summary'
                    const cellData = data as { percentage: number; completed: number; total: number }
                    
                    // Determine progress color
                    const getProgressColor = (percentage: number) => {
                      if (percentage === 100) return 'bg-green-100 text-green-800 border-green-300'
                      if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      if (percentage > 0) return 'bg-orange-100 text-orange-800 border-orange-300'
                      return 'bg-gray-100 text-gray-800 border-gray-300'
                    }
                    
                    return (
                      <div className={`text-center ${isSummaryRow || isSummaryColumn ? 'font-semibold' : ''}`}>
                        <div className={`inline-flex flex-col items-center px-2 py-1 rounded border ${getProgressColor(cellData.percentage)}`}>
                          <div className="text-lg">{cellData.percentage}%</div>
                          <div className="text-xs text-gray-600">{cellData.completed}/{cellData.total}</div>
                        </div>
                      </div>
                    )
                  }}
                  stickyFirstColumn={true}
                  stickyHeader={true}
                  className="shadow-sm"
                  emptyMessage={t('competitionStatus.noCompetitionsForEvent')}
                />
              )
            })()
          ) : viewMode === 'table' ? (
            // Table View
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableTableHeader
                      label={t('competitionStatus.table.competition')}
                      sortKey="name"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      label={t('competitionStatus.table.ageGroup')}
                      sortKey="ageFrom"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      label={t('competitionStatus.table.gender')}
                      sortKey="gender"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableTableHeader
                      label={t('competitionStatus.table.overallStatus')}
                      sortKey="overallStatus"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.squadStates')}
                    </th>
                    <SortableTableHeader
                      label={t('competitionStatus.table.progress')}
                      sortKey="progress"
                      currentSortKey={sortKey}
                      currentSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.squads')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedFilteredCompetitions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}{item.number ? ` (${t('competitionStatus.numberAbbrev')} ${item.number})` : ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            {t('competitionStatus.round')} {item.round}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ageFrom}-{item.ageTo} {t('competitionStatus.years')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <GenderBadge value={item.gender} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {(() => { const s = getAggregatedOverallStatus(item); return (
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getOverallStatusColor(s)).className}`}
                          style={getStatusColor(getOverallStatusColor(s)).style}
                        >
                          {s === 'completed' ? t('competitionStatus.statusLabels.completed') : s === 'in_progress' ? t('competitionStatus.statusLabels.inProgress') : t('competitionStatus.statusLabels.notStarted')}
                        </span>
                        )})()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => { const statuses = getStatusManagementSummary(item); return (
                          <div className="flex flex-wrap gap-1">
                            {statuses.map(status => (
                              <span 
                                key={status.statusId}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${getStatusColor(status.colorCode).className}`} 
                                style={getStatusColor(status.colorCode).style}
                              >
                                {status.statusName}: {status.count}
                              </span>
                            ))}
                          </div>
                        )})()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${getCompletionPercentage(item)}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-700">
                            {getCompletionPercentage(item)}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Leistungen erfasst: {item.completedSquadDisciplines} / {item.totalSquadDisciplines}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-wrap gap-1">
                          {item.disciplines_detail.map((discipline: {
                            disciplineId: number;
                            disciplineShort: string;
                          }) => (
                            <span key={discipline.disciplineId} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100">
                              {discipline.disciplineShort}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="text-xs">
                          <div>{t('competitionStatus.details.participants')}: {item.participantCount}</div>
                          <div>{t('competitionStatus.details.totalParticipantsDiscipline')}: {item.totalSquadDisciplines}</div>
                          <div>{t('competitionStatus.details.completed')}: {item.completedSquadDisciplines}</div>
                          <div>{t('competitionStatus.details.inProgress')}: {item.inProgressSquadDisciplines}</div>
                          <div>{t('competitionStatus.details.notStarted')}: {item.notStartedSquadDisciplines}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            // Grid View
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedFilteredCompetitions.map((item) => (
                  <div key={item.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {item.name}{item.number ? ` (${t('competitionStatus.numberAbbrev')} ${item.number})` : ''}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {t('competitionStatus.round')} {item.round}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('competitionStatus.grid.status')}</label>
                        {(() => { const s = getAggregatedOverallStatus(item); return (
                          <div 
                            className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getOverallStatusColor(s)).className}`}
                            style={getStatusColor(getOverallStatusColor(s)).style}
                          >
                            {s === 'completed' ? t('competitionStatus.statusLabels.completed') : s === 'in_progress' ? t('competitionStatus.statusLabels.inProgress') : t('competitionStatus.statusLabels.notStarted')}
                          </div>
                        )})()}
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('competitionStatus.grid.progress')}</label>
                        <div className="mt-1">
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${getCompletionPercentage(item)}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm text-gray-700">
                              {getCompletionPercentage(item)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('competitionStatus.grid.details')}</label>
                        <div className="mt-1 text-sm text-gray-900">
                          <div className="flex items-center gap-2"><GenderBadge value={item.gender} /> • {item.ageFrom}-{item.ageTo} {t('competitionStatus.years')}</div>
                          <div>{item.disciplines_detail.length} {t('competitionStatus.grid.disciplines')} • {item.participantCount} {t('competitionStatus.grid.participants')}</div>
                          <div>{t('competitionStatus.details.totalParticipantsDiscipline')}: {item.totalSquadDisciplines}</div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('competitionStatus.grid.statusBreakdown')}</label>
                        <div className="mt-1 text-sm text-gray-900">
                          {item.statusDistribution.map((status: { statusId: number; statusName: string; count: number }) => (
                            <div key={status.statusId} className="flex justify-between">
                              <span>{status.statusName}:</span>
                              <span>{status.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {filteredCompetitions.length === 0 && (
            <div className="text-center py-12">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('competitionStatus.noCompetitionsTitle')}</h3>
              <p className="text-gray-600">
                {competitionStatuses.length === 0 
                  ? t('competitionStatus.noCompetitionsForEvent')
                  : t('competitionStatus.noCompetitionsMatchFilters')
                }
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

export default CompetitionStatusManagement
