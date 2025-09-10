import React, { useState, useEffect } from 'react'
import EventSelector from '@/components/EventSelector'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import UnifiedDataView from '@/components/UnifiedDataView'
import useViewToggle from '@/hooks/useViewToggle'
import {
  CalendarDaysIcon,
  UsersIcon,
  TrophyIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentArrowUpIcon,
  EyeIcon
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
  
  const [searchTerm, setSearchTerm] = useState('')

  // Import modal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importEventData, setImportEventData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    location: '',
    description: ''
  })
  const [importProgress, setImportProgress] = useState<{ step: string; progress: number } | null>(null)

  // View toggle
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: 'eventManagement', 
    defaultView: 'table' 
  })

  // Fetch scores when selection changes
  useEffect(() => {
    if (selectedEvent) {
      fetchScores()
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

  const fetchScores = async () => {
    if (!selectedEvent) return
    
    setLoading(prev => ({ ...prev, scores: true }))
    try {
      const params = new URLSearchParams({
        limit: '1000', // Load all data for better filtering
      })
      
      if (selectedCompetition) params.append('competitionId', selectedCompetition.id.toString())
      if (selectedSquad) params.append('squadName', selectedSquad.squad_name)
      if (searchTerm) params.append('search', searchTerm)

      const data = await apiGet(`/events/${selectedEvent.int_eventid}/scores?${params}`)
      setScores(data.scores || [])
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

  // Import functions
  const openImportModal = () => setShowImportModal(true)
  const closeImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportEventData({
      name: '',
      startDate: '',
      endDate: '',
      location: '',
      description: ''
    })
    setImportProgress(null)
  }

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importFile) return

    try {
      setImportProgress({ step: 'Preparing import...', progress: 10 })
      
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('name', importEventData.name.trim())
      if (importEventData.startDate) formData.append('startDate', importEventData.startDate)
      if (importEventData.endDate) formData.append('endDate', importEventData.endDate)
      if (importEventData.location) formData.append('location', importEventData.location.trim())
      if (importEventData.description) formData.append('description', importEventData.description.trim())
      
      setImportProgress({ step: 'Uploading and processing...', progress: 30 })
      
      const response = await fetch('/api/events/import-gymnet', {
        method: 'POST',
        body: formData,
      })
      
      const result = await response.json()
      
      if (response.ok && result.success) {
        setImportProgress({ step: 'Import completed successfully!', progress: 100 })
        setTimeout(() => {
          closeImportModal()
          // Refresh data if needed
          if (selectedEvent) {
            fetchScores()
            fetchDisciplines()
          }
        }, 2000)
      } else {
        throw new Error(result.error || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportProgress({ step: `Error: ${error instanceof Error ? error.message : 'Import failed'}`, progress: 0 })
    }
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
        showImport={true}
        importLabel="Import from GymNet"
        onImport={openImportModal}
        showViewToggle={true}
        viewMode={viewType === 'table' ? 'table' : 'grid'}
        onViewModeChange={(mode) => handleViewTypeChange(mode === 'table' ? 'table' : 'cards')}
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
          <UnifiedDataView
            items={scores}
            selectedItem={null}
            isLoading={loading.scores}
            viewType={viewType}
            onViewTypeChange={handleViewTypeChange}
            onSelectItem={() => {}} // No selection needed for this view
            renderCard={(score) => {
              const ProgressIcon = getProgressIcon(score.completed_disciplines, score.total_disciplines)
              const progressColor = getProgressColor(score.completed_disciplines, score.total_disciplines)

              return (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl font-bold text-gray-900">#{score.start_number || '—'}</span>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{score.participant_name}</h3>
                          <p className="text-sm text-gray-500 capitalize">{score.participant_type.toLowerCase()}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Club:</span>
                          <span className="font-medium">{score.club_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Competition:</span>
                          <span className="font-medium">{score.competition_number} - {score.competition_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Squad:</span>
                          <span className="font-medium">{score.squad || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Progress:</span>
                          <div className="flex items-center gap-2">
                            <ProgressIcon className={`h-4 w-4 ${progressColor.split(' ')[0]}`} />
                            <span className="font-medium">{score.completed_disciplines}/{score.total_disciplines}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex flex-wrap gap-2">
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
                    </div>
                    
                    <div className="ml-4">
                      <button
                        onClick={() => {/* Add view details functionality */}}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="View Details"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            }}
            tableHeaders={['Start #', 'Participant', 'Club', 'Competition', 'Squad', 'Progress', 'Status']}
            renderTableRow={(score) => (
              <>
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
                    {(() => {
                      const ProgressIcon = getProgressIcon(score.completed_disciplines, score.total_disciplines)
                      return <ProgressIcon className={`h-4 w-4 mr-2 ${getProgressColor(score.completed_disciplines, score.total_disciplines).split(' ')[0]}`} />
                    })()}
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
              </>
            )}
            emptyStateTitle="No participants found"
            emptyStateDescription="Select an event, competition, and squad to view participants and their scores"
          />
        </>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Import Event from DTB GymNet
                </h3>
                <button
                  onClick={closeImportModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleImportSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select GymNet XML File
                  </label>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Select a DTB GymNet XML export file to import event data, competitions, disciplines, and participants.
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">
                    Since GymNet XML files don't contain overall event information, please provide the event details:
                  </h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Name *</label>
                      <input
                        type="text"
                        value={importEventData.name}
                        onChange={(e) => setImportEventData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <input
                          type="date"
                          value={importEventData.startDate}
                          onChange={(e) => setImportEventData(prev => ({ ...prev, startDate: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <input
                          type="date"
                          value={importEventData.endDate}
                          onChange={(e) => setImportEventData(prev => ({ ...prev, endDate: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <input
                        type="text"
                        value={importEventData.location}
                        onChange={(e) => setImportEventData(prev => ({ ...prev, location: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <textarea
                        value={importEventData.description}
                        onChange={(e) => setImportEventData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {importProgress && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className="mb-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{importProgress.step}</span>
                        <span className="text-gray-600">{importProgress.progress}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={!!importProgress}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!importFile || !importEventData.name.trim() || !!importProgress}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                  Import Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventManagement
