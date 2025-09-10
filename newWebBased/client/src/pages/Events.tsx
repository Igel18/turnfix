import React, { useState, useEffect } from 'react'
import {
  CalendarDaysIcon,
  MapPinIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { DatabaseManagementTemplate } from '@/components/DatabaseManagementTemplate'
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
  club_count?: number
  status: 'upcoming' | 'active' | 'completed'
}

interface Venue {
  int_wettkampforteid: number
  var_name: string
  var_adresse?: string
  var_plz?: string
  var_ort?: string
}

const Events: React.FC = () => {
  // State management
  const [events, setEvents] = useState<Event[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<{ step: string; progress: number } | null>(null)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
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

  // Filter configuration for DatabaseManagementTemplate
  const getFilterConfig = () => [
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
  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '1000', // Load all events
        offset: '0'
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
      // Total pages handled by template
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch venues for location dropdown
  const fetchVenues = async () => {
    try {
      const data = await apiGet('/venues?limit=1000')
      setVenues(data.venues || [])
    } catch (error) {
      console.error('Error fetching venues:', error)
      setVenues([])
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

      console.log('=== CLIENT DEBUG: Saving event ===')
      console.log('Editing event:', editingEvent)
      console.log('Event data being sent:', eventData)
      console.log('Form data state:', formData)

      let response
      if (editingEvent) {
        console.log(`Making PUT request to /events/${editingEvent.int_eventid}`)
        response = await apiPut(`/events/${editingEvent.int_eventid}`, eventData)
      } else {
        console.log('Making POST request to /events')
        response = await apiPost('/events', eventData)
      }

      console.log('=== CLIENT DEBUG: Server response ===')
      console.log('Response:', response)

      console.log('=== CLIENT DEBUG: Refreshing events list ===')
      await fetchEvents()
      setIsModalOpen(false)
      resetForm()
      console.log('=== CLIENT DEBUG: Save operation completed ===')
    } catch (error) {
      console.error('Error saving event:', error)
    }
  }

  // Delete event
  const handleDelete = async (eventId: number, forceDelete = false) => {
    if (!forceDelete && !confirm('Are you sure you want to delete this event?')) return

    setErrorMessage('')

    try {
      const url = forceDelete ? `/events/${eventId}?force=true` : `/events/${eventId}`
      await apiDelete(url)
      await fetchEvents()
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
    fetchVenues() // Load venues for dropdown
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
    fetchVenues() // Load venues for dropdown
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
          fetchEvents() // Reload events
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

  useEffect(() => {
    fetchEvents()
  }, [searchTerm, selectedStatus])

  // Card render function
  const renderCard = (event: Event) => {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {event.var_eventname}
            </h3>
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
            <MapPinIcon className="h-4 w-4 mr-2" />
            <span>{event.club_count || 0} clubs</span>
          </div>

          {event.var_description && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-sm text-gray-600 line-clamp-2">
                {event.var_description}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-2">
          <button
            onClick={() => openEditModal(event)}
            className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <PencilIcon className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => handleDelete(event.int_eventid)}
            className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <DatabaseManagementTemplate
          title="Event Management"
          subtitle={`Manage gymnastics events and competitions (${events.length} events loaded)`}
          icon={CalendarDaysIcon}
          data={events}
          isLoading={isLoading}
          error={errorMessage}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search events..."
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          filterOptions={getFilterConfig()}
          onClearAllFilters={handleClearAllFilters}
          onExportCSV={handleExportCSV}
          viewStorageKey="events"
          defaultView="table"
          onAdd={openCreateModal}
          addLabel="Add Event"
          onEdit={openEditModal}
          onDelete={(event) => handleDelete(event.int_eventid)}
          renderTableHeaders={() => (
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participants
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Clubs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          )}
          renderTableRow={(event: Event) => (
            <tr key={event.int_eventid} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="font-medium text-gray-900">{event.var_eventname}</div>
                  {event.var_description && (
                    <div className="text-sm text-gray-500 line-clamp-1">{event.var_description}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div>{formatDate(event.dat_eventstartdate)}</div>
                {event.dat_eventstartdate !== event.dat_eventenddate && (
                  <div className="text-gray-500">to {formatDate(event.dat_eventenddate)}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm">
                  <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {event.var_location}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm">
                  <UsersIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {event.participant_count}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm">
                  <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                  {event.club_count || 0} clubs
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(event)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event.int_eventid)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          )}
          renderCard={renderCard}
          additionalContent={
            <div className="mt-4">
              <button
                onClick={openImportModal}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Import from Gymnet
              </button>
            </div>
          }
        />

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
                  <select
                    required
                    value={formData.var_location}
                    onChange={(e) => setFormData({ ...formData, var_location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a venue...</option>
                    {venues.map((venue) => (
                      <option key={venue.int_wettkampforteid} value={venue.var_name}>
                        {venue.var_name}
                        {venue.var_ort && ` (${venue.var_ort})`}
                      </option>
                    ))}
                  </select>
                  {venues.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      No venues found. You can manage venues in Database Management → Manage Locations.
                    </p>
                  )}
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
