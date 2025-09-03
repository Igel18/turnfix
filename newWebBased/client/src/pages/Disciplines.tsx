import { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrophyIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { exportToCSV } from '@/utils/csvExport'
import { apiGet, apiDelete, apiPost, apiPut } from '@/utils/api'

interface Discipline {
  id: number
  name: string
  short_name: string
  display_name?: string
  formula?: string
  input_mask?: string
  attempts: number
  icon?: string
  shortcut?: string
  calculation_type: number
  unit?: string
  lanes_division: boolean
  male_allowed: boolean
  female_allowed: boolean
  sport_id: number
  formula_id?: number
  should_calculate: boolean
  gender_text: string
  category_id?: number
  available_from?: string
  available_to?: string
  active?: boolean
}

interface Apparatus {
  unit: string
  discipline_count: number
}

interface Category {
  id: number
  name: string
}

export default function Disciplines() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGender, setSelectedGender] = useState('')
  const [selectedApparatus, setSelectedApparatus] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // Unique filter options
  const [apparatus, setApparatus] = useState<Apparatus[]>([])
  const [categories] = useState<Category[]>([])

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDiscipline, setEditingDiscipline] = useState<Discipline | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    displayName: '',
    formula: '',
    inputMask: '',
    attempts: 1,
    icon: '',
    shortcut: '',
    calculationType: 2,
    unit: '',
    lanesDivision: false,
    maleAllowed: true,
    femaleAllowed: true,
    sportId: 1,
    formulaId: undefined as number | undefined,
    shouldCalculate: true
  })

  useEffect(() => {
    fetchDisciplines()
  }, [])

  const fetchDisciplines = async () => {
    try {
      setIsLoading(true)
      const data = await apiGet('/disciplines')
      setDisciplines(data || [])
      
      // Extract unique apparatus
      const uniqueApparatus = data?.reduce((acc: Apparatus[], discipline: Discipline) => {
        const unitValue = discipline.unit || 'No Unit'
        const existing = acc.find(app => app.unit === unitValue)
        if (existing) {
          existing.discipline_count++
        } else {
          acc.push({
            unit: unitValue,
            discipline_count: 1
          })
        }
        return acc
      }, []) || []
      
      setApparatus(uniqueApparatus)
      
    } catch (error) {
      console.error('Error fetching disciplines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (discipline: Discipline) => {
    if (window.confirm(`Are you sure you want to delete "${discipline.display_name || discipline.name}"?`)) {
      try {
        await apiDelete(`/disciplines/${discipline.id}`)
        
        // Refresh the list
        await fetchDisciplines()
      } catch (error) {
        console.error('Error deleting discipline:', error)
        alert('Failed to delete discipline. Please try again.')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      shortName: '',
      displayName: '',
      formula: '',
      inputMask: '',
      attempts: 1,
      icon: '',
      shortcut: '',
      calculationType: 2,
      unit: '',
      lanesDivision: false,
      maleAllowed: true,
      femaleAllowed: true,
      sportId: 1,
      formulaId: undefined,
      shouldCalculate: true
    })
    setEditingDiscipline(null)
  }

  const handleAddDiscipline = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const handleEditDiscipline = (discipline: Discipline) => {
    setFormData({
      name: discipline.name,
      shortName: discipline.short_name,
      displayName: discipline.display_name || '',
      formula: discipline.formula || '',
      inputMask: discipline.input_mask || '',
      attempts: discipline.attempts,
      icon: discipline.icon || '',
      shortcut: discipline.shortcut || '',
      calculationType: discipline.calculation_type,
      unit: discipline.unit || '',
      lanesDivision: discipline.lanes_division,
      maleAllowed: discipline.male_allowed,
      femaleAllowed: discipline.female_allowed,
      sportId: discipline.sport_id,
      formulaId: discipline.formula_id,
      shouldCalculate: discipline.should_calculate
    })
    setEditingDiscipline(discipline)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const disciplineData = {
        name: formData.name,
        shortName: formData.shortName,
        displayName: formData.displayName || undefined,
        formula: formData.formula || undefined,
        inputMask: formData.inputMask || undefined,
        attempts: formData.attempts,
        icon: formData.icon || undefined,
        shortcut: formData.shortcut || undefined,
        calculationType: formData.calculationType,
        unit: formData.unit || undefined,
        lanesDivision: formData.lanesDivision,
        maleAllowed: formData.maleAllowed,
        femaleAllowed: formData.femaleAllowed,
        sportId: formData.sportId,
        formulaId: formData.formulaId,
        shouldCalculate: formData.shouldCalculate
      }

      if (editingDiscipline) {
        await apiPut(`/disciplines/${editingDiscipline.id}`, disciplineData)
      } else {
        await apiPost('/disciplines', disciplineData)
      }
      
      setIsModalOpen(false)
      resetForm()
      fetchDisciplines()
    } catch (error) {
      console.error('Error saving discipline:', error)
    }
  }

  const filteredDisciplines = disciplines.filter(discipline => {
    if (searchTerm && !discipline.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !discipline.short_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(discipline.display_name?.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false
    }
    
    if (selectedGender) {
      if (selectedGender === 'male' && !discipline.male_allowed) return false
      if (selectedGender === 'female' && !discipline.female_allowed) return false
      if (selectedGender === 'both' && (!discipline.male_allowed || !discipline.female_allowed)) return false
    }
    
    if (selectedApparatus) {
      const disciplineUnit = discipline.unit || 'No Unit'
      if (disciplineUnit !== selectedApparatus) return false
    }
    if (selectedCategory && discipline.category_id?.toString() !== selectedCategory) return false
    
    return true
  })

  const getDisciplineStateInfo = (): StateInfo[] => [
    { 
      label: 'Total', 
      value: 'total',
      count: disciplines.length, 
      color: 'blue' 
    },
    { 
      label: 'Active', 
      value: 'active',
      count: disciplines.filter(d => d.active !== false).length, 
      color: 'green' 
    },
    { 
      label: 'Male', 
      value: 'male',
      count: disciplines.filter(d => d.male_allowed).length, 
      color: 'indigo' 
    },
    { 
      label: 'Female', 
      value: 'female',
      count: disciplines.filter(d => d.female_allowed).length, 
      color: 'pink' 
    },
    { 
      label: 'Apparatus', 
      value: 'apparatus',
      count: apparatus.length, 
      color: 'orange' 
    }
  ]

  const getFilterOptions = () => [
    {
      label: 'Gender',
      value: 'gender',
      selectedValue: selectedGender,
      onChange: setSelectedGender,
      options: [
        { value: '', label: 'All Genders' },
        { value: 'male', label: 'Male Only' },
        { value: 'female', label: 'Female Only' },
        { value: 'both', label: 'Both Genders' }
      ]
    },
    {
      label: 'Apparatus',
      value: 'apparatus',
      selectedValue: selectedApparatus,
      onChange: setSelectedApparatus,
      options: [
        { value: '', label: 'All Apparatus' },
        ...apparatus.map(app => ({
          value: app.unit,
          label: app.unit,
          count: app.discipline_count
        }))
      ]
    },
    {
      label: 'Category',
      value: 'category',
      selectedValue: selectedCategory,
      onChange: setSelectedCategory,
      options: [
        { value: '', label: 'All Categories' },
        ...categories.map(cat => ({
          value: cat.id.toString(),
          label: cat.name
        }))
      ]
    }
  ]

  const handleExport = () => {
    const exportData = filteredDisciplines.map(discipline => ({
      'Name': discipline.display_name || discipline.name,
      'Short Name': discipline.short_name,
      'Unit': discipline.unit,
      'Gender': discipline.gender_text,
      'Attempts': discipline.attempts,
      'Active': discipline.active ? 'Yes' : 'No'
    }))
    
    exportToCSV({
      filename: 'disciplines.csv',
      headers: ['Name', 'Short Name', 'Apparatus', 'Gender', 'Attempts', 'Active'],
      data: exportData,
      numberFields: ['Attempts']
    })
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Manage Disciplines"
        description="Manage gymnastics disciplines, apparatus, and age categories"
        icon={TrophyIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search disciplines..."
        stateInfo={getDisciplineStateInfo()}
        filterOptions={getFilterOptions()}
        onClearAllFilters={() => {
          setSearchTerm('')
          setSelectedGender('')
          setSelectedApparatus('')
          setSelectedCategory('')
        }}
        onExportCSV={handleExport}
        primaryAction={{
          label: 'Add Discipline',
          icon: PlusIcon,
          onClick: handleAddDiscipline
        }}
        showHomeButton={true}
        totalCount={disciplines.length}
        filteredCount={filteredDisciplines.length}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading disciplines...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDisciplines.map((discipline) => (
              <div key={discipline.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {discipline.display_name || discipline.name}
                    </h3>
                    <p className="text-sm text-gray-600">{discipline.short_name}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => console.log('View discipline:', discipline)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditDiscipline(discipline)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(discipline)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Apparatus:</span>
                    <span className="font-medium">{discipline.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium">{discipline.gender_text}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Attempts:</span>
                    <span className="font-medium">{discipline.attempts}</span>
                  </div>
                  {discipline.active !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${discipline.active ? 'text-green-600' : 'text-red-600'}`}>
                        {discipline.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDisciplines.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No disciplines found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedGender || selectedApparatus || selectedCategory
                ? 'Try adjusting your filters to see more results.'
                : 'Get started by adding your first discipline.'}
            </p>
            <button
              onClick={handleAddDiscipline}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center mx-auto"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add First Discipline
            </button>
          </div>
        )}
      </div>

      {/* Comprehensive Discipline Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingDiscipline ? 'Edit Discipline' : 'Create New Discipline'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Boden"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Short Name *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={formData.shortName}
                        onChange={(e) => setFormData({...formData, shortName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Bo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={formData.displayName}
                        onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Bodenturnen"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Settings */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Calculation & Formula</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Formula
                      </label>
                      <textarea
                        maxLength={300}
                        rows={3}
                        value={formData.formula}
                        onChange={(e) => setFormData({...formData, formula: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter calculation formula"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Calculation Type
                        </label>
                        <select
                          value={formData.calculationType}
                          onChange={(e) => setFormData({...formData, calculationType: parseInt(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={1}>Type 1</option>
                          <option value={2}>Type 2</option>
                          <option value={3}>Type 3</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Formula ID
                        </label>
                        <input
                          type="number"
                          value={formData.formulaId || ''}
                          onChange={(e) => setFormData({...formData, formulaId: e.target.value ? parseInt(e.target.value) : undefined})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Formula reference ID"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Settings */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Input & Display Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Input Mask
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={formData.inputMask}
                        onChange={(e) => setFormData({...formData, inputMask: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 00.000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attempts
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.attempts}
                        onChange={(e) => setFormData({...formData, attempts: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Icon
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.icon}
                        onChange={(e) => setFormData({...formData, icon: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Icon name/path"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Shortcut
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={formData.shortcut}
                        onChange={(e) => setFormData({...formData, shortcut: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Keyboard shortcut"
                      />
                    </div>
                  </div>
                </div>

                {/* Unit & Sport Settings */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Unit & Sport Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., pts, m, s"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sport ID
                      </label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.sportId}
                        onChange={(e) => setFormData({...formData, sportId: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Gender & Options */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Gender & Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Allowed Genders
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.maleAllowed}
                            onChange={(e) => setFormData({...formData, maleAllowed: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Male</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.femaleAllowed}
                            onChange={(e) => setFormData({...formData, femaleAllowed: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Female</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Additional Options
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.lanesDivision}
                            onChange={(e) => setFormData({...formData, lanesDivision: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Lanes Division</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.shouldCalculate}
                            onChange={(e) => setFormData({...formData, shouldCalculate: e.target.checked})}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Should Calculate</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingDiscipline ? 'Update Discipline' : 'Create Discipline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
