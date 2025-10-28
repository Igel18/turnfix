import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvent } from '../contexts/EventContext'
import { TrophyIcon } from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { useMedals, MedalStanding } from '../hooks/useMedals'
import { 
  addPDFHeaderFooter, 
  getContentArea,
  getUnifiedTableStyles,
  addSectionTitle,
  PDF_CONFIG
} from '@/utils/pdfUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import getSocket from '@/utils/socket'

export default function Medallienspiegel() {
  const { t } = useTranslation()
  const { selectedEvent } = useEvent()
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  
  const { medalData, loading, error, refetch } = useMedals(
    selectedEvent ? selectedEvent.int_eventid : null
  )

  // Socket.IO: Listen for real-time medal updates
  useEffect(() => {
    if (!selectedEvent) return

    const selectedEventId = selectedEvent.int_eventid
    const socket = getSocket()
    socket.emit('join-competition', selectedEventId)

    const handleMedalUpdate = () => {
      console.log('🏅 Medal standings update received, refetching data...')
      refetch()
    }

    socket.on('score-updated', handleMedalUpdate)
    socket.on('medal-updated', handleMedalUpdate)

    return () => {
      socket.emit('leave-competition', selectedEventId)
      socket.off('score-updated', handleMedalUpdate)
      socket.off('medal-updated', handleMedalUpdate)
    }
  }, [selectedEvent, refetch])

  const handleExportPDF = () => {
    if (!medalData || !selectedEvent) {
      console.error('Cannot export PDF: Missing medalData or selectedEvent')
      return
    }

    if (!medalData.standings || medalData.standings.length === 0) {
      console.error('Cannot export PDF: No medal standings data')
      alert(t('medallienspiegel.noDataToExport'))
      return
    }

    try {
      console.log('Starting PDF export with data:', {
        eventName: medalData.eventName,
        standingsCount: medalData.standings.length,
        selectedEvent: selectedEvent.var_eventname
      })

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
      
      // For landscape A4: width = 297mm, height = 210mm
      const contentArea = getContentArea(297, 210)
      
      // Add header and footer with landscape dimensions
      const eventForPDF = {
        int_eventid: selectedEvent.int_eventid,
        var_eventname: selectedEvent.var_eventname || medalData.eventName,
        dat_eventstartdate: selectedEvent.dat_eventstartdate || '',
        dat_eventenddate: selectedEvent.dat_eventenddate || '',
        var_location: selectedEvent.var_location || '',
        status: selectedEvent.status || 'completed' as const
      }

      addPDFHeaderFooter({
        doc,
        event: eventForPDF,
        documentTitle: t('medallienspiegel.title'),
        pageWidth: 297,
        pageHeight: 210
      })

      // Title and event info
      let yPosition = contentArea.startY + 10
      yPosition = addSectionTitle(doc, t('medallienspiegel.title'), yPosition)
      
      doc.setFontSize(PDF_CONFIG.fonts.body.size)
      doc.setFont('helvetica', 'normal')
      doc.text(`${t('medallienspiegel.event')}: ${medalData.eventName}`, contentArea.startX, yPosition)
      yPosition += PDF_CONFIG.spacing.line + 5

      // Prepare medal standings table data
      const tableColumns = [
        { header: t('medallienspiegel.table.rank'), dataKey: 'rank' },
        { header: t('medallienspiegel.table.club'), dataKey: 'clubName' },
        { header: t('medallienspiegel.table.gold'), dataKey: 'gold' },
        { header: t('medallienspiegel.table.silver'), dataKey: 'silver' },
        { header: t('medallienspiegel.table.bronze'), dataKey: 'bronze' },
        { header: t('medallienspiegel.table.total'), dataKey: 'total' },
        { header: t('medallienspiegel.table.starters'), dataKey: 'starters' }
      ]

      const tableData = medalData.standings
        .sort((a, b) => {
          // Sort by total medals desc, then by gold desc, then by silver desc
          if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals
          if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold
          if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver
          return b.totalBronze - a.totalBronze
        })
        .map((standing, index) => ({
          rank: index + 1,
          clubName: standing.clubName,
          gold: standing.totalGold,
          silver: standing.totalSilver,
          bronze: standing.totalBronze,
          total: standing.totalMedals,
          starters: standing.totalStarters
        }))

      // Summary statistics
      const totalMedals = tableData.reduce((sum, row) => sum + row.total, 0)
      const totalStarters = tableData.reduce((sum, row) => sum + row.starters, 0)
      
      doc.text(`${t('medallienspiegel.participatingClubs')}: ${tableData.length}`, contentArea.startX, yPosition)
      doc.text(`${t('medallienspiegel.totalMedals')}: ${totalMedals}`, contentArea.startX + 80, yPosition)
      doc.text(`${t('medallienspiegel.totalStarters')}: ${totalStarters}`, contentArea.startX + 150, yPosition)
      yPosition += PDF_CONFIG.spacing.section

      console.log('PDF table data prepared:', tableData)

      // Get unified table styles
      const unifiedStyles = getUnifiedTableStyles()

      autoTable(doc, {
        head: [tableColumns.map(col => col.header)],
        body: tableData.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
        startY: yPosition,
        ...unifiedStyles,
        columnStyles: {
          0: { halign: 'center', cellWidth: 20 }, // Rang
          1: { halign: 'left', cellWidth: 120 }, // Verein (wider for club names)
          2: { halign: 'center', cellWidth: 25, fillColor: [255, 215, 0] }, // Gold
          3: { halign: 'center', cellWidth: 25, fillColor: [192, 192, 192] }, // Silber
          4: { halign: 'center', cellWidth: 25, fillColor: [205, 127, 50] }, // Bronze
          5: { halign: 'center', cellWidth: 25 }, // Summe
          6: { halign: 'center', cellWidth: 30 } // Starter
        },
        didDrawPage: function(data) {
          // Add header and footer to each new page
          addPDFHeaderFooter({
            doc,
            event: eventForPDF,
            documentTitle: t('medallienspiegel.title'),
            pageWidth: 297,
            pageHeight: 210
          })
          
          // Adjust next page start position to account for header
          if (data.pageNumber > 1) {
            const headerSpace = 35
            data.settings.startY = headerSpace
          }
        }
      })

      // After table is complete, update all pages with correct page numbers
      const finalPageCount = doc.getNumberOfPages()
      for (let i = 1; i <= finalPageCount; i++) {
        doc.setPage(i)
        // Clear previous footer area
        doc.setFillColor(255, 255, 255)
        doc.rect(10, 210 - 15 - 6, 297 - 20, 15 + 6, 'F')
        
        // Add updated footer with correct page count
        const footerY = 210 - 15
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(0, 0, 0)
        doc.text('created with TurnFix', 10, footerY)
        doc.text('github.com/Igel18/turnfix', 10, footerY + 4)
        doc.text(`${i} / ${finalPageCount}`, 297 / 2, footerY + 2, { align: 'center' })
        
        const currentDateTime = new Date().toLocaleString('de-DE')
        doc.text(currentDateTime, 297 - 10, footerY, { align: 'right' })
        doc.text('GNU GPL v3', 297 - 10, footerY + 4, { align: 'right' })
        doc.line(10, footerY - 5, 297 - 10, footerY - 5)
      }

      const fileName = `medallienspiegel_${medalData.eventName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      console.log('Saving PDF as:', fileName)
      doc.save(fileName)
      
      console.log('PDF export completed successfully')
    } catch (error) {
      console.error('Error during PDF export:', error)
      alert(t('medallienspiegel.exportError'))
    }
  }

  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <UnifiedPageHeader
            title={t('medallienspiegel.title')}
            subtitle={t('medallienspiegel.subtitle')}
            icon={TrophyIcon}
            showEventContext={true}
          />
          <div className="text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('medallienspiegel.noEventTitle')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('medallienspiegel.noEventMessage')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          <UnifiedPageHeader
            title={t('medallienspiegel.title')}
            subtitle={t('medallienspiegel.subtitle')}
            icon={TrophyIcon}
            showEventContext={true}
          />
          <div className="text-center">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{t('medallienspiegel.loadError')}</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={refetch}
                      className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded-md hover:bg-red-200"
                    >
                      {t('medallienspiegel.retry')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <UnifiedPageHeader
          title={t('medallienspiegel.title')}
          subtitle={t('medallienspiegel.subtitleWithEvent', { eventName: selectedEvent.var_eventname })}
          icon={TrophyIcon}
          showEventContext={true}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showViewToggle={true}
          onExportPDF={handleExportPDF}
          showExportPDF={true}
          totalCount={medalData?.standings.length || 0}
        />

        {loading ? (
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('medallienspiegel.loading')}
            </div>
          </div>
        ) : medalData && medalData.standings.length > 0 ? (
          viewMode === 'table' ? (
            <MedalTable standings={medalData.standings} />
          ) : (
            <MedalGrid standings={medalData.standings} />
          )
        ) : (
          <div className="text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('medallienspiegel.noMedalsTitle')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {t('medallienspiegel.noMedalsMessage')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MedalTable({ standings }: { standings: MedalStanding[] }) {
  const { t } = useTranslation()
  // Sort standings by total medals desc, then by gold desc, then by silver desc
  const sortedStandings = [...standings].sort((a, b) => {
    if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals
    if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold
    if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver
    return b.totalBronze - a.totalBronze
  })

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('medallienspiegel.table.rank')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('medallienspiegel.table.club')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              🥇 {t('medallienspiegel.table.gold')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              🥈 {t('medallienspiegel.table.silver')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              🥉 {t('medallienspiegel.table.bronze')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('medallienspiegel.table.total')}
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t('medallienspiegel.table.starters')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedStandings.map((standing, index) => (
            <tr key={standing.clubId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{standing.clubName}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {standing.totalGold}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {standing.totalSilver}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {standing.totalBronze}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                {standing.totalMedals}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                {standing.totalStarters}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

function MedalGrid({ standings }: { standings: MedalStanding[] }) {
  const { t } = useTranslation()
  // Sort standings by total medals desc, then by gold desc, then by silver desc
  const sortedStandings = [...standings].sort((a, b) => {
    if (a.totalMedals !== b.totalMedals) return b.totalMedals - a.totalMedals
    if (a.totalGold !== b.totalGold) return b.totalGold - a.totalGold
    if (a.totalSilver !== b.totalSilver) return b.totalSilver - a.totalSilver
    return b.totalBronze - a.totalBronze
  })

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {sortedStandings.map((standing, index) => (
        <div key={standing.clubId} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-md bg-indigo-500 text-white font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {standing.clubName}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('medallienspiegel.grid.startersCount', { count: standing.totalStarters })}
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{standing.totalGold}</div>
                  <div className="text-xs text-gray-500">🥇 {t('medallienspiegel.grid.gold')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{standing.totalSilver}</div>
                  <div className="text-xs text-gray-500">🥈 {t('medallienspiegel.grid.silver')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{standing.totalBronze}</div>
                  <div className="text-xs text-gray-500">🥉 {t('medallienspiegel.grid.bronze')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{standing.totalMedals}</div>
                  <div className="text-xs text-gray-500">{t('medallienspiegel.grid.total')}</div>
                </div>
              </div>
            </div>

            {standing.competitions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">{t('medallienspiegel.grid.byCompetition')}:</h4>
                <div className="space-y-1">
                  {standing.competitions.map((comp) => (
                    <div key={comp.competitionId} className="text-xs text-gray-600">
                      <span className="font-medium">{comp.competitionName}:</span>
                      <span className="ml-1">
                        🥇{comp.gold} 🥈{comp.silver} 🥉{comp.bronze}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
