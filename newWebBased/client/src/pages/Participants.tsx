import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  CalendarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { exportToCSV, getParticipantCSVData } from '@/utils/csvExport'

interface Participant {
  int_teilnehmerid: number
  var_nachname: string
  var_vorname: string
  dat_geburtstag: string
  int_geschlecht: number
  int_vereineid: number
  verein_name: string
  geschlecht_name: string
  age: number | null
  int_startpassnummer: number | null
}

interface Club {
  int_vereineid: number
  var_name: string
}

export function Participants() {
  const { t } = useTranslation()
  
  const [participants, setParticipants] = useState<Participant[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClub, setSelectedClub] = useState<number | ''>('')
  const [selectedGender, setSelectedGender] = useState<string>('')
  const [selectedAge, setSelectedAge] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form state
  const [formData, setFormData] = useState({
    var_nachname: '',
    var_vorname: '',
    dat_geburtsdatum: '',
    var_geschlecht: '',
    int_vereineid: '',
    int_startpassnummer: ''
  })

  // Age groups for filtering
  const ageGroups = [
    { value: '7-9', label: '7-9 years' },
    { value: '10-12', label: '10-12 years' },
    { value: '13-15', label: '13-15 years' },
    { value: '16-18', label: '16-18 years' },
    { value: '19+', label: '19+ years' }
  ]

  // Helper functions for unified header
  const getParticipantStateInfo = (): StateInfo[] => {
    const activeCount = participants.filter(p => p.age !== null && p.age >= 0).length
    const missingDataCount = participants.filter(p => p.age === null || !p.dat_geburtstag).length
    const licenseCount = participants.filter(p => p.int_startpassnummer !== null).length

    return [
      {
        value: 'active',
        label: 'Active',
        count: activeCount,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'missing_data',
        label: 'Missing Data',
        count: missingDataCount,
        color: 'bg-yellow-100 text-yellow-800'
      },
      {
        value: 'licensed',
        label: 'Licensed',
        count: licenseCount,
        color: 'bg-blue-100 text-blue-800'
      }
    ]
  }

  const getFilterOptions = () => [
    {
      label: 'Club',
      value: 'club',
      options: clubs.map(club => ({
        value: club.int_vereineid.toString(),
        label: club.var_name
      })),
      selectedValue: selectedClub.toString(),
      onChange: (value: string) => {
        setSelectedClub(value === '' ? '' : parseInt(value));
        setCurrentPage(1);
      }
    },
    {
      label: 'Gender',
      value: 'gender',
      options: [
        { value: 'M', label: 'Male' },
        { value: 'W', label: 'Female' }
      ],
      selectedValue: selectedGender,
      onChange: (value: string) => {
        setSelectedGender(value);
        setCurrentPage(1);
      }
    },
    {
      label: 'Age Group',
      value: 'age',
      options: ageGroups,
      selectedValue: selectedAge,
      onChange: (value: string) => {
        setSelectedAge(value);
        setCurrentPage(1);
      }
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedClub('')
    setSelectedGender('')
    setSelectedAge('')
    setSelectedStatus('')
    setCurrentPage(1)
  }

  const handleExportCSV = () => {
    const csvData = getParticipantCSVData(participants)
    exportToCSV(csvData)
  }

  // Fetch participants with pagination and filters
  const fetchParticipants = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '10',
        offset: ((page - 1) * 10).toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (selectedClub) params.append('clubId', selectedClub.toString())
      if (selectedGender) params.append('gender', selectedGender)
      if (selectedAge) {
        const [min, max] = selectedAge.split('-')
        params.append('age_min', min)
        if (max !== '+') params.append('age_max', max)
      }

      console.log('Fetching participants with params:', params.toString());

      const response = await fetch(`/api/participants?${params}`);

      if (response.ok) {
        const data = await response.json()
        setParticipants(data.participants)
        setTotalPages(Math.ceil(data.pagination.total / 10))
      }
    } catch (error) {
      console.error('Error fetching participants:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch clubs for dropdown
  const fetchClubs = async () => {
    try {
      const response = await fetch('/api/clubs?limit=100');
      
      if (response.ok) {
        const data = await response.json()
        setClubs(data.clubs)
      }
    } catch (error) {
      console.error('Error fetching clubs:', error)
    }
  }

  // Create or update participant
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingParticipant 
        ? `/api/participants/${editingParticipant.int_teilnehmerid}`
        : '/api/participants'
      
      const method = editingParticipant ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          var_nachname: formData.var_nachname,
          var_vorname: formData.var_vorname,
          dat_geburtstag: formData.dat_geburtsdatum,
          int_geschlecht: formData.var_geschlecht === 'M' ? 1 : formData.var_geschlecht === 'W' ? 2 : 0,
          int_vereineid: parseInt(formData.int_vereineid) || 0,
          bool_nur_jahr: true,
          int_startpassnummer: formData.int_startpassnummer !== '' ? parseInt(formData.int_startpassnummer) : 0
        })
      })

      if (response.ok) {
        await fetchParticipants(currentPage)
        setIsModalOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving participant:', error)
    }
  }

  // Delete participant
  const handleDelete = async (participantId: number) => {
    if (!confirm('Are you sure you want to delete this participant?')) return

    try {
      const response = await fetch(`/api/participants/${participantId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchParticipants(currentPage)
      }
    } catch (error) {
      console.error('Error deleting participant:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      var_nachname: '',
      var_vorname: '',
      dat_geburtsdatum: '',
      var_geschlecht: '',
      int_vereineid: '',
      int_startpassnummer: ''
    })
    setEditingParticipant(null)
  }

  const openEditModal = (participant: Participant) => {
    setEditingParticipant(participant)
    setFormData({
      var_nachname: participant.var_nachname,
      var_vorname: participant.var_vorname,
      dat_geburtsdatum: participant.dat_geburtstag.split('T')[0], // Format date for input
      var_geschlecht: participant.int_geschlecht === 1 ? 'M' : participant.int_geschlecht === 2 ? 'W' : '',
      int_vereineid: participant.int_vereineid.toString(),
      int_startpassnummer: participant.int_startpassnummer !== null ? participant.int_startpassnummer.toString() : ''
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  useEffect(() => {
    // Add a small delay to prevent rapid API calls when filters change
    const timeoutId = setTimeout(() => {
      fetchParticipants(currentPage)
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedClub, selectedGender, selectedAge, currentPage])

  useEffect(() => {
    fetchClubs()
  }, [])

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title={t('participants.title')}
        description={t('participants.subtitle')}
        icon={UserGroupIcon}
        stateInfo={getParticipantStateInfo()}
        selectedState={selectedStatus}
        onStateChange={setSelectedStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('participants.searchPlaceholder')}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'Add Athlete',
          icon: PlusIcon,
          onClick: openCreateModal
        }}
        totalCount={participants.length}
      />

      {/* Participants Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading athletes...</p>
          </div>
        ) : participants.length === 0 ? (
          <div className="p-6 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No athletes found</p>
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
                    Gender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Age
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Club
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Pass Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {participants.map((participant) => (
                  <tr key={participant.int_teilnehmerid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {participant.var_vorname} {participant.var_nachname}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        participant.int_geschlecht === 1
                          ? 'bg-blue-100 text-blue-800'
                          : participant.int_geschlecht === 2
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}>
                        {participant.int_geschlecht === 1
                          ? 'Male'
                          : participant.int_geschlecht === 2
                            ? 'Female'
                            : participant.geschlecht_name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {participant.age ? `${participant.age} years` : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-600">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                        {participant.verein_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {participant.int_startpassnummer || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(participant)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(participant.int_teilnehmerid)}
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
        <div className="flex justify-center mt-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            
            {/* Smart Pagination: show first, last, current, and nearby pages with ellipsis */}
            {(() => {
              const pages = [];
              const startPage = Math.max(1, currentPage - 2);
              const endPage = Math.min(totalPages, currentPage + 2);

              // Always show first page
              if (startPage > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`px-3 py-2 border rounded-lg ${1 === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    1
                  </button>
                );
                if (startPage > 2) {
                  pages.push(<span key="start-ellipsis" className="px-2">...</span>);
                }
              }

              // Show pages around current
              for (let page = startPage; page <= endPage; page++) {
                pages.push(
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 border rounded-lg ${page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    {page}
                  </button>
                );
              }

              // Always show last page
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="end-ellipsis" className="px-2">...</span>);
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`px-3 py-2 border rounded-lg ${totalPages === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                  >
                    {totalPages}
                  </button>
                );
              }
              return pages;
            })()}
            
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
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingParticipant ? 'Edit Athlete' : 'Add New Athlete'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.var_vorname}
                      onChange={(e) => setFormData({ ...formData, var_vorname: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="First name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.var_nachname}
                      onChange={(e) => setFormData({ ...formData, var_nachname: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Pass Number
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.int_startpassnummer}
                    onChange={(e) => setFormData({ ...formData, int_startpassnummer: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Start pass number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dat_geburtsdatum}
                    onChange={(e) => setFormData({ ...formData, dat_geburtsdatum: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    required
                    value={formData.var_geschlecht}
                    onChange={(e) => setFormData({ ...formData, var_geschlecht: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="W">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Club *
                  </label>
                  <select
                    required
                    value={formData.int_vereineid}
                    onChange={(e) => setFormData({ ...formData, int_vereineid: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a club</option>
                    {clubs.map((club) => (
                      <option key={club.int_vereineid} value={club.int_vereineid}>
                        {club.var_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Removed Birth Year Min and Max fields, not needed since birth date is mandatory */}

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
                    {editingParticipant ? 'Update' : 'Create'} Athlete
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

export default Participants
