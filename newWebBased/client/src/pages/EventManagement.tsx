import React, { useState, useEffect } from 'react'
import EventSelector from '@/components/EventSelector'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import {
  CalendarDaysIcon,
  UsersIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { apiGet } from '../utils/api'

interface Event {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  status: 'upcoming' | 'active' | 'completed'
}

interface Competition {
  id: number
  name: string
  number: string
  round: number
  event_id: number
  participant_count: number
  discipline_count: number
}

interface Squad {
  squad_name: string
  participant_count: number
  individual_count: number
  group_count: number
  team_count: number
}

interface Score {
  score_id: number
  start_number: number
  participant_name: string
  participant_type: string
  club_name: string
  competition_name: string
  competition_number: string
  squad: string
  not_starting: boolean
  age_class: boolean
  completed_disciplines: number
  total_disciplines: number
}

interface Discipline {
  id: number
  name: string
  short_name: string
  display_name: string
  icon: string
  male_allowed: boolean
  female_allowed: boolean
  sort_order: number
  is_compulsory: boolean
  participant_count: number
}

const EventManagement: React.FC = () => {
  // Selection state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  
  // Data state
  const [scores, setScores] = useState<Score[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [loading, setLoading] = useState({
    scores: false,
    disciplines: false
  })
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch scores when selection changes
  useEffect(() => {
    if (selectedEvent) {
      fetchScores(1)
    } else {
      setScores([])
    }
  }, [selectedEvent, selectedCompetition, selectedSquad, searchTerm])

  // Fetch disciplines when event or competition changes
  useEffect(() => {
    if (selectedEvent) {
      fetchDisciplines()
    } else {
      setDisciplines([])
    }
  }, [selectedEvent, selectedCompetition])

  const fetchScores = async (page: number) => {
    if (!selectedEvent) return
    
    setLoading(prev => ({ ...prev, scores: true }))
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((page - 1) * 20).toString()
      })
      
      if (selectedCompetition) params.append('competitionId', selectedCompetition.id.toString())
      if (selectedSquad) params.append('squadName', selectedSquad.squad_name)
      if (searchTerm) params.append('search', searchTerm)

      const data = await apiGet(`/events/${selectedEvent.int_eventid}/scores?${params}`)
      setScores(data.scores || [])
      setTotalPages(Math.ceil((data.pagination?.total || 0) / 20))
      setCurrentPage(page)
    } catch (error) {
      console.error('Error fetching scores:', error)
    } finally {
      setLoading(prev => ({ ...prev, scores: false }))
    }
  }

  const fetchDisciplines = async () => {
    if (!selectedEvent) return
    
    setLoading(prev => ({ ...prev, disciplines: true }))
    try {
      const params = new URLSearchParams()
      if (selectedCompetition) params.append('competitionId', selectedCompetition.id.toString())

      const data = await apiGet(`/events/${selectedEvent.int_eventid}/disciplines?${params}`)
      setDisciplines(data.disciplines || [])
    } catch (error) {
      console.error('Error fetching disciplines:', error)
    } finally {
      setLoading(prev => ({ ...prev, disciplines: false }))
    }
  }

  const getProgressColor = (completed: number, total: number) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0
    if (percentage === 100) return 'text-green-600 bg-green-100'
    if (percentage > 0) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getProgressIcon = (completed: number, total: number) => {
    const percentage = total > 0 ? (completed / total) * 100 : 0
    if (percentage === 100) return CheckCircleIcon
    return ExclamationTriangleIcon
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UnifiedPageHeader
        title="Event Management"
        subtitle="Select an event to view competitions, squads, participants, and their scores"
        icon={CalendarDaysIcon}
        showEventContext={true}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants..."
        showFilters={false}
        showAdd={false}
        showImport={false}
        showViewToggle={false}
        showExportCSV={false}
        showExportPDF={false}
        showPrint={false}
      />

      {/* Event Selector */}
      <EventSelector
        onSelectionChange={(eventId, competitionId, squadName) => {
          // Find the event object from eventId if needed
          if (eventId !== null) {
            // You might need to fetch the event details or have them available
            setSelectedEvent({ int_eventid: eventId } as Event);
          } else {
            setSelectedEvent(null);
          }
          
          if (competitionId !== null) {
            setSelectedCompetition({ id: competitionId } as Competition);
          } else {
            setSelectedCompetition(null);
          }
          
          if (squadName !== null) {
            setSelectedSquad({ squad_name: squadName, participant_count: 0, individual_count: 0, group_count: 0, team_count: 0 } as Squad);
          } else {
            setSelectedSquad(null);
          }
        }}
      />

      {selectedEvent && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Event</p>
                  <p className="text-2xl font-semibold text-gray-900">{selectedEvent.status}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrophyIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Competitions</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {selectedCompetition ? '1 Selected' : 'All'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-2xl font-semibold text-gray-900">{scores.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Disciplines</p>
                  <p className="text-2xl font-semibold text-gray-900">{disciplines.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Disciplines Overview */}
          {disciplines.length > 0 && (
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  Disciplines Overview
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {disciplines.map((discipline) => (
                    <div key={discipline.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{discipline.name}</h4>
                          <p className="text-sm text-gray-500">
                            {discipline.display_name || discipline.short_name}
                          </p>
                        </div>
                        {discipline.is_compulsory && (
                          <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded">
                            Compulsory
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          {discipline.participant_count} participants
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {discipline.male_allowed && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Male</span>
                          )}
                          {discipline.female_allowed && (
                            <span className="text-xs text-pink-600 bg-pink-100 px-2 py-1 rounded">Female</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Participants & Scores */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <UsersIcon className="h-5 w-5 text-gray-400 mr-2" />
                  Participants & Scores
                </h3>
                
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    placeholder="Search participants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {loading.scores ? (
                <div className="p-6 text-center text-gray-500">
                  Loading participants and scores...
                </div>
              ) : scores.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No participants found for the selected criteria
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
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
                          Competition
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Squad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {scores.map((score) => {
                        const ProgressIcon = getProgressIcon(score.completed_disciplines, score.total_disciplines)
                        return (
                          <tr key={score.score_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {score.start_number || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{score.participant_name}</div>
                                <div className="text-sm text-gray-500 capitalize">{score.participant_type.toLowerCase()}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {score.club_name || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {score.competition_number} - {score.competition_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {score.squad || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <ProgressIcon className={`h-4 w-4 mr-2 ${getProgressColor(score.completed_disciplines, score.total_disciplines).split(' ')[0]}`} />
                                <span className="text-sm text-gray-900">
                                  {score.completed_disciplines}/{score.total_disciplines}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {score.not_starting && (
                                  <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded">
                                    Not Starting
                                  </span>
                                )}
                                {score.age_class && (
                                  <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded">
                                    Age Class
                                  </span>
                                )}
                                {!score.not_starting && !score.age_class && (
                                  <span className="px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Showing page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchScores(currentPage - 1)}
                          disabled={currentPage <= 1}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => fetchScores(currentPage + 1)}
                          disabled={currentPage >= totalPages}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default EventManagement
