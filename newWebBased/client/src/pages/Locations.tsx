import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { UnifiedHeader } from '../components/UnifiedHeader'
import { UnifiedDataView } from '../components/UnifiedDataView'
import useViewToggle from '../hooks/useViewToggle'
import type { StateInfo } from '../components/UnifiedHeader'

interface Location {
  int_wettkampforteid: number
  var_name: string
  var_adresse?: string
  var_plz?: string
  var_ort?: string
}

interface FormData {
  var_name: string
  var_adresse: string
  var_plz: string
  var_ort: string
}

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedState, setSelectedState] = useState('')

  // View toggle with persistence
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: 'locations', 
    defaultView: 'table' 
  })

  const [formData, setFormData] = useState<FormData>({
    var_name: '',
    var_adresse: '',
    var_plz: '',
    var_ort: ''
  })

  // Fetch locations
  const fetchLocations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/venues')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.venues || [])
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter locations based on search and state
  useEffect(() => {
    let filtered = locations

    if (searchTerm) {
      filtered = filtered.filter(location =>
        location.var_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.var_ort?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.var_adresse?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedState) {
      // Filter by state/status based on location properties
      if (selectedState === 'complete') {
        filtered = filtered.filter(location => 
          location.var_name && location.var_ort && location.var_adresse
        )
      } else if (selectedState === 'incomplete') {
        filtered = filtered.filter(location => 
          !location.var_ort || !location.var_adresse
        )
      }
    }

    setFilteredLocations(filtered)
  }, [locations, searchTerm, selectedState])

  // State info for unified header
  const getLocationStateInfo = (): StateInfo[] => {
    const complete = locations.filter(location => 
      location.var_name && location.var_ort && location.var_adresse
    ).length
    const incomplete = locations.filter(location => 
      !location.var_ort || !location.var_adresse
    ).length

    return [
      {
        value: 'complete',
        label: 'Complete',
        count: complete,
        color: 'bg-green-100 text-green-800'
      },
      {
        value: 'incomplete', 
        label: 'Incomplete',
        count: incomplete,
        color: 'bg-yellow-100 text-yellow-800'
      }
    ]
  }

  // Handle state change
  const handleStateChange = (state: string) => {
    setSelectedState(state === selectedState ? '' : state)
  }

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedState('')
  }

  // Export CSV
  const handleExportCSV = () => {
    const csvData = filteredLocations.map(location => ({
      Name: location.var_name,
      Address: location.var_adresse || '',
      'Postal Code': location.var_plz || '',
      City: location.var_ort || ''
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'locations.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingLocation 
        ? `/api/venues/${editingLocation.int_wettkampforteid}`
        : '/api/venues'
      
      const method = editingLocation ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchLocations()
        handleCloseModal()
      } else {
        const errorData = await response.json()
        alert(`Failed to ${editingLocation ? 'update' : 'create'} location: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('An error occurred while saving the location.')
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/venues/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchLocations()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete location: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('An error occurred while deleting the location.')
    }
  }

  // Handle edit
  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      var_name: location.var_name,
      var_adresse: location.var_adresse || '',
      var_plz: location.var_plz || '',
      var_ort: location.var_ort || ''
    })
    setIsModalOpen(true)
  }

  // Handle modal close
  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingLocation(null)
    setFormData({
      var_name: '',
      var_adresse: '',
      var_plz: '',
      var_ort: ''
    })
  }

  // Table headers for unified data view
  const tableHeaders = [
    'Location Name',
    'Address',
    'Postal Code',
    'City'
  ]

  useEffect(() => {
    fetchLocations()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="space-y-6">
        <UnifiedHeader
          title="Location Management"
          description="Manage competition venues and locations"
          icon={BuildingOfficeIcon}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search locations..."
          stateInfo={getLocationStateInfo()}
          selectedState={selectedState}
          onStateChange={handleStateChange}
          onClearAllFilters={handleClearAllFilters}
          onExportCSV={handleExportCSV}
          showHomeButton={true}
          homeUrl="/dashboard"
          primaryAction={{
            label: "Add Location",
            icon: PlusIcon,
            onClick: () => setIsModalOpen(true)
          }}
          showViewToggle={true}
          viewType={viewType}
          onViewTypeChange={handleViewTypeChange}
          totalCount={locations.length}
          filteredCount={filteredLocations.length}
        />

        <UnifiedDataView
          items={filteredLocations}
          selectedItem={null}
          isLoading={loading}
          viewType={viewType}
          onViewTypeChange={handleViewTypeChange}
          onSelectItem={() => {}}
          actionButtons={[
            {
              icon: PencilIcon,
              onClick: (item) => handleEdit(item as Location),
              className: "text-blue-600 hover:text-blue-900",
              title: "Edit"
            },
            {
              icon: TrashIcon,
              onClick: (item) => handleDelete((item as Location).int_wettkampforteid),
              className: "text-red-600 hover:text-red-900",
              title: "Delete"
            }
          ]}
          renderCard={(item) => {
            const location = item as Location
            return (
              <div key={location.int_wettkampforteid} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{location.var_name}</h3>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      {location.var_adresse && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{location.var_adresse}</span>
                        </div>
                      )}
                      {location.var_ort && (
                        <div className="flex items-center">
                          <span className="ml-6">{location.var_plz} {location.var_ort}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.int_wettkampforteid)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          }}
          tableHeaders={tableHeaders}
          renderTableRow={(item) => {
            const location = item as Location
            return (
              <>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{location.var_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {location.var_adresse || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{location.var_plz || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{location.var_ort || 'N/A'}</div>
                </td>
              </>
            )
          }}
        />

        {/* Modal for Add/Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={formData.var_name}
                      onChange={(e) => setFormData({ ...formData, var_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.var_adresse}
                      onChange={(e) => setFormData({ ...formData, var_adresse: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.var_plz}
                      onChange={(e) => setFormData({ ...formData, var_plz: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.var_ort}
                      onChange={(e) => setFormData({ ...formData, var_ort: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingLocation ? 'Update' : 'Create'} Location
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
