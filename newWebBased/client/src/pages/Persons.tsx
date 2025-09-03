import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { UnifiedHeader } from '../components/UnifiedHeader'
import { UnifiedDataView } from '../components/UnifiedDataView'
import useViewToggle from '../hooks/useViewToggle'
import type { StateInfo } from '../components/UnifiedHeader'

interface Person {
  int_personenid: number
  var_vorname: string
  var_nachname: string
  var_email?: string
  var_telefon?: string
  var_fax?: string
  var_adresse?: string
  var_plz?: string
  var_ort?: string
  var_land?: string
  var_geburtsdatum?: string
  var_notiz?: string
}

interface FormData {
  var_vorname: string
  var_nachname: string
  var_email: string
  var_telefon: string
  var_fax: string
  var_adresse: string
  var_plz: string
  var_ort: string
  var_land: string
  var_geburtsdatum: string
  var_notiz: string
}

export default function Persons() {
  const [persons, setPersons] = useState<Person[]>([])
  const [filteredPersons, setFilteredPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedState, setSelectedState] = useState('')

  // View toggle with persistence
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: 'persons', 
    defaultView: 'table' 
  })

  const [formData, setFormData] = useState<FormData>({
    var_vorname: '',
    var_nachname: '',
    var_email: '',
    var_telefon: '',
    var_fax: '',
    var_adresse: '',
    var_plz: '',
    var_ort: '',
    var_land: '',
    var_geburtsdatum: '',
    var_notiz: ''
  })

  // Fetch persons
  const fetchPersons = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/persons')
      if (response.ok) {
        const data = await response.json()
        setPersons(data.persons || [])
      }
    } catch (error) {
      console.error('Error fetching persons:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter persons based on search and state
  useEffect(() => {
    let filtered = persons

    if (searchTerm) {
      filtered = filtered.filter(person =>
        person.var_vorname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.var_nachname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.var_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.var_ort?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedState) {
      // Filter by state/status based on person properties
      if (selectedState === 'complete') {
        filtered = filtered.filter(person => 
          person.var_vorname && person.var_nachname && person.var_email && person.var_ort
        )
      } else if (selectedState === 'incomplete') {
        filtered = filtered.filter(person => 
          !person.var_email || !person.var_ort
        )
      } else if (selectedState === 'with-contact') {
        filtered = filtered.filter(person => 
          person.var_email || person.var_telefon
        )
      }
    }

    setFilteredPersons(filtered)
  }, [persons, searchTerm, selectedState])

  // State info for unified header
  const getPersonStateInfo = (): StateInfo[] => {
    const complete = persons.filter(person => 
      person.var_vorname && person.var_nachname && person.var_email && person.var_ort
    ).length
    const incomplete = persons.filter(person => 
      !person.var_email || !person.var_ort
    ).length
    const withContact = persons.filter(person => 
      person.var_email || person.var_telefon
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
      },
      {
        value: 'with-contact',
        label: 'With Contact',
        count: withContact,
        color: 'bg-blue-100 text-blue-800'
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
    const csvData = filteredPersons.map(person => ({
      'First Name': person.var_vorname,
      'Last Name': person.var_nachname,
      'Email': person.var_email || '',
      'Phone': person.var_telefon || '',
      'Address': person.var_adresse || '',
      'Postal Code': person.var_plz || '',
      'City': person.var_ort || '',
      'Country': person.var_land || '',
      'Birth Date': person.var_geburtsdatum || ''
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'persons.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingPerson 
        ? `/api/persons/${editingPerson.int_personenid}`
        : '/api/persons'
      
      const method = editingPerson ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await fetchPersons()
        handleCloseModal()
      } else {
        const errorData = await response.json()
        alert(`Failed to ${editingPerson ? 'update' : 'create'} person: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('An error occurred while saving the person.')
    }
  }

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this person? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/persons/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchPersons()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete person: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error deleting person:', error)
      alert('An error occurred while deleting the person.')
    }
  }

  // Handle edit
  const handleEdit = (person: Person) => {
    setEditingPerson(person)
    setFormData({
      var_vorname: person.var_vorname,
      var_nachname: person.var_nachname,
      var_email: person.var_email || '',
      var_telefon: person.var_telefon || '',
      var_fax: person.var_fax || '',
      var_adresse: person.var_adresse || '',
      var_plz: person.var_plz || '',
      var_ort: person.var_ort || '',
      var_land: person.var_land || '',
      var_geburtsdatum: person.var_geburtsdatum || '',
      var_notiz: person.var_notiz || ''
    })
    setIsModalOpen(true)
  }

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPerson(null)
    setFormData({
      var_vorname: '',
      var_nachname: '',
      var_email: '',
      var_telefon: '',
      var_fax: '',
      var_adresse: '',
      var_plz: '',
      var_ort: '',
      var_land: '',
      var_geburtsdatum: '',
      var_notiz: ''
    })
  }

  // Table headers for unified data view
  const tableHeaders = [
    'Name',
    'Email',
    'Phone',
    'City',
    'Actions'
  ]

  useEffect(() => {
    fetchPersons()
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
          title="Person Management"
          description="Manage contact persons and individuals"
          icon={UserIcon}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search persons..."
          stateInfo={getPersonStateInfo()}
          selectedState={selectedState}
          onStateChange={handleStateChange}
          onClearAllFilters={handleClearAllFilters}
          onExportCSV={handleExportCSV}
          showHomeButton={true}
          homeUrl="/dashboard"
          primaryAction={{
            label: "Add Person",
            icon: PlusIcon,
            onClick: () => setIsModalOpen(true)
          }}
          showViewToggle={true}
          viewType={viewType}
          onViewTypeChange={handleViewTypeChange}
          totalCount={persons.length}
          filteredCount={filteredPersons.length}
        />

        <UnifiedDataView
          items={filteredPersons}
          selectedItem={null}
          isLoading={loading}
          viewType={viewType}
          onViewTypeChange={handleViewTypeChange}
          onSelectItem={() => {}}
          renderCard={(item) => {
            const person = item as Person
            return (
              <div key={person.int_personenid} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {person.var_vorname} {person.var_nachname}
                    </h3>
                    <div className="mt-2 space-y-2 text-sm text-gray-600">
                      {person.var_email && (
                        <div className="flex items-center">
                          <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{person.var_email}</span>
                        </div>
                      )}
                      {person.var_telefon && (
                        <div className="flex items-center">
                          <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{person.var_telefon}</span>
                        </div>
                      )}
                      {person.var_adresse && (
                        <div className="flex items-center">
                          <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{person.var_adresse}</span>
                        </div>
                      )}
                      {person.var_ort && (
                        <div className="flex items-center">
                          <span className="ml-6">{person.var_plz} {person.var_ort}</span>
                        </div>
                      )}
                      {person.var_geburtsdatum && (
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{person.var_geburtsdatum}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(person)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(person.int_personenid)}
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
            const person = item as Person
            return (
              <tr key={person.int_personenid} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {person.var_vorname} {person.var_nachname}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{person.var_email || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{person.var_telefon || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{person.var_ort || 'N/A'}</div>
                  {person.var_land && (
                    <div className="text-sm text-gray-500">{person.var_land}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={() => handleEdit(person)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(person.int_personenid)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          }}
        />

        {/* Modal for Add/Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-90vh overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingPerson ? 'Edit Person' : 'Add New Person'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.var_vorname}
                      onChange={(e) => setFormData({ ...formData, var_vorname: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.var_nachname}
                      onChange={(e) => setFormData({ ...formData, var_nachname: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.var_email}
                      onChange={(e) => setFormData({ ...formData, var_email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.var_telefon}
                      onChange={(e) => setFormData({ ...formData, var_telefon: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fax
                    </label>
                    <input
                      type="text"
                      value={formData.var_fax}
                      onChange={(e) => setFormData({ ...formData, var_fax: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      value={formData.var_geburtsdatum}
                      onChange={(e) => setFormData({ ...formData, var_geburtsdatum: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.var_land}
                      onChange={(e) => setFormData({ ...formData, var_land: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.var_notiz}
                      onChange={(e) => setFormData({ ...formData, var_notiz: e.target.value })}
                      rows={3}
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
                    {editingPerson ? 'Update' : 'Create'} Person
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
