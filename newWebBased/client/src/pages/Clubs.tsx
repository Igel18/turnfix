import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { exportToCSV, getClubCSVData } from '@/utils/csvExport'

interface Club {
  int_vereineid: number
  var_name: string
  var_website?: string
  int_gaueid: number
  int_personenid?: number
  int_start_ort: number
  gaue_name?: string
  var_vorname?: string
  var_nachname?: string
  var_email?: string
  var_telefon?: string
  athlete_count: number
}

interface Region {
  id: number
  name: string
}

interface Contact {
  int_personenid: number
  var_vorname: string
  var_nachname: string
  var_email?: string
  var_telefon?: string
}

export function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<number | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Form state
  const [formData, setFormData] = useState({
    var_name: '',
    var_website: '',
    int_gaueid: '',
    int_personenid: '',
    int_start_ort: '0'
  })

  // Helper functions for unified header
  const getClubStateInfo = (): StateInfo[] => {
    const activeClubs = clubs.filter(club => club.athlete_count > 0).length
    const inactiveClubs = clubs.filter(club => club.athlete_count === 0).length
    const withContact = clubs.filter(club => club.var_email || club.var_telefon).length

    return [
      {
        value: 'active',
        label: 'Active',
        count: activeClubs,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'inactive',
        label: 'Inactive',
        count: inactiveClubs,
        color: 'bg-gray-100 text-gray-800'
      },
      {
        value: 'with_contact',
        label: 'With Contact',
        count: withContact,
        color: 'bg-blue-100 text-blue-800'
      }
    ]
  }

  const getFilterOptions = () => [
    {
      label: 'Region',
      value: 'region',
      options: regions.map(region => ({
        value: region.id.toString(),
        label: region.name
      })),
      selectedValue: selectedRegion.toString(),
      onChange: (value: string) => setSelectedRegion(value === '' ? '' : parseInt(value))
    }
  ]

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedRegion('')
    setSelectedStatus('')
  }

  const handleExportCSV = () => {
    const csvData = getClubCSVData(clubs)
    exportToCSV(csvData)
  }

  // Fetch clubs with pagination and filters
  const fetchClubs = async (page = 1) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '10',
        offset: ((page - 1) * 10).toString()
      })
      
      if (searchTerm) params.append('search', searchTerm)
      if (selectedRegion) params.append('gaue_id', selectedRegion.toString())

      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clubs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClubs(data.clubs)
        setTotalPages(Math.ceil(data.pagination.total / 10))
      }
    } catch (error) {
      console.error('Error fetching clubs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch regions for dropdown
  const fetchRegions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/clubs/data/gaue', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRegions(data)
      }
    } catch (error) {
      console.error('Error fetching regions:', error)
    }
  }

  // Fetch contacts/persons for dropdown
  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/clubs/data/personen', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  // Create or update club
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const url = editingClub 
        ? `/api/clubs/${editingClub.int_vereineid}`
        : '/api/clubs'
      
      const method = editingClub ? 'PUT' : 'POST'
      
      const requestBody = {
        var_name: formData.var_name,
        var_website: formData.var_website || null,
        int_gaueid: parseInt(formData.int_gaueid) || 1,
        int_personenid: formData.int_personenid ? parseInt(formData.int_personenid) : null,
        int_start_ort: parseInt(formData.int_start_ort) || 0
      }
      
      console.log('Sending club data:', requestBody);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        await fetchClubs(currentPage)
        setIsModalOpen(false)
        resetForm()
      } else {
        const errorData = await response.text()
        console.error('Error response:', response.status, errorData)
      }
    } catch (error) {
      console.error('Error saving club:', error)
    }
  }

  // Delete club
  const handleDelete = async (clubId: number) => {
    if (!confirm('Are you sure you want to delete this club?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/clubs/${clubId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchClubs(currentPage)
      }
    } catch (error) {
      console.error('Error deleting club:', error)
    }
  }

  const resetForm = () => {
    setFormData({ 
      var_name: '', 
      var_website: '', 
      int_gaueid: '',
      int_personenid: '',
      int_start_ort: '0'
    })
    setEditingClub(null)
  }

  const openEditModal = (club: Club) => {
    setEditingClub(club)
    setFormData({
      var_name: club.var_name,
      var_website: club.var_website || '',
      int_gaueid: club.int_gaueid.toString(),
      int_personenid: club.int_personenid?.toString() || '',
      int_start_ort: club.int_start_ort.toString()
    })
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  useEffect(() => {
    fetchClubs(currentPage)
  }, [searchTerm, selectedRegion, currentPage])

  useEffect(() => {
    fetchRegions()
    fetchContacts()
  }, [])

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Club Management"
        description="Manage gymnastics clubs and associations"
        icon={BuildingOfficeIcon}
        stateInfo={getClubStateInfo()}
        selectedState={selectedStatus}
        onStateChange={setSelectedStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search clubs..."
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={handleExportCSV}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'Add Club',
          icon: PlusIcon,
          onClick: openCreateModal
        }}
        totalCount={clubs.length}
      />

      {/* Clubs Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading clubs...</p>
          </div>
        ) : clubs.length === 0 ? (
          <div className="p-6 text-center">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No clubs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Club Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Person
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Website
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Athletes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clubs.map((club) => (
                  <tr key={club.int_vereineid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{club.var_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {club.gaue_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {club.var_vorname && club.var_nachname ? (
                        <div>
                          <div className="font-medium">{club.var_vorname} {club.var_nachname}</div>
                          {club.var_email && (
                            <div className="text-xs text-gray-500">{club.var_email}</div>
                          )}
                          {club.var_telefon && (
                            <div className="text-xs text-gray-500">{club.var_telefon}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No contact</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {club.var_website ? (
                        <a 
                          href={club.var_website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      ) : (
                        <span className="text-gray-400">No website</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {club.athlete_count} athletes
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(club)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(club.int_vereineid)}
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
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingClub ? 'Edit Club' : 'Add New Club'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Club Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.var_name}
                    onChange={(e) => setFormData({ ...formData, var_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter club name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.var_website}
                    onChange={(e) => setFormData({ ...formData, var_website: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Region *
                  </label>
                  <select
                    required
                    value={formData.int_gaueid}
                    onChange={(e) => setFormData({ ...formData, int_gaueid: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a region</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <select
                    value={formData.int_personenid}
                    onChange={(e) => setFormData({ ...formData, int_personenid: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No contact person</option>
                    {contacts.map((contact) => (
                      <option key={contact.int_personenid} value={contact.int_personenid}>
                        {contact.var_vorname} {contact.var_nachname}
                        {contact.var_email && ` (${contact.var_email})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Location Code
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.int_start_ort}
                    onChange={(e) => setFormData({ ...formData, int_start_ort: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Location code for competition start order (usually 0)
                  </p>
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
                    {editingClub ? 'Update' : 'Create'} Club
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

export default Clubs
