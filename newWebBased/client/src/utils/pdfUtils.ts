import jsPDF from 'jspdf'

interface Event {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  status: 'upcoming' | 'active' | 'completed'
}

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
    primary: [0, 102, 204] as [number, number, number],      // Blau - für Header
    secondary: [100, 100, 100] as [number, number, number],  // Grau - für sekundäre Elemente
    success: [76, 175, 80] as [number, number, number],      // Grün - für Erfolg/Highlights
    warning: [255, 152, 0] as [number, number, number],      // Orange - für Warnungen
    error: [244, 67, 54] as [number, number, number],        // Rot - für Fehler
    text: [0, 0, 0] as [number, number, number],             // Schwarz - Standardtext
    background: [245, 245, 245] as [number, number, number], // Hellgrau - Hintergrund
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
    textColor: PDF_CONFIG.colors.white,
    fontSize: PDF_CONFIG.fonts.header.size,
    fontStyle: 'bold',
    halign: 'center' as const,
    valign: 'middle' as const,
    cellPadding: 3
  },
  bodyStyles: {
    fontSize: PDF_CONFIG.fonts.body.size,
    cellPadding: 2,
    minCellHeight: 8,
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
    lineWidth: 0.1
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
