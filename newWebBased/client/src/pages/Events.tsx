import React, { useState, useEffect } from 'react'
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { exportToCSV, getEventCSVData } from '@/utils/csvExport'
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
  id: number
  firstname: string
  lastname: string
  club: string
  clubId: number
  gender: 'male' | 'female'
  birthYear: number | null
  age: number | null
  squad_name: string | null
  startet_nicht: boolean
  isInEvent: boolean
  assignedCompetitions: number[]
  registrationDate?: string
}

interface EventScore {
  int_wertungid: number
  int_start_nummer: number
  participant_name: string
  club_name: string
  var_disziplin: string
  dec_wertung: number
  dat_wertung_datum: string
}

const Events: React.FC = () => {
  // State management
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([])
  const [eventScores, setEventScores] = useState<EventScore[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<{ step: string; progress: number } | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [activeView, setActiveView] = useState<'list' | 'participants' | 'scores'>('list')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  
  // Import event details state
  const [importEventData, setImportEventData] = useState({
    eventName: '',
    startDate: '',
    endDate: '',
    location: '',
    description: ''
  })
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

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

  // Helper functions for unified header
  const getEventStateInfo = (): StateInfo[] => {
    const upcomingCount = events.filter(e => e.status === 'upcoming').length
    const activeCount = events.filter(e => e.status === 'active').length
    const completedCount = events.filter(e => e.status === 'completed').length

    return [
      {
        value: 'upcoming',
        label: 'Upcoming',
        count: upcomingCount,
        color: 'bg-blue-100 text-blue-800'
      },
      {
        value: 'active',
        label: 'Active',
        count: activeCount,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'completed',
        label: 'Completed',
        count: completedCount,
        color: 'bg-gray-100 text-gray-800'
      }
    ]
  }

  const getFilterOptions = () => [
    {
      label: 'Status',
      value: 'status',
      options: statusOptions.map(status => ({
        value: status.value,
        label: status.label
      })),
      selectedValue: selectedStatus,
      onChange: setSelectedStatus
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
  }

  const handleExportCSV = () => {
    const csvData = getEventCSVData(events)
    exportToCSV(csvData)
  }

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
      console.log('=== CLIENT DEBUG: Successfully received API response ===')
      console.log('Events array length:', data.events?.length)
      console.log('First event received:', data.events?.[0])
        
      // Add status to each event based on dates
      const eventsWithStatus = (data.events || []).map((event: any) => ({
        ...event,
        status: getEventStatus(event.dat_eventstartdate, event.dat_eventenddate)
      }))
      console.log('=== CLIENT DEBUG: Events with status added ===')
      console.log('Setting events array with length:', eventsWithStatus.length)
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
      const data = await apiGet(`/event-participants?eventId=${eventId}`)
      setEventParticipants(data.participants || [])
    } catch (error) {
      console.error('Error fetching event participants:', error)
      setEventParticipants([])
    }
  }

  // Fetch scores for selected event
  const fetchEventScores = async (eventId: number) => {
    try {
      const data = await apiGet(`/scores?eventId=${eventId}&limit=100`)
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
  const handleDelete = async (eventId: number, forceDelete = false) => {
    if (!forceDelete && !confirm('Are you sure you want to delete this event?')) return

    setErrorMessage('')
    setSuccessMessage('')

    try {
      const url = forceDelete ? `/events/${eventId}?force=true` : `/events/${eventId}`
      await apiDelete(url)
      setSuccessMessage('Event deleted successfully')
      await fetchEvents(currentPage)
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error: any) {
      console.error('Error deleting event:', error)
      console.log('Error response status:', error.response?.status)
      console.log('Error response data:', error.response?.data)
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        const errorData = error.response.data
        console.log('409 Error data:', errorData)
        if (errorData.hasScores) {
          // Ask user if they want to force delete
          const forceConfirm = confirm(
            `This event contains ${errorData.scoresCount} scores and cannot be deleted normally.\n\n` +
            `Do you want to DELETE ALL DATA associated with this event?\n` +
            `This will permanently remove:\n` +
            `- All participant scores\n` +
            `- All competitions\n` +
            `- The event itself\n\n` +
            `This action cannot be undone!`
          )
          
          if (forceConfirm) {
            // Recursively call with forceDelete = true
            return handleDelete(eventId, true)
          }
        } else {
          setErrorMessage(errorData.error || 'Cannot delete event with existing data')
        }
      } else if (error.response?.status === 404) {
        setErrorMessage('Event not found')
      } else {
        setErrorMessage('Failed to delete event. Please try again.')
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000)
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

  const openImportModal = () => {
    setImportFile(null)
    setImportProgress(null)
    setIsImportModalOpen(true)
  }

  const handleImportFile = async () => {
    if (!importFile) return

    // Validate required event name
    if (!importEventData.eventName.trim()) {
      setImportProgress({ step: 'Error: Event name is required', progress: 0 })
      return
    }

    setImportProgress({ step: 'Parsing XML file...', progress: 10 })
    
    try {
      const formData = new FormData()
      formData.append('xmlFile', importFile)
      
      // Add event information to FormData
      formData.append('eventName', importEventData.eventName.trim())
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
        setImportProgress({ step: 'Processing and inserting data into database...', progress: 70 })
        
        // Display the extracted data if available
        if (result.extractedData) {
          const { clubs, competitions, participants, devices } = result.extractedData
          let summary = '\n\n📊 Extracted Data Summary:\n'
          
          if (clubs.length > 0) {
            summary += `\n🏛️ Clubs (${clubs.length}):\n`
            clubs.slice(0, 3).forEach((club: any) => {
              summary += `  • ${club.name || 'Unnamed Club'} ${club.code ? `(${club.code})` : ''}\n`
            })
            if (clubs.length > 3) summary += `  ... and ${clubs.length - 3} more\n`
          }
          
          if (competitions.length > 0) {
            summary += `\n🏆 Competitions (${competitions.length}):\n`
            competitions.slice(0, 3).forEach((comp: any) => {
              summary += `  • ${comp.name || 'Unnamed Competition'} ${comp.date ? `(${comp.date})` : ''}\n`
            })
            if (competitions.length > 3) summary += `  ... and ${competitions.length - 3} more\n`
          }
          
          if (participants.length > 0) {
            summary += `\n👥 Participants (${participants.length}):\n`
            participants.slice(0, 3).forEach((p: any) => {
              const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed Participant'
              summary += `  • ${name} ${p.gender ? `(${p.gender})` : ''}\n`
            })
            if (participants.length > 3) summary += `  ... and ${participants.length - 3} more\n`
          }
          
          if (devices.length > 0) {
            summary += `\n🤸 Devices/Apparatus (${devices.length}):\n`
            devices.slice(0, 3).forEach((d: any) => {
              summary += `  • ${d.name || 'Unnamed Device'} ${d.code ? `(${d.code})` : ''}\n`
            })
            if (devices.length > 3) summary += `  ... and ${devices.length - 3} more\n`
          }

          // Add database insertion results if available
          if (result.insertionResults) {
            const { clubs: clubResults, participants: participantResults, competitions: compResults, devices: deviceResults } = result.insertionResults
            summary += '\n\n💾 Database Import Results:\n'
            summary += `  🏛️ Clubs: ${clubResults.inserted} new, ${clubResults.updated} updated, ${clubResults.errors} errors\n`
            summary += `  👥 Participants: ${participantResults.inserted} new, ${participantResults.updated} updated, ${participantResults.errors} errors\n`
            summary += `  🏆 Competitions: ${compResults.inserted} new, ${compResults.updated} updated, ${compResults.errors} errors\n`
            summary += `  🤸 Disciplines: ${deviceResults.inserted} new, ${deviceResults.updated} updated, ${deviceResults.errors} errors`
          }

          // Add event creation info if available
          if (result.createdEvent) {
            summary = `\n🎪 Event Created: "${result.createdEvent.name}" (ID: ${result.createdEvent.id})${summary}`
          }
          
          // Update the progress message with the summary
          setImportProgress({ 
            step: `Import completed successfully! ${summary}`, 
            progress: 100 
          })
        } else {
          // Fallback if no extracted data
          setImportProgress({ step: 'Import completed successfully!', progress: 100 })
        }
        
        setTimeout(() => {
          setIsImportModalOpen(false)
          setImportProgress(null)
          // Reset import event data for next import
          setImportEventData({
            eventName: '',
            startDate: '',
            endDate: '',
            location: '',
            description: ''
          })
          fetchEvents(currentPage) // Reload events
        }, 8000) // Extended timeout to let user read the summary
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      console.error('Import error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setImportProgress({ step: `Import failed: ${errorMessage}`, progress: 0 })
    }
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
      {activeView === 'list' ? (
        <div>
          <UnifiedHeader
            title="Event Management"
            description={`Manage gymnastics events and competitions (${events.length} events loaded)`}
            icon={CalendarDaysIcon}
            stateInfo={getEventStateInfo()}
            selectedState={selectedStatus}
            onStateChange={setSelectedStatus}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search events..."
            filterOptions={getFilterOptions()}
            onClearAllFilters={handleClearAllFilters}
            onExportCSV={handleExportCSV}
            showHomeButton={true}
            homeUrl="/dashboard"
            primaryAction={{
              label: 'Add Event',
              icon: PlusIcon,
              onClick: openCreateModal
            }}
            secondaryAction={{
              label: 'Import from Gymnet',
              icon: DocumentArrowUpIcon,
              onClick: openImportModal
            }}
            totalCount={events.length}
          />

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => setErrorMessage('')}
                    className="text-red-400 hover:text-red-600 focus:outline-none"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

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
        </div>
      ) : (
        <div>
          {/* Event Detail Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <CalendarDaysIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Event: {selectedEvent?.var_eventname}
                </h1>
                <p className="text-gray-600 mt-2">
                  View participants and scores for this event
                </p>
              </div>
              <button
                onClick={handleBackToList}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <span>← Back to Events</span>
              </button>
            </div>
          </div>
          
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
                            <tr key={participant.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {participant.firstname} {participant.lastname}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {participant.club}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  participant.gender === 'male' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-pink-100 text-pink-800'
                                }`}>
                                  {participant.gender === 'male' ? 'Male' : 'Female'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {participant.age ? `${participant.age} years` : 'N/A'}
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

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Import Event from DTB Gymnet
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Gymnet XML File
                  </label>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select a DTB Gymnet XML export file to import event data, competitions, disciplines, and participants.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-3">Event Information</h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Since GymNet XML files don't contain overall event information, please provide the event details:
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Event Name *
                      </label>
                      <input
                        type="text"
                        value={importEventData.eventName}
                        onChange={(e) => setImportEventData({...importEventData, eventName: e.target.value})}
                        placeholder="e.g., District Championships 2024"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={importEventData.startDate}
                          onChange={(e) => setImportEventData({...importEventData, startDate: e.target.value})}
                          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-800 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={importEventData.endDate}
                          onChange={(e) => setImportEventData({...importEventData, endDate: e.target.value})}
                          className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={importEventData.location}
                        onChange={(e) => setImportEventData({...importEventData, location: e.target.value})}
                        placeholder="e.g., Sports Hall Munich"
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        Description
                      </label>
                      <textarea
                        value={importEventData.description}
                        onChange={(e) => setImportEventData({...importEventData, description: e.target.value})}
                        placeholder="Optional additional information about the event"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {importProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-start text-sm text-gray-700">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed max-w-md">{importProgress.step}</pre>
                      <span className="ml-2">{importProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          importProgress.progress === 0 ? 'bg-red-500' : 
                          importProgress.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.max(importProgress.progress, 5)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Import Information</h4>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• Event information will be extracted and created</li>
                    <li>• Competitions and disciplines will be imported</li>
                    <li>• Participants will be added to the database</li>
                    <li>• Existing clubs will be updated if found</li>
                    <li>• Existing participants will be updated if found</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsImportModalOpen(false)
                      // Reset import event data when canceling
                      setImportEventData({
                        eventName: '',
                        startDate: '',
                        endDate: '',
                        location: '',
                        description: ''
                      })
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={importProgress !== null}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFile}
                    disabled={!importFile || !importEventData.eventName.trim() || importProgress !== null}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {importProgress ? 'Importing...' : 'Import Event'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Events
