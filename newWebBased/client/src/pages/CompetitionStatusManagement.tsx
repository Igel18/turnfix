import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  TrophyIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { GenderBadge } from '@/components/GenderBadge'
import { useEvent } from '@/contexts/EventContext'
import { apiGet } from '@/utils/api'

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
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const selectedEventId = eventIdParam ? parseInt(eventIdParam) : selectedEvent?.int_eventid

  // Load initial data
  useEffect(() => {
    if (selectedEventId) {
      loadData()
    }
  }, [selectedEventId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load competition status data from our new aggregated endpoint
      const competitionStatusData = await apiGet(`/competition-status?eventId=${selectedEventId}`)
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
    if (filterGender && !item.gender.toLowerCase().includes(filterGender.toLowerCase())) {
      return false
    }
    return true
  })

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterGender('')
  }

  const getFilterOptions = () => [
    {
      value: 'status',
      label: t('competitionStatus.filters.status'),
      selectedValue: filterStatus,
      options: [
        { value: 'completed', label: t('competitionStatus.filters.completed') },
        { value: 'in_progress', label: t('competitionStatus.filters.inProgress') },
        { value: 'not_started', label: t('competitionStatus.filters.notStarted') }
      ],
      onChange: setFilterStatus
    },
    {
      value: 'gender',
      label: t('competitionStatus.filters.gender'),
      selectedValue: filterGender,
      options: [
        { value: 'männlich', label: t('competitionStatus.filters.male') },
        { value: 'weiblich', label: t('competitionStatus.filters.female') }
      ],
      onChange: setFilterGender
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">{t('competitionStatus.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedPageHeader
        title={t('competitionStatus.title')}
        subtitle={t('competitionStatus.subtitle', { eventName: selectedEvent?.var_eventname || t('competitionStatus.selectedEvent') })}
        icon={TrophyIcon}
        showEventContext={true}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('competitionStatus.searchPlaceholder')}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasFilters={true}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        showExportCSV={true}
        onExportCSV={() => {
          // TODO: Implement CSV export
          console.log('Export CSV')
        }}
        showAdd={false}
        showImport={false}
        viewMode={viewMode}
        onViewModeChange={(mode) => setViewMode(mode)}
        showViewToggle={true}
      />

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
        <div className="bg-white rounded-lg shadow-sm border mx-6 overflow-hidden">
          {viewMode === 'table' ? (
            // Table View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.competition')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.ageGroup')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.gender')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.overallStatus')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.squadStates')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.progress')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.squads')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('competitionStatus.table.details')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompetitions.map((item) => (
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
                          {item.disciplines_detail.map(discipline => (
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
          ) : (
            // Grid View
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompetitions.map((item) => (
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
                          {item.statusDistribution.map((status) => (
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
    </div>
  )
}

export default CompetitionStatusManagement
