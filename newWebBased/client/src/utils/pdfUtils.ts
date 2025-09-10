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
  doc.text(documentTitle, pageWidth - margin, headerHeight, { align: 'right' })
  
  // Header separator line
  doc.setLineWidth(0.5)
  doc.line(margin, headerHeight + 12, pageWidth - margin, headerHeight + 12)
  
  // Footer configuration
  const footerY = pageHeight - footerHeight
  
  // Clear footer area with white background to prevent text overlap
  doc.setFillColor(255, 255, 255) // White background
  doc.rect(margin, footerY - 6, pageWidth - (2 * margin), footerHeight + 6, 'F') // Fill rectangle
  
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
  
  // Footer separator line
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
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
