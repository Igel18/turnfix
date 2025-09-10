import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { useCertificateLayout } from '../contexts/CertificateLayoutContext'
import { 
  ChartBarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import { apiGet } from '../utils/api'
import { debugLog, isDebugEnabled, setDebugMode } from '@/utils/debug'
import { addPDFHeaderFooter, getContentArea } from '@/utils/pdfUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Participant {
  id: number
  name: string
  club: string
  startNumber: number
  age: number
  scores: { [discipline: string]: number }
  totalScore: number
  rank: number
  competitionId?: number
  competitionName?: string
}

interface CompetitionGroup {
  competitionId: number
  competitionName: string
  participants: Participant[]
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

interface CertificateLayout {
  int_layoutid: number
  var_name: string
  txt_comment: string | null
  fields: LayoutField[]
}

// Paper format definitions (same as LayoutDesigner)
const PAPER_FORMATS = {
  A4: { width: 595, height: 842, name: 'A4 (210 × 297 mm)' },
  A3: { width: 842, height: 1191, name: 'A3 (297 × 420 mm)' },
  A5: { width: 420, height: 595, name: 'A5 (148 × 210 mm)' },
  Letter: { width: 612, height: 792, name: 'Letter (8.5 × 11 in)' },
  Legal: { width: 612, height: 1008, name: 'Legal (8.5 × 14 in)' },
  Tabloid: { width: 792, height: 1224, name: 'Tabloid (11 × 17 in)' }
}

const Results = () => {
  const [searchParams] = useSearchParams()
  const { selectedEvent } = useEvent()
  
  // URL parameters as fallback (for direct navigation)
  const urlEventId = searchParams.get('eventId')
  const urlSquadName = searchParams.get('squadName')
  
  // Use context values or URL parameters - ALWAYS filter by event
  const eventId = selectedEvent?.int_eventid.toString() || urlEventId
  const squadName = urlSquadName
  
  const [ranking, setRanking] = useState<Participant[]>([])
  const [competitionGroups, setCompetitionGroups] = useState<CompetitionGroup[]>([])
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [eventName, setEventName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [competitions, setCompetitions] = useState<any[]>([])
  const [selectedCompetition, setSelectedCompetition] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Certificate printing state
  const { selectedLayout: contextSelectedLayout, setSelectedLayout: setContextSelectedLayout } = useCertificateLayout()
  const [certificateLayouts, setCertificateLayouts] = useState<CertificateLayout[]>([])
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedPaperFormat, setSelectedPaperFormat] = useState<keyof typeof PAPER_FORMATS>('A4')
  const [certificatesToPrint, setCertificatesToPrint] = useState<Participant[]>([])
  const [isPrintingCertificates, setIsPrintingCertificates] = useState(false)

  const getFilterOptions = () => [
    {
      value: 'competition',
      label: 'Competition',
      selectedValue: selectedCompetition,
      options: getAvailableCompetitions().map(comp => ({
        value: comp.id?.toString() || '',
        label: `${comp.name || 'Unknown Competition'}${comp.number ? ` (Nr. ${comp.number})` : ''}`
      })),
      onChange: setSelectedCompetition
    }
  ];

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedCompetition('')
  }

  // Format score with 3 decimal places
  const formatScore = (score: number) => {
    return score.toFixed(3)
  }

  // Get medal color for rankings
  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600 bg-yellow-100'
      case 2: return 'text-gray-600 bg-gray-100'
      case 3: return 'text-amber-600 bg-amber-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  // Get medal emoji
  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return rank.toString()
    }
  }

  // Fetch available competitions for the event
  const fetchCompetitions = async () => {
    if (!eventId) return

    try {
      const data = await apiGet(`/competitions?eventId=${eventId}`)
      // The API returns competitions directly as an array, not wrapped in { competitions: [] }
      const competitionsArray = Array.isArray(data) ? data : []
      setCompetitions(competitionsArray)
    } catch (error) {
      console.error('Error fetching competitions:', error)
      setCompetitions([])
    }
  }

  // Fetch ranking data for the specific event
  const fetchEventRanking = async () => {
    if (!eventId) return
    
    setIsLoading(true)
    try {
      // First, fetch participants for the event/competition
      const participantsParams = new URLSearchParams({ 
        eventId: eventId
      })
      if (selectedCompetition) {
        participantsParams.append('competitionId', selectedCompetition)
      }

      const participantsData = await apiGet(`/event-participants?${participantsParams}`)
      const participants = participantsData.participants || []

      if (participants.length === 0) {
        setRanking([])
        setCompetitionGroups([])
        setDisciplines([])
        setEventName(selectedEvent?.var_eventname || `Event ${eventId}`)
        return
      }

      // Then fetch scores for the specific event
      const scoresParams = new URLSearchParams({ 
        limit: '1000',
        eventId: eventId
      })
      if (squadName) scoresParams.append('squadName', squadName)
      if (selectedCompetition) scoresParams.append('competitionId', selectedCompetition)

      const scoresData = await apiGet(`/scores?${scoresParams}`)
      const scores = scoresData.results || []

      console.log('Fetched scores data:', scoresData)
      console.log('Scores array:', scores)
      console.log('First score:', scores[0])

      // Create a map of participant scores
      const scoresMap = new Map<number, { [discipline: string]: number }>()
      const disciplineSet = new Set<string>()

      scores.forEach((score: any) => {
        const participantId = score.participantId
        const discipline = score.discipline?.name || score.disciplineName
        const scoreValue = score.score || 0
        
        console.log('Processing score:', { participantId, discipline, scoreValue })
        
        if (!participantId || !discipline || scoreValue === null) {
          console.log('Skipping invalid score:', { participantId, discipline, scoreValue })
          return // Skip invalid scores
        }
        
        disciplineSet.add(discipline)

        if (!scoresMap.has(participantId)) {
          scoresMap.set(participantId, {})
        }
        scoresMap.get(participantId)![discipline] = scoreValue
      })

      console.log('Disciplines found:', Array.from(disciplineSet))
      console.log('Scores map:', scoresMap)

      // Build ranking list from participants with their scores
      const participantsList: Participant[] = participants.map((participant: any) => {
        const participantScores = scoresMap.get(participant.id) || {}
        const totalScore = Object.values(participantScores).reduce((sum: number, score: number) => sum + score, 0)

        return {
          id: participant.id,
          name: `${participant.firstname} ${participant.lastname}`,
          club: participant.club || 'Unknown Club',
          startNumber: participant.startNumber || 0,
          age: participant.age || 0,
          scores: participantScores,
          totalScore,
          rank: 0,
          competitionId: participant.assignedCompetitions?.[0], // Use first assigned competition
          competitionName: (() => {
            const comp = competitions.find(c => c.id === participant.assignedCompetitions?.[0] || c.id === Number(participant.assignedCompetitions?.[0]))
            return comp 
              ? `${comp.name}${comp.number ? ` (Nr. ${comp.number})` : ''}` 
              : 'Unknown Competition'
          })()
        }
      })

      if (selectedCompetition) {
        // Single competition view - normal ranking
        participantsList.sort((a, b) => b.totalScore - a.totalScore)
        participantsList.forEach((participant, index) => {
          participant.rank = index + 1
        })
        setRanking(participantsList)
        setCompetitionGroups([])
      } else {
        // Group by competition and rank within each competition
        const competitionMap = new Map<number, Participant[]>()
        
        participantsList.forEach(participant => {
          const compId = participant.competitionId || 0
          if (!competitionMap.has(compId)) {
            competitionMap.set(compId, [])
          }
          competitionMap.get(compId)!.push(participant)
        })

        // Create competition groups with individual rankings
        const groups: CompetitionGroup[] = []
        competitionMap.forEach((participants, competitionId) => {
          // Sort participants by total score within this competition
          participants.sort((a, b) => b.totalScore - a.totalScore)
          participants.forEach((participant, index) => {
            participant.rank = index + 1
          })

          const competition = competitions.find(c => c.id === competitionId || c.id === Number(competitionId))
          const competitionName = competition 
            ? `${competition.name}${competition.number ? ` (Nr. ${competition.number})` : ''}` 
            : `Competition ${competitionId}`
          groups.push({
            competitionId,
            competitionName,
            participants
          })
        })

        // Sort groups by competition name
        groups.sort((a, b) => a.competitionName.localeCompare(b.competitionName))
        
        setCompetitionGroups(groups)
        setRanking([]) // Clear single ranking when showing groups
      }

      setDisciplines(Array.from(disciplineSet).sort())
      // Use the selected event name from context, fallback to data from scores or eventId
      setEventName(selectedEvent?.var_eventname || scores[0]?.event_name || scores[0]?.eventName || `Event ${eventId}`)
    } catch (error) {
      console.error('Error fetching event ranking:', error)
      setRanking([])
      setCompetitionGroups([])
      setDisciplines([])
      setEventName(selectedEvent?.var_eventname || `Event ${eventId}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Export results to CSV
  const exportResults = () => {
    if (ranking.length === 0) return

    const headers = ['Platz', 'Start #', 'Name', 'Verein', 'Jg', ...disciplines, 'Gesamt']
    const csvData = ranking.map(participant => [
      participant.rank,
      participant.startNumber || '',
      participant.name,
      participant.club,
      participant.age,
      ...disciplines.map(discipline => formatScore(participant.scores[discipline] || 0)),
      formatScore(participant.totalScore)
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `results_${eventName}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export results to PDF
  const exportResultsPDF = () => {
    if (selectedCompetition) {
      // Single competition export
      if (ranking.length === 0) return

      const doc = new jsPDF('landscape')
      const pageFormat = doc.internal.pageSize
      const pageWidth = pageFormat.width
      const pageHeight = pageFormat.height
      
      // Add header and footer
      addPDFHeaderFooter({
        doc,
        event: selectedEvent,
        documentTitle: 'Competition Results',
        pageWidth,
        pageHeight
      })
      
      // Get content area (excluding header/footer space)
      const contentArea = getContentArea(pageWidth, pageHeight)
      
      // Add competition info in content area
      const selectedComp = competitions.find(c => c.id?.toString() === selectedCompetition)
      const selectedCompName = selectedComp 
        ? `${selectedComp.name}${selectedComp.number ? ` (Nr. ${selectedComp.number})` : ''}` 
        : 'Unknown Competition'
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(selectedCompName, contentArea.startX, contentArea.startY + 10)
      
      let currentY = contentArea.startY + 35 // Increased spacing to prevent header overlap
      
      // Prepare table data
      const headers = ['Rank', 'Start #', 'Name', 'Club', 'Age', ...disciplines, 'Total']
      const tableData = filteredRanking.map(participant => [
        participant.rank,
        participant.startNumber || '',
        participant.name,
        participant.club,
        participant.age,
        ...disciplines.map(discipline => 
          participant.scores[discipline] ? formatScore(participant.scores[discipline]) : '-'
        ),
        formatScore(participant.totalScore)
      ])

      // Generate table
      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: currentY,
        pageBreak: 'auto',
        margin: { top: 35, left: 10, right: 10, bottom: 25 }, // Ensure proper margins on all pages
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }, // Rank
          1: { halign: 'left', cellWidth: 40 },   // Name
          2: { halign: 'left', cellWidth: 35 },   // Club
          3: { halign: 'center', cellWidth: 15 }, // Age
          [headers.length - 1]: { 
            halign: 'center', 
            cellWidth: 20,
            fillColor: [240, 248, 255],
            fontStyle: 'bold'
          } // Total
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        didParseCell: function(data: any) {
          // Highlight medal positions
          if (data.section === 'body' && data.column.index === 0) {
            const rank = parseInt(data.cell.text[0])
            if (rank <= 3) {
              switch (rank) {
                case 1:
                  data.cell.styles.fillColor = [255, 215, 0] // Gold
                  break
                case 2:
                  data.cell.styles.fillColor = [192, 192, 192] // Silver
                  break
                case 3:
                  data.cell.styles.fillColor = [205, 127, 50] // Bronze
                  break
              }
              data.cell.styles.textColor = [0, 0, 0]
              data.cell.styles.fontStyle = 'bold'
            }
          }
          
          // Highlight total score column
          if (data.section === 'body' && data.column.index === headers.length - 1) {
            data.cell.styles.fillColor = [240, 248, 255]
            data.cell.styles.fontStyle = 'bold'
          }
        },
        didDrawPage: function() {
          // Note: Page numbering will be updated after document completion
          // to ensure correct total page count
        }
      })

      // Update all page headers/footers with correct page numbering
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addPDFHeaderFooter({
          doc,
          event: selectedEvent,
          documentTitle: 'Competition Results',
          pageWidth,
          pageHeight
        })
      }

      // Save the PDF
      doc.save(`results_${selectedCompName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    } else {
      // All competitions export
      if (filteredCompetitionGroups.length === 0) return

      const doc = new jsPDF('landscape')
      const pageFormat = doc.internal.pageSize
      const pageWidth = pageFormat.width
      const pageHeight = pageFormat.height
      
      // Add header and footer
      addPDFHeaderFooter({
        doc,
        event: selectedEvent,
        documentTitle: 'Competition Results - All Competitions',
        pageWidth,
        pageHeight
      })
      
      // Get content area (excluding header/footer space)
      const contentArea = getContentArea(pageWidth, pageHeight)
      let currentY = contentArea.startY + 20 // Increased spacing to prevent header overlap

      // Process each competition group
      filteredCompetitionGroups.forEach((group) => {
        // Check if we need a new page
        if (currentY > contentArea.endY - 50) {
          doc.addPage()
          addPDFHeaderFooter({
            doc,
            event: selectedEvent,
            documentTitle: 'Competition Results - All Competitions',
            pageWidth,
            pageHeight
          })
          currentY = contentArea.startY + 20 // Increased spacing to prevent header overlap
        }

        // Add competition title
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(`${group.competitionName} (${group.participants.length} participants)`, contentArea.startX, currentY)
        currentY += 12

        // Prepare table data for this competition
        const headers = ['Rank', 'Start #', 'Name', 'Club', 'Age', ...disciplines, 'Total']
        const tableData = group.participants.map(participant => [
          participant.rank,
          participant.startNumber || '',
          participant.name,
          participant.club,
          participant.age,
          ...disciplines.map(discipline => 
            participant.scores[discipline] ? formatScore(participant.scores[discipline]) : '-'
          ),
          formatScore(participant.totalScore)
        ])

        // Generate table for this competition
        autoTable(doc, {
          head: [headers],
          body: tableData,
          startY: currentY,
          pageBreak: 'auto',
          margin: { top: 35, left: 10, right: 10, bottom: 25 }, // Ensure proper margins on all pages
          styles: {
            fontSize: 7,
            cellPadding: 1.5,
          },
          headStyles: {
            fillColor: [66, 139, 202],
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { halign: 'center', cellWidth: 12 }, // Rank
            1: { halign: 'left', cellWidth: 35 },   // Name
            2: { halign: 'left', cellWidth: 30 },   // Club
            3: { halign: 'center', cellWidth: 12 }, // Age
            [headers.length - 1]: { 
              halign: 'center', 
              cellWidth: 18,
              fillColor: [240, 248, 255],
              fontStyle: 'bold'
            } // Total
          },
          alternateRowStyles: {
            fillColor: [248, 249, 250]
          },
          didParseCell: function(data: any) {
            // Highlight medal positions
            if (data.section === 'body' && data.column.index === 0) {
              const rank = parseInt(data.cell.text[0])
              if (rank <= 3) {
                switch (rank) {
                  case 1:
                    data.cell.styles.fillColor = [255, 215, 0] // Gold
                    break
                  case 2:
                    data.cell.styles.fillColor = [192, 192, 192] // Silver
                    break
                  case 3:
                    data.cell.styles.fillColor = [205, 127, 50] // Bronze
                    break
                }
                data.cell.styles.textColor = [0, 0, 0]
                data.cell.styles.fontStyle = 'bold'
              }
            }
            
            // Highlight total score column
            if (data.section === 'body' && data.column.index === headers.length - 1) {
              data.cell.styles.fillColor = [240, 248, 255]
              data.cell.styles.fontStyle = 'bold'
            }
          },
          didDrawPage: function(data: any) {
            // Note: Page numbering will be updated after document completion
            // to ensure correct total page count
            currentY = (data as any).cursor.y + 15
          }
        })

        // Add some space between competitions
        currentY += 10
      })

      // Update all page headers/footers with correct page numbering
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addPDFHeaderFooter({
          doc,
          event: selectedEvent,
          documentTitle: 'Competition Results - All Competitions',
          pageWidth,
          pageHeight
        })
      }

      // Save the PDF
      doc.save(`results_all_competitions_${eventName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    }
  }

  // Fetch available certificate layouts
  const fetchCertificateLayouts = async () => {
    try {
      const data = await apiGet('/layouts')
      console.log('Fetched layouts:', data)
      // The API returns layouts directly as an array
      const layouts = Array.isArray(data) ? data : []
      setCertificateLayouts(layouts)
      
      // Log available layout names for debugging
      if (layouts.length > 0) {
        console.log('Available layout names:', layouts.map(l => l.var_name));
      }
      
      // Auto-select the first layout if no layout is currently selected and layouts are available
      if (!contextSelectedLayout && layouts.length > 0) {
        // Try to find a layout that looks like it's for certificates
        let preferredLayout = layouts.find(layout => {
          const name = layout.var_name.toLowerCase();
          return name.includes('certificate') || 
                 name.includes('award') || 
                 name.includes('prize') || 
                 name.includes('urkunde') || 
                 name.includes('zeugnis') ||
                 name.includes('diplom');
        });
        
        // If no preferred layout found, use the first one
        if (!preferredLayout) {
          preferredLayout = layouts[0];
        }
        
        console.log('Auto-selecting layout:', preferredLayout.var_name, 'from', layouts.length, 'available layouts');
        // Convert the layout to match the context type
        const contextLayout = {
          ...preferredLayout,
          fields: preferredLayout.fields?.map((field: any) => ({
            ...field,
            var_text: field.var_value, // Map var_value to var_text for context compatibility
            var_spaltenwert: null // Add missing property for context compatibility
          }))
        };
        setContextSelectedLayout(contextLayout);
      }
    } catch (error) {
      console.error('Error fetching certificate layouts:', error)
      setCertificateLayouts([])
    }
  }

  // Get database field value for certificate
  const getDatabaseFieldValue = (fieldNum: number, participant: Participant, eventName: string, eventLocation?: string) => {
    switch (fieldNum) {
      case 0: return eventName // Event name
      case 1: return new Date().toLocaleDateString('de-DE') // Event dates
      case 2: return eventLocation || 'Sporthalle' // Location
      case 3: return participant.name // Participant name
      case 4: return participant.club // Club name
      case 5: return `${participant.rank}.` // Place/Rank
      case 6: return participant.totalScore.toFixed(3) // Score/Points
      case 7: return participant.competitionName || 'Wettkampf' // Competition name
      case 8: return `${participant.competitionName || 'Wettkampf'} (Einzel)` // Competition + designation
      case 9: return 'Turngau' // Gau (District)
      case 10: return 'Turnerbund' // Verband (Association)
      case 11: return 'Deutschland' // Land (State)
      case 12: return participant.rank <= 3 ? 'Siegerurkunde' : 'Teilnahmeurkunde' // Type string
      case 13: return participant.totalScore.toFixed(3) // Score (alternative)
      case 14: return participant.name // Team members (single participant)
      case 15: return `WK-${participant.competitionId}` // Competition number
      default: return `Feld ${fieldNum}`
    }
  }

  // Helper function to load image as base64
  const loadImageAsBase64 = (imagePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          canvas.width = img.width
          canvas.height = img.height
          
          // Clear the canvas with transparent background
          ctx?.clearRect(0, 0, canvas.width, canvas.height)
          ctx?.drawImage(img, 0, 0)
          
          // Use PNG format to preserve transparency
          const dataURL = canvas.toDataURL('image/png')
          resolve(dataURL)
        } catch (error) {
          reject(error)
        }
      }
      
      img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`))
      
      // Determine the full URL for the image
      let imageUrl = imagePath
      if (imagePath.startsWith('/uploads/')) {
        imageUrl = `${window.location.origin}${imagePath}`
      } else if (!imagePath.startsWith('http') && !imagePath.startsWith('data:')) {
        imageUrl = `${window.location.origin}/${imagePath}`
      }
      
      img.src = imageUrl
    })
  }

  // Generate certificates for selected participants
  const generateCertificates = async () => {
    if (!contextSelectedLayout || certificatesToPrint.length === 0) return

    setIsPrintingCertificates(true)
    try {
      // Find the selected layout
      const layout = certificateLayouts.find(l => l.int_layoutid === contextSelectedLayout.int_layoutid)
      if (!layout) {
        alert('Layout not found')
        return
      }

      // Create PDF document with selected paper format
      const paperSize = PAPER_FORMATS[selectedPaperFormat]
      const doc = new jsPDF('portrait', 'pt', [paperSize.width, paperSize.height])
      const pageWidth = paperSize.width
      const pageHeight = paperSize.height

      debugLog(`PDF page size: ${pageWidth} x ${pageHeight}`)
      debugLog(`Layout: ${layout.var_name} with ${layout.fields.length} fields`)

      // Generate certificate for each participant
      for (let participantIndex = 0; participantIndex < certificatesToPrint.length; participantIndex++) {
        const participant = certificatesToPrint[participantIndex]
        
        if (participantIndex > 0) {
          doc.addPage()
        }

        debugLog(`Generating certificate for participant: ${participant.name}`)

        // Add debug info to see coordinate system (only when debug is enabled)
        if (isDebugEnabled()) {
          doc.setTextColor(100, 100, 100)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.text(`Debug: ${participant.name} - Page: ${pageWidth}x${pageHeight} - Format: ${selectedPaperFormat}`, 20, 20)
        }

        // Sort fields by layer (background to foreground)
        const sortedFields = [...layout.fields].sort((a, b) => a.int_layer - b.int_layer)
        debugLog(`Processing ${sortedFields.length} fields for layout: ${layout.var_name}`)
        
        // Find the maximum coordinates to understand the scale
        const maxX = Math.max(...sortedFields.map(f => f.rel_x + f.rel_w))
        const maxY = Math.max(...sortedFields.map(f => f.rel_y + f.rel_h))
        
        // Log all field coordinates to understand the scale (only when debug is enabled)
        if (isDebugEnabled()) {
          debugLog('=== Field Coordinates Analysis ===')
          sortedFields.forEach((field, idx) => {
            debugLog(`Field ${idx}: x=${field.rel_x}, y=${field.rel_y}, w=${field.rel_w}, h=${field.rel_h}, type=${field.int_typ}`)
          })
          debugLog(`Maximum coordinates: X=${maxX}, Y=${maxY}`)
          
          // Add this info to the PDF for reference (only in debug mode)
          doc.text(`Max coords: X=${maxX.toFixed(0)}, Y=${maxY.toFixed(0)}`, 20, 35)
        }

        // Process each field (now with proper async handling for images)
        for (let fieldIndex = 0; fieldIndex < sortedFields.length; fieldIndex++) {
          const field = sortedFields[fieldIndex]
          // Simple coordinate conversion - assume database stores values in 0-1 range
          // If they're larger than 1, divide by the maximum coordinate to normalize
          
          debugLog(`Raw field ${fieldIndex}: x=${field.rel_x}, y=${field.rel_y}, w=${field.rel_w}, h=${field.rel_h}`)
          debugLog(`Field type: ${field.int_typ}, value: "${field.var_value}", font: "${field.var_font}"`)
          
          // The database coordinates seem to be stored at a different scale than the designer canvas
          // Let's calculate the ratio between database max and designer canvas
          const designerCanvasWidth = 2480  // A4 at 300 DPI from LayoutDesigner
          const designerCanvasHeight = 3508 // A4 at 300 DPI from LayoutDesigner
          
          debugLog(`Database coordinate space: ${maxX.toFixed(1)} x ${maxY.toFixed(1)}`)
          debugLog(`Designer canvas: ${designerCanvasWidth} x ${designerCanvasHeight}`)
          
          // Calculate the scaling factor from database coordinates to designer canvas
          const dbToDesignerX = designerCanvasWidth / maxX  // Should be ~10.16
          const dbToDesignerY = designerCanvasHeight / maxY // Should be ~11.89
          
          // Then scale from designer canvas to PDF
          const designerToPdfX = pageWidth / designerCanvasWidth   // Should be ~0.24
          const designerToPdfY = pageHeight / designerCanvasHeight // Should be ~0.24
          
          // Combined scaling: database -> designer -> PDF
          const scaleX = dbToDesignerX * designerToPdfX
          const scaleY = dbToDesignerY * designerToPdfY
          
          debugLog(`DB to Designer scale: X=${dbToDesignerX.toFixed(3)}, Y=${dbToDesignerY.toFixed(3)}`)
          debugLog(`Designer to PDF scale: X=${designerToPdfX.toFixed(3)}, Y=${designerToPdfY.toFixed(3)}`)
          debugLog(`Combined scale: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`)
          
          // Calculate PDF coordinates using the combined scaling
          const x = Math.max(0, field.rel_x * scaleX)
          const y = Math.max(0, field.rel_y * scaleY)
          const width = Math.max(1, field.rel_w * scaleX)
          const height = Math.max(1, field.rel_h * scaleY)

          console.log(`PDF coords: x=${x.toFixed(1)}, y=${y.toFixed(1)}, w=${width.toFixed(1)}, h=${height.toFixed(1)}, page=${pageWidth}x${pageHeight}`)

          console.log(`Field ${fieldIndex}: type=${field.int_typ}, pos=(${x.toFixed(1)}, ${y.toFixed(1)}), size=(${width.toFixed(1)}, ${height.toFixed(1)})`)

          // Skip fields that are completely outside the page
          if (x >= pageWidth || y >= pageHeight || width <= 0 || height <= 0) {
            console.log(`Skipping field ${fieldIndex} - outside page bounds`)
            return
          }

          // Set default text properties
          doc.setTextColor(0, 0, 0) // Black text
          doc.setFont('helvetica', 'normal')

          // Debug: Draw field boundaries (red rectangles) and add field info (only when debug is enabled)
          if (isDebugEnabled()) {
            doc.setDrawColor(255, 0, 0)
            doc.setLineWidth(0.5)
            doc.rect(x, y, width, height)
            
            // Add field number for debugging
            doc.setFontSize(8)
            doc.setTextColor(255, 0, 0)
            doc.text(`${fieldIndex}`, x, y - 2)
            doc.setTextColor(0, 0, 0)
          }

          switch (field.int_typ) {
            case 0: // Database field
              if (field.var_value && /^\d+$/.test(field.var_value)) {
                const fieldValue = getDatabaseFieldValue(parseInt(field.var_value), participant, eventName)
                console.log(`Database field ${field.var_value}: "${fieldValue}"`)
                
                // Set font size with better scaling
                const fontParts = field.var_font?.split(',') || ['helvetica', '12']
                let fontSize = parseInt(fontParts[1]) || 12
                // Scale font size based on field height if available
                if (height > 10) {
                  fontSize = Math.min(fontSize, height * 0.6)
                }
                fontSize = Math.max(8, Math.min(72, fontSize))
                doc.setFontSize(fontSize)
                
                // Calculate text position - jsPDF text baseline is at the bottom of the text
                // To center text vertically: middle of field + small offset for baseline
                const textY = y + (height + fontSize) / 2
                
                // Set text alignment
                const align = field.int_align === 1 ? 'center' : field.int_align === 2 ? 'right' : 'left'
                let textX = x
                if (align === 'center') textX = x + width/2
                if (align === 'right') textX = x + width
                
                doc.text(fieldValue, textX, textY, { 
                  align: align as any, 
                  maxWidth: width > 0 ? width : undefined 
                })
              }
              break
              
            case 1: // Text field
              if (field.var_value) {
                console.log(`Text field: "${field.var_value}"`)
                
                const fontParts = field.var_font?.split(',') || ['helvetica', '12']
                let fontSize = parseInt(fontParts[1]) || 12
                // Scale font size based on field height if available
                if (height > 10) {
                  fontSize = Math.min(fontSize, height * 0.6)
                }
                fontSize = Math.max(8, Math.min(72, fontSize))
                doc.setFontSize(fontSize)
                
                // Calculate text position - center vertically in the field
                const textY = y + (height + fontSize) / 2
                
                const align = field.int_align === 1 ? 'center' : field.int_align === 2 ? 'right' : 'left'
                let textX = x
                if (align === 'center') textX = x + width/2
                if (align === 'right') textX = x + width
                
                doc.text(field.var_value, textX, textY, { 
                  align: align as any, 
                  maxWidth: width > 0 ? width : undefined 
                })
              }
              break
              
            case 2: // Image field
              if (field.var_value && width > 0 && height > 0) {
                try {
                  const imageData = await loadImageAsBase64(field.var_value)
                  doc.addImage(imageData, 'PNG', x, y, width, height)
                  console.log(`Added image to PDF: ${field.var_value}`)
                } catch (error) {
                  console.error(`Error loading image ${field.var_value}:`, error)
                  // Draw placeholder on error
                  doc.setDrawColor(255, 100, 100)
                  doc.setLineWidth(1)
                  doc.rect(x, y, width, height)
                  doc.setFontSize(8)
                  doc.text('Image Error', x + width/2, y + height/2, { align: 'center' })
                }
              } else {
                // Draw placeholder for empty image field
                doc.setDrawColor(200, 200, 200)
                doc.setLineWidth(1)
                doc.rect(x, y, width, height)
                doc.setFontSize(8)
                doc.text('No Image', x + width/2, y + height/2, { align: 'center' })
              }
              break
              
            case 3: // Line field
              console.log(`Line field at (${x}, ${y}) to (${x + width}, ${y + height/2})`)
              doc.setDrawColor(0, 0, 0)
              doc.setLineWidth(1)
              if (width > 0) {
                doc.line(x, y + height/2, x + width, y + height/2)
              }
              break
              
            default:
              console.log(`Unknown field type: ${field.int_typ}`)
          }
        }
      }

      // Save the PDF
      const selectedCompForFilename = competitions.find(c => c.id?.toString() === selectedCompetition)
      const compNameForFilename = selectedCompForFilename 
        ? `${selectedCompForFilename.name}${selectedCompForFilename.number ? `_Nr_${selectedCompForFilename.number}` : ''}`.replace(/[^a-z0-9_]/gi, '_') 
        : 'all'
      const fileName = `certificates_${compNameForFilename}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      // Close modal
      setShowCertificateModal(false)
      setCertificatesToPrint([])
      setSelectedPaperFormat('A4')
      // Note: We don't clear the selected layout as it's now managed globally
      
    } catch (error) {
      console.error('Error generating certificates:', error)
      alert('Error generating certificates')
    } finally {
      setIsPrintingCertificates(false)
    }
  }

  // Show certificate modal for selected participants
  const showCertificateDialog = (participants: Participant[]) => {
    setCertificatesToPrint(participants)
    setShowCertificateModal(true)
    // Don't reset the selected layout, but ensure layouts are fetched
    fetchCertificateLayouts()
  }

  // Get all participants for certificate printing
  const getAllParticipantsForCertificates = () => {
    if (selectedCompetition) {
      return filteredRanking
    } else {
      return filteredCompetitionGroups.flatMap(group => group.participants)
    }
  }

  // Filter participants based on search term
  const filteredRanking = ranking.filter(participant =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (participant.startNumber && participant.startNumber.toString().includes(searchTerm))
  )

  // Get competitions that actually have participants in this event
  const getAvailableCompetitions = () => {
    // Return empty array if competitions haven't been loaded yet
    if (!competitions || competitions.length === 0) {
      return []
    }
    
    if (selectedCompetition) {
      // If a competition is selected, show all competitions for switching
      return competitions.filter(comp => comp.id !== undefined)
    } else {
      // Show only competitions that have participants in the current results
      const competitionsWithParticipants = new Set<number>()
      
      // Collect competition IDs from current results
      if (competitionGroups.length > 0) {
        competitionGroups.forEach(group => {
          if (group.competitionId) {
            competitionsWithParticipants.add(group.competitionId)
          }
        })
      } else if (ranking.length > 0) {
        ranking.forEach(participant => {
          if (participant.competitionId) {
            competitionsWithParticipants.add(participant.competitionId)
          }
        })
      }
      
      return competitions.filter(comp => 
        comp.id !== undefined && competitionsWithParticipants.has(comp.id)
      )
    }
  }

  // Filter competition groups based on search term
  const filteredCompetitionGroups = competitionGroups.map(group => ({
    ...group,
    participants: group.participants.filter(participant =>
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (participant.startNumber && participant.startNumber.toString().includes(searchTerm))
    )
  })).filter(group => group.participants.length > 0)

  useEffect(() => {
    if (eventId) {
      const loadData = async () => {
        // First fetch competitions, then ranking data
        await fetchCompetitions()
        await fetchEventRanking()
      }
      loadData()
    }
  }, [eventId, squadName, selectedCompetition])

  // Refresh ranking data when competitions are loaded (only if we have competitions but no proper names yet)
  useEffect(() => {
    if (eventId && competitions.length > 0 && competitionGroups.length > 0) {
      // Check if any competition group still has a generic name (indicating refresh needed)
      const hasGenericNames = competitionGroups.some(group => 
        group.competitionName.startsWith('Competition ')
      )
      if (hasGenericNames) {
        fetchEventRanking()
      }
    }
  }, [competitions])

  // Show message if no event is selected
  if (!eventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Event Selected</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select an event to view competition results.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <UnifiedPageHeader
        title="Competition Results"
        subtitle={`Rankings for ${eventName}`}
        icon={ChartBarIcon}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants, clubs, start numbers..."
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasFilters={true}
        filterOptions={getFilterOptions()}
        onClearAllFilters={handleClearAllFilters}
        showExportCSV={true}
        onExportCSV={exportResults}
        showExportPDF={true}
        onExportPDF={exportResultsPDF}
        showPrint={true}
        onPrint={() => showCertificateDialog(getAllParticipantsForCertificates())}
        totalCount={selectedCompetition ? filteredRanking.length : filteredCompetitionGroups.reduce((sum, group) => sum + group.participants.length, 0)}
        showEventContext={true}
      />

      {/* Rankings Table */}
      <div className="bg-white rounded-lg shadow-sm border mx-6">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading results...</p>
          </div>
        ) : selectedCompetition ? (
          // Single Competition View
          filteredRanking.length === 0 ? (
            <div className="p-6 text-center">
              <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results found for this competition</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platz
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verein
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jg
                    </th>
                    {disciplines.map(discipline => (
                      <th key={discipline} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                        <div className="flex flex-col">
                          <span className="font-semibold">{discipline}</span>
                          <span className="text-[10px] text-gray-400 font-normal">Device</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-l-2 border-blue-200">
                      <div className="flex flex-col">
                        <span className="font-bold text-blue-700">Gesamt</span>
                        <span className="text-[10px] text-blue-500 font-normal">Total Score</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRanking.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMedalColor(participant.rank)}`}>
                          {getMedalEmoji(participant.rank)}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {participant.startNumber ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {participant.startNumber}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {participant.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                        {participant.club}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-center text-gray-600">
                        {participant.age}
                      </td>
                      {disciplines.map(discipline => (
                        <td key={discipline} className="px-4 py-4 whitespace-nowrap text-center border-l border-gray-100">
                          <div className="flex flex-col items-center">
                            {participant.scores[discipline] ? (
                              <span className="text-lg font-bold text-gray-900">
                                {formatScore(participant.scores[discipline])}
                              </span>
                            ) : (
                              <span className="text-lg font-medium text-gray-400">-</span>
                            )}
                            <span className="text-xs text-gray-500 mt-1">
                              {discipline}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-4 whitespace-nowrap text-center bg-blue-50 border-l-2 border-blue-200">
                        <div className="flex flex-col items-center">
                          <span className="text-xl font-bold text-blue-900">
                            {formatScore(participant.totalScore)}
                          </span>
                          <span className="text-xs text-blue-600 mt-1">
                            Total
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Grouped by Competition View
          filteredCompetitionGroups.length === 0 ? (
            <div className="p-6 text-center">
              <TrophyIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No results found for this event</p>
            </div>
          ) : (
            <div className="space-y-8 p-6">
              {filteredCompetitionGroups.map((group) => (
                <div key={group.competitionId} className="border rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                    <h3 className="text-xl font-bold text-white">{group.competitionName}</h3>
                    <p className="text-blue-100 text-sm">{group.participants.length} participants</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Platz
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Start #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Verein
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jg
                          </th>
                          {disciplines.map(discipline => (
                            <th key={discipline} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                              <div className="flex flex-col">
                                <span className="font-semibold">{discipline}</span>
                                <span className="text-[10px] text-gray-400 font-normal">Device</span>
                              </div>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 border-l-2 border-blue-200">
                            <div className="flex flex-col">
                              <span className="font-bold text-blue-700">Gesamt</span>
                              <span className="text-[10px] text-blue-500 font-normal">Total Score</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {group.participants.map((participant) => (
                          <tr key={participant.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${getMedalColor(participant.rank)}`}>
                                {getMedalEmoji(participant.rank)}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center">
                              {participant.startNumber ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {participant.startNumber}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">
                                {participant.name}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-gray-600">
                              {participant.club}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-center text-gray-600">
                              {participant.age}
                            </td>
                            {disciplines.map(discipline => (
                              <td key={discipline} className="px-4 py-4 whitespace-nowrap text-center border-l border-gray-100">
                                <div className="flex flex-col items-center">
                                  {participant.scores[discipline] ? (
                                    <span className="text-lg font-bold text-gray-900">
                                      {formatScore(participant.scores[discipline])}
                                    </span>
                                  ) : (
                                    <span className="text-lg font-medium text-gray-400">-</span>
                                  )}
                                  <span className="text-xs text-gray-500 mt-1">
                                    {discipline}
                                  </span>
                                </div>
                              </td>
                            ))}
                            <td className="px-4 py-4 whitespace-nowrap text-center bg-blue-50 border-l-2 border-blue-200">
                              <div className="flex flex-col items-center">
                                <span className="text-xl font-bold text-blue-900">
                                  {formatScore(participant.totalScore)}
                                </span>
                                <span className="text-xs text-blue-600 mt-1">
                                  Total
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Print Certificates</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Selected participants: {certificatesToPrint.length}
                </p>
                <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2 text-sm">
                  {certificatesToPrint.slice(0, 5).map(p => (
                    <div key={p.id} className="truncate">
                      {p.rank}. {p.name} ({p.club})
                    </div>
                  ))}
                  {certificatesToPrint.length > 5 && (
                    <div className="text-gray-500">...and {certificatesToPrint.length - 5} more</div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Certificate Layout
                </label>
                <select
                  value={contextSelectedLayout?.int_layoutid || ''}
                  onChange={(e) => {
                    const layoutId = Number(e.target.value);
                    const layout = certificateLayouts.find(l => l.int_layoutid === layoutId);
                    if (layout) {
                      // Convert the layout to match the context type
                      const contextLayout = {
                        ...layout,
                        fields: layout.fields?.map((field: any) => ({
                          ...field,
                          var_text: field.var_value, // Map var_value to var_text for context compatibility
                          var_spaltenwert: null // Add missing property for context compatibility
                        }))
                      };
                      setContextSelectedLayout(contextLayout);
                    } else {
                      setContextSelectedLayout(null);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose a layout...</option>
                  {certificateLayouts.map(layout => (
                    <option key={layout.int_layoutid} value={layout.int_layoutid}>
                      {layout.var_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paper Format
                </label>
                <select
                  value={selectedPaperFormat}
                  onChange={(e) => setSelectedPaperFormat(e.target.value as keyof typeof PAPER_FORMATS)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {Object.entries(PAPER_FORMATS).map(([key, format]) => (
                    <option key={key} value={key}>
                      {format.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the same paper format used when designing the layout
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isDebugEnabled()}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="mr-2 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Debug Mode
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Show debug information on certificates (field boundaries, coordinates, etc.)
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCertificateModal(false)
                    setCertificatesToPrint([])
                    setSelectedPaperFormat('A4')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateCertificates}
                  disabled={!contextSelectedLayout || isPrintingCertificates}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isPrintingCertificates ? 'Generating...' : 'Generate PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Results
