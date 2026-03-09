import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent } from '../contexts/EventContext'
import { 
  TableCellsIcon
} from '@heroicons/react/24/outline'
import { EventManagementTemplate } from '../components/templates/EventManagementTemplate'
import MatrixView, { MatrixCountCell, MatrixColumn, MatrixRow } from '../components/MatrixView'
import { exportWideTablePDF } from '../utils/pdfUtils'

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
  const { t } = useTranslation()
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

        console.log(`Fetching meldematrix data for event ${eventId}`)

        // Fetch meldematrix data from the specialized endpoint
        const response = await fetch(`/api/meldematrix?eventId=${eventId}`)
        
        console.log(`API response status: ${response.status}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`API error response: ${errorText}`)
          throw new Error(`Failed to fetch meldematrix data: ${response.status} ${response.statusText}`)
        }
        
        const data = await response.json()
        console.log('API response data:', data)
        
        if (!data.success) {
          throw new Error(data.error || data.message || 'API returned error')
        }

        const { clubs, competitions, registrationMatrix } = data.data
        
        console.log(`Found ${clubs?.length || 0} clubs, ${competitions?.length || 0} competitions`)
        
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
    try {
      // Convert event to format expected by pdfUtils
      const eventForPDF = selectedEvent ? {
        int_eventid: selectedEvent.int_eventid,
        var_eventname: selectedEvent.var_eventname,
        dat_eventstartdate: selectedEvent.dat_eventstartdate,
        dat_eventenddate: selectedEvent.dat_eventenddate,
        var_location: selectedEvent.var_location,
        status: 'active' as const
      } : null

      // Prepare table columns: show competition name + number + gender/age on separate lines
      const tableColumns = [
        t('pdf.common.club'),
        ...filteredCompetitions.map(comp => {
          const num = comp.number ? comp.number.toString().padStart(4, '0') : comp.id.toString().padStart(4, '0')
          const genderAge = comp.gender && comp.gender !== 'unbekannt'
            ? `${comp.gender.charAt(0).toUpperCase()} ${comp.ageFrom ?? ''}${comp.ageTo ? `-${comp.ageTo}` : ''}${comp.ageFrom || comp.ageTo ? 'J' : ''}`
            : (comp.ageFrom || comp.ageTo)
              ? `${comp.ageFrom ?? ''}${comp.ageTo ? `-${comp.ageTo}` : ''}J`
              : ''
          const line2 = genderAge ? `${num} · ${genderAge}` : num
          return `${comp.name}\n${line2}`
        }),
        t('pdf.common.total')
      ]

      // Prepare table data
      const tableData = filteredClubs.map(club => {
        const row = [club.name]
        
        filteredCompetitions.forEach(competition => {
          const count = registrationData[club.id]?.[competition.id] || 0
          row.push(count > 0 ? count.toString() : '')
        })
        
        row.push(getClubTotal(club.id).toString())
        return row
      })

      // Add totals row
      const totalsRow = ['']
      filteredCompetitions.forEach(competition => {
        totalsRow.push(getCompetitionTotal(competition.id).toString())
      })
      totalsRow.push(getGrandTotal().toString())
      tableData.push(totalsRow)

      // Use the general-purpose wide table export with automatic column splitting
      exportWideTablePDF({
        orientation: 'landscape',
        event: eventForPDF,
        documentTitle: t('pdf.documentTitles.meldematrix'),
        columns: tableColumns,
        data: tableData,
        frozenColumns: 1,          // Club name is always visible
        frozenColumnWidth: 40,
        dataColumnWidth: 25,       // Fixed width for all competition columns (same as Gesamt)
        tableOptions: {
          columnStyles: {
            0: { halign: 'left', minCellWidth: 40 },
          },
          totalColumnStyle: {
            halign: 'center',
            fillColor: [236, 241, 247],
            fontStyle: 'bold',
          },
          didParseCell: (data: any) => {
            // Highlight last row (totals row)
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
              data.cell.styles.fillColor = [236, 241, 247]
              data.cell.styles.fontStyle = 'bold'
            }
          },
        },
        filename: `Meldematrix_${selectedEvent?.var_eventname || 'Event'}_${new Date().toISOString().split('T')[0]}.pdf`,
      })

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert(t('meldematrix.pdfError'))
    }
  }

  const clearFilters = () => {
    setGenderFilter('all')
    setClubFilter('')
  }

  if (loading) {
    return (
      <EventManagementTemplate
        title={t('meldematrix.title')}
        subtitle={t('meldematrix.subtitle')}
        icon={TableCellsIcon}
        showEventContext={true}
        loading={true}
      >
        <div className="animate-pulse p-8">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </EventManagementTemplate>
    )
  }

  if (error) {
    return (
      <EventManagementTemplate
        title={t('meldematrix.title')}
        subtitle={t('meldematrix.subtitle')}
        icon={TableCellsIcon}
        showEventContext={true}
      >
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">
              <h3 className="text-lg font-medium">{t('meldematrix.errorTitle')}</h3>
              <p className="mt-2">{error}</p>
            </div>
          </div>
        </div>
      </EventManagementTemplate>
    )
  }

  return (
    <EventManagementTemplate
      title={t('meldematrix.title')}
      subtitle={t('meldematrix.subtitle')}
      icon={TableCellsIcon}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters(!showFilters)}
      searchTerm={clubFilter}
      onSearchChange={setClubFilter}
      searchPlaceholder={t('meldematrix.searchPlaceholder')}
      showExportPDF={true}
      onExportPDF={handleExportPDF}
      showEventContext={true}
      filterSection={
        showFilters ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('meldematrix.filters.gender')}
                </label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">{t('meldematrix.filters.all')}</option>
                  <option value="männlich">{t('meldematrix.filters.male')}</option>
                  <option value="weiblich">{t('meldematrix.filters.female')}</option>
                  <option value="gemischt">{t('meldematrix.filters.mixed')}</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('common.resetFilters')}
                </button>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      <MatrixView
        columns={[
          ...filteredCompetitions.map((competition): MatrixColumn => ({
            id: competition.id,
            label: competition.name,
            // FIX Point 100: Handle undefined ageFrom to prevent "undefinedJ"
            subLabel: (() => {
              const num = competition.number ? competition.number : competition.id.toString()
              const genderAge = competition.gender && competition.gender !== 'unbekannt' 
                ? `${competition.gender.charAt(0).toUpperCase()} ${competition.ageFrom ?? ''}${competition.ageTo ? `-${competition.ageTo}` : ''}${competition.ageFrom || competition.ageTo ? 'J' : ''}`
                : (competition.ageFrom || competition.ageTo)
                  ? `${competition.ageFrom ?? ''}${competition.ageTo ? `-${competition.ageTo}` : ''}J`
                  : ''
              return genderAge ? `${num} · ${genderAge}` : num
            })(),
            minWidth: '80px'
          })),
          // Total column
          {
            id: 'total',
            label: t('meldematrix.table.total'),
            subLabel: '',
            minWidth: '80px'
          }
        ]}
        rows={[
          // Club rows
          ...filteredClubs.map((club): MatrixRow => {
            const rowData: Record<string | number, number> = {}
            
            // Add competition counts
            filteredCompetitions.forEach((competition) => {
              rowData[competition.id] = registrationData[club.id]?.[competition.id] || 0
            })
            
            // Add total
            rowData['total'] = getClubTotal(club.id)
            
            return {
              id: club.id,
              label: club.name,
              data: rowData
            }
          }),
          // Totals row
          {
            id: 'totals',
            label: t('meldematrix.table.total'),
            isHighlighted: true,
            data: {
              ...Object.fromEntries(
                filteredCompetitions.map(comp => [comp.id, getCompetitionTotal(comp.id)])
              ),
              total: getGrandTotal()
            }
          }
        ]}
        renderCell={({ rowId, columnId, data }) => {
          const count = data as number
          const isTotalsRow = rowId === 'totals'
          const isTotalColumn = columnId === 'total'
          
          // Special styling for totals
          if (isTotalsRow || isTotalColumn) {
            return (
              <div className={`font-semibold ${isTotalsRow && isTotalColumn ? 'text-lg' : ''}`}>
                {count > 0 ? count : '-'}
              </div>
            )
          }
          
          // Regular cells
          return <MatrixCountCell count={count} showZero={false} />
        }}
        stickyFirstColumn={true}
        stickyHeader={true}
        className="shadow-sm"
        emptyMessage={t('meldematrix.statistics.totalRegistrations') + ': 0'}
      />

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{filteredClubs.length}</div>
          <div className="text-sm text-gray-600">{t('meldematrix.statistics.clubs')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{filteredCompetitions.length}</div>
          <div className="text-sm text-gray-600">{t('meldematrix.statistics.competitions')}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">{getGrandTotal()}</div>
          <div className="text-sm text-gray-600">{t('meldematrix.statistics.totalRegistrations')}</div>
        </div>
      </div>
    </EventManagementTemplate>
  )
}
