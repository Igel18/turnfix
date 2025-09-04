import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  XMarkIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '../components/UnifiedPageHeader'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable
  }
}

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
    try {
      // Create new PDF document in landscape orientation
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      // Get current date/time for footer
      const now = new Date()
      const dateTimeString = now.toLocaleString('de-DE')

      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Template layout matching the provided example
      
      // Left side - Event information (top left)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Event: ${selectedEvent?.var_eventname || 'Unknown Event'}`, 10, 15)
      doc.text(`Datum: ${selectedEvent?.dat_eventstartdate ? new Date(selectedEvent.dat_eventstartdate).toLocaleDateString('de-DE') : 'TBD'}`, 10, 20)
      doc.text(`Ort: ${selectedEvent?.var_location || 'TBD'}`, 10, 25)

      // Right side - Document title (top right)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      const documentTitle = 'Meldematrix'
      const documentTitleWidth = doc.getTextWidth(documentTitle)
      doc.text(documentTitle, pageWidth - documentTitleWidth - 10, 20)

      // Center section positioning
      const centerBoxX = 70
      const centerBoxY = 8
      const centerBoxWidth = 150
      
      // Center - Main title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0) // Black text
      const mainTitle = selectedEvent?.var_eventname || 'Event Name'
      const mainTitleWidth = doc.getTextWidth(mainTitle)
      doc.text(mainTitle, centerBoxX + (centerBoxWidth - mainTitleWidth) / 2, centerBoxY + 8)
      
      // Center - Subtitle
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      const eventYear = selectedEvent?.dat_eventstartdate ? new Date(selectedEvent.dat_eventstartdate).getFullYear() : new Date().getFullYear()
      const subtitle = `${eventYear} ${selectedEvent?.var_location || 'Location TBD'}`
      const subtitleWidth = doc.getTextWidth(subtitle)
      doc.text(subtitle, centerBoxX + (centerBoxWidth - subtitleWidth) / 2, centerBoxY + 16)

      // Reset colors for table
      doc.setDrawColor(0, 0, 0)
      doc.setTextColor(0, 0, 0)

      // Prepare table data
      const tableColumns = [
        'Verein',
        ...filteredCompetitions.map(comp => 
          comp.number ? `Wk.\n${comp.number.toString().padStart(4, '0')}` : `Wk.\n${comp.id.toString().padStart(4, '0')}`
        ),
        'Ges.'
      ]

      const tableData = filteredClubs.map(club => {
        const row = [club.name]
        
        // Add data for each competition
        filteredCompetitions.forEach(competition => {
          const count = registrationData[club.id]?.[competition.id] || 0
          row.push(count > 0 ? count.toString() : '')
        })
        
        // Add total for this club
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

      // Create table with autoTable
      autoTable(doc, {
        head: [tableColumns],
        body: tableData,
        startY: 40, // Start below the header section
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          halign: 'center',
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { halign: 'left', minCellWidth: 40 } // Verein column wider and left-aligned
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.1,
        margin: { left: 10, right: 10 },
        didDrawPage: () => {
          // Footer
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.text(`Erstellt durch TurnFix • ${dateTimeString}`, 10, pageHeight - 10)
          
          const footerRight = 'Lizenziert unter der GNU GPL v3.1 • github.com/Igel18/turnfix'
          const footerRightWidth = doc.getTextWidth(footerRight)
          doc.text(footerRight, pageWidth - footerRightWidth - 10, pageHeight - 10)
        }
      })

      // Save the PDF
      const filename = `Meldematrix_${selectedEvent?.var_eventname || 'Event'}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Fehler beim Erstellen der PDF-Datei. Bitte versuchen Sie es erneut.')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const clearFilters = () => {
    setGenderFilter('all')
    setClubFilter('')
  }

  // Filter options for the unified header
  const filterOptions = [
    {
      value: 'gender',
      label: 'Gender',
      selectedValue: genderFilter,
      onChange: (value: string) => setGenderFilter(value || 'all'),
      options: [
        { value: 'männlich', label: 'Männlich' },
        { value: 'weiblich', label: 'Weiblich' },
        { value: 'gemischt', label: 'Gemischt' }
      ]
    }
  ]

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
      <UnifiedPageHeader
        title="Meldematrix"
        subtitle="Registration overview: Clubs vs Competitions"
        icon={TableCellsIcon}
        hasFilters={true}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        searchTerm={clubFilter}
        onSearchChange={setClubFilter}
        searchPlaceholder="Search clubs..."
        filterOptions={filterOptions}
        onClearAllFilters={clearFilters}
        showPrint={true}
        onPrint={handlePrint}
        showExportPDF={true}
        onExportPDF={handleExportPDF}
        showEventContext={true}
      />

      {/* Remove the old manual filters section since it's now handled by UnifiedPageHeader */}

      {/* Matrix Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-300">
                  Verein
                </th>
                {filteredCompetitions.map((competition) => (
                  <th
                    key={competition.id}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[60px] border-r border-gray-300 hover:bg-gray-100 transition-colors cursor-help"
                    title={`${competition.name}${competition.number ? ` (Nr. ${competition.number})` : ''} - ${competition.gender || ''} ${competition.ageFrom || ''}${competition.ageTo ? `-${competition.ageTo}` : ''} Jahre`}
                  >
                    <div className="flex flex-col items-center justify-center h-16">
                      <div className="font-bold text-gray-900 text-sm">
                        {competition.number ? competition.number : competition.id}
                      </div>
                      {(competition.gender || competition.ageFrom) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {competition.gender && competition.gender !== 'unbekannt' ? competition.gender.charAt(0).toUpperCase() : ''}
                          {competition.ageFrom && ` ${competition.ageFrom}${competition.ageTo ? `-${competition.ageTo}` : ''}J`}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-r border-gray-300">
                  Ges.
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClubs.map((club, index) => (
                <tr key={club.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10 border-r border-gray-300">
                    {club.name}
                  </td>
                  {filteredCompetitions.map((competition) => {
                    const count = registrationData[club.id]?.[competition.id] || 0
                    return (
                      <td
                        key={competition.id}
                        className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-900 border-r border-gray-300"
                      >
                        {count > 0 ? count : ''}
                      </td>
                    )
                  })}
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-center text-gray-900 bg-blue-50 border-r border-gray-300">
                    {getClubTotal(club.id)}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-300">
                  Gesamt
                </td>
                {filteredCompetitions.map((competition) => (
                  <td
                    key={competition.id}
                    className="px-3 py-4 whitespace-nowrap text-sm text-center font-semibold text-gray-900 border-r border-gray-300"
                  >
                    {getCompetitionTotal(competition.id)}
                  </td>
                ))}
                <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-center text-gray-900 bg-blue-100 border-r border-gray-300">
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
