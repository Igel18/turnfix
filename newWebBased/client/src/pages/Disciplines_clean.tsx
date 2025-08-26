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

interface Discipline {
  id: number
  name: string
  short_name: string
  display_name?: string
  apparatus: string
  male_allowed: boolean
  female_allowed: boolean
  gender_text: string
  age_from: string
  age_to: string
  age_range: string
  category_id?: number
  icon?: string
  formula?: string
  sport_id: number
  input_mask?: string
  attempts: number
  available_from?: string
  available_to?: string
  active?: boolean
}

interface AgeGroup {
  age_from: string
  age_to: string
  age_range: string
  discipline_count: number
}

interface Apparatus {
  apparatus: string
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
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('')
  const [selectedApparatus, setSelectedApparatus] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // Unique filter options
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([])
  const [apparatus, setApparatus] = useState<Apparatus[]>([])
  const [categories] = useState<Category[]>([])

  useEffect(() => {
    fetchDisciplines()
  }, [])

  const fetchDisciplines = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/disciplines')
      if (!response.ok) throw new Error('Failed to fetch disciplines')
      
      const data = await response.json()
      setDisciplines(data.disciplines || [])
      
      // Extract unique age groups
      const uniqueAgeGroups = data.disciplines?.reduce((acc: AgeGroup[], discipline: Discipline) => {
        const existing = acc.find(ag => ag.age_range === discipline.age_range)
        if (existing) {
          existing.discipline_count++
        } else {
          acc.push({
            age_from: discipline.age_from,
            age_to: discipline.age_to,
            age_range: discipline.age_range,
            discipline_count: 1
          })
        }
        return acc
      }, []) || []
      
      setAgeGroups(uniqueAgeGroups)
      
      // Extract unique apparatus
      const uniqueApparatus = data.disciplines?.reduce((acc: Apparatus[], discipline: Discipline) => {
        const existing = acc.find(app => app.apparatus === discipline.apparatus)
        if (existing) {
          existing.discipline_count++
        } else {
          acc.push({
            apparatus: discipline.apparatus,
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
        const response = await fetch(`/api/disciplines/${discipline.id}`, {
          method: 'DELETE',
        })
        
        if (!response.ok) throw new Error('Failed to delete discipline')
        
        // Refresh the list
        await fetchDisciplines()
      } catch (error) {
        console.error('Error deleting discipline:', error)
        alert('Failed to delete discipline. Please try again.')
      }
    }
  }

  const handleAddDiscipline = () => {
    // TODO: Open add modal or navigate to add page
    console.log('Add discipline clicked')
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
    
    if (selectedAgeGroup && discipline.age_range !== selectedAgeGroup) return false
    if (selectedApparatus && discipline.apparatus !== selectedApparatus) return false
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
      label: 'Age Groups', 
      value: 'age_groups',
      count: ageGroups.length, 
      color: 'purple' 
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
      label: 'Age Group',
      value: 'age_group',
      selectedValue: selectedAgeGroup,
      onChange: setSelectedAgeGroup,
      options: [
        { value: '', label: 'All Ages' },
        ...ageGroups.map(group => ({
          value: group.age_range,
          label: `${group.age_range} Jahre`,
          count: group.discipline_count
        }))
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
          value: app.apparatus,
          label: app.apparatus,
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
      'Apparatus': discipline.apparatus,
      'Gender': discipline.gender_text,
      'Age Range': discipline.age_range,
      'Attempts': discipline.attempts,
      'Active': discipline.active ? 'Yes' : 'No'
    }))
    
    exportToCSV({
      filename: 'disciplines.csv',
      headers: ['Name', 'Short Name', 'Apparatus', 'Gender', 'Age Range', 'Attempts', 'Active'],
      data: exportData,
      numberFields: ['Attempts']
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
          setSelectedAgeGroup('')
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
                      onClick={() => console.log('Edit discipline:', discipline)}
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
                    <span className="font-medium">{discipline.apparatus}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gender:</span>
                    <span className="font-medium">{discipline.gender_text}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Age Range:</span>
                    <span className="font-medium">{discipline.age_range} Jahre</span>
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
              {searchTerm || selectedGender || selectedAgeGroup || selectedApparatus || selectedCategory
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
    </div>
  )
}
