import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Event {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  status: 'upcoming' | 'active' | 'completed'
}

/** Orientation type for PDF documents */
export type PDFOrientation = 'portrait' | 'landscape'

/** A4 page dimensions in mm */
export const A4_DIMENSIONS = {
  portrait: { width: 210, height: 297 },
  landscape: { width: 297, height: 210 }
} as const

interface PDFHeaderFooterOptions {
  doc: jsPDF
  event: Event | null
  documentTitle: string
  pageWidth?: number
  pageHeight?: number
}

/**
 * Adds standardized header and footer to PDF pages
 * Header Left: Event name, date, location
 * Header Right: Document title (e.g., "Competition Results")
 * Footer Left: "created with TurnFix" and GitHub URL
 * Footer Center: Page number
 * Footer Right: Current date/time and GNU GPL v3 license
 */
export const addPDFHeaderFooter = (options: PDFHeaderFooterOptions) => {
  const { doc, event, documentTitle, pageWidth = 297, pageHeight = 210 } = options
  
  // Header configuration
  const headerHeight = 15
  const footerHeight = 15
  const margin = 10
  
  // Clear header area with white background to prevent text overlap
  doc.setFillColor(255, 255, 255) // White background
  doc.rect(0, 0, pageWidth, headerHeight + 15, 'F') // Fill rectangle for entire header area
  
  // Reset to black text and drawing color
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  
  // Set header font
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Header Left: Event info
  if (event) {
    const eventStartDate = event.dat_eventstartdate ? new Date(event.dat_eventstartdate).toLocaleDateString('de-DE') : ''
    const eventEndDate = event.dat_eventenddate ? new Date(event.dat_eventenddate).toLocaleDateString('de-DE') : ''
    
    let dateRange = ''
    if (eventStartDate && eventEndDate) {
      if (eventStartDate === eventEndDate) {
        dateRange = eventStartDate
      } else {
        dateRange = `${eventStartDate} - ${eventEndDate}`
      }
    } else if (eventStartDate) {
      dateRange = eventStartDate
    }
    
    const headerLeftLines = [
      event.var_eventname || 'Event',
      dateRange,
      event.var_location || ''
    ].filter(line => line.trim() !== '')
    
    headerLeftLines.forEach((line, index) => {
      doc.text(line, margin, headerHeight + (index * 4))
    })
  }
  
  // Header Right: Document title
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0) // Ensure black text
  doc.text(documentTitle, pageWidth - margin, headerHeight, { align: 'right' })
  
  // Reset text color and font for content
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  
  // Header separator line (consistent color and width)
  doc.setDrawColor(0, 0, 0) // Black line
  doc.setLineWidth(0.5)
  doc.line(margin, headerHeight + 12, pageWidth - margin, headerHeight + 12)
  
  // Footer configuration
  const footerY = pageHeight - footerHeight
  
  // Clear footer area with white background to prevent text overlap
  doc.setFillColor(255, 255, 255) // White background
  doc.rect(0, footerY - 6, pageWidth, footerHeight + 12, 'F') // Fill rectangle for entire footer area
  
  // Reset colors for footer
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  
  // Footer separator line (consistent color and width)
  doc.setDrawColor(0, 0, 0) // Black line
  doc.setLineWidth(0.5)
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
  
  // Footer Left: TurnFix branding
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0) // Ensure black text
  doc.text('created with TurnFix', margin, footerY)
  doc.text('github.com/Igel18/turnfix', margin, footerY + 4)
  
  // Footer Center: Page number
  const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber
  const totalPages = (doc as any).internal.getNumberOfPages()
  
  // For didDrawPage callbacks, we need to get total pages differently
  let pageText = `${currentPage}`
  try {
    if (totalPages > 0) {
      pageText = `${currentPage} / ${totalPages}`
    } else {
      // During didDrawPage, total pages might not be available yet
      pageText = `Seite ${currentPage}`
    }
  } catch (e) {
    pageText = `Seite ${currentPage}`
  }
  
  doc.text(pageText, pageWidth / 2, footerY + 2, { align: 'center' })
  
  // Footer Right: Date/time and license
  const currentDateTime = new Date().toLocaleString('de-DE')
  doc.text(currentDateTime, pageWidth - margin, footerY, { align: 'right' })
  doc.text('GNU GPL v3', pageWidth - margin, footerY + 4, { align: 'right' })
  
  // Reset all colors and styles to defaults after header/footer
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  doc.setFillColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
}

/**
 * Calculates the available content area after headers and footers
 */
export const getContentArea = (pageWidth: number = 297, pageHeight: number = 210) => {
  const margin = 10
  const headerHeight = 32 // Header + separator + spacing (increased to prevent overlap)
  const footerHeight = 25 // Footer + separator + spacing (increased to prevent overlap)
  
  return {
    startX: margin,
    startY: headerHeight,
    endX: pageWidth - margin,
    endY: pageHeight - footerHeight,
    width: pageWidth - (2 * margin),
    height: pageHeight - headerHeight - footerHeight
  }
}

/**
 * Helper function to add header/footer to all existing pages and set up for new pages
 */
export const setupPDFWithHeaderFooter = (doc: jsPDF, event: Event | null, documentTitle: string) => {
  const pageCount = (doc as any).internal.getNumberOfPages()
  const pageFormat = doc.internal.pageSize
  const pageWidth = pageFormat.width
  const pageHeight = pageFormat.height
  
  // Add header/footer to all existing pages
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    addPDFHeaderFooter({
      doc,
      event,
      documentTitle,
      pageWidth,
      pageHeight
    })
  }
  
  return getContentArea(pageWidth, pageHeight)
}

/**
 * Unified PDF Configuration for consistent styling across all PDF exports
 * Point 34: PDF-Export Vereinheitlichung
 */
export const PDF_CONFIG = {
  fonts: {
    title: { size: 16, style: 'bold' as const },
    subtitle: { size: 14, style: 'bold' as const },
    header: { size: 12, style: 'bold' as const },
    body: { size: 10, style: 'normal' as const },
    small: { size: 8, style: 'normal' as const }
  },
  colors: {
    primary: [229, 236, 246] as [number, number, number],    // Dezentes Blau-Grau für Tabellenkopf
    secondary: [153, 163, 179] as [number, number, number],  // Neutrales Grau für Linien
    headingText: [33, 43, 54] as [number, number, number],   // Dunkles Blau-Grau für Kopftexte
    success: [76, 175, 80] as [number, number, number],      // Grün - für Erfolg/Highlights
    warning: [255, 152, 0] as [number, number, number],      // Orange - für Warnungen
    error: [244, 67, 54] as [number, number, number],        // Rot - für Fehler
    text: [0, 0, 0] as [number, number, number],             // Schwarz - Standardtext
    background: [248, 250, 252] as [number, number, number], // Sehr helles Grau für Zebra-Zeilen
    white: [255, 255, 255] as [number, number, number],      // Weiß
    gold: [255, 215, 0] as [number, number, number],         // Gold - Medaillen
    silver: [192, 192, 192] as [number, number, number],     // Silber - Medaillen
    bronze: [205, 127, 50] as [number, number, number]       // Bronze - Medaillen
  },
  margins: {
    page: 10,
    header: 32,    // Erhöht um Header-Überlappung zu vermeiden
    footer: 25,    // Erhöht um Footer-Überlappung zu vermeiden
    table: 5
  },
  spacing: {
    line: 5,       // Zeilenabstand
    section: 10,   // Abschnittabstand
    paragraph: 7   // Absatzabstand
  }
}

/**
 * Draw a rounded badge for rankings/placements in PDF tables
 * Creates a badge similar to the Web UI (rounded-full style)
 * 
 * @param doc - jsPDF document instance
 * @param value - The value to display in the badge (e.g., rank number, medal count)
 * @param x - X position (center of badge)
 * @param y - Y position (center of badge)
 * @param type - Badge type: 'rank' (for placements 1-3), 'gold', 'silver', 'bronze', or 'default'
 * @param options - Optional customization (width, height, radius, fontSize)
 */
export const drawRankingBadge = (
  doc: jsPDF, 
  value: string | number, 
  x: number, 
  y: number, 
  type: 'rank' | 'gold' | 'silver' | 'bronze' | 'default' = 'default',
  options?: {
    width?: number
    height?: number
    radius?: number
    fontSize?: number
  }
) => {
  const badgeWidth = options?.width || 16
  const badgeHeight = options?.height || 6
  const radius = options?.radius || 3
  const fontSize = options?.fontSize || 9
  
  // Badge colors based on type
  let fillColor: [number, number, number]
  let textColor: [number, number, number] = [0, 0, 0] // Black text by default
  
  switch (type) {
    case 'rank':
      // For rank 1-3, use special colors
      const rankNum = typeof value === 'number' ? value : parseInt(value.toString())
      if (rankNum === 1) {
        fillColor = [255, 250, 205] // Cream yellow for 1st place
      } else if (rankNum === 2) {
        fillColor = [245, 245, 245] // Light gray for 2nd place
      } else if (rankNum === 3) {
        fillColor = [255, 243, 224] // Cream orange for 3rd place
      } else {
        fillColor = [255, 255, 255] // White for other ranks
      }
      break
    case 'gold':
      fillColor = [255, 235, 59] // Soft yellow
      break
    case 'silver':
      fillColor = [224, 224, 224] // Light gray
      break
    case 'bronze':
      fillColor = [255, 193, 7] // Warm orange
      break
    default:
      fillColor = [240, 248, 255] // Light blue (default)
      break
  }
  
  // Draw rounded rectangle as badge background
  doc.setFillColor(...fillColor)
  doc.roundedRect(x - badgeWidth/2, y - badgeHeight/2, badgeWidth, badgeHeight, radius, radius, 'F')
  
  // Draw text on badge
  doc.setTextColor(...textColor)
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')
  doc.text(value.toString(), x, y + 1.5, { align: 'center' })
}

/**
 * Get unified table styles for autoTable
 * Ensures consistent table appearance across all PDF exports
 */
export const getUnifiedTableStyles = () => ({
  headStyles: {
    fillColor: PDF_CONFIG.colors.primary,
    textColor: PDF_CONFIG.colors.headingText,
    fontSize: PDF_CONFIG.fonts.header.size,
    fontStyle: 'bold',
    halign: 'center' as const,
    valign: 'middle' as const,
    cellPadding: 2.8
  },
  bodyStyles: {
    fontSize: PDF_CONFIG.fonts.body.size,
    cellPadding: 2.2,
    minCellHeight: 7.2,
    textColor: PDF_CONFIG.colors.text
  },
  alternateRowStyles: {
    fillColor: PDF_CONFIG.colors.background
  },
  margin: { 
    top: PDF_CONFIG.margins.header,
    bottom: PDF_CONFIG.margins.footer 
  },
  styles: {
    overflow: 'linebreak' as const,
    cellWidth: 'wrap' as const,
    lineColor: PDF_CONFIG.colors.secondary,
    lineWidth: 0.06
  }
})

/**
 * Add a section title to the PDF
 * Consistent styling for section headers
 */
export const addSectionTitle = (doc: jsPDF, title: string, y: number, options?: { 
  fontSize?: number, 
  fontStyle?: 'normal' | 'bold' | 'italic',
  color?: [number, number, number],
  align?: 'left' | 'center' | 'right'
}) => {
  const fontSize = options?.fontSize || PDF_CONFIG.fonts.subtitle.size
  const fontStyle = options?.fontStyle || PDF_CONFIG.fonts.subtitle.style
  const color = options?.color || PDF_CONFIG.colors.text
  const align = options?.align || 'left'
  
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', fontStyle)
  doc.setTextColor(...color)
  
  const x = align === 'center' 
    ? doc.internal.pageSize.getWidth() / 2 
    : align === 'right'
    ? doc.internal.pageSize.getWidth() - PDF_CONFIG.margins.page
    : PDF_CONFIG.margins.page
  
  doc.text(title, x, y, { align })
  
  return y + PDF_CONFIG.spacing.section
}

/**
 * Add a horizontal separator line
 */
export const addSeparatorLine = (doc: jsPDF, y: number, options?: {
  color?: [number, number, number],
  lineWidth?: number,
  margin?: number
}) => {
  const color = options?.color || PDF_CONFIG.colors.secondary
  const lineWidth = options?.lineWidth || 0.5
  const margin = options?.margin || PDF_CONFIG.margins.page
  
  doc.setDrawColor(...color)
  doc.setLineWidth(lineWidth)
  
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.line(margin, y, pageWidth - margin, y)
  
  return y + PDF_CONFIG.spacing.line
}

/**
 * Format date for PDF display
 */
export const formatPDFDate = (date: string | Date, locale: string = 'de-DE'): string => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString(locale)
}

/**
 * Format date range for PDF display
 */
export const formatPDFDateRange = (startDate: string | Date, endDate?: string | Date, locale: string = 'de-DE'): string => {
  if (!startDate) return ''
  
  const start = formatPDFDate(startDate, locale)
  
  if (!endDate) return start
  
  const end = formatPDFDate(endDate, locale)
  
  return start === end ? start : `${start} - ${end}`
}

/**
 * Add body text to the PDF with consistent styling
 * Returns the new Y position after the text
 */
export const addBodyText = (doc: jsPDF, text: string, x: number, y: number, options?: {
  fontSize?: number,
  fontStyle?: 'normal' | 'bold' | 'italic',
  color?: [number, number, number],
  maxWidth?: number
}): number => {
  const fontSize = options?.fontSize || PDF_CONFIG.fonts.body.size
  const fontStyle = options?.fontStyle || PDF_CONFIG.fonts.body.style
  const color = options?.color || PDF_CONFIG.colors.text
  const maxWidth = options?.maxWidth || (doc.internal.pageSize.getWidth() - (2 * PDF_CONFIG.margins.page))
  
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', fontStyle)
  doc.setTextColor(...color)
  
  // Split text into lines if needed
  const lines = doc.splitTextToSize(text, maxWidth)
  
  lines.forEach((line: string) => {
    doc.text(line, x, y)
    y += PDF_CONFIG.spacing.line
  })
  
  return y
}

/**
 * Add a labeled value (e.g., "Name: John Doe") to the PDF
 * Returns the new Y position
 */
export const addLabeledValue = (doc: jsPDF, label: string, value: string, x: number, y: number, options?: {
  labelWidth?: number,
  fontSize?: number
}): number => {
  const fontSize = options?.fontSize || PDF_CONFIG.fonts.body.size
  const labelWidth = options?.labelWidth || 50
  
  // Label in bold
  doc.setFontSize(fontSize)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_CONFIG.colors.text)
  doc.text(`${label}:`, x, y)
  
  // Value in normal
  doc.setFont('helvetica', 'normal')
  doc.text(value || '-', x + labelWidth, y)
  
  return y + PDF_CONFIG.spacing.line + 1
}

/**
 * Reset all PDF styles to defaults
 * Use this after custom styling to ensure consistency
 */
export const resetPDFStyles = (doc: jsPDF) => {
  doc.setFontSize(PDF_CONFIG.fonts.body.size)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_CONFIG.colors.text)
  doc.setDrawColor(0, 0, 0)
  doc.setFillColor(255, 255, 255)
}

/**
 * Creates a new jsPDF document with the given orientation.
 * Returns the doc along with page dimensions for convenience.
 * 
 * Usage:
 *   const { doc, pageWidth, pageHeight } = createPDFDocument('landscape')
 */
export const createPDFDocument = (orientation: PDFOrientation = 'portrait') => {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  return { doc, pageWidth, pageHeight }
}

/**
 * Options for the wide-table column-splitting export
 */
export interface WideTableExportOptions {
  /** The jsPDF document to draw into (if not provided, a new one will be created) */
  doc?: jsPDF
  /** Orientation for the document (default: 'landscape') */
  orientation?: PDFOrientation
  /** Event data for the header */
  event: Event | null
  /** Title shown in the header */
  documentTitle: string
  /** Full array of column header strings */
  columns: string[]
  /** Full 2D array of row data (each row must match columns length) */
  data: string[][]
  /** Number of leading columns that are "frozen" / repeated on every page (default: 1, e.g. the club-name column) */
  frozenColumns?: number
  /** Maximum column width in mm for data columns (default: auto-calculated) */
  maxColumnWidth?: number
  /** Minimum column width in mm for data columns (default: 15) */
  minColumnWidth?: number
  /** Fixed width in mm for each data column. When set, text wraps within this width and page-break calculation uses this value. */
  dataColumnWidth?: number
  /** Width in mm reserved for frozen columns (default: auto-calculated, min 40) */
  frozenColumnWidth?: number
  /** Extra autoTable options merged into each table call */
  tableOptions?: Record<string, any>
  /** Starting Y position for the first table (default: 40) */
  startY?: number
  /** Filename to save – if provided, doc.save() is called automatically */
  filename?: string
}

/**
 * Exports a wide table to PDF, automatically splitting columns across multiple pages
 * when the table would be wider than the available page width.
 * 
 * Frozen columns (e.g. club name) are repeated on every page for readability.
 * Header & footer are added to every page via addPDFHeaderFooter.
 * 
 * This is the "allgemein verfügbar" solution for wide tables.
 * 
 * @returns The jsPDF document for further manipulation or saving.
 */
export const exportWideTablePDF = (options: WideTableExportOptions): jsPDF => {
  const {
    orientation = 'landscape',
    event,
    documentTitle,
    columns,
    data,
    frozenColumns = 1,
    minColumnWidth = 15,
    dataColumnWidth,
    tableOptions = {},
    startY = 40,
    filename,
  } = options

  // Create or reuse document
  const doc = options.doc ?? createPDFDocument(orientation).doc
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = PDF_CONFIG.margins.page

  // Available width for table content
  const availableWidth = pageWidth - 2 * margin

  // Split columns into frozen (always shown) and data columns
  const frozenCols = columns.slice(0, frozenColumns)
  const dataCols = columns.slice(frozenColumns)

  // Estimate width per frozen column (at least 40mm, or proportional)
  const frozenColWidth = options.frozenColumnWidth ?? Math.max(40, availableWidth * 0.2)
  const totalFrozenWidth = frozenColWidth // treated as one block for simplicity

  // Available width for data columns on each page
  const dataAreaWidth = availableWidth - totalFrozenWidth

  // Calculate how many data columns fit per page
  const effectiveColWidth = dataColumnWidth ?? minColumnWidth
  const maxColsPerPage = Math.max(1, Math.floor(dataAreaWidth / effectiveColWidth))

  // Build column styles for data columns with fixed width (if dataColumnWidth is set)
  const buildDataColumnStyles = (colCount: number, frozenCount: number, extraStyles?: Record<string, any>) => {
    const styles: Record<number, any> = { ...(extraStyles || {}) }
    if (dataColumnWidth) {
      for (let i = frozenCount; i < colCount; i++) {
        styles[i] = {
          cellWidth: dataColumnWidth,
          halign: 'center' as const,
          ...(styles[i] || {}),
        }
      }
    }
    return styles
  }

  // Check if all columns fit on a single page
  if (dataCols.length <= maxColsPerPage) {
    // Everything fits on one page – render normally
    const baseStyles = { ...(tableOptions.columnStyles || {}) }
    if (tableOptions.totalColumnStyle) {
      baseStyles[columns.length - 1] = tableOptions.totalColumnStyle
    }
    const mergedTableOptions = {
      ...tableOptions,
      columnStyles: buildDataColumnStyles(columns.length, frozenColumns, baseStyles),
    }
    _renderTablePage(doc, {
      columns,
      data,
      event,
      documentTitle,
      pageWidth,
      pageHeight,
      startY,
      tableOptions: mergedTableOptions,
      isFirstPage: true,
    })
  } else {
    // Split data columns into chunks
    const chunks: string[][] = []
    for (let i = 0; i < dataCols.length; i += maxColsPerPage) {
      chunks.push(dataCols.slice(i, i + maxColsPerPage))
    }

    chunks.forEach((chunkCols, chunkIndex) => {
      // Add new page for chunks after the first
      if (chunkIndex > 0) {
        doc.addPage()
      }

      // Build columns for this page: frozen + chunk
      const pageColumns = [...frozenCols, ...chunkCols]

      // Build data for this page: frozen data + chunk data
      const pageData = data.map(row => {
        const frozenData = row.slice(0, frozenColumns)
        // Calculate the indices for this chunk's data columns
        const chunkStartIndex = frozenColumns + chunkIndex * maxColsPerPage
        const chunkEndIndex = chunkStartIndex + chunkCols.length
        const chunkData = row.slice(chunkStartIndex, chunkEndIndex)
        return [...frozenData, ...chunkData]
      })

      // Only apply totalColumnStyle on the last chunk (which contains the last data column)
      const isLastChunk = chunkIndex === chunks.length - 1

      const chunkBaseStyles: Record<number, any> = {
            ...(tableOptions.columnStyles || {}),
            0: {
              halign: 'left' as const,
              minCellWidth: frozenColWidth,
              ...(tableOptions.columnStyles?.[0] || {}),
            },
            ...(isLastChunk && tableOptions.totalColumnStyle
              ? { [pageColumns.length - 1]: tableOptions.totalColumnStyle }
              : {}
            ),
          }

      _renderTablePage(doc, {
        columns: pageColumns,
        data: pageData,
        event,
        documentTitle: chunks.length > 1
          ? `${documentTitle} (${chunkIndex + 1}/${chunks.length})`
          : documentTitle,
        pageWidth,
        pageHeight,
        startY,
        tableOptions: {
          ...tableOptions,
          columnStyles: buildDataColumnStyles(pageColumns.length, frozenColumns, chunkBaseStyles),
        },
        isFirstPage: chunkIndex === 0,
      })
    })
  }

  // Add header/footer to ALL pages (including ones created by autoTable row overflow)
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addPDFHeaderFooter({ doc, event, documentTitle, pageWidth, pageHeight })
  }

  // Save if filename provided
  if (filename) {
    doc.save(filename)
  }

  return doc
}

/**
 * Internal helper: renders one table page (used by exportWideTablePDF)
 */
function _renderTablePage(
  doc: jsPDF,
  opts: {
    columns: string[]
    data: string[][]
    event: Event | null
    documentTitle: string
    pageWidth: number
    pageHeight: number
    startY: number
    tableOptions: Record<string, any>
    isFirstPage: boolean
  }
) {
  const unifiedStyles = getUnifiedTableStyles()

  // Destructure didParseCell and didDrawPage from tableOptions so they can be composed
  const { didParseCell, didDrawPage, columnStyles, totalColumnStyle, ...restTableOptions } = opts.tableOptions

  autoTable(doc, {
    head: [opts.columns],
    body: opts.data,
    startY: opts.startY,
    ...unifiedStyles,
    ...restTableOptions,
    columnStyles: columnStyles || {},
    didParseCell: didParseCell ? (data: any) => didParseCell(data) : undefined,
    didDrawPage: () => {
      // Header/footer is added after the full render via the loop in exportWideTablePDF
      // But if consumer needs to do something on each page, call their handler
      if (didDrawPage) didDrawPage()
    },
  })
}
