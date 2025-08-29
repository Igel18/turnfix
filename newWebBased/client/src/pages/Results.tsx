import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useEvent } from '../contexts/EventContext'
import { 
  ChartBarIcon,
  TrophyIcon,
  InformationCircleIcon,
  DocumentArrowDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'
import UnifiedHeader, { StateInfo } from '@/components/UnifiedHeader'
import { apiGet } from '../utils/api'
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
  
  // Certificate printing state
  const [certificateLayouts, setCertificateLayouts] = useState<CertificateLayout[]>([])
  const [showCertificateModal, setShowCertificateModal] = useState(false)
  const [selectedLayout, setSelectedLayout] = useState<string>('')
  const [selectedPaperFormat, setSelectedPaperFormat] = useState<keyof typeof PAPER_FORMATS>('A4')
  const [certificatesToPrint, setCertificatesToPrint] = useState<Participant[]>([])
  const [isPrintingCertificates, setIsPrintingCertificates] = useState(false)

  // Helper functions for unified header
  const getResultsStateInfo = (): StateInfo[] => {
    const totalParticipants = selectedCompetition ? 
      ranking.length : 
      filteredCompetitionGroups.reduce((sum, group) => sum + group.participants.length, 0)
    
    const totalDisciplines = disciplines.length
    const completedScores = selectedCompetition ?
      ranking.reduce((sum, p) => sum + Object.keys(p.scores).length, 0) :
      filteredCompetitionGroups.reduce((sum, group) => 
        sum + group.participants.reduce((groupSum, p) => groupSum + Object.keys(p.scores).length, 0), 0
      )

    return [
      {
        value: 'participants',
        label: 'Participants',
        count: totalParticipants,
        color: 'text-blue-600'
      },
      {
        value: 'disciplines',
        label: 'Disciplines',
        count: totalDisciplines,
        color: 'text-green-600'
      },
      {
        value: 'scores',
        label: 'Scores',
        count: completedScores,
        color: 'text-purple-600'
      }
    ]
  }

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
      setCompetitions(Array.isArray(data) ? data : [])
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
        setEventName(`Event ${eventId}`)
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
          competitionName: competitions.find(c => c.id === participant.assignedCompetitions?.[0])?.name || 'Unknown Competition'
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

          const competitionName = competitions.find(c => c.id === competitionId)?.name || `Competition ${competitionId}`
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
      setEventName(scores[0]?.event_name || scores[0]?.eventName || `Event ${eventId}`)
    } catch (error) {
      console.error('Error fetching event ranking:', error)
      setRanking([])
      setCompetitionGroups([])
      setDisciplines([])
    } finally {
      setIsLoading(false)
    }
  }

  // Export results to CSV
  const exportResults = () => {
    if (ranking.length === 0) return

    const headers = ['Platz', 'Name', 'Verein', 'Jg', ...disciplines, 'Gesamt']
    const csvData = ranking.map(participant => [
      participant.rank,
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
      
      // Add title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Competition Results', 20, 20)
      
      // Add event info
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Event: ${eventName}`, 20, 35)
      const selectedCompName = competitions.find(c => c.id?.toString() === selectedCompetition)?.name || 'Unknown Competition'
      doc.text(`Competition: ${selectedCompName}`, 20, 45)
      if (squadName) {
        doc.text(`Squad: ${squadName}`, 20, 55)
      }
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, squadName ? 65 : 55)
      
      // Prepare table data
      const headers = ['Rank', 'Name', 'Club', 'Age', ...disciplines, 'Total']
      const tableData = filteredRanking.map(participant => [
        participant.rank,
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
        startY: squadName ? 75 : 65,
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
        didParseCell: function(data) {
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
        }
      })

      // Save the PDF
      doc.save(`results_${selectedCompName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    } else {
      // All competitions export
      if (filteredCompetitionGroups.length === 0) return

      const doc = new jsPDF('landscape')
      let currentY = 20
      
      // Add title
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Competition Results - All Competitions', 20, currentY)
      currentY += 20
      
      // Add event info
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Event: ${eventName}`, 20, currentY)
      currentY += 10
      if (squadName) {
        doc.text(`Squad: ${squadName}`, 20, currentY)
        currentY += 10
      }
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, currentY)
      currentY += 20

      // Process each competition group
      filteredCompetitionGroups.forEach((group) => {
        // Check if we need a new page
        if (currentY > 180) {
          doc.addPage()
          currentY = 20
        }

        // Add competition title
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text(`${group.competitionName} (${group.participants.length} participants)`, 20, currentY)
        currentY += 15

        // Prepare table data for this competition
        const headers = ['Rank', 'Name', 'Club', 'Age', ...disciplines, 'Total']
        const tableData = group.participants.map(participant => [
          participant.rank,
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
          didParseCell: function(data) {
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
          didDrawPage: function(data) {
            currentY = (data as any).cursor.y + 15
          }
        })

        // Add some space between competitions
        currentY += 10
      })

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
      setCertificateLayouts(Array.isArray(data) ? data : [])
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
    if (!selectedLayout || certificatesToPrint.length === 0) return

    setIsPrintingCertificates(true)
    try {
      // Find the selected layout
      const layout = certificateLayouts.find(l => l.int_layoutid.toString() === selectedLayout)
      if (!layout) {
        alert('Layout not found')
        return
      }

      // Create PDF document with selected paper format
      const paperSize = PAPER_FORMATS[selectedPaperFormat]
      const doc = new jsPDF('portrait', 'pt', [paperSize.width, paperSize.height])
      const pageWidth = paperSize.width
      const pageHeight = paperSize.height

      console.log(`PDF page size: ${pageWidth} x ${pageHeight}`)
      console.log(`Layout: ${layout.var_name} with ${layout.fields.length} fields`)

      // Generate certificate for each participant
      for (let participantIndex = 0; participantIndex < certificatesToPrint.length; participantIndex++) {
        const participant = certificatesToPrint[participantIndex]
        
        if (participantIndex > 0) {
          doc.addPage()
        }

        console.log(`Generating certificate for participant: ${participant.name}`)

        // Add debug info to see coordinate system
        doc.setTextColor(100, 100, 100)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.text(`Debug: ${participant.name} - Page: ${pageWidth}x${pageHeight} - Format: ${selectedPaperFormat}`, 20, 20)

        // Sort fields by layer (background to foreground)
        const sortedFields = [...layout.fields].sort((a, b) => a.int_layer - b.int_layer)
        console.log(`Processing ${sortedFields.length} fields for layout: ${layout.var_name}`)
        
        // Log all field coordinates to understand the scale
        console.log('=== Field Coordinates Analysis ===')
        sortedFields.forEach((field, idx) => {
          console.log(`Field ${idx}: x=${field.rel_x}, y=${field.rel_y}, w=${field.rel_w}, h=${field.rel_h}, type=${field.int_typ}`)
        })
        
        // Find the maximum coordinates to understand the scale
        const maxX = Math.max(...sortedFields.map(f => f.rel_x + f.rel_w))
        const maxY = Math.max(...sortedFields.map(f => f.rel_y + f.rel_h))
        console.log(`Maximum coordinates: X=${maxX}, Y=${maxY}`)
        
        // Add this info to the PDF for reference
        doc.text(`Max coords: X=${maxX.toFixed(0)}, Y=${maxY.toFixed(0)}`, 20, 35)

        // Process each field (now with proper async handling for images)
        for (let fieldIndex = 0; fieldIndex < sortedFields.length; fieldIndex++) {
          const field = sortedFields[fieldIndex]
          // Simple coordinate conversion - assume database stores values in 0-1 range
          // If they're larger than 1, divide by the maximum coordinate to normalize
          
          console.log(`Raw field ${fieldIndex}: x=${field.rel_x}, y=${field.rel_y}, w=${field.rel_w}, h=${field.rel_h}`)
          console.log(`Field type: ${field.int_typ}, value: "${field.var_value}", font: "${field.var_font}"`)
          
          // The database coordinates seem to be stored at a different scale than the designer canvas
          // Let's calculate the ratio between database max and designer canvas
          const designerCanvasWidth = 2480  // A4 at 300 DPI from LayoutDesigner
          const designerCanvasHeight = 3508 // A4 at 300 DPI from LayoutDesigner
          
          console.log(`Database coordinate space: ${maxX.toFixed(1)} x ${maxY.toFixed(1)}`)
          console.log(`Designer canvas: ${designerCanvasWidth} x ${designerCanvasHeight}`)
          
          // Calculate the scaling factor from database coordinates to designer canvas
          const dbToDesignerX = designerCanvasWidth / maxX  // Should be ~10.16
          const dbToDesignerY = designerCanvasHeight / maxY // Should be ~11.89
          
          // Then scale from designer canvas to PDF
          const designerToPdfX = pageWidth / designerCanvasWidth   // Should be ~0.24
          const designerToPdfY = pageHeight / designerCanvasHeight // Should be ~0.24
          
          // Combined scaling: database -> designer -> PDF
          const scaleX = dbToDesignerX * designerToPdfX
          const scaleY = dbToDesignerY * designerToPdfY
          
          console.log(`DB to Designer scale: X=${dbToDesignerX.toFixed(3)}, Y=${dbToDesignerY.toFixed(3)}`)
          console.log(`Designer to PDF scale: X=${designerToPdfX.toFixed(3)}, Y=${designerToPdfY.toFixed(3)}`)
          console.log(`Combined scale: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`)
          
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

          // Debug: Draw field boundaries (red rectangles) and add field info
          doc.setDrawColor(255, 0, 0)
          doc.setLineWidth(0.5)
          doc.rect(x, y, width, height)
          
          // Add field number for debugging
          doc.setFontSize(8)
          doc.setTextColor(255, 0, 0)
          doc.text(`${fieldIndex}`, x, y - 2)
          doc.setTextColor(0, 0, 0)

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
      const fileName = `certificates_${selectedCompetition ? competitions.find(c => c.id?.toString() === selectedCompetition)?.name?.replace(/[^a-z0-9]/gi, '_') : 'all'}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      // Close modal
      setShowCertificateModal(false)
      setCertificatesToPrint([])
      setSelectedLayout('')
      setSelectedPaperFormat('A4')
      
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
    participant.club.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter competition groups based on search term
  const filteredCompetitionGroups = competitionGroups.map(group => ({
    ...group,
    participants: group.participants.filter(participant =>
      participant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.participants.length > 0)

  useEffect(() => {
    if (eventId) {
      fetchCompetitions()
      fetchEventRanking()
    }
  }, [eventId, squadName, selectedCompetition])

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
      <UnifiedHeader
        title="Competition Results"
        description={`Rankings for ${eventName}${squadName ? ` - Squad ${squadName}` : ''}`}
        icon={ChartBarIcon}
        stateInfo={getResultsStateInfo()}
        selectedState=""
        onStateChange={() => {}}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search participants, clubs..."
        filterOptions={[
          {
            label: 'Competition',
            value: 'competition',
            options: [
              { value: '', label: 'All Competitions' },
              ...competitions.map(comp => ({
                value: comp.id?.toString() || '',
                label: comp.name || 'Unknown Competition',
                count: undefined
              }))
            ],
            selectedValue: selectedCompetition,
            onChange: setSelectedCompetition
          }
        ]}
        onClearAllFilters={handleClearAllFilters}
        onExportCSV={exportResults}
        secondaryAction={{
          label: 'Export PDF',
          icon: DocumentArrowDownIcon,
          onClick: exportResultsPDF
        }}
        showHomeButton={true}
        homeUrl="/dashboard"
        totalCount={selectedCompetition ? filteredRanking.length : filteredCompetitionGroups.reduce((sum, group) => sum + group.participants.length, 0)}
      />

      {/* Event Selection Context */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 mx-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div className="text-sm text-blue-800">
              <strong>Event:</strong> {eventName}
              {squadName && (
                <>
                  <span className="mx-2">•</span>
                  <strong>Squad:</strong> {squadName}
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => showCertificateDialog(getAllParticipantsForCertificates())}
            className="flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print Certificates
          </button>
        </div>
      </div>

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
                  value={selectedLayout}
                  onChange={(e) => setSelectedLayout(e.target.value)}
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

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCertificateModal(false)
                    setCertificatesToPrint([])
                    setSelectedLayout('')
                    setSelectedPaperFormat('A4')
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateCertificates}
                  disabled={!selectedLayout || isPrintingCertificates}
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
