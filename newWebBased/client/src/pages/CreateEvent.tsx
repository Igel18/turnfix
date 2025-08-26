import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  EyeIcon,
  HomeIcon
} from '@heroicons/react/24/outline'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

interface Event {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  var_description?: string
  participant_count: number
  score_count: number
  status: 'upcoming' | 'active' | 'completed'
}

interface EventParticipant {
  int_teilnehmerid: number
  var_vorname: string
  var_nachname: string
  vereins_name: string
  var_geschlecht: string
  dat_geburtsdatum: string
}

interface EventScore {
  int_wertungid: number
  participant_name: string
  club_name: string
  var_disziplin: string
  dec_wertung: number
  int_start_nummer: number
  dat_wertung_datum: string
}

export function CreateEvent() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([])
  const [eventScores, setEventScores] = useState<EventScore[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeView, setActiveView] = useState<'list' | 'participants' | 'scores'>('list')

  // Form state for creating/editing events
  const [formData, setFormData] = useState({
    var_eventname: '',
    dat_eventstartdate: '',
    dat_eventenddate: '',
    var_location: '',
    var_description: ''
  })

  const statusOptions = [
    { value: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' }
  ]

  // Determine event status based on dates
  const getEventStatus = (startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' => {
    const now = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (now < start) return 'upcoming'
    if (now > end) return 'completed'
    return 'active'
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Fetch events with pagination and filters
  const fetchEvents = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '10',
        offset: ((page - 1) * 10).toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (selectedStatus) params.append('status', selectedStatus)

      const data = await apiGet(`/events?${params}`)
      // Add status to each event based on dates
      const eventsWithStatus = data.events.map((event: any) => ({
        ...event,
        status: getEventStatus(event.dat_eventstartdate, event.dat_eventenddate)
      }))
      setEvents(eventsWithStatus)
      setTotalPages(Math.ceil(data.pagination.total / 10))
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch participants for selected event
  const fetchEventParticipants = async (eventId: number) => {
    try {
      const data = await apiGet(`/events/${eventId}/participants`)
      setEventParticipants(data.participants || [])
    } catch (error) {
      console.error('Error fetching event participants:', error)
      setEventParticipants([])
    }
  }

  // Fetch scores for selected event
  const fetchEventScores = async (eventId: number) => {
    try {
      const data = await apiGet(`/scores?event_id=${eventId}&limit=100`)
      setEventScores(data.scores || [])
    } catch (error) {
      console.error('Error fetching event scores:', error)
      setEventScores([])
    }
  }

  // Create or update event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const eventData = {
        var_eventname: formData.var_eventname,
        dat_eventstartdate: formData.dat_eventstartdate,
        dat_eventenddate: formData.dat_eventenddate,
        var_location: formData.var_location,
        var_description: formData.var_description || null
      }

      if (editingEvent) {
        await apiPut(`/events/${editingEvent.int_eventid}`, eventData)
      } else {
        await apiPost('/events', eventData)
      }

      await fetchEvents(currentPage)
      setIsModalOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving event:', error)
    }
  }

  // Delete event
  const handleDelete = async (eventId: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      await apiDelete(`/events/${eventId}`)
      await fetchEvents(currentPage)
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      var_eventname: '',
      dat_eventstartdate: '',
      dat_eventenddate: '',
      var_location: '',
      var_description: ''
    })
    setEditingEvent(null)
  }

  const openEditModal = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      var_eventname: event.var_eventname,
      dat_eventstartdate: event.dat_eventstartdate.split('T')[0],
      dat_eventenddate: event.dat_eventenddate.split('T')[0],
      var_location: event.var_location,
      var_description: event.var_description || ''
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    return statusOptions.find(option => option.value === status)?.color || 'bg-gray-100 text-gray-800'
  }

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event)
    setActiveView('participants')
    fetchEventParticipants(event.int_eventid)
    fetchEventScores(event.int_eventid)
  }

  const handleBackToList = () => {
    setSelectedEvent(null)
    setActiveView('list')
  }

  useEffect(() => {
    if (activeView === 'list') {
      fetchEvents(currentPage)
    }
  }, [searchTerm, selectedStatus, currentPage, activeView])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 mb-4">
        <Link 
          to="/dashboard" 
          className="text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center"
        >
          <HomeIcon className="h-5 w-5 mr-1" />
          Dashboard
        </Link>
        <span className="text-gray-500">/</span>
        <span className="text-gray-900 font-medium">Create Event</span>
      </nav>
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CalendarDaysIcon className="h-8 w-8 mr-3 text-blue-600" />
              {selectedEvent ? `Event: ${selectedEvent.var_eventname}` : 'Event Management'}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedEvent 
                ? 'View participants and scores for this event'
                : 'Manage gymnastics events and competitions'
              }
            </p>
          </div>
          <div className="flex space-x-3">
            {selectedEvent && (
              <button
                onClick={handleBackToList}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <span>← Back to Events</span>
              </button>
            )}
            {!selectedEvent && (
              <button
                onClick={openCreateModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add Event</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {activeView === 'list' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {events.filter(e => e.status === 'upcoming').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {events.filter(e => e.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {events.filter(e => e.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                {statusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              
              <div className="text-sm text-gray-500 flex items-center">
                Showing {events.length} events
              </div>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {isLoading ? (
              <div className="col-span-full flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No events found</p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event.int_eventid} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {event.var_eventname}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                          {statusOptions.find(s => s.value === event.status)?.label}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSelectEvent(event)}
                          className="text-green-600 hover:text-green-800"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(event)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.int_eventid)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarDaysIcon className="h-4 w-4 mr-2" />
                        <span>
                          {formatDate(event.dat_eventstartdate)}
                          {event.dat_eventstartdate !== event.dat_eventenddate && 
                            ` - ${formatDate(event.dat_eventenddate)}`
                          }
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        <span>{event.var_location}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        <span>{event.participant_count} participants</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                        <span>{event.score_count} scores recorded</span>
                      </div>

                      {event.var_description && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {event.var_description}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleSelectEvent(event)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        View Participants & Scores
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded-lg ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Event Details View */
        <div className="space-y-8">
          {/* Event Info Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Date Range</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(selectedEvent!.dat_eventstartdate)} - {formatDate(selectedEvent!.dat_eventenddate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <MapPinIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedEvent!.var_location}</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <UsersIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-lg font-semibold text-gray-900">{eventParticipants.length}</p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg mr-4">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Scores</p>
                  <p className="text-lg font-semibold text-gray-900">{eventScores.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="flex space-x-1 p-1">
              <button
                onClick={() => setActiveView('participants')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'participants'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <UsersIcon className="h-4 w-4 inline mr-2" />
                Participants ({eventParticipants.length})
              </button>
              <button
                onClick={() => setActiveView('scores')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'scores'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <ClipboardDocumentListIcon className="h-4 w-4 inline mr-2" />
                Scores ({eventScores.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeView === 'participants' ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Participants</h3>
                  {eventParticipants.length === 0 ? (
                    <div className="text-center py-12">
                      <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No participants registered for this event</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Club
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gender
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Age
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {eventParticipants.map((participant) => (
                            <tr key={participant.int_teilnehmerid} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {participant.var_vorname} {participant.var_nachname}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {participant.vereins_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  participant.var_geschlecht === 'M' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-pink-100 text-pink-800'
                                }`}>
                                  {participant.var_geschlecht === 'M' ? 'Male' : 'Female'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {new Date().getFullYear() - new Date(participant.dat_geburtsdatum).getFullYear()} years
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Scores</h3>
                  {eventScores.length === 0 ? (
                    <div className="text-center py-12">
                      <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No scores recorded for this event yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
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
                          {eventScores.map((score) => (
                            <tr key={score.int_wertungid} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                  {score.int_start_nummer}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {score.participant_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {score.club_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {score.var_disziplin}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-lg font-bold text-gray-900">
                                  {score.dec_wertung.toFixed(3)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {formatDate(score.dat_wertung_datum)}
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
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingEvent ? 'Edit Event' : 'Add New Event'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_eventname}
                    onChange={(e) => setFormData({ ...formData, var_eventname: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter event name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dat_eventstartdate}
                      onChange={(e) => setFormData({ ...formData, dat_eventstartdate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dat_eventenddate}
                      onChange={(e) => setFormData({ ...formData, dat_eventenddate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_location}
                    onChange={(e) => setFormData({ ...formData, var_location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event venue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.var_description}
                    onChange={(e) => setFormData({ ...formData, var_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingEvent ? 'Update' : 'Create'} Event
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateEvent;
