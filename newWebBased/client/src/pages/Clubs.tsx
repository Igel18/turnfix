import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'
import { UnifiedHeader } from '../components/UnifiedHeader'
import { UnifiedDataView } from '../components/UnifiedDataView'
import type { StateInfo } from '../components/UnifiedHeader'

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

interface FormData {
  var_name: string
  var_website: string
  int_gaueid: string
  int_personenid: string
  int_start_ort: string
}

export function Clubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegion, setSelectedRegion] = useState<number | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [viewType, setViewType] = useState<'table' | 'cards'>('cards')
  const [activeTab, setActiveTab] = useState('info')
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [formData, setFormData] = useState<FormData>({
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
        value: 'with-contact',
        label: 'With Contact',
        count: withContact,
        color: 'bg-blue-100 text-blue-800'
      }
    ]
  }

  // Fetch clubs with search and pagination
  const fetchClubs = async (page: number = 1) => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRegion && { region: selectedRegion.toString() }),
        ...(selectedStatus && { status: selectedStatus })
      })

      const response = await fetch(`/api/clubs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClubs(data.clubs || [])
        setTotalPages(data.pagination?.totalPages || 1)
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
      const response = await fetch('/api/regions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRegions(data.regions || [])
      }
    } catch (error) {
      console.error('Error fetching regions:', error)
    }
  }

  // Fetch contacts for dropdown
  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/contacts', {
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
      
      console.log('Sending club data:', requestBody)
      
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
    <div className="space-y-6">
      {/* Page Header with Add Button */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
            <BuildingOfficeIcon className="h-8 w-8 mr-3" />
            Clubs
          </h1>
          <p className="text-gray-600">
            Manage gymnastics clubs, their contact information, and regional assignments
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Club
        </button>
      </div>

      <UnifiedHeader
        title="Clubs"
        description="Manage gymnastics clubs, their contact information, and regional assignments"
        icon={BuildingOfficeIcon}
        
        // Search functionality
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search clubs by name..."
        
        // State info badges
        stateInfo={getClubStateInfo()}
        selectedState={selectedStatus}
        onStateChange={setSelectedStatus}
        
        // Clear filters and export
        onClearAllFilters={() => {
          setSearchTerm('')
          setSelectedRegion('')
          setSelectedStatus('')
        }}
        onExportCSV={() => console.log('Export CSV functionality to be implemented')}
        
        // Filter options
        filterOptions={[
          {
            label: 'Region',
            value: 'region',
            selectedValue: selectedRegion.toString(),
            onChange: (value) => setSelectedRegion(value === '' ? '' : parseInt(value)),
            options: [
              { value: '', label: 'All Regions' },
              ...regions.map(region => ({ 
                value: region.id.toString(), 
                label: region.name 
              }))
            ]
          }
        ]}
      />

      {/* Unified Data View */}
      <UnifiedDataView
        items={clubs}
        selectedItem={selectedClub}
        isLoading={isLoading}
        viewType={viewType}
        onViewTypeChange={setViewType}
        onSelectItem={(club) => setSelectedClub(club as Club)}
        
        // Card rendering
        renderCard={(club) => (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {club.var_name}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    <span>{club.gaue_name || 'No region'}</span>
                  </div>
                  
                  {club.var_vorname && club.var_nachname && (
                    <div className="flex items-center text-sm text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      <span>{club.var_vorname} {club.var_nachname}</span>
                    </div>
                  )}
                  
                  {club.var_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      <span>{club.var_email}</span>
                    </div>
                  )}
                  
                  {club.var_telefon && (
                    <div className="flex items-center text-sm text-gray-600">
                      <PhoneIcon className="h-4 w-4 mr-2" />
                      <span>{club.var_telefon}</span>
                    </div>
                  )}
                  
                  {club.var_website && (
                    <div className="flex items-center text-sm text-gray-600">
                      <GlobeAltIcon className="h-4 w-4 mr-2" />
                      <a 
                        href={club.var_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {club.athlete_count} athletes
                </span>
              </div>
            </div>
          </div>
        )}
        
        // Table configuration
        tableHeaders={['Club Name', 'Region', 'Contact Person', 'Website', 'Athletes']}
        renderTableRow={(club) => (
          <>
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
          </>
        )}
        
        // Detail view configuration
        selectedItemTabs={[
          {
            id: 'info',
            label: 'Information',
            icon: BuildingOfficeIcon
          },
          {
            id: 'athletes',
            label: 'Athletes',
            icon: UserGroupIcon,
            count: selectedClub?.athlete_count || 0
          }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        
        renderTabContent={(tabId, club) => {
          if (tabId === 'info') {
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Club Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <p className="text-sm text-gray-900">{club.var_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Region</label>
                        <p className="text-sm text-gray-900">{club.gaue_name || 'No region assigned'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Website</label>
                        {club.var_website ? (
                          <a 
                            href={club.var_website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {club.var_website}
                          </a>
                        ) : (
                          <p className="text-sm text-gray-500">No website</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Contact Person</label>
                        <p className="text-sm text-gray-900">
                          {club.var_vorname && club.var_nachname 
                            ? `${club.var_vorname} ${club.var_nachname}`
                            : 'No contact person'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm text-gray-900">{club.var_email || 'No email'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-sm text-gray-900">{club.var_telefon || 'No phone'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          } else if (tabId === 'athletes') {
            return (
              <div className="text-center py-12">
                <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {club.athlete_count} Athletes
                </h3>
                <p className="text-gray-600">
                  Detailed athlete list would be implemented here
                </p>
              </div>
            )
          }
        }}
        
        renderDetailStats={(club) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Club Name</p>
                <p className="text-lg font-semibold text-gray-900">{club.var_name}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <MapPinIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Region</p>
                <p className="text-lg font-semibold text-gray-900">{club.gaue_name || 'No region'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg mr-4">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Athletes</p>
                <p className="text-lg font-semibold text-gray-900">{club.athlete_count}</p>
              </div>
            </div>
          </div>
        )}
        
        // Actions
        actionButtons={[
          {
            icon: PencilIcon,
            onClick: (club) => openEditModal(club as Club),
            className: "text-blue-600 hover:text-blue-800",
            title: "Edit Club"
          },
          {
            icon: TrashIcon,
            onClick: (club) => handleDelete((club as Club).int_vereineid),
            className: "text-red-600 hover:text-red-800",
            title: "Delete Club"
          }
        ]}
        
        // Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        
        // Empty state
        emptyStateIcon={BuildingOfficeIcon}
        emptyStateTitle="No clubs found"
        emptyStateDescription="Try adjusting your search or filter criteria"
      />

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
