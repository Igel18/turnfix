import { useState, useEffect } from 'react'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader from '@/components/UnifiedHeader'
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api'

interface Status {
  int_statusid: number
  var_name: string
  ary_colorcode: string
  bol_bogen: boolean
  bol_karte: boolean
}

interface StatusFormData {
  var_name: string
  ary_colorcode: string
  bol_bogen: boolean
  bol_karte: boolean
}

export function StatusManagement() {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingStatus, setEditingStatus] = useState<Status | null>(null)
  const [formData, setFormData] = useState<StatusFormData>({
    var_name: '',
    ary_colorcode: '{0,0,0}',
    bol_bogen: true,
    bol_karte: true
  })

  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/statuses?limit=100')
      setStatuses(data.statuses || [])
    } catch (error) {
      console.error('Error loading statuses:', error)
      alert('Failed to load statuses')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async () => {
    try {
      if (editingStatus) {
        // Update existing status
        await apiPut(`/statuses/${editingStatus.int_statusid}`, formData)
      } else {
        // Create new status
        await apiPost('/statuses', formData)
      }
      
      await loadStatuses()
      resetForm()
    } catch (error) {
      console.error('Error saving status:', error)
      alert('Failed to save status')
    }
  }

  const handleDelete = async (statusId: number) => {
    if (!confirm('Are you sure you want to delete this status? This action cannot be undone.')) {
      return
    }

    try {
      await apiDelete(`/statuses/${statusId}`)
      await loadStatuses()
    } catch (error) {
      console.error('Error deleting status:', error)
      alert('Failed to delete status. This status may be in use.')
    }
  }

  const handleEdit = (status: Status) => {
    setEditingStatus(status)
    setFormData({
      var_name: status.var_name,
      ary_colorcode: status.ary_colorcode,
      bol_bogen: status.bol_bogen,
      bol_karte: status.bol_karte
    })
    setShowCreateModal(true)
  }

  const resetForm = () => {
    setEditingStatus(null)
    setFormData({
      var_name: '',
      ary_colorcode: '{0,0,0}',
      bol_bogen: true,
      bol_karte: true
    })
    setShowCreateModal(false)
  }

  const parseColorCode = (colorCode: string): { r: number, g: number, b: number } => {
    try {
      const match = colorCode.match(/\{(\d+),(\d+),(\d+)\}/)
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        }
      }
    } catch (error) {
      console.error('Error parsing color code:', error)
    }
    return { r: 0, g: 0, b: 0 }
  }

  const formatColorCode = (r: number, g: number, b: number): string => {
    return `{${r},${g},${b}}`
  }

  const filteredStatuses = statuses.filter(status =>
    status.var_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto">
      <UnifiedHeader
        title="Status Management"
        description={`Manage squad and participant status options (${statuses.length} statuses loaded)`}
        icon={TagIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search statuses..."
        onClearAllFilters={() => setSearchTerm('')}
        onExportCSV={() => {}}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: 'Add Status',
          icon: PlusIcon,
          onClick: () => setShowCreateModal(true)
        }}
        totalCount={statuses.length}
        filteredCount={filteredStatuses.length}
      />

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading statuses...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Show in Results Sheet
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Show in Score Card
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStatuses.map((status) => {
                  const color = parseColorCode(status.ary_colorcode)
                  return (
                    <tr key={status.int_statusid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 rounded mr-3 border border-gray-300"
                            style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                          />
                          <div className="text-sm font-medium text-gray-900">
                            {status.var_name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        RGB({color.r}, {color.g}, {color.b})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                          status.bol_bogen 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {status.bol_bogen ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                          status.bol_karte 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {status.bol_karte ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(status)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(status.int_statusid)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {filteredStatuses.length === 0 && (
            <div className="p-6 text-center">
              <TagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No statuses found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'No statuses match your search.' : 'Get started by creating your first status.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Status
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingStatus ? 'Edit Status' : 'Create New Status'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Name
                  </label>
                  <input
                    type="text"
                    value={formData.var_name}
                    onChange={(e) => setFormData({ ...formData, var_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter status name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const color = parseColorCode(formData.ary_colorcode)
                      return (
                        <>
                          <input
                            type="color"
                            value={`#${color.r.toString(16).padStart(2, '0')}${color.g.toString(16).padStart(2, '0')}${color.b.toString(16).padStart(2, '0')}`}
                            onChange={(e) => {
                              const hex = e.target.value
                              const r = parseInt(hex.slice(1, 3), 16)
                              const g = parseInt(hex.slice(3, 5), 16)
                              const b = parseInt(hex.slice(5, 7), 16)
                              setFormData({ ...formData, ary_colorcode: formatColorCode(r, g, b) })
                            }}
                            className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          <span className="text-sm text-gray-500">
                            RGB({color.r}, {color.g}, {color.b})
                          </span>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.bol_bogen}
                      onChange={(e) => setFormData({ ...formData, bol_bogen: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show in Results Sheet</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.bol_karte}
                      onChange={(e) => setFormData({ ...formData, bol_karte: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show in Score Card</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrUpdate}
                  disabled={!formData.var_name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingStatus ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatusManagement
