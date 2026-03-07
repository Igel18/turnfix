import React, { useState, useEffect, useRef } from 'react'
import { 
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import DatabaseManagementTemplate from '@/components/DatabaseManagementTemplate'
import { SortableTableHeader, useTableSort } from '@/components/SortableTableHeader'
import { useCertificateLayout } from '@/contexts/CertificateLayoutContext'
import LayoutDesigner from '@/components/LayoutDesigner'
import { apiGet, apiPost, apiPut, apiDelete, invalidateCache } from '../utils/api'
import { BlueInfoBox } from '@/components/InfoBoxes'
import { useTranslation } from 'react-i18next'

// Database field descriptions from C++ code (_global.cpp)
// These numbers correspond to the field indices used in certificate layouts
export const DATABASE_FIELD_DESCRIPTIONS: { [key: number]: string } = {
  0: 'Veranstaltungsname',
  1: 'Veranstaltungsdatum',
  2: 'Veranstaltungsort',
  3: 'Name (Teilnehmer)',
  4: 'Verein',
  5: 'Platz',
  6: 'Punkte',
  7: 'Wettkampfbezeichnung',
  8: 'Wettkampfbezeichnung mit Jahrgang',
  9: 'Turnkreis/-gau',
  10: 'Verband',
  11: 'Land',
  12: 'Ausdruck-Typ (Siegerurkunde/Teilnahmeurkunde)',
  13: 'Summe Platzziffern',
  14: 'Mannschaftsnamen',
  15: 'Wettkampfnummer'
}

// Helper function to get field description
export const getDatabaseFieldDescription = (fieldNum: number): string => {
  return DATABASE_FIELD_DESCRIPTIONS[fieldNum] || `Feld ${fieldNum}`
}

interface Layout {
  int_layoutid: number
  var_name: string
  txt_comment: string | null
  fieldCount?: number
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

const CertificateLayouts: React.FC = () => {
  const { t } = useTranslation()
  
  // State management
  const [layouts, setLayouts] = useState<Layout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDesigner, setShowDesigner] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState<Layout | null>(null)
  const [showHelpPanel, setShowHelpPanel] = useState(false)
  
  // Sorting
  const { sortKey, sortDirection, handleSort, sortData } = useTableSort('var_name', 'asc')

  // Context for certificate printing
  const { selectedLayout: contextSelectedLayout, setSelectedLayout: setContextSelectedLayout } = useCertificateLayout()

  // Debounced field save reference
  const debouncedFieldSave = useRef<{ [fieldId: number]: NodeJS.Timeout }>({})

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
        name: t('certificateLayouts.newLayout'),
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

  // Edit layout (open designer) — always fetch fresh data from API
  const handleEditLayout = async (layout: Layout) => {
    try {
      // Invalidate cache and fetch fresh layout data to avoid stale image paths
      invalidateCache(`/layouts/${layout.int_layoutid}`)
      const freshLayout = await apiGet(`/layouts/${layout.int_layoutid}`)
      console.log('Opening designer with fresh layout data:', freshLayout)
      setSelectedLayout(freshLayout)
      setShowDesigner(true)
    } catch (error) {
      console.error('Error fetching fresh layout data, using local copy:', error)
      // Fallback to local data if API call fails
      setSelectedLayout(layout)
      setShowDesigner(true)
    }
  }

  // Delete layout
  const handleDeleteLayout = async (layout: Layout) => {
    console.log('Delete button clicked for layout:', layout)
    
    if (!confirm(t('certificateLayouts.confirmDelete'))) {
      console.log('Delete cancelled by user')
      return
    }

    console.log('Attempting to delete layout:', layout.int_layoutid)
    try {
      const response = await apiDelete(`/layouts/${layout.int_layoutid}`)
      console.log('Delete response:', response)
      setLayouts(prev => prev.filter(l => l.int_layoutid !== layout.int_layoutid))
      console.log('Layout removed from state')
    } catch (error) {
      console.error('Error deleting layout:', error)
      alert(t('certificateLayouts.deleteError', { error: error instanceof Error ? error.message : String(error) }))
    }
  }

  // Duplicate layout
  const handleDuplicateLayout = async (layout: Layout) => {
    const newName = prompt(t('certificateLayouts.enterDuplicateName'), `${layout.var_name} ${t('certificateLayouts.copyLabel')}`)
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

  // Select layout for certificate printing
  const handleSelectLayout = (layout: Layout) => {
    // Convert Layout to CertificateLayout format
    const certificateLayout = {
      ...layout,
      fields: layout.fields?.map(field => ({
        ...field,
        var_text: field.var_value,
        var_spaltenwert: null
      }))
    }
    setContextSelectedLayout(certificateLayout)
    console.log(`Selected layout "${layout.var_name}" for certificate printing`)
  }

  // Save layout from designer
  const saveLayoutFromDesigner = async (layout: Layout) => {
    try {
      console.log('Saving layout:', layout)
      
      // Cancel all pending debounced field saves to prevent race conditions
      // (debounced saves from handleFieldsChange could overwrite with stale data)
      Object.values(debouncedFieldSave.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
      debouncedFieldSave.current = {}
      
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
      
      // Validate name length (API expects max 100 characters)
      if (layoutData.name.length > 100) {
        throw new Error('Layout name is too long (max 100 characters)')
      }
      
      // First, update the layout metadata
      await apiPut(`/layouts/${layout.int_layoutid}`, layoutData)
      
      // Then, if there are fields, save them too
      if (layout.fields && layout.fields.length > 0) {
        console.log('Saving fields:', layout.fields)
        
        for (const field of layout.fields) {
          console.log('Processing field:', field)
          
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
          
          if (field.int_layout_felderid < 0) {
            await apiPost(`/layouts/${layout.int_layoutid}/fields`, fieldData)
          } else {
            await apiPut(`/layouts/${layout.int_layoutid}/fields/${field.int_layout_felderid}`, fieldData)
          }
        }
      }
      
      // Close designer and refresh the complete list to show updated name/comment
      setShowDesigner(false)
      setSelectedLayout(null)
      
      // Invalidate the API cache for layouts before re-fetching
      // Without this, apiGet may return stale cached data (30s cache) showing old image paths
      invalidateCache('/layouts')
      
      // Reload all layouts to ensure UI is in sync with database
      await fetchLayouts()
      
    } catch (error) {
      console.error('Error saving layout:', error)
      alert('Error saving layout. Please check the console for details.')
    }
  }

  // Handle field changes from designer with debouncing
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

      // Check for deletions
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
        if (debouncedFieldSave.current[field.int_layout_felderid]) {
          clearTimeout(debouncedFieldSave.current[field.int_layout_felderid])
        }
        
        debouncedFieldSave.current[field.int_layout_felderid] = setTimeout(async () => {
          try {
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
              console.log('Creating new field:', fieldData)
              const newField = await apiPost(`/layouts/${selectedLayout.int_layoutid}/fields`, fieldData)
              field.int_layout_felderid = newField.int_layout_felderid
              
              setSelectedLayout(prev => ({
                ...prev!,
                fields: prev!.fields?.map(f => 
                  f.int_layout_felderid === field.int_layout_felderid ? { ...f, int_layout_felderid: newField.int_layout_felderid } : f
                ) || []
              }))
            } else {
              console.log('Updating field:', field.int_layout_felderid, fieldData)
              await apiPut(`/layouts/${selectedLayout.int_layoutid}/fields/${field.int_layout_felderid}`, fieldData)
            }
            
            console.log('Field saved successfully:', field.int_layout_felderid)
          } catch (error) {
            console.error('Error saving field:', field.int_layout_felderid, error)
          }
        }, 500)
      }
      
    } catch (error) {
      console.error('Error updating fields:', error)
    }
  }

  // Sort and filter layouts
  const sortedLayouts = sortData(layouts, (layout) => {
    if (sortKey === 'fieldCount') return layout.fieldCount || 0;
    if (sortKey === 'txt_comment') return layout.txt_comment || '';
    return layout[sortKey as keyof Layout];
  });

  const filteredLayouts = sortedLayouts.filter(layout =>
    layout.var_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    layout.txt_comment?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchTerm('')
  }

  // Export functionality
  const handleExportCSV = () => {
    const exportData = layouts.map(layout => ({
      'Name': layout.var_name,
      'Comment': layout.txt_comment || '',
      'Field Count': layout.fieldCount || 0,
      'ID': layout.int_layoutid
    }))
    
    // Simple CSV export
    const headers = ['Name', 'Comment', 'Field Count', 'ID'] as const
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'certificate-layouts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Render table headers
  const renderTableHeaders = () => (
    <tr>
      <SortableTableHeader
        label={t('certificateLayouts.layoutName')}
        sortKey="var_name"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('certificateLayouts.comment')}
        sortKey="txt_comment"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <SortableTableHeader
        label={t('certificateLayouts.fields')}
        sortKey="fieldCount"
        currentSortKey={sortKey}
        currentSortDirection={sortDirection}
        onSort={handleSort}
      />
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('certificateLayouts.status')}
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        {t('certificateLayouts.actions')}
      </th>
    </tr>
  )

  // Render table row
  const renderTableRow = (layout: Layout, index: number) => (
    <tr key={layout.int_layoutid} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{layout.var_name}</div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-600 max-w-xs truncate">
          {layout.txt_comment || '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {t('certificateLayouts.fieldsCount', { count: layout.fieldCount || 0 })}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {contextSelectedLayout?.int_layoutid === layout.int_layoutid ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {t('certificateLayouts.selectedForPrinting')}
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {t('certificateLayouts.available')}
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleSelectLayout(layout)}
            className={`p-2 rounded-lg transition-colors ${
              contextSelectedLayout?.int_layoutid === layout.int_layoutid
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={t('certificateLayouts.selectForPrinting')}
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditLayout(layout)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('certificateLayouts.editLayout')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDuplicateLayout(layout)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title={t('certificateLayouts.duplicateLayout')}
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteLayout(layout)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('certificateLayouts.deleteLayout')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )

  // Render card view
  const renderCard = (layout: Layout) => (
    <div key={layout.int_layoutid} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {layout.var_name}
          </h3>
          {layout.txt_comment && (
            <p className="text-sm text-gray-600 mb-2">{layout.txt_comment}</p>
          )}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="inline-flex items-center">
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              {t('certificateLayouts.fieldsCount', { count: layout.fieldCount || 0 })}
            </span>
            {contextSelectedLayout?.int_layoutid === layout.int_layoutid && (
              <span className="inline-flex items-center text-green-600">
                <PrinterIcon className="h-4 w-4 mr-1" />
                {t('certificateLayouts.selectedForPrinting')}
              </span>
            )}
          </div>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={() => handleSelectLayout(layout)}
            className={`p-2 rounded-lg transition-colors ${
              contextSelectedLayout?.int_layoutid === layout.int_layoutid
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={t('certificateLayouts.selectForPrinting')}
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditLayout(layout)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={t('certificateLayouts.editLayout')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDuplicateLayout(layout)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title={t('certificateLayouts.duplicateLayout')}
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteLayout(layout)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={t('certificateLayouts.deleteLayout')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  // Help content
  const helpContent = (
    <BlueInfoBox title={t('certificateLayouts.help.title')}>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-blue-900 mb-2">{t('certificateLayouts.help.layoutManagement')}</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>{t('certificateLayouts.help.createLayouts')}</li>
            <li>{t('certificateLayouts.help.editLayouts')}</li>
            <li>{t('certificateLayouts.help.duplicateLayouts')}</li>
            <li>{t('certificateLayouts.help.selectLayouts')}</li>
            <li>{t('certificateLayouts.help.deleteLayouts')}</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-900 mb-2">{t('certificateLayouts.help.layoutDesigner')}</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>{t('certificateLayouts.help.addElements')}</li>
            <li>{t('certificateLayouts.help.positionElements')}</li>
            <li>{t('certificateLayouts.help.configureFonts')}</li>
            <li>{t('certificateLayouts.help.previewLayout')}</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-medium text-blue-900 mb-2">{t('certificateLayouts.help.specialFeatures')}</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>{t('certificateLayouts.help.duplicateFeature')}</strong></li>
            <li><strong>{t('certificateLayouts.help.selectFeature')}</strong></li>
            <li><strong>{t('certificateLayouts.help.designerIntegration')}</strong></li>
          </ul>
        </div>
      </div>
    </BlueInfoBox>
  )

  return (
    <>
      <DatabaseManagementTemplate
        title={t('certificateLayouts.title')}
        subtitle={t('certificateLayouts.subtitle', { count: layouts.length })}
        icon={DocumentTextIcon}
        data={filteredLayouts}
        isLoading={isLoading}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={t('certificateLayouts.searchPlaceholder')}
        itemsPerPage={20}
        viewStorageKey="certificate-layouts-view"
        onAdd={handleCreateLayout}
        addLabel={t('certificateLayouts.addLayout')}
        onExportCSV={handleExportCSV}
        renderTableHeaders={renderTableHeaders}
        renderTableRow={renderTableRow}
        renderCard={renderCard}
        onClearAllFilters={handleClearAllFilters}
        showFilters={false}
        showHelpPanel={showHelpPanel}
        onToggleHelpPanel={() => setShowHelpPanel(!showHelpPanel)}
        helpContent={helpContent}
        helpLabel={t('certificateLayouts.layoutHelp')}
      />
      
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
    </>
  )
}

export default CertificateLayouts
