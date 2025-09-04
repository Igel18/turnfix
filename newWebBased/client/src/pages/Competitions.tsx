import React, { useState, useEffect } from 'react';
import { 
  MapPinIcon, 
  TrophyIcon,
  CalendarIcon,
  UsersIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import UnifiedPageHeader from '@/components/UnifiedPageHeader';

interface Competition {
  int_eventid: number;
  var_eventname: string;
  var_description?: string;
  dat_eventstartdate: string;
  dat_eventenddate: string;
  var_location?: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'MIXED';
  status: 'upcoming' | 'active' | 'completed';
  maxParticipants?: number;
  registrationDeadline?: string;
  isPublic: boolean;
  participant_count: number;
  createdAt: string;
}

interface CompetitionFormData {
  var_eventname: string;
  var_description: string;
  dat_eventstartdate: string;
  dat_eventenddate: string;
  var_location: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'MIXED';
  maxParticipants: string;
  registrationDeadline: string;
  isPublic: boolean;
}

const Competitions: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [formData, setFormData] = useState<CompetitionFormData>({
    var_eventname: '',
    var_description: '',
    dat_eventstartdate: '',
    dat_eventenddate: '',
    var_location: '',
    type: 'INDIVIDUAL',
    maxParticipants: '',
    registrationDeadline: '',
    isPublic: true
  });

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const competitionTypes = [
    { value: 'INDIVIDUAL', label: 'Individual Competition' },
    { value: 'TEAM', label: 'Team Competition' },
    { value: 'MIXED', label: 'Mixed Competition' }
  ]

  const statusOptions = [
    { value: 'upcoming', label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
    { value: 'active', label: 'Active', color: 'bg-green-100 text-green-800' },
    { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' }
  ]

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Determine competition status based on dates
  const getCompetitionStatus = (startDate: string, endDate: string): 'upcoming' | 'active' | 'completed' => {
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

  // Fetch competitions with pagination and filters
  const fetchCompetitions = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '10',
        offset: ((page - 1) * 10).toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (selectedStatus) params.append('status', selectedStatus)
      if (selectedMonth) {
        const monthIndex = months.indexOf(selectedMonth) + 1
        params.append('month', monthIndex.toString())
      }

      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/events?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Add status to each competition based on dates
        const competitionsWithStatus = data.events.map((comp: any) => ({
          ...comp,
          status: getCompetitionStatus(comp.dat_eventstartdate, comp.dat_eventenddate)
        }))
        setCompetitions(competitionsWithStatus)
        setTotalPages(Math.ceil(data.pagination.total / 10))
      }
    } catch (error) {
      console.error('Error fetching competitions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Create or update competition
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const url = editingCompetition 
        ? `http://localhost:3001/api/events/${editingCompetition.int_eventid}`
        : 'http://localhost:3001/api/events'
      
      const method = editingCompetition ? 'PUT' : 'POST'
      
      // Prepare submission data with proper types
      const submissionData = {
        var_eventname: formData.var_eventname,
        dat_eventstartdate: formData.dat_eventstartdate,
        dat_eventenddate: formData.dat_eventenddate,
        var_location: formData.var_location,
        var_description: formData.var_description || null,
        type: formData.type,
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        registrationDeadline: formData.registrationDeadline || null,
        isPublic: formData.isPublic
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      })

      if (response.ok) {
        await fetchCompetitions(currentPage)
        setIsModalOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving competition:', error)
    }
  }

  // Delete competition
  const handleDelete = async (competitionId: number) => {
    if (!confirm('Are you sure you want to delete this competition?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`http://localhost:3001/api/events/${competitionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchCompetitions(currentPage)
      }
    } catch (error) {
      console.error('Error deleting competition:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      var_eventname: '',
      dat_eventstartdate: '',
      dat_eventenddate: '',
      var_location: '',
      var_description: '',
      type: 'INDIVIDUAL' as 'INDIVIDUAL' | 'TEAM' | 'MIXED',
      maxParticipants: '',
      registrationDeadline: '',
      isPublic: true
    })
    setEditingCompetition(null)
  }

  const openEditModal = (competition: Competition) => {
    setEditingCompetition(competition)
    setFormData({
      var_eventname: competition.var_eventname,
      dat_eventstartdate: competition.dat_eventstartdate.split('T')[0],
      dat_eventenddate: competition.dat_eventenddate.split('T')[0],
      var_location: competition.var_location || '',
      var_description: competition.var_description || '',
      type: competition.type || 'INDIVIDUAL',
      maxParticipants: competition.maxParticipants?.toString() || '',
      registrationDeadline: competition.registrationDeadline?.split('T')[0] || '',
      isPublic: competition.isPublic !== false
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

  // Helper functions for unified header
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
    },
    {
      label: 'Month',
      value: 'month',
      options: months.map(month => ({
        value: month,
        label: month
      })),
      selectedValue: selectedMonth,
      onChange: setSelectedMonth
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedStatus('')
    setSelectedMonth('')
  }

  const handleExportCSV = () => {
    // Simple CSV export for now
    const csvContent = [
      ['Name', 'Start Date', 'End Date', 'Location', 'Status', 'Participants'].join(','),
      ...competitions.map(comp => [
        `"${comp.var_eventname}"`,
        `"${formatDate(comp.dat_eventstartdate)}"`,
        `"${formatDate(comp.dat_eventenddate)}"`,
        `"${comp.var_location || ''}"`,
        `"${statusOptions.find(s => s.value === comp.status)?.label || comp.status}"`,
        comp.participant_count
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `competitions_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    fetchCompetitions(currentPage)
  }, [searchTerm, selectedStatus, selectedMonth, currentPage])

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedPageHeader
        title="Competition Management"
        subtitle="Organize and manage gymnastics competitions"
        icon={TrophyIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search competitions..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        showExportCSV={true}
        onExportCSV={handleExportCSV}
        showAdd={true}
        addLabel="Add Competition"
        onAdd={openCreateModal}
        totalCount={competitions.length}
        showEventContext={true}
      />

      {/* Competitions Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading competitions...</p>
          </div>
        ) : competitions.length === 0 ? (
          <div className="p-6 text-center">
            <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No competitions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Competition
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
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {competitions.map((competition) => (
                  <tr key={competition.int_eventid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {competition.var_eventname}
                      </div>
                      {competition.var_description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {competition.var_description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <div>
                          <div className="text-sm">{formatDate(competition.dat_eventstartdate)}</div>
                          {competition.dat_eventstartdate !== competition.dat_eventenddate && (
                            <div className="text-xs text-gray-500">to {formatDate(competition.dat_eventenddate)}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {competition.var_location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <UsersIcon className="h-4 w-4 mr-2" />
                        {competition.participant_count} participants
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(competition.status)}`}>
                        {statusOptions.find(s => s.value === competition.status)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(competition)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(competition.int_eventid)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingCompetition ? 'Edit Competition' : 'Add New Competition'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_eventname}
                    onChange={(e) => setFormData({ ...formData, var_eventname: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter competition name"
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
                    placeholder="Competition venue"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Competition Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'INDIVIDUAL' | 'TEAM' | 'MIXED' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {competitionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Participants
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Leave empty for unlimited"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional: Set a limit on participants</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Registration Deadline
                    </label>
                    <input
                      type="date"
                      value={formData.registrationDeadline}
                      onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                      max={formData.dat_eventstartdate || undefined}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional: Deadline for registration</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Public Competition (visible for registration)
                  </label>
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
                    {editingCompetition ? 'Update' : 'Create'} Competition
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

export default Competitions
