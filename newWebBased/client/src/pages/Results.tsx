import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  UserGroupIcon,
  EyeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { apiGet } from '../utils/api'

interface Result {
  int_teilnehmerid: number
  participant_name: string
  club_name: string
  event_name: string
  var_disziplin: string
  dec_wertung: number
  int_start_nummer: number
  dat_wertung_datum: string
  rank: number
  total_score?: number
}

interface EventResult {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  participant_count: number
  discipline_count: number
}

export function Results() {
  const [searchParams] = useSearchParams()
  const { selectedEvent, selectedCompetition, selectedSquad } = useEvent()
  
  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId')
  const urlCompetitionId = searchParams.get('competitionId') 
  const urlSquadName = searchParams.get('squadName')
  
  // Use context values or URL parameters
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const competitionId = selectedCompetition?.id.toString() || urlCompetitionId
  const squadName = selectedSquad?.squad_name || urlSquadName
  
  const [results, setResults] = useState<Result[]>([])
  const [eventResults, setEventResults] = useState<EventResult[]>([])
  const [selectedEventForFilter, setSelectedEventForFilter] = useState<number | ''>(eventId ? parseInt(eventId) : '')
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('')
  const [viewMode, setViewMode] = useState<'individual' | 'rankings' | 'events'>('events')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Helper functions for unified header
  const getResultsStateInfo = (): StateInfo[] => {
    const totalEvents = eventResults.length
    const totalResults = results.length
    const uniqueParticipants = new Set(results.map(r => r.int_teilnehmerid)).size

    return [
      {
        value: 'events',
        label: 'Events',
        count: totalEvents,
        color: 'bg-blue-100 text-blue-800'
      },
      {
        value: 'results',
        label: 'Results',
        count: totalResults,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'participants',
        label: 'Participants',
        count: uniqueParticipants,
        color: 'bg-purple-100 text-purple-800'
      }
    ]
  }

  const getFilterOptions = () => [
    {
      label: 'Event',
      value: 'event',
      options: eventResults.map(event => ({
        value: event.int_eventid.toString(),
        label: event.var_eventname
      })),
      selectedValue: selectedEventForFilter.toString(),
      onChange: (value: string) => setSelectedEventForFilter(value === '' ? '' : parseInt(value))
    },
    {
      label: 'Discipline',
      value: 'discipline',
      options: disciplines.map(discipline => ({
        value: discipline,
        label: discipline
      })),
      selectedValue: selectedDiscipline,
      onChange: setSelectedDiscipline
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedEventForFilter('')
    setSelectedDiscipline('')
  }

  const disciplines = [
    'Floor Exercise',
    'Pommel Horse',
    'Still Rings',
    'Vault',
    'Parallel Bars',
    'Horizontal Bar',
    'Uneven Bars',
    'Balance Beam',
    'All-Around'
  ]

  // Format score with 3 decimal places
  const formatScore = (score: number) => {
    return score.toFixed(3)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get medal color for rankings
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-100'
      case 2: return 'text-gray-600 bg-gray-100'
      case 3: return 'text-amber-600 bg-amber-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  // Get medal emoji
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  // Fetch event results overview
  const fetchEventResults = async () => {
    setIsLoading(true)
    try {
      const data = await apiGet('/events?limit=50')
      setEventResults(data.events || [])
    } catch (error) {
      console.error('Error fetching event results:', error)
      setEventResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch individual results
  const fetchResults = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (selectedEventForFilter) params.append('event_id', selectedEventForFilter.toString())
      if (selectedDiscipline) params.append('discipline', selectedDiscipline)
      if (searchTerm) params.append('search', searchTerm)

      const data = await apiGet(`/scores?${params}`)
      // Add ranking to scores
      const sortedScores = (data.scores || [])
        .sort((a: Result, b: Result) => b.dec_wertung - a.dec_wertung)
        .map((score: Result, index: number) => ({
          ...score,
          rank: index + 1
        }))
      setResults(sortedScores)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  // Export results to CSV
  const exportResults = () => {
    if (results.length === 0) return

    const headers = ['Rank', 'Participant', 'Club', 'Event', 'Discipline', 'Score', 'Start #', 'Date']
    const csvData = results.map(result => [
      result.rank,
      result.participant_name,
      result.club_name,
      result.event_name,
      result.var_disziplin,
      formatScore(result.dec_wertung),
      result.int_start_nummer,
      formatDate(result.dat_wertung_datum)
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (viewMode === 'events') {
      fetchEventResults()
    } else {
      fetchResults()
    }
  }, [viewMode, selectedEventForFilter, selectedDiscipline, searchTerm])

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Competition Results"
        description="View competition results and rankings"
        icon={ChartBarIcon}
        stateInfo={getResultsStateInfo()}
        selectedState=""
        onStateChange={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants, events..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={exportResults}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={viewMode === 'events' ? eventResults.length : results.length}
      />

      {/* Event Selection Context */}
      {(eventId || competitionId || squadName) && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Selected Context:</strong>
              {eventId && ` Event: ${selectedEvent?.var_eventname || `Event ID ${eventId}`}`}
              {competitionId && ` • Competition ID: ${competitionId}`}
              {squadName && ` • Squad: ${squadName}`}
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Results are filtered based on your selection from the dashboard.
          </p>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setViewMode('events')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'events'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Event Overview
          </button>
          <button
            onClick={() => setViewMode('rankings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'rankings'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Rankings
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'individual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Individual Results
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'events' ? (
        /* Event Overview */
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-gray-600">Loading events...</p>
            </div>
          ) : eventResults.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No events found</p>
            </div>
          ) : (
            eventResults.map((event) => (
              <div key={event.int_eventid} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {event.var_eventname}
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedEventForFilter(event.int_eventid)
                        setViewMode('rankings')
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="View Results"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>
                        {formatDate(event.dat_eventstartdate)}
                        {event.dat_eventstartdate !== event.dat_eventenddate && 
                          ` - ${formatDate(event.dat_eventenddate)}`
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      <span>{event.participant_count} participants</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <TrophyIcon className="h-4 w-4 mr-2" />
                      <span>{event.discipline_count} disciplines</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedEventForFilter(event.int_eventid)
                        setViewMode('rankings')
                      }}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      View Results
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Results Table */
        <div className="bg-white rounded-lg shadow-sm border">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading results...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {viewMode === 'rankings' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Discipline
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={`${result.int_teilnehmerid}-${result.var_disziplin}`} className="hover:bg-gray-50">
                      {viewMode === 'rankings' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMedalColor(result.rank)}`}>
                            {getMedalEmoji(result.rank)}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                          {result.int_start_nummer}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {result.participant_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {result.club_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {result.event_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {result.var_disziplin}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-gray-900">
                          {formatScore(result.dec_wertung)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatDate(result.dat_wertung_datum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Results
