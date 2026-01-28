/**
 * useExport Hook
 * Point 123: Separation of Concerns
 * 
 * Handles export functionality:
 * - CSV export with formatted scores
 * - PDF export (single competition or all competitions)
 * - File naming and formatting
 */

import { useCallback } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEvent } from '@/contexts/EventContext'
import {
  addPDFHeaderFooter,
  getUnifiedTableStyles,
  addSectionTitle,
  drawRankingBadge
} from '@/utils/pdfUtils'
import type { Participant, CompetitionGroup } from '../Results.types'

interface UseExportProps {
  eventName: string
  selectedCompetition: string | null
  ranking: Participant[]
  competitionGroups: CompetitionGroup[]
  disciplines: string[]
  formatScore: (score: number) => string
}

export const useExport = ({
  eventName,
  selectedCompetition,
  ranking,
  competitionGroups,
  disciplines,
  formatScore
}: UseExportProps) => {
  const { selectedEvent } = useEvent()

  /**
   * Export results to CSV format
   */
  const exportResultsCSV = useCallback(() => {
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
  }, [ranking, disciplines, eventName, formatScore])

  /**
   * Export single competition results to PDF
   */
  const exportSingleCompetitionPDF = useCallback((
    participants: Participant[],
    competitionName: string
  ) => {
    const doc = new jsPDF('landscape')
    const pageFormat = doc.internal.pageSize
    const pageWidth = pageFormat.width
    const pageHeight = pageFormat.height

    // Table headers
    const headers = [
      'Platz', 'Start #', 'Name', 'Verein', 'Jg',
      ...disciplines,
      'Gesamt'
    ]

    // Table data with jury results support
    const tableData = participants.map(participant => {
      const baseRow = [
        participant.rank,
        participant.startNumber || '',
        participant.name,
        participant.club,
        participant.age
      ]

      // For each discipline, include score and jury breakdown if available
      const disciplineData = disciplines.map(discipline => {
        const score = participant.scores[discipline]
        if (!score) return '-'

        const juryResults = participant.juryResults?.[discipline]
        if (!juryResults || juryResults.length === 0) {
          return formatScore(score)
        }

        // Build jury breakdown string
        const formula = participant.formulas?.[discipline] || ''
        const startValue = participant.startValues?.[discipline]
        
        // Format individual field scores
        const fieldScores = juryResults
          .filter(jr => !jr.isFinalScore)
          .map(jr => `${jr.fieldShortName}: ${jr.performance !== null ? jr.performance.toFixed(1) : '-'}`)
          .join(', ')

        // Build detailed breakdown
        const breakdown: string[] = []
        if (formula) breakdown.push(`Formula: ${formula}`)
        if (startValue !== undefined) breakdown.push(`Start: ${startValue}`)
        if (fieldScores) breakdown.push(fieldScores)
        breakdown.push(`Total: ${formatScore(score)}`)

        return breakdown.join('\n')
      })

      return [...baseRow, ...disciplineData, formatScore(participant.totalScore)]
    })

    // Get unified table styles
    const unifiedStyles = getUnifiedTableStyles()

    // Generate table with jury results support
    autoTable(doc, {
      ...unifiedStyles,
      head: [headers],
      body: tableData,
      startY: 60,
      styles: {
        ...unifiedStyles.styles,
        fontSize: 7,
        cellPadding: 3,
        lineWidth: 0.1,
        valign: 'middle',
        overflow: 'linebreak', // Enable line breaks for multi-line content
      },
      columnStyles: (() => {
        const styles: any = {
          0: { halign: 'center', cellWidth: 15 },
          1: { halign: 'center', cellWidth: 18 },
          2: { halign: 'left', cellWidth: 45 },
          3: { halign: 'left', cellWidth: 38 },
          4: { halign: 'center', cellWidth: 12 },
          [headers.length - 1]: {
            halign: 'center',
            cellWidth: 20,
            fillColor: [240, 248, 255],
            fontStyle: 'bold'
          }
        }
        // Discipline columns with more space for jury results
        disciplines.forEach((_, index) => {
          styles[5 + index] = { 
            halign: 'center', 
            cellWidth: 24, // Increased from 18 to accommodate jury details
            fontSize: 6, // Smaller font for breakdown
            cellPadding: 2
          }
        })
        return styles
      })(),
      didParseCell: function (data: any) {
        // Highlight medal positions
        if (data.section === 'body' && data.column.index === 0) {
          const rank = parseInt(data.cell.text[0])
          if (rank <= 3) {
            switch (rank) {
              case 1:
                data.cell.styles.fillColor = [255, 250, 205]
                break
              case 2:
                data.cell.styles.fillColor = [245, 245, 245]
                break
              case 3:
                data.cell.styles.fillColor = [255, 243, 224]
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
      didDrawCell: function (data: any) {
        // Draw ranking badges for top 3 positions
        if (data.section === 'body' && data.column.index === 0) {
          const rank = parseInt(data.cell.text[0])
          if (rank <= 3) {
            const cell = data.cell
            const x = cell.x + cell.width / 2
            const y = cell.y + cell.height / 2
            drawRankingBadge(doc, rank, x, y, 'rank')
          }
        }
      },
      didDrawPage: function () {
        addPDFHeaderFooter({
          doc,
          event: selectedEvent,
          documentTitle: `Competition Results - ${competitionName}`,
          pageWidth,
          pageHeight
        })
      }
    })

    doc.save(`results_${competitionName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }, [disciplines, formatScore, selectedEvent])

  /**
   * Export all competitions to PDF
   */
  const exportAllCompetitionsPDF = useCallback(() => {
    if (competitionGroups.length === 0) return

    const doc = new jsPDF('landscape')
    const pageFormat = doc.internal.pageSize
    const pageWidth = pageFormat.width
    const pageHeight = pageFormat.height

    let currentY = 60

    competitionGroups.forEach((group, groupIndex) => {
      // Add page break if needed
      if (groupIndex > 0 && currentY > pageHeight - 100) {
        doc.addPage()
        currentY = 60
      }

      // Add competition title
      addSectionTitle(doc, group.competitionName, currentY)
      currentY += 15

      // Table headers
      const headers = [
        'Platz', 'Start #', 'Name', 'Verein', 'Jg',
        ...group.disciplines,
        'Gesamt'
      ]

      // Table data with jury results support
      const tableData = group.participants.map(participant => {
        const baseRow = [
          participant.rank,
          participant.startNumber || '',
          participant.name,
          participant.club,
          participant.age
        ]

        // For each discipline, include score and jury breakdown if available
        const disciplineData = group.disciplines.map(discipline => {
          const score = participant.scores[discipline]
          if (!score) return '-'

          const juryResults = participant.juryResults?.[discipline]
          if (!juryResults || juryResults.length === 0) {
            return formatScore(score)
          }

          // Build jury breakdown string
          const formula = participant.formulas?.[discipline] || ''
          const startValue = participant.startValues?.[discipline]
          
          // Format individual field scores
          const fieldScores = juryResults
            .filter(jr => !jr.isFinalScore)
            .map(jr => `${jr.fieldShortName}: ${jr.performance !== null ? jr.performance.toFixed(1) : '-'}`)
            .join(', ')

          // Build detailed breakdown
          const breakdown: string[] = []
          if (formula) breakdown.push(`Formula: ${formula}`)
          if (startValue !== undefined) breakdown.push(`Start: ${startValue}`)
          if (fieldScores) breakdown.push(fieldScores)
          breakdown.push(`Total: ${formatScore(score)}`)

          return breakdown.join('\n')
        })

        return [...baseRow, ...disciplineData, formatScore(participant.totalScore)]
      })

      // Get unified table styles
      const unifiedStyles = getUnifiedTableStyles()

      // Generate table with jury results support
      autoTable(doc, {
        ...unifiedStyles,
        head: [headers],
        body: tableData,
        startY: currentY,
        pageBreak: 'auto',
        styles: {
          ...unifiedStyles.styles,
          fontSize: 7,
          cellPadding: 3,
          lineWidth: 0.1,
          valign: 'middle',
          overflow: 'linebreak', // Enable line breaks for multi-line content
        },
        columnStyles: (() => {
          const styles: any = {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'center', cellWidth: 18 },
            2: { halign: 'left', cellWidth: 45 },
            3: { halign: 'left', cellWidth: 38 },
            4: { halign: 'center', cellWidth: 12 },
            [headers.length - 1]: {
              halign: 'center',
              cellWidth: 20,
              fillColor: [240, 248, 255],
              fontStyle: 'bold'
            }
          }
          // Discipline columns with more space for jury results
          group.disciplines.forEach((_, index) => {
            styles[5 + index] = { 
              halign: 'center', 
              cellWidth: 24, // Increased from 18 to accommodate jury details
              fontSize: 6, // Smaller font for breakdown
              cellPadding: 2
            }
          })
          return styles
        })(),
        didParseCell: function (data: any) {
          if (data.section === 'body' && data.column.index === 0) {
            const rank = parseInt(data.cell.text[0])
            if (rank <= 3) {
              switch (rank) {
                case 1:
                  data.cell.styles.fillColor = [255, 250, 205]
                  break
                case 2:
                  data.cell.styles.fillColor = [245, 245, 245]
                  break
                case 3:
                  data.cell.styles.fillColor = [255, 243, 224]
                  break
              }
              data.cell.styles.textColor = [0, 0, 0]
              data.cell.styles.fontStyle = 'bold'
            }
          }

          if (data.section === 'body' && data.column.index === headers.length - 1) {
            data.cell.styles.fillColor = [240, 248, 255]
            data.cell.styles.fontStyle = 'bold'
          }
        },
        didDrawCell: function (data: any) {
          if (data.section === 'body' && data.column.index === 0) {
            const rank = parseInt(data.cell.text[0])
            if (rank <= 3) {
              const cell = data.cell
              const x = cell.x + cell.width / 2
              const y = cell.y + cell.height / 2
              drawRankingBadge(doc, rank, x, y, 'rank')
            }
          }
        },
        didDrawPage: function (data: any) {
          addPDFHeaderFooter({
            doc,
            event: selectedEvent,
            documentTitle: 'Competition Results - All Competitions',
            pageWidth,
            pageHeight
          })
          currentY = (data as any).cursor.y + 15
        }
      })

      currentY += 10
    })

    doc.save(`results_all_competitions_${eventName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }, [competitionGroups, eventName, formatScore, selectedEvent])

  /**
   * Main export function that chooses between single or all competitions
   */
  const exportResultsPDF = useCallback(() => {
    if (selectedCompetition) {
      // Single competition export
      if (ranking.length === 0) return
      const competitionName = competitionGroups.find(g => g.competitionId.toString() === selectedCompetition)?.competitionName || `Competition ${selectedCompetition}`
      exportSingleCompetitionPDF(ranking, competitionName)
    } else {
      // All competitions export
      exportAllCompetitionsPDF()
    }
  }, [selectedCompetition, ranking, competitionGroups, exportSingleCompetitionPDF, exportAllCompetitionsPDF])

  return {
    exportResultsCSV,
    exportResultsPDF
  }
}
