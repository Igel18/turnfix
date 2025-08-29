import { useState, useEffect } from 'react'
import { 
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import LayoutDesigner from '@/components/LayoutDesigner'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

interface Layout {
  int_layoutid: number
  var_name: string
  txt_comment: string
  fieldCount?: number
  createdAt?: string
}

interface LayoutField {
  int_layout_felderid: number
  int_layoutid: number
  int_typ: number
  var_font: string
  rel_x: number
  rel_y: number
  rel_w: number
  rel_h: number
  var_value: string
  int_align: number
  int_layer: number
}

export function CertificateLayouts() {
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingLayout, setEditingLayout] = useState<Layout | null>(null)
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null)
  const [showDesigner, setShowDesigner] = useState(false)

  // Form state for creating/editing layouts
  const [formData, setFormData] = useState({
    name: '',
    comment: ''
  })

  // Helper functions for unified header
  const getLayoutsStateInfo = (): StateInfo[] => {
    const totalLayouts = layouts.length
    const layoutsWithFields = layouts.filter(layout => (layout.fieldCount || 0) > 0).length
    const emptyLayouts = totalLayouts - layoutsWithFields

    return [
      {
        value: 'total',
        label: 'Total Layouts',
        count: totalLayouts,
        color: 'text-blue-600'
      },
      {
        value: 'configured',
        label: 'With Fields',
        count: layoutsWithFields,
        color: 'text-green-600'
      },
      {
        value: 'empty',
        label: 'Empty',
        count: emptyLayouts,
        color: 'text-gray-600'
      }
    ]
  }

  const handleClearAllFilters = () => {
    setSearchTerm('')
  }

  // Fetch layouts from API
  const fetchLayouts = async () => {
    setIsLoading(true)
    try {
      const data = await apiGet('/layouts')
      setLayouts(data || [])
    } catch (error) {
      console.error('Error fetching layouts:', error)
      setLayouts([])
    } finally {
      setIsLoading(false)
    }
  }

  // Create new layout
  const handleCreateLayout = async () => {
    if (!formData.name.trim()) return

    try {
      const newLayout = await apiPost('/layouts', {
        name: formData.name,
        comment: formData.comment
      })
      
      setLayouts(prev => [...prev, newLayout])
      setShowCreateModal(false)
      setFormData({ name: '', comment: '' })
    } catch (error) {
      console.error('Error creating layout:', error)
    }
  }

  // Update layout
  const handleUpdateLayout = async () => {
    if (!editingLayout || !formData.name.trim()) return

    try {
      const updatedLayout = await apiPut(`/layouts/${editingLayout.int_layoutid}`, {
        name: formData.name,
        comment: formData.comment
      })
      
      setLayouts(prev => prev.map(layout => 
        layout.int_layoutid === editingLayout.int_layoutid ? updatedLayout : layout
      ))
      setEditingLayout(null)
      setFormData({ name: '', comment: '' })
    } catch (error) {
      console.error('Error updating layout:', error)
    }
  }

  // Delete layout
  const handleDeleteLayout = async (layoutId: number) => {
    if (!confirm('Are you sure you want to delete this layout? This action cannot be undone.')) {
      return
    }

    try {
      await apiDelete(`/layouts/${layoutId}`)
      setLayouts(prev => prev.filter(layout => layout.int_layoutid !== layoutId))
    } catch (error) {
      console.error('Error deleting layout:', error)
    }
  }

  // Duplicate layout
  const handleDuplicateLayout = async (layout: Layout) => {
    try {
      const duplicatedLayout = await apiPost('/layouts', {
        name: `${layout.var_name} (Copy)`,
        comment: layout.txt_comment
      })
      
      setLayouts(prev => [...prev, duplicatedLayout])
    } catch (error) {
      console.error('Error duplicating layout:', error)
    }
  }

  // Export layouts (placeholder)
  const exportLayouts = () => {
    console.log('Export layouts functionality to be implemented')
  }

  // Open edit modal
  const openEditModal = (layout: Layout) => {
    setEditingLayout(layout)
    setFormData({
      name: layout.var_name || '',
      comment: layout.txt_comment || ''
    })
  }

  // Open layout designer
  const openLayoutDesigner = (layout: Layout) => {
    setSelectedLayout(layout)
    setShowDesigner(true)
  }

  // Save layout from designer
  const saveLayoutFromDesigner = async (layout: Layout) => {
    try {
      const updatedLayout = await apiPut(`/layouts/${layout.int_layoutid}`, {
        name: layout.var_name,
        comment: layout.txt_comment
      })
      
      setLayouts(prev => prev.map(l => 
        l.int_layoutid === layout.int_layoutid ? updatedLayout : l
      ))
      setShowDesigner(false)
      setSelectedLayout(null)
    } catch (error) {
      console.error('Error saving layout:', error)
    }
  }

  // Handle field changes from designer
  const handleFieldsChange = async (fields: LayoutField[]) => {
    if (!selectedLayout) return
    
    try {
      // Update field count in layout
      const updatedLayout = { ...selectedLayout, fields, fieldCount: fields.length }
      setSelectedLayout(updatedLayout)
      
      // Update in layouts list
      setLayouts(prev => prev.map(layout => 
        layout.int_layoutid === selectedLayout.int_layoutid 
          ? { ...layout, fieldCount: fields.length, fields }
          : layout
      ))
    } catch (error) {
      console.error('Error updating fields:', error)
    }
  }

  // Filter layouts based on search term
  const filteredLayouts = layouts.filter(layout =>
    layout.var_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    layout.txt_comment?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useEffect(() => {
    fetchLayouts()
  }, [])

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedHeader
        title="Certificate Layouts"
        description="Design and manage certificate templates and layouts for competitions"
        icon={DocumentTextIcon}
        stateInfo={getLayoutsStateInfo()}
        selectedState=""
        onStateChange={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search layouts..."
        filterOptions={[]}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={exportLayouts}
        primaryAction={{
          label: 'New Layout',
          icon: PlusIcon,
          onClick: () => setShowCreateModal(true)
        }}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={filteredLayouts.length}
      />

      {/* View Toggle */}
      <div className="flex justify-end mb-4 mx-6">
        <div className="flex rounded-md shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Table View
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading layouts...</p>
          </div>
        ) : filteredLayouts.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No certificate layouts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first certificate layout.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Layout
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLayouts.map((layout) => (
              <div key={layout.int_layoutid} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {layout.var_name || 'Untitled Layout'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {layout.fieldCount || 0} fields
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {layout.txt_comment && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {layout.txt_comment}
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openLayoutDesigner(layout)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Design Layout"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(layout)}
                        className="text-gray-600 hover:text-gray-800 p-1"
                        title="Edit Layout"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateLayout(layout)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Duplicate Layout"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLayout(layout.int_layoutid)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Delete Layout"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Table View
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fields
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLayouts.map((layout) => (
                  <tr key={layout.int_layoutid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {layout.var_name || 'Untitled Layout'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {layout.txt_comment || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {layout.fieldCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openLayoutDesigner(layout)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Design Layout"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(layout)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Edit Layout"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateLayout(layout)}
                          className="text-green-600 hover:text-green-900"
                          title="Duplicate Layout"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLayout(layout.int_layoutid)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Layout"
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

      {/* Create/Edit Modal */}
      {(showCreateModal || editingLayout) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLayout ? 'Edit Layout' : 'Create New Layout'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Layout Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter layout name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter layout description"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingLayout(null)
                    setFormData({ name: '', comment: '' })
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={editingLayout ? handleUpdateLayout : handleCreateLayout}
                  disabled={!formData.name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md"
                >
                  {editingLayout ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Designer */}
      {showDesigner && selectedLayout && (
        <LayoutDesigner
          layout={selectedLayout}
          onClose={() => {
            setShowDesigner(false)
            setSelectedLayout(null)
          }}
          onSave={saveLayoutFromDesigner}
          onFieldsChange={handleFieldsChange}
        />
      )}
    </div>
  )
}

export default CertificateLayouts
