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
  HomeIcon,
  DocumentArrowDownIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'
import { setupPDFWithHeaderFooter } from '../utils/pdfUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  // PDF Label Configuration Modal State
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelConfig, setLabelConfig] = useState({
    rows: 8,
    columns: 4,
    width: 48.5, // mm
    height: 16.9, // mm
    marginTop: 15, // mm
    marginLeft: 10, // mm
    marginRight: 10, // mm
    marginBottom: 15, // mm
    showBorders: true
  })

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

  // PDF Export Functions
  const exportParticipantsListPDF = () => {
    if (!selectedEvent || eventParticipants.length === 0) {
      alert('No participants to export')
      return
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const contentArea = setupPDFWithHeaderFooter(doc, selectedEvent, 'Participants List')
    
    // Prepare data for the table
    const tableData = eventParticipants.map((participant, index) => [
      (index + 1).toString(),
      `${participant.var_vorname} ${participant.var_nachname}`,
      participant.vereins_name,
      participant.var_geschlecht === 'M' ? 'Male' : 'Female',
      (new Date().getFullYear() - new Date(participant.dat_geburtsdatum).getFullYear()).toString(),
      new Date(participant.dat_geburtsdatum).toLocaleDateString('de-DE')
    ])

    autoTable(doc, {
      head: [['#', 'Name', 'Club', 'Gender', 'Age', 'Birth Date']],
      body: tableData,
      startY: contentArea.startY + 10,
      margin: { left: 10, right: 10 },
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 135, 245],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `participants-list-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`
    
    doc.save(filename)
  }

  const exportParticipantsLabelsPDF = () => {
    if (!selectedEvent || eventParticipants.length === 0) {
      alert('No participants to export')
      return
    }

    const config = labelConfig
    const doc = new jsPDF('p', 'mm', 'a4')
    
    // A4 dimensions: 210 x 297 mm
    const pageWidth = 210
    const pageHeight = 297
    
    // Calculate available area for labels
    const availableWidth = pageWidth - config.marginLeft - config.marginRight
    const availableHeight = pageHeight - config.marginTop - config.marginBottom
    
    // Calculate actual label dimensions including spacing
    const labelWidth = availableWidth / config.columns
    const labelHeight = availableHeight / config.rows
    
    let currentPage = 1
    let currentRow = 0
    let currentCol = 0
    
    eventParticipants.forEach((participant, index) => {
      // Check if we need a new page
      if (index > 0 && currentRow === 0 && currentCol === 0) {
        doc.addPage()
        currentPage++
      }
      
      // Calculate position
      const x = config.marginLeft + (currentCol * labelWidth)
      const y = config.marginTop + (currentRow * labelHeight)
      
      // Draw border if enabled
      if (config.showBorders) {
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.1)
        doc.rect(x, y, labelWidth, labelHeight)
      }
      
      // Add participant information
      const name = `${participant.var_vorname} ${participant.var_nachname}`
      const club = participant.vereins_name
      const birthYear = new Date(participant.dat_geburtsdatum).getFullYear().toString()
      const gender = participant.var_geschlecht === 'M' ? 'M' : 'W'
      
      // Set font for label content
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      
      // Name (top of label)
      const nameY = y + 4
      doc.text(name, x + 2, nameY, { maxWidth: labelWidth - 4 })
      
      // Club and details
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      const clubY = nameY + 4
      doc.text(club, x + 2, clubY, { maxWidth: labelWidth - 4 })
      
      // Birth year and gender
      const detailsY = clubY + 3
      doc.text(`${birthYear} (${gender})`, x + 2, detailsY)
      
      // Event name (bottom of label)
      if (selectedEvent.var_eventname.length > 0) {
        doc.setFontSize(7)
        const eventY = y + labelHeight - 2
        doc.text(selectedEvent.var_eventname, x + 2, eventY, { maxWidth: labelWidth - 4 })
      }
      
      // Move to next position
      currentCol++
      if (currentCol >= config.columns) {
        currentCol = 0
        currentRow++
        if (currentRow >= config.rows) {
          currentRow = 0
        }
      }
    })
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `participants-labels-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`
    
    doc.save(filename)
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Event Participants</h3>
                    {eventParticipants.length > 0 && (
                      <div className="flex space-x-2">
                        <button
                          onClick={exportParticipantsListPDF}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                          Export List PDF
                        </button>
                        <button
                          onClick={() => setShowLabelModal(true)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <TagIcon className="h-4 w-4 mr-2" />
                          Export Labels PDF
                        </button>
                      </div>
                    )}
                  </div>
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

      {/* Label Configuration Modal */}
      {showLabelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Label Configuration</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rows
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={labelConfig.rows}
                    onChange={(e) => setLabelConfig({ ...labelConfig, rows: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Columns
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={labelConfig.columns}
                    onChange={(e) => setLabelConfig({ ...labelConfig, columns: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label Width (mm)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    step="0.1"
                    value={labelConfig.width}
                    onChange={(e) => setLabelConfig({ ...labelConfig, width: parseFloat(e.target.value) || 48.5 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label Height (mm)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    step="0.1"
                    value={labelConfig.height}
                    onChange={(e) => setLabelConfig({ ...labelConfig, height: parseFloat(e.target.value) || 16.9 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Top Margin (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginTop}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginTop: parseFloat(e.target.value) || 15 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bottom Margin (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginBottom}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginBottom: parseFloat(e.target.value) || 15 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Left Margin (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginLeft}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginLeft: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Right Margin (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={labelConfig.marginRight}
                    onChange={(e) => setLabelConfig({ ...labelConfig, marginRight: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showBorders"
                  checked={labelConfig.showBorders}
                  onChange={(e) => setLabelConfig({ ...labelConfig, showBorders: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showBorders" className="ml-2 block text-sm text-gray-900">
                  Show label borders (for alignment)
                </label>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Preview Info</h4>
                <p className="text-sm text-gray-600">
                  Layout: {labelConfig.rows} × {labelConfig.columns} labels per page<br/>
                  Label size: {labelConfig.width} × {labelConfig.height} mm<br/>
                  Total labels per page: {labelConfig.rows * labelConfig.columns}<br/>
                  Pages needed: {Math.ceil(eventParticipants.length / (labelConfig.rows * labelConfig.columns))}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  exportParticipantsLabelsPDF()
                  setShowLabelModal(false)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export Labels PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreateEvent;
