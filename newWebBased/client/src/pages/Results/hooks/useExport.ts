/**
 * useExport Hook
 * Point 123: Separation of Concerns
 * 
 * Handles export functionality:
 * - CSV export with formatted scores
 * - PDF export (single competition or all competitions)
 * - File naming and formatting
 * 
 * REFACTORED: Uses centralized formula utilities
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useEvent } from '@/contexts/EventContext'
import {
  addPDFHeaderFooter,
  getUnifiedTableStyles,
  addSectionTitle,
  drawRankingBadge
} from '@/utils/pdfUtils'
import {
  pdfColors,
  applyTableHeaderStyle,
  applyFormulaStyle
} from '@/utils/pdfStyles'
import { getDisciplineShortName } from '@/utils/disciplineIcons'
import { preloadIconsForPDF, addIconToPDF, type IconData } from '@/utils/pdfIcons'
import { getUnifiedResultsHeaderLabels } from '@/utils/headerLabels'
import { 
  buildFieldSymbolsMap, 
  detectFormulaType,
  formatScore as formatScoreUtil 
} from '@/utils/formulaUtils'
import type { Participant, CompetitionGroup, DisciplineInfo } from '../Results.types'

interface UseExportProps {
  eventId: string | null
  eventName: string
  selectedCompetition: string | null
  ranking: Participant[]
  competitionGroups: CompetitionGroup[]
  disciplines: string[]
  disciplineFormulas: Record<string, string>
  selectedCompetitionDisciplineInfo: DisciplineInfo[]
  formatScore: (score: number) => string
}

export const resolveCompetitionExportName = (
  selectedCompetition: string,
  ranking: Participant[],
  competitionGroups: CompetitionGroup[]
) => {
  const rankingMatch = ranking.find(participant => participant.competitionId?.toString() === selectedCompetition)
  if (rankingMatch?.competitionName?.trim()) {
    return rankingMatch.competitionName.trim()
  }

  const groupMatch = competitionGroups.find(group => group.competitionId.toString() === selectedCompetition)
  if (groupMatch?.competitionName?.trim()) {
    return groupMatch.competitionName.trim()
  }

  return `Competition ${selectedCompetition}`
}

export const useExport = ({
  eventId,
  eventName,
  selectedCompetition,
  ranking,
  competitionGroups,
  disciplines,
  disciplineFormulas,
  selectedCompetitionDisciplineInfo,
  formatScore
}: UseExportProps) => {
  const { selectedEvent } = useEvent()
  const { t } = useTranslation()
  const labels = getUnifiedResultsHeaderLabels(t)

  interface DisciplineHeaderMeta {
    shortName: string
    formula?: string
    iconPath?: string
  }

  const buildDisciplineHeaderMeta = (
    disciplineNames: string[],
    participants: Participant[],
    preferredFormulas: Record<string, string>,
    disciplineInfo: DisciplineInfo[]
  ): Record<string, DisciplineHeaderMeta> => {
    const byName = new Map(disciplineInfo.map(info => [info.name, info]))
    const formulaMap = getDisciplineFormulaMap(participants, disciplineNames, preferredFormulas)

    return disciplineNames.reduce((acc: Record<string, DisciplineHeaderMeta>, discipline) => {
      const info = byName.get(discipline)
      acc[discipline] = {
        shortName: getDisciplineShortName(discipline, info?.fullData || info),
        formula: formulaMap[discipline],
        iconPath: info?.iconPath || info?.fullData?.var_icon
      }
      return acc
    }, {})
  }

  const getDisciplineFormulaMap = (
    participants: Participant[],
    disciplineNames: string[],
    preferredFormulas: Record<string, string> = {}
  ) => {
    const formulaMap: Record<string, string> = {}

    disciplineNames.forEach((discipline) => {
      const preferred = preferredFormulas[discipline]
      if (preferred && preferred.trim()) {
        formulaMap[discipline] = preferred.trim()
        return
      }

      const formula = participants
        .map(participant => participant.formulas?.[discipline])
        .find(value => value && value.trim())

      if (formula) {
        formulaMap[discipline] = formula.trim()
      }
    })

    return formulaMap
  }

  /**
   * Export results to CSV format
   */
  const exportResultsCSV = useCallback(() => {
    if (ranking.length === 0) return

    const headers = [
      labels.rank,
      labels.startNumber,
      labels.name,
      labels.club,
      labels.age,
      ...disciplines,
      labels.total
    ]
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
  }, [ranking, disciplines, eventName, formatScore, t])

  /**
   * Export single competition results to PDF
   */
  const exportSingleCompetitionPDF = useCallback(async (
    participants: Participant[],
    competitionName: string
  ) => {
    const doc = new jsPDF('landscape')
    const pageFormat = doc.internal.pageSize
    const pageWidth = pageFormat.width
    const pageHeight = pageFormat.height

    const headerMeta = buildDisciplineHeaderMeta(
      disciplines,
      participants,
      disciplineFormulas,
      selectedCompetitionDisciplineInfo
    )
    const iconCache = await preloadIconsForPDF(
      disciplines.map(discipline => ({
        name: discipline,
        iconPath: headerMeta[discipline]?.iconPath
      }))
    )

    // Table headers
    const headers = [
      labels.rank,
      labels.startNumber,
      labels.name,
      labels.club,
      labels.age,
      ...disciplines.map(discipline => headerMeta[discipline]?.shortName || discipline),
      labels.total
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

        // Use centralized formula utilities
        const formula = participant.formulas?.[discipline]
        const formulaType = formula ? detectFormulaType(formula) : 'none'
        
        // Variable-type formulas (e.g. "1*x") have no field breakdown.
        // Old jury results from a previous linked formula are stale.
        // This matches JuryResultsDisplay, Score Capture, and Jury Portal behavior.
        if (formulaType === 'variable') {
          return formatScore(score)
        }

        // Build field symbols map
        const fieldsMap = buildFieldSymbolsMap(juryResults, formula)
        const fields = Object.values(fieldsMap)

        // Build detailed breakdown
        const breakdown: string[] = []
        
        // Field scores
        const fieldScores = fields
          .map(f => `${f.symbol}: ${formatScoreUtil(f.value)}`)
          .join(', ')
        if (fieldScores) breakdown.push(fieldScores)
        
        breakdown.push(`Total: ${formatScore(score)}`)

        return breakdown.join('\n')
      })

      return [...baseRow, ...disciplineData, formatScore(participant.totalScore)]
    })

    // Get unified table styles
    const unifiedStyles = getUnifiedTableStyles()

    // Add competition name as visible heading above the table
    addSectionTitle(doc, competitionName, 60)

    // Generate table with jury results support
    autoTable(doc, {
      ...unifiedStyles,
      head: [headers],
      body: tableData,
      startY: 75,
      headStyles: {
        ...(unifiedStyles.headStyles || {}),
        minCellHeight: 9
      },
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
            fillColor: pdfColors.background.header,
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
        if (data.section === 'head' && data.column.index >= 5 && data.column.index < headers.length - 1) {
          data.cell.text = ['']
        }

        // Highlight medal positions
        if (data.section === 'body' && data.column.index === 0) {
          const rank = parseInt(data.cell.text[0])
          if (rank <= 3) {
            switch (rank) {
              case 1:
                data.cell.styles.fillColor = pdfColors.ranking.gold
                break
              case 2:
                data.cell.styles.fillColor = pdfColors.ranking.silver
                break
              case 3:
                data.cell.styles.fillColor = pdfColors.ranking.bronze
                break
            }
            data.cell.styles.textColor = pdfColors.text.primary
            data.cell.styles.fontStyle = 'bold'
          }
        }

        // Highlight total score column
        if (data.section === 'body' && data.column.index === headers.length - 1) {
          data.cell.styles.fillColor = pdfColors.background.header
          data.cell.styles.fontStyle = 'bold'
        }
      },
      didDrawCell: function (data: any) {
        if (data.section === 'head' && data.column.index >= 5 && data.column.index < headers.length - 1) {
          const discipline = disciplines[data.column.index - 5]
          const meta = headerMeta[discipline]
          if (meta) {
            const cell = data.cell
            const icon: IconData | undefined = iconCache.get(discipline)

            if (icon) {
              addIconToPDF(doc, icon, cell.x + 1.5, cell.y + 1.2, 3.2)
            }

            applyTableHeaderStyle(doc)
            doc.text(meta.shortName, cell.x + cell.width / 2, cell.y + 4.2, { align: 'center' })

            if (meta.formula) {
              applyFormulaStyle(doc)
              doc.text(meta.formula, cell.x + cell.width / 2, cell.y + 7.5, { align: 'center' })
            }
          }
        }

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
    })

    // Add header/footer to ALL pages AFTER table generation
    // so that getNumberOfPages() returns the correct final total
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      addPDFHeaderFooter({
        doc,
        event: selectedEvent,
        documentTitle: `Competition Results - ${competitionName}`,
        pageWidth,
        pageHeight
      })
    }

    doc.save(`results_${competitionName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }, [disciplines, disciplineFormulas, selectedCompetitionDisciplineInfo, formatScore, selectedEvent, t])

  /**
   * Export all competitions to PDF
   */
  const exportAllCompetitionsPDF = useCallback(async () => {
    if (competitionGroups.length === 0) return

    const doc = new jsPDF('landscape')
    const pageFormat = doc.internal.pageSize
    const pageWidth = pageFormat.width
    const pageHeight = pageFormat.height

    let currentY = 60

    for (let groupIndex = 0; groupIndex < competitionGroups.length; groupIndex++) {
      const group = competitionGroups[groupIndex]
      // Add page break if needed
      if (groupIndex > 0 && currentY > pageHeight - 100) {
        doc.addPage()
        currentY = 60
      }

      // Add competition title
      addSectionTitle(doc, group.competitionName, currentY)
      currentY += 15

      // Table headers
      const groupHeaderFormulas = group.disciplineInfo.reduce((acc: Record<string, string>, disciplineInfo) => {
        const formula = disciplineInfo.fullData?.var_formel || disciplineInfo.fullData?.formula
        if (formula && String(formula).trim()) {
          acc[disciplineInfo.name] = String(formula).trim()
        }
        return acc
      }, {})

      const headerMeta = buildDisciplineHeaderMeta(
        group.disciplines,
        group.participants,
        groupHeaderFormulas,
        group.disciplineInfo
      )
      const iconCache = await preloadIconsForPDF(
        group.disciplines.map(discipline => ({
          name: discipline,
          iconPath: headerMeta[discipline]?.iconPath
        }))
      )

      const headers = [
        labels.rank,
        labels.startNumber,
        labels.name,
        labels.club,
        labels.age,
        ...group.disciplines.map(discipline => headerMeta[discipline]?.shortName || discipline),
        labels.total
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

          // Use centralized formula utilities
          const formula = participant.formulas?.[discipline]
          const formulaType = formula ? detectFormulaType(formula) : 'none'
          
          // Variable-type formulas (e.g. "1*x") have no field breakdown.
          // Old jury results from a previous linked formula are stale.
          // This matches JuryResultsDisplay, Score Capture, and Jury Portal behavior.
          if (formulaType === 'variable') {
            return formatScore(score)
          }

          // Build field symbols map
          const fieldsMap = buildFieldSymbolsMap(juryResults, formula)
          const fields = Object.values(fieldsMap)

          // Build detailed breakdown
          const breakdown: string[] = []
          
          // Field scores
          const fieldScores = fields
            .map(f => `${f.symbol}: ${formatScoreUtil(f.value)}`)
            .join(', ')
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
        headStyles: {
          ...(unifiedStyles.headStyles || {}),
          minCellHeight: 9
        },
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
          if (data.section === 'head' && data.column.index >= 5 && data.column.index < headers.length - 1) {
            data.cell.text = ['']
          }

          if (data.section === 'body' && data.column.index === 0) {
            const rank = parseInt(data.cell.text[0])
            if (rank <= 3) {
              switch (rank) {
                case 1:
                  data.cell.styles.fillColor = pdfColors.ranking.gold
                  break
                case 2:
                  data.cell.styles.fillColor = pdfColors.ranking.silver
                  break
                case 3:
                  data.cell.styles.fillColor = pdfColors.ranking.bronze
                  break
              }
              data.cell.styles.textColor = pdfColors.text.primary
              data.cell.styles.fontStyle = 'bold'
            }
          }

          if (data.section === 'body' && data.column.index === headers.length - 1) {
            data.cell.styles.fillColor = pdfColors.background.header
            data.cell.styles.fontStyle = 'bold'
          }
        },
        didDrawCell: function (data: any) {
          if (data.section === 'head' && data.column.index >= 5 && data.column.index < headers.length - 1) {
            const discipline = group.disciplines[data.column.index - 5]
            const meta = headerMeta[discipline]
            if (meta) {
              const cell = data.cell
              const icon: IconData | undefined = iconCache.get(discipline)

              if (icon) {
                addIconToPDF(doc, icon, cell.x + 1.5, cell.y + 1.2, 3.2)
              }

              applyTableHeaderStyle(doc)
              doc.text(meta.shortName, cell.x + cell.width / 2, cell.y + 4.2, { align: 'center' })

              if (meta.formula) {
                applyFormulaStyle(doc)
                doc.text(meta.formula, cell.x + cell.width / 2, cell.y + 7.5, { align: 'center' })
              }
            }
          }

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
          currentY = (data as any).cursor.y + 15
        }
      })

      currentY += 10
    }

    // Add header/footer to ALL pages AFTER all tables are generated
    // so that getNumberOfPages() returns the correct final total
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

    doc.save(`results_all_competitions_${eventName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }, [competitionGroups, eventName, formatScore, selectedEvent, t])

  /**
   * Main export function that chooses between single or all competitions
   */
  const exportResultsPDF = useCallback(() => {
    if (selectedCompetition) {
      // Single competition export
      if (ranking.length === 0) return
      const competitionName = resolveCompetitionExportName(selectedCompetition, ranking, competitionGroups)
      void exportSingleCompetitionPDF(ranking, competitionName)
    } else {
      // All competitions export
      void exportAllCompetitionsPDF()
    }
  }, [selectedCompetition, ranking, competitionGroups, exportSingleCompetitionPDF, exportAllCompetitionsPDF])

  /**
   * Export GymNet XML for current event/competition
   */
  const exportResultsGymNetXML = useCallback(async () => {
    if (!eventId) return

    const params = new URLSearchParams({ eventId })
    if (selectedCompetition) {
      params.append('competitionId', selectedCompetition)
    }

    const response = await fetch(`/api/results/export-gymnet-xml?${params.toString()}`)
    if (!response.ok) {
      throw new Error('Failed to export GymNet XML')
    }

    const blob = await response.blob()
    const headerFileName = response.headers
      .get('content-disposition')
      ?.match(/filename="?([^";]+)"?/i)?.[1]

    const fallbackName = `gymnet_results_${eventName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xml`
    const fileName = headerFileName || fallbackName

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(url)
  }, [eventId, selectedCompetition, eventName])

  return {
    exportResultsCSV,
    exportResultsPDF,
    exportResultsGymNetXML
  }
}
