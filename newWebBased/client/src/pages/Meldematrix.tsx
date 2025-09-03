import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  DocumentArrowDownIcon,
  PrinterIcon,
  FunnelIcon,
  XMarkIcon,
  HomeIcon
} from '@heroicons/react/24/outline'

interface Club {
  id: number
  name: string
  shortName?: string
}

interface Competition {
  id: number
  name: string
  number?: string
  gender?: string
  ageFrom?: number
  ageTo?: number
}

interface RegistrationData {
  [clubId: number]: {
    [competitionId: number]: number
  }
}

export default function Meldematrix() {
  const { selectedEvent } = useEvent()
  const [searchParams] = useSearchParams()
  const eventId = searchParams.get('eventId') || selectedEvent?.int_eventid

  const [clubs, setClubs] = useState<Club[]>([])
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [registrationData, setRegistrationData] = useState<RegistrationData>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [genderFilter, setGenderFilter] = useState<string>('all')
  const [clubFilter, setClubFilter] = useState<string>('')

  useEffect(() => {
    if (!eventId) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch meldematrix data from the specialized endpoint
        const response = await fetch(`/api/meldematrix?eventId=${eventId}`)
        if (!response.ok) throw new Error('Failed to fetch meldematrix data')
        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'API returned error')
        }

        const { clubs, competitions, registrationMatrix } = data.data
        
        // Transform and set the data
        setClubs(clubs || [])
        setCompetitions(competitions || [])
        setRegistrationData(registrationMatrix || {})

      } catch (err) {
        console.error('Error fetching meldematrix data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId])

  // Filter data based on current filters
  const filteredClubs = clubs.filter(club => 
    clubFilter === '' || club.name.toLowerCase().includes(clubFilter.toLowerCase())
  )

  const filteredCompetitions = competitions.filter(competition =>
    genderFilter === 'all' || competition.gender === genderFilter
  )

  // Calculate totals
  const getClubTotal = (clubId: number): number => {
    const clubData = registrationData[clubId] || {}
    return Object.values(clubData).reduce((sum: number, count: number) => sum + count, 0)
  }

  const getCompetitionTotal = (competitionId: number): number => {
    return Object.keys(registrationData).reduce((sum: number, clubIdStr) => {
      const clubId = parseInt(clubIdStr)
      const clubData = registrationData[clubId] || {}
      return sum + (clubData[competitionId] || 0)
    }, 0)
  }

  const getGrandTotal = (): number => {
    return Object.keys(registrationData).reduce((sum: number, clubIdStr) => {
      const clubId = parseInt(clubIdStr)
      const clubData = registrationData[clubId] || {}
      return sum + Object.values(clubData).reduce((clubSum: number, count: number) => clubSum + count, 0)
    }, 0)
  }

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    console.log('Exporting Meldematrix as PDF...')
    alert('PDF Export functionality will be implemented')
  }

  const handlePrint = () => {
    window.print()
  }

  const clearFilters = () => {
    setGenderFilter('all')
    setClubFilter('')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <h3 className="text-lg font-medium">Error loading Meldematrix</h3>
            <p className="mt-2">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              to="/dashboard"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <HomeIcon className="h-4 w-4 mr-2" />
              Home
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meldematrix</h1>
              <p className="text-gray-600 mt-1">
                Registration overview: Clubs vs Competitions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PrinterIcon className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Event Context */}
        {selectedEvent && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Selected Event:</span> {selectedEvent.var_eventname}
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Genders</option>
                <option value="männlich">Männlich</option>
                <option value="weiblich">Weiblich</option>
                <option value="gemischt">Gemischt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Club Name
              </label>
              <input
                type="text"
                value={clubFilter}
                onChange={(e) => setClubFilter(e.target.value)}
                placeholder="Search clubs..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                  Verein
                </th>
                {filteredCompetitions.map((competition) => (
                  <th
                    key={competition.id}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]"
                    title={`${competition.name}${competition.number ? ` (Nr. ${competition.number})` : ''} - ${competition.gender || ''} ${competition.ageFrom || ''}${competition.ageTo ? `-${competition.ageTo}` : ''} Jahre`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <div className="font-bold text-gray-700">
                        {competition.number ? `Nr. ${competition.number}` : `ID ${competition.id}`}
                      </div>
                      <div className="transform -rotate-45 origin-center whitespace-nowrap text-xs">
                        {competition.name}
                      </div>
                      {(competition.gender || competition.ageFrom) && (
                        <div className="text-xs text-gray-500">
                          {competition.gender && competition.gender !== 'unbekannt' ? competition.gender.charAt(0).toUpperCase() : ''}
                          {competition.ageFrom && ` ${competition.ageFrom}${competition.ageTo ? `-${competition.ageTo}` : ''}J`}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50">
                  Ges.
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClubs.map((club, index) => (
                <tr key={club.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                    {club.name}
                  </td>
                  {filteredCompetitions.map((competition) => {
                    const count = registrationData[club.id]?.[competition.id] || 0
                    return (
                      <td
                        key={competition.id}
                        className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900"
                      >
                        {count > 0 ? count : ''}
                      </td>
                    )
                  })}
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-center text-gray-900 bg-blue-50">
                    {getClubTotal(club.id)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-gray-100 z-10">
                  Gesamt
                </td>
                {filteredCompetitions.map((competition) => (
                  <td
                    key={competition.id}
                    className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900"
                  >
                    {getCompetitionTotal(competition.id)}
                  </td>
                ))}
                <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-center text-gray-900 bg-blue-100">
                  {getGrandTotal()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{filteredClubs.length}</div>
          <div className="text-sm text-gray-600">Participating Clubs</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{filteredCompetitions.length}</div>
          <div className="text-sm text-gray-600">Available Competitions</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">{getGrandTotal()}</div>
          <div className="text-sm text-gray-600">Total Registrations</div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          table {
            font-size: 8px;
          }
          th, td {
            padding: 2px !important;
          }
        }
      `}</style>
    </div>
  )
}
