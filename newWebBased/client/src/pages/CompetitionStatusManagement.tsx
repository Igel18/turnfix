import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  TrophyIcon,
  EyeIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
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
  const [searchParams] = useSearchParams()
  const eventIdParam = searchParams.get('eventId')
  const { selectedEvent, setSelectedEvent } = useEvent()

  // Data states
  const [competitionStatuses, setCompetitionStatuses] = useState<CompetitionStatus[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Filter states
  const [filterCompetition, setFilterCompetition] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGender, setFilterGender] = useState('')

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

  // Filter competitions
  const filteredCompetitions = competitionStatuses.filter(item => {
    if (filterCompetition && !item.name.toLowerCase().includes(filterCompetition.toLowerCase())) {
      return false
    }
    if (filterStatus && !item.overallStatus.toLowerCase().includes(filterStatus.toLowerCase())) {
      return false
    }
    if (filterGender && !item.gender.toLowerCase().includes(filterGender.toLowerCase())) {
      return false
    }
    return true
  })

  // State info for header
  const getStateInfo = (): StateInfo[] => {
    const total = competitionStatuses.length
    const completed = competitionStatuses.filter(c => c.overallStatus === 'completed').length
    const inProgress = competitionStatuses.filter(c => c.overallStatus === 'in_progress').length
    const notStarted = competitionStatuses.filter(c => c.overallStatus === 'not_started').length

    return [
      { value: 'completed', label: 'Abgeschlossen', count: completed, color: 'text-green-600' },
      { value: 'in-progress', label: 'In Bearbeitung', count: inProgress, color: 'text-yellow-600' },
      { value: 'not_started', label: 'Nicht gestartet', count: notStarted, color: 'text-gray-600' },
      { value: 'total', label: 'Gesamt', count: total, color: 'text-blue-600' }
    ]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading competition status data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UnifiedHeader
        title="Competition Status Management"
        description="View aggregated status for competitions based on squad progress"
        icon={TrophyIcon}
        searchTerm=""
        onSearchChange={() => {}}
        onClearAllFilters={() => {
          setFilterCompetition('')
          setFilterStatus('')
          setFilterGender('')
        }}
        onExportCSV={() => {
          // TODO: Implement CSV export
          console.log('Export CSV')
        }}
        stateInfo={getStateInfo()}
        showHomeButton={true}
        primaryAction={{
          label: viewMode === 'table' ? 'Grid View' : 'Table View',
          icon: viewMode === 'table' ? EyeIcon : ClipboardDocumentListIcon,
          onClick: () => setViewMode(viewMode === 'table' ? 'grid' : 'table')
        }}
      />

      {/* Event Selection */}
      {!selectedEvent && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Select Event</h3>
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

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Competition</label>
            <input
              type="text"
              placeholder="Filter by competition name..."
              value={filterCompetition}
              onChange={(e) => setFilterCompetition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Abgeschlossen">Abgeschlossen</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Vorbereitet">Vorbereitet</option>
              <option value="Nicht gestartet">Nicht gestartet</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Genders</option>
              <option value="männlich">Männlich</option>
              <option value="weiblich">Weiblich</option>
            </select>
          </div>
        </div>
      </div>

      {/* Competition Status Display */}
      {selectedEventId && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {viewMode === 'table' ? (
            // Table View
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Competition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Age Group
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Squads
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCompetitions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.number} - Round {item.round}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.ageFrom}-{item.ageTo} Jahre
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getOverallStatusColor(item.overallStatus)).className}`}
                          style={getStatusColor(getOverallStatusColor(item.overallStatus)).style}
                        >
                          {item.overallStatus === 'completed' ? 'Abgeschlossen' :
                           item.overallStatus === 'in_progress' ? 'In Bearbeitung' : 'Nicht gestartet'}
                        </span>
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
                        <div className="text-xs text-gray-500 mt-1">
                          {item.statusDistribution.map(status => 
                            `${status.statusName}: ${status.count}`
                          ).join(', ')}
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
                          <div>Total: {item.totalSquadDisciplines}</div>
                          <div>Completed: {item.completedSquadDisciplines}</div>
                          <div>In Progress: {item.inProgressSquadDisciplines}</div>
                          <div>Not Started: {item.notStartedSquadDisciplines}</div>
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
                          {item.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {item.number} - Round {item.round}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                        <div 
                          className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getOverallStatusColor(item.overallStatus)).className}`}
                          style={getStatusColor(getOverallStatusColor(item.overallStatus)).style}
                        >
                          {item.overallStatus === 'completed' ? 'Abgeschlossen' :
                           item.overallStatus === 'in_progress' ? 'In Bearbeitung' : 'Nicht gestartet'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Progress</label>
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
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Details</label>
                        <div className="mt-1 text-sm text-gray-900">
                          <div>{item.gender} • {item.ageFrom}-{item.ageTo} Jahre</div>
                          <div>{item.disciplines_detail.length} Disciplines • {item.participantCount} Participants</div>
                          <div>Total Squad-Disciplines: {item.totalSquadDisciplines}</div>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status Breakdown</label>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No competitions found</h3>
              <p className="text-gray-600">
                {competitionStatuses.length === 0 
                  ? 'No competition data available for this event'
                  : 'No competitions match your current filters'
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
