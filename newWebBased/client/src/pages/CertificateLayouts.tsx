import { useState, useEffect, useRef } from 'react'
import { 
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import useViewToggle from '@/hooks/useViewToggle'
import { useCertificateLayout } from '@/contexts/CertificateLayoutContext'
import LayoutDesigner from '@/components/LayoutDesigner'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

interface Layout {
  int_layoutid: number
  var_name: string
  txt_comment: string | null
  fieldCount?: number
  createdAt?: string
  fields?: LayoutField[]
}

interface LayoutField {
  int_layout_felderid: number
  int_layoutid: number
  int_typ: number
  var_font: string | null
  rel_x: number
  rel_y: number
  rel_w: number
  rel_h: number
  var_value: string | null
  int_align: number
  int_layer: number
}

export function CertificateLayouts() {
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // View toggle with persistence
  const { viewType, handleViewTypeChange } = useViewToggle({ 
    key: 'certificate-layouts', 
    defaultView: 'cards' 
  })
  
  // Certificate layout context for persistence
  const { selectedLayout: contextSelectedLayout, setSelectedLayout: setContextSelectedLayout } = useCertificateLayout()

  // Handler to select layout for printing persistence
  const handleSelectLayoutForPrinting = (layout: Layout) => {
    // Convert Layout to CertificateLayout format (they're compatible except for field properties)
    const certificateLayout = {
      ...layout,
      fields: layout.fields?.map(field => ({
        ...field,
        var_text: field.var_value, // Map var_value to var_text
        var_spaltenwert: null // Add missing property
      }))
    }
    setContextSelectedLayout(certificateLayout)
    // Optional: Show a notification that the layout was selected for printing
    console.log(`Selected layout "${layout.var_name}" for certificate printing`)
  }
  
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null)
  const [showDesigner, setShowDesigner] = useState(false)

  // Form state no longer needed since we create layouts directly

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

  // Create new layout and open designer immediately
  const handleCreateLayout = async () => {
    try {
      const newLayout = await apiPost('/layouts', {
        name: 'New Layout',
        comment: ''
      })
      
      setLayouts(prev => [...prev, newLayout])
      
      // Immediately open the designer for the new layout
      setSelectedLayout(newLayout)
      setShowDesigner(true)
    } catch (error) {
      console.error('Error creating layout:', error)
    }
  }

  // Update layout (now handled in the designer)
  // This function is no longer needed since editing is done in the designer

  // Delete layout
  const handleDeleteLayout = async (layoutId: number) => {
    console.log('Delete button clicked for layout ID:', layoutId)
    
    if (!confirm('Are you sure you want to delete this layout? This action cannot be undone.')) {
      console.log('Delete cancelled by user')
      return
    }

    console.log('Attempting to delete layout:', layoutId)
    try {
      const response = await apiDelete(`/layouts/${layoutId}`)
      console.log('Delete response:', response)
      setLayouts(prev => prev.filter(layout => layout.int_layoutid !== layoutId))
      console.log('Layout removed from state')
    } catch (error) {
      console.error('Error deleting layout:', error)
      alert('Error deleting layout: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  // Duplicate layout
  const handleDuplicateLayout = async (layout: Layout) => {
    const newName = prompt(`Enter name for duplicated layout:`, `${layout.var_name} (Copy)`)
    if (!newName || !newName.trim()) return

    try {
      const duplicatedLayout = await apiPost(`/layouts/${layout.int_layoutid}/duplicate`, {
        name: newName.trim()
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

  // Open layout designer (now handles both design and edit)
  const openLayoutDesigner = (layout: Layout) => {
    setSelectedLayout(layout)
    setShowDesigner(true)
  }

  // Save layout from designer
  const saveLayoutFromDesigner = async (layout: Layout) => {
    try {
      console.log('Saving layout:', layout)
      
      // Test if the layout exists first
      try {
        const existingLayout = await apiGet(`/layouts/${layout.int_layoutid}`)
        console.log('Existing layout found:', existingLayout)
      } catch (fetchError) {
        console.error('Error fetching existing layout:', fetchError)
        throw new Error('Layout not found on server')
      }
      
      // Prepare the data to send to the server
      const layoutData = {
        name: layout.var_name?.trim() || 'Untitled Layout',
        comment: layout.txt_comment || null
      }
      
      console.log('Sending layout data:', layoutData)
      console.log('URL:', `/layouts/${layout.int_layoutid}`)
      console.log('Layout name length:', layoutData.name.length)
      
      // Validate name length (API expects max 100 characters)
      if (layoutData.name.length > 100) {
        throw new Error('Layout name is too long (max 100 characters)')
      }
      
      // First, update the layout metadata
      await apiPut(`/layouts/${layout.int_layoutid}`, layoutData)
      
      // Then, if there are fields, save them too
      if (layout.fields && layout.fields.length > 0) {
        console.log('Saving fields:', layout.fields)
        
        // Save each field individually (this might need optimization later)
        for (const field of layout.fields) {
          console.log('Processing field:', field)
          
          // Truncate value if it's too long (database limit is 200 characters)
          const truncatedValue = field.var_value && field.var_value.length > 200 
            ? field.var_value.substring(0, 200) 
            : field.var_value
          
          if (truncatedValue !== field.var_value) {
            console.warn(`Field value truncated from ${field.var_value?.length} to 200 characters (database limit)`)
          }
          
          const fieldData = {
            type: field.int_typ,
            font: field.var_font || null,
            x: field.rel_x,
            y: field.rel_y,
            width: field.rel_w,
            height: field.rel_h,
            value: truncatedValue || null,
            align: field.int_align,
            layer: field.int_layer
          }
          
          console.log('Sending field data:', fieldData)
          
          if (field.int_layout_felderid < 0) {
            // New field - create it
            await apiPost(`/layouts/${layout.int_layoutid}/fields`, fieldData)
          } else {
            // Existing field - update it
            await apiPut(`/layouts/${layout.int_layoutid}/fields/${field.int_layout_felderid}`, fieldData)
          }
        }
      }
      
      // Refresh the layout from server to get the updated data
      const refreshedLayout = await apiGet(`/layouts/${layout.int_layoutid}`)
      
      setLayouts(prev => prev.map(l => 
        l.int_layoutid === layout.int_layoutid ? refreshedLayout : l
      ))
      setShowDesigner(false)
      setSelectedLayout(null)
    } catch (error) {
      console.error('Error saving layout:', error)
      alert('Error saving layout. Please check the console for details.')
    }
  }

  // Handle field changes from designer with debouncing
  const debouncedFieldSave = useRef<{ [fieldId: number]: NodeJS.Timeout }>({})
  
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

      // Check if we need to handle deletions
      const currentFieldIds = fields.map(f => f.int_layout_felderid).filter(id => id > 0)
      const previousFieldIds = selectedLayout.fields?.map(f => f.int_layout_felderid).filter(id => id > 0) || []
      const deletedFieldIds = previousFieldIds.filter(id => !currentFieldIds.includes(id))
      
      // Handle field deletions immediately
      for (const deletedId of deletedFieldIds) {
        try {
          console.log('Deleting field:', deletedId)
          await apiDelete(`/layouts/${selectedLayout.int_layoutid}/fields/${deletedId}`)
        } catch (error) {
          console.error('Error deleting field:', deletedId, error)
        }
      }

      // Debounce field updates to avoid excessive API calls
      for (const field of fields) {
        // Clear existing timeout for this field
        if (debouncedFieldSave.current[field.int_layout_felderid]) {
          clearTimeout(debouncedFieldSave.current[field.int_layout_felderid])
        }
        
        // Set new timeout
        debouncedFieldSave.current[field.int_layout_felderid] = setTimeout(async () => {
          try {
            // Truncate value if it's too long (database limit is 200 characters)
            const truncatedValue = field.var_value && field.var_value.length > 200 
              ? field.var_value.substring(0, 200) 
              : field.var_value
            
            const fieldData = {
              type: field.int_typ,
              font: field.var_font || null,
              x: field.rel_x,
              y: field.rel_y,
              width: field.rel_w,
              height: field.rel_h,
              value: truncatedValue || null,
              align: field.int_align,
              layer: field.int_layer
            }
            
            if (field.int_layout_felderid < 0) {
              // New field - create it
              console.log('Creating new field:', fieldData)
              const newField = await apiPost(`/layouts/${selectedLayout.int_layoutid}/fields`, fieldData)
              
              // Update field ID in local state
              field.int_layout_felderid = newField.int_layout_felderid
              
              // Update the selected layout with the new field ID
              setSelectedLayout(prev => ({
                ...prev!,
                fields: prev!.fields?.map(f => 
                  f.int_layout_felderid === field.int_layout_felderid ? { ...f, int_layout_felderid: newField.int_layout_felderid } : f
                ) || []
              }))
            } else {
              // Existing field - update it
              console.log('Updating field:', field.int_layout_felderid, fieldData)
              await apiPut(`/layouts/${selectedLayout.int_layoutid}/fields/${field.int_layout_felderid}`, fieldData)
            }
            
            console.log('Field saved successfully:', field.int_layout_felderid)
          } catch (error) {
            console.error('Error saving field:', field.int_layout_felderid, error)
          }
        }, 500) // 500ms debounce delay
      }
      
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(debouncedFieldSave.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
    }
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
          onClick: handleCreateLayout
        }}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={filteredLayouts.length}
        showViewToggle={true}
        viewType={viewType}
        onViewTypeChange={handleViewTypeChange}
      />

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
                onClick={handleCreateLayout}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Layout
              </button>
            </div>
          </div>
        ) : viewType === 'cards' ? (
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
                        title="Edit/Design Layout"
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
                    <button
                      onClick={() => handleSelectLayoutForPrinting(layout)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        contextSelectedLayout?.int_layoutid === layout.int_layoutid
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title="Select for Certificate Printing"
                    >
                      <PrinterIcon className="h-4 w-4 inline mr-1" />
                      {contextSelectedLayout?.int_layoutid === layout.int_layoutid ? 'Selected' : 'Select'}
                    </button>
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
                      <div className="flex justify-end items-center space-x-2">
                        <button
                          onClick={() => openLayoutDesigner(layout)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit/Design Layout"
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
                        <button
                          onClick={() => handleSelectLayoutForPrinting(layout)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ml-2 ${
                            contextSelectedLayout?.int_layoutid === layout.int_layoutid
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Select for Certificate Printing"
                        >
                          <PrinterIcon className="h-3 w-3 inline mr-1" />
                          {contextSelectedLayout?.int_layoutid === layout.int_layoutid ? 'Selected' : 'Select'}
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
