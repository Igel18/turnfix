// Fixed-width layout used by the PDF export: 15+18+45+38+12 (person) + 20 (total) + 24 per discipline.
import { drawRankingBadge } from '@/utils/pdfUtils'
import { pdfColors } from '@/utils/pdfStyles'
const PERSON_AND_TOTAL_WIDTH = 148
const DISCIPLINE_COLUMN_WIDTH = 24
const TABLE_SIDE_MARGIN = 14.15

export const WRAPPED_COLUMNS = 6
const PERSON_COLUMNS = 5

export type WrappedRowKind = 'person' | 'detail'

export const needsWrappedLayout = (disciplineCount: number, pageWidth: number): boolean =>
  PERSON_AND_TOTAL_WIDTH + disciplineCount * DISCIPLINE_COLUMN_WIDTH > pageWidth - 2 * TABLE_SIDE_MARGIN

const chunk = <T>(items: T[], size: number, filler: T): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    const part = items.slice(i, i + size)
    while (part.length < size) part.push(filler)
    chunks.push(part)
  }
  return chunks
}

/**
 * Converts [person cols..., discipline cols..., total] rows into a grid where the
 * disciplines are printed in extra rows below the person's row.
 */
export const buildWrappedTable = (
  headers: string[],
  rows: Array<Array<string | number>>
) => {
  const personHeaders = headers.slice(0, PERSON_COLUMNS)
  const totalHeader = headers[headers.length - 1]
  const disciplineHeaders = headers.slice(PERSON_COLUMNS, -1)

  const head: string[][] = [
    [...personHeaders, totalHeader],
    ...chunk(disciplineHeaders, WRAPPED_COLUMNS, '')
  ]

  const body: Array<Array<string | number>> = []
  const rowKinds: WrappedRowKind[] = []

  rows.forEach(row => {
    body.push([...row.slice(0, PERSON_COLUMNS), row[row.length - 1]])
    rowKinds.push('person')
    chunk(row.slice(PERSON_COLUMNS, -1), WRAPPED_COLUMNS, '').forEach(detail => {
      body.push(detail)
      rowKinds.push('detail')
    })
  })

  return { head, body, rowKinds }
}

/**
 * autoTable options for the wrapped layout (equal columns, person row highlighted,
 * discipline scores in smaller centred rows below).
 */
export const getWrappedTableOptions = (
  doc: any,
  headers: string[],
  rows: Array<Array<string | number>>
) => {
  const { head, body, rowKinds } = buildWrappedTable(headers, rows)
  const columnWidth = (doc.internal.pageSize.width - 2 * TABLE_SIDE_MARGIN) / WRAPPED_COLUMNS
  const isPersonRow = (index: number) => rowKinds[index] === 'person'

  const columnStyles: Record<number, any> = {}
  for (let i = 0; i < WRAPPED_COLUMNS; i++) {
    columnStyles[i] = { cellWidth: columnWidth, halign: i === 2 || i === 3 ? 'left' : 'center' }
  }

  return {
    head,
    body,
    columnStyles,
    didParseCell: (data: any) => {
      if (data.section !== 'body') return
      if (isPersonRow(data.row.index)) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = pdfColors.background.header
        if (data.column.index === 0) {
          const rank = parseInt(data.cell.text[0])
          const medal = [pdfColors.ranking.gold, pdfColors.ranking.silver, pdfColors.ranking.bronze][rank - 1]
          if (medal) data.cell.styles.fillColor = medal
        }
      } else {
        data.cell.styles.halign = 'center'
        data.cell.styles.fontSize = 6
      }
    },
    didDrawCell: (data: any) => {
      if (data.section !== 'body' || data.column.index !== 0 || !isPersonRow(data.row.index)) return
      const rank = parseInt(data.cell.text[0])
      if (rank >= 1 && rank <= 3) {
        drawRankingBadge(doc, rank, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, 'rank')
      }
    }
  }
}
