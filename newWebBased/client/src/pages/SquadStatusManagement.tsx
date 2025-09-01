import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  ClipboardDocumentListIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { useEvent } from '@/contexts/EventContext'
import { apiGet } from '@/utils/api'

// Types
interface SquadDisciplineStatus {
  id: number
  eventId: number
  squadName: string
  disciplineId: number
  disciplineName: string
  disciplineShort: string
  statusId: number
  status: {
    id: number
    name: string
    colorCode: string
  }
  round: number | null
  isFirstApparatus: boolean
}

interface Status {
  int_statusid: number
  var_name: string
  ary_colorcode: string
}

interface Event {
  int_eventid: number
  var_eventname: string
}

export function SquadStatusManagement() {
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()
  
  // URL parameters as fallback
  const urlEventId = searchParams.get('eventId')
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId

  // State management
  const [loading, setLoading] = useState(true)
  const [squadDisciplines, setSquadDisciplines] = useState<SquadDisciplineStatus[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '')
  
  // Filters
  const [filterSquad, setFilterSquad] = useState('')
  const [filterDiscipline, setFilterDiscipline] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  // View options
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [editingItem, setEditingItem] = useState<SquadDisciplineStatus | null>(null)

  // Load initial data
  useEffect(() => {
    if (selectedEventId) {
      loadData()
    }
  }, [selectedEventId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load squad disciplines
      const squadDisciplinesData = await apiGet(`/squad-disciplines?eventId=${selectedEventId}`)
      setSquadDisciplines(squadDisciplinesData.squadDisciplines || [])

      // Load statuses
      const statusesData = await apiGet('/statuses?limit=100')
      setStatuses(statusesData.statuses || [])

      // Load events if not selected
      if (!selectedEvent) {
        const eventsData = await apiGet('/events?limit=100')
        setEvents(eventsData.events || [])
      }

    } catch (error) {
      console.error('Error loading squad status data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Update status
  const updateStatus = async (item: SquadDisciplineStatus, newStatusId: number) => {
    try {
      const response = await fetch(`/api/squad-disciplines/${encodeURIComponent(item.squadName)}/${item.disciplineId}/status?eventId=${item.eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statusId: newStatusId
        }),
      })

      if (response.ok) {
        // Update local state
        const newStatus = statuses.find(s => s.int_statusid === newStatusId)
        if (newStatus) {
          setSquadDisciplines(prev => prev.map(sd => 
            sd.id === item.id ? {
              ...sd,
              statusId: newStatusId,
              status: {
                id: newStatus.int_statusid,
                name: newStatus.var_name,
                colorCode: newStatus.ary_colorcode
              }
            } : sd
          ))
        }
        setEditingItem(null)
      } else {
        const errorData = await response.json()
        alert(`Failed to update status: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status due to network error')
    }
  }

  // Get status color style from actual color code
  const getStatusColor = (colorCode: string): { style: React.CSSProperties; className: string } => {
    if (!colorCode) return { 
      style: {}, 
      className: 'bg-gray-100 text-gray-800 border border-gray-200' 
    }
    
    try {
      // Handle different color code formats
      let rgbValues: number[] = []
      
      if (colorCode.startsWith('{') && colorCode.endsWith('}')) {
        // Format: {255,0,0}
        const cleanCode = colorCode.slice(1, -1)
        rgbValues = cleanCode.split(',').map(v => parseInt(v.trim()))
      } else if (colorCode.startsWith('rgb(') && colorCode.endsWith(')')) {
        // Format: rgb(255,0,0)
        const cleanCode = colorCode.slice(4, -1)
        rgbValues = cleanCode.split(',').map(v => parseInt(v.trim()))
      } else if (colorCode.startsWith('#')) {
        // Format: #ff0000
        const hex = colorCode.slice(1)
        rgbValues = [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16)
        ]
      } else {
        // Try to parse as comma-separated values
        rgbValues = colorCode.split(',').map(v => parseInt(v.trim()))
      }
      
      if (rgbValues.length === 3 && rgbValues.every(v => !isNaN(v) && v >= 0 && v <= 255)) {
        const [r, g, b] = rgbValues
        
        // Calculate brightness to determine if we need light or dark background
        const brightness = (r * 299 + g * 587 + b * 114) / 1000
        
        let bgR, bgG, bgB, textR, textG, textB
        
        if (brightness < 128) {
          // Dark color - use lighter background with darker text
          bgR = Math.min(255, r + Math.max(180, 255 - r))
          bgG = Math.min(255, g + Math.max(180, 255 - g))
          bgB = Math.min(255, b + Math.max(180, 255 - b))
          textR = Math.max(0, Math.min(r * 0.3, 80))
          textG = Math.max(0, Math.min(g * 0.3, 80))
          textB = Math.max(0, Math.min(b * 0.3, 80))
        } else {
          // Light color - use the original color as background with white text
          bgR = r
          bgG = g
          bgB = b
          textR = textG = textB = brightness > 180 ? 0 : 255
        }
        
        return {
          style: {
            backgroundColor: `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`,
            color: `rgb(${Math.round(textR)}, ${Math.round(textG)}, ${Math.round(textB)})`,
            borderColor: `rgb(${r}, ${g}, ${b})`
          },
          className: 'border'
        }
      }
    } catch (error) {
      console.warn('Failed to parse color code:', colorCode, error)
    }
    
    // Fallback to generic color mapping
    if (colorCode.includes('255,0,0') || colorCode.includes('#ff0000') || colorCode.includes('red')) {
      return { style: {}, className: 'bg-red-100 text-red-800 border border-red-200' }
    } else if (colorCode.includes('0,255,0') || colorCode.includes('#00ff00') || colorCode.includes('green')) {
      return { style: {}, className: 'bg-green-100 text-green-800 border border-green-200' }
    } else if (colorCode.includes('255,255,0') || colorCode.includes('#ffff00') || colorCode.includes('yellow')) {
      return { style: {}, className: 'bg-yellow-100 text-yellow-800 border border-yellow-200' }
    } else if (colorCode.includes('0,0,255') || colorCode.includes('#0000ff') || colorCode.includes('blue')) {
      return { style: {}, className: 'bg-blue-100 text-blue-800 border border-blue-200' }
    }
    
    return { style: {}, className: 'bg-gray-100 text-gray-800 border border-gray-200' }
  }

  // Filter data
  const filteredData = squadDisciplines.filter(item => {
    const matchesSquad = !filterSquad || item.squadName.toLowerCase().includes(filterSquad.toLowerCase())
    const matchesDiscipline = !filterDiscipline || item.disciplineName.toLowerCase().includes(filterDiscipline.toLowerCase())
    const matchesStatus = !filterStatus || item.status.name.toLowerCase().includes(filterStatus.toLowerCase())
    
    return matchesSquad && matchesDiscipline && matchesStatus
  })

  // Get unique values for filter dropdowns
  const uniqueSquads = [...new Set(squadDisciplines.map(item => item.squadName))].sort()
  const uniqueDisciplines = [...new Set(squadDisciplines.map(item => item.disciplineName))].sort()
  const uniqueStatuses = [...new Set(squadDisciplines.map(item => item.status.name))].sort()

  // State info for header
  const getStateInfo = (): StateInfo[] => {
    const statusCounts = squadDisciplines.reduce((acc, item) => {
      acc[item.status.name] = (acc[item.status.name] || 0) + 1
      return acc
    }, {} as { [key: string]: number })

    return [
      { label: 'Total Combinations', value: squadDisciplines.length.toString(), count: squadDisciplines.length, color: 'blue' },
      { label: 'Squads', value: uniqueSquads.length.toString(), count: uniqueSquads.length, color: 'green' },
      { label: 'Disciplines', value: uniqueDisciplines.length.toString(), count: uniqueDisciplines.length, color: 'purple' },
      ...Object.entries(statusCounts).map(([status, count]) => ({
        label: status,
        value: count.toString(),
        count,
        color: 'yellow' as const
      }))
    ]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <UnifiedHeader
        title="Squad Status Management"
        description={`Manage status for squad-discipline combinations (${squadDisciplines.length} combinations loaded)`}
        icon={ClipboardDocumentListIcon}
        searchTerm=""
        onSearchChange={() => {}}
        onClearAllFilters={() => {
          setFilterSquad('')
          setFilterDiscipline('')
          setFilterStatus('')
        }}
        onExportCSV={() => {
          // TODO: Implement CSV export
          console.log('Export CSV')
        }}
        stateInfo={getStateInfo()}
        showHomeButton={true}
        homeUrl="/dashboard"
        primaryAction={{
          label: viewMode === 'table' ? 'Grid View' : 'Table View',
          icon: viewMode === 'table' ? EyeIcon : ClipboardDocumentListIcon,
          onClick: () => setViewMode(viewMode === 'table' ? 'grid' : 'table')
        }}
        totalCount={squadDisciplines.length}
        filteredCount={filteredData.length}
      />

      {/* Event Selection */}
      {!selectedEvent && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose an event...</option>
            {events.map((event) => (
              <option key={event.int_eventid} value={event.int_eventid}>
                {event.var_eventname}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Status Legend</h3>
        
        {/* Status Legend */}
        {uniqueStatuses.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status Colors</h4>
            <div className="flex flex-wrap gap-2">
              {statuses
                .filter(status => uniqueStatuses.includes(status.var_name))
                .map(status => {
                  const colorInfo = getStatusColor(status.ary_colorcode)
                  return (
                    <div key={status.int_statusid} className="flex items-center space-x-2">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorInfo.className}`}
                        style={colorInfo.style}
                      >
                        {status.var_name}
                      </span>
                    </div>
                  )
                })
              }
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Squad</label>
            <select
              value={filterSquad}
              onChange={(e) => setFilterSquad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Squads</option>
              {uniqueSquads.map(squad => (
                <option key={squad} value={squad}>{squad}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
            <select
              value={filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Disciplines</option>
              {uniqueDisciplines.map(discipline => (
                <option key={discipline} value={discipline}>{discipline}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterSquad('')
                setFilterDiscipline('')
                setFilterStatus('')
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Squad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discipline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Round</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Apparatus</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.squadName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{item.disciplineName}</div>
                        <div className="text-gray-500">{item.disciplineShort}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingItem?.id === item.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            defaultValue={item.statusId}
                            onChange={(e) => updateStatus(item, parseInt(e.target.value))}
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                          >
                            {statuses.map(status => (
                              <option key={status.int_statusid} value={status.int_statusid}>
                                {status.var_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status.colorCode).className}`}
                          style={getStatusColor(item.status.colorCode).style}
                        >
                          {item.status.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.round || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.isFirstApparatus ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingItem?.id !== item.id && (
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredData.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{item.squadName}</h3>
                  <p className="text-sm text-gray-500">{item.disciplineName}</p>
                  <p className="text-xs text-gray-400">{item.disciplineShort}</p>
                </div>
                <button
                  onClick={() => setEditingItem(item)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                  {editingItem?.id === item.id ? (
                    <select
                      defaultValue={item.statusId}
                      onChange={(e) => updateStatus(item, parseInt(e.target.value))}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {statuses.map(status => (
                        <option key={status.int_statusid} value={status.int_statusid}>
                          {status.var_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div 
                      className={`mt-1 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status.colorCode).className}`}
                      style={getStatusColor(item.status.colorCode).style}
                    >
                      {item.status.name}
                    </div>
                  )}
                </div>
                
                {item.round && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Round</label>
                    <p className="mt-1 text-sm text-gray-900">{item.round}</p>
                  </div>
                )}
                
                {item.isFirstApparatus && (
                  <div className="flex items-center text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">First Apparatus</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredData.length === 0 && (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No squad-discipline combinations found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {squadDisciplines.length === 0 ? 
              'No data available for the selected event.' : 
              'Try adjusting your filters to see results.'
            }
          </p>
        </div>
      )}
    </div>
  )
}
