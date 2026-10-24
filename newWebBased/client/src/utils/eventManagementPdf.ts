import jsPDF from 'jspdf'
import {
  addPDFHeaderFooter,
  getContentArea,
  PDF_CONFIG,
  addSectionTitle,
  addLabeledValue,
  resetPDFStyles
} from '@/utils/pdfUtils'

interface EventDetailsForPdf {
  var_eventname?: string
  var_location?: string
  venue_name?: string
  dat_eventstartdate?: string
  dat_eventenddate?: string
  dat_meldeschluss?: string
  var_veranstalter?: string
  contact_person_name?: string
  registration_contact_name?: string
  int_kampfrichter?: number
  int_helfer?: number
  int_edv?: number
  txt_hinweise?: string
}

interface StatisticsForPdf {
  totalParticipants: number
  maleParticipants: number
  femaleParticipants: number
  totalClubs: number
  totalCompetitions: number
  totalGroups: number
  ageGroups: { [key: string]: number }
  clubBreakdown?: { clubName: string; count: number }[]
}

interface ExportEventManagementPdfArgs {
  selectedEvent: any
  eventDetails: EventDetailsForPdf
  statistics: StatisticsForPdf
  t: (key: string) => string
}

export const exportEventManagementPDF = ({ selectedEvent, eventDetails, statistics, t }: ExportEventManagementPdfArgs) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // For portrait A4: width = 210mm, height = 297mm
  const pageWidth = 210
  const pageHeight = 297
  const contentArea = getContentArea(pageWidth, pageHeight)

  const eventForPDF = {
    int_eventid: selectedEvent.int_eventid,
    var_eventname: selectedEvent.var_eventname,
    dat_eventstartdate: selectedEvent.dat_eventstartdate,
    dat_eventenddate: selectedEvent.dat_eventenddate,
    var_location: selectedEvent.var_location,
    status: selectedEvent.status || 'active'
  }

  const checkPageBreak = (currentY: number, requiredSpace: number = 20) => {
    if (currentY + requiredSpace > contentArea.endY) {
      doc.addPage()
      return contentArea.startY
    }
    return currentY
  }

  let yPosition = contentArea.startY

  yPosition = checkPageBreak(yPosition, 30)
  yPosition = addSectionTitle(doc, t('eventManagement.eventDetails'), yPosition)

  const eventInfoItems = [
    [t('eventManagement.form.eventName'), eventDetails.var_eventname || '-'],
    [t('eventManagement.form.location'), eventDetails.venue_name || eventDetails.var_location || '-'],
    [t('eventManagement.form.startDate'), eventDetails.dat_eventstartdate ? new Date(eventDetails.dat_eventstartdate).toLocaleDateString() : '-'],
    [t('eventManagement.form.endDate'), eventDetails.dat_eventenddate ? new Date(eventDetails.dat_eventenddate).toLocaleDateString() : '-'],
    [t('eventManagement.form.registrationDeadline'), eventDetails.dat_meldeschluss ? new Date(eventDetails.dat_meldeschluss).toLocaleDateString() : '-'],
    [t('eventManagement.form.organizer'), eventDetails.var_veranstalter || '-'],
    [t('eventManagement.form.contactPerson'), eventDetails.contact_person_name || '-'],
    [t('eventManagement.form.registrationContact'), eventDetails.registration_contact_name || '-']
  ]

  eventInfoItems.forEach(([label, value]) => {
    yPosition = checkPageBreak(yPosition, 10)
    yPosition = addLabeledValue(doc, label, value, contentArea.startX, yPosition)
  })

  yPosition += PDF_CONFIG.spacing.section

  yPosition = checkPageBreak(yPosition, 30)
  yPosition = addSectionTitle(doc, t('eventManagement.statistics.title'), yPosition)

  const participantStats = [
    [t('eventManagement.statistics.totalParticipants'), statistics.totalParticipants.toString()],
    [t('eventManagement.statistics.male'), statistics.maleParticipants.toString()],
    [t('eventManagement.statistics.female'), statistics.femaleParticipants.toString()],
    [t('eventManagement.statistics.totalClubs'), statistics.totalClubs.toString()],
    [t('eventManagement.statistics.totalCompetitions'), statistics.totalCompetitions.toString()],
    [t('events.groups'), statistics.totalGroups.toString()]
  ]

  participantStats.forEach(([label, value]) => {
    yPosition = checkPageBreak(yPosition, 10)
    yPosition = addLabeledValue(doc, label, value, contentArea.startX, yPosition)
  })

  yPosition += PDF_CONFIG.spacing.section

  if (Object.keys(statistics.ageGroups).length > 0) {
    yPosition = checkPageBreak(yPosition, 20)
    yPosition = addSectionTitle(doc, t('pdf.common.ageGroups'), yPosition, { fontSize: PDF_CONFIG.fonts.header.size })

    Object.entries(statistics.ageGroups).forEach(([ageGroup, count]) => {
      yPosition = checkPageBreak(yPosition, 10)
      yPosition = addLabeledValue(doc, `  ${ageGroup}`, count.toString(), contentArea.startX, yPosition)
    })

    yPosition += PDF_CONFIG.spacing.section
  }

  if (statistics.clubBreakdown && statistics.clubBreakdown.length > 0) {
    yPosition = checkPageBreak(yPosition, 20)
    yPosition = addSectionTitle(doc, t('eventManagement.statistics.clubDistribution'), yPosition, { fontSize: PDF_CONFIG.fonts.header.size })

    statistics.clubBreakdown.forEach((club) => {
      yPosition = checkPageBreak(yPosition, 10)
      yPosition = addLabeledValue(doc, `  ${club.clubName}`, club.count.toString(), contentArea.startX, yPosition)
    })
  }

  if (eventDetails.int_kampfrichter || eventDetails.int_helfer || eventDetails.int_edv) {
    yPosition += PDF_CONFIG.spacing.section
    yPosition = checkPageBreak(yPosition, 30)
    yPosition = addSectionTitle(doc, t('eventManagement.staffRequirements'), yPosition)

    if (eventDetails.int_kampfrichter) {
      yPosition = checkPageBreak(yPosition, 10)
      yPosition = addLabeledValue(doc, `  ${t('eventManagement.form.numberOfJudges')}`, eventDetails.int_kampfrichter.toString(), contentArea.startX, yPosition)
    }
    if (eventDetails.int_helfer) {
      yPosition = checkPageBreak(yPosition, 10)
      yPosition = addLabeledValue(doc, `  ${t('eventManagement.form.numberOfHelpers')}`, eventDetails.int_helfer.toString(), contentArea.startX, yPosition)
    }
    if (eventDetails.int_edv) {
      yPosition = checkPageBreak(yPosition, 10)
      yPosition = addLabeledValue(doc, `  ${t('eventManagement.form.numberOfCompOffice')}`, eventDetails.int_edv.toString(), contentArea.startX, yPosition)
    }
  }

  if (eventDetails.txt_hinweise) {
    yPosition += PDF_CONFIG.spacing.section
    yPosition = checkPageBreak(yPosition, 20)
    yPosition = addSectionTitle(doc, t('eventManagement.form.additionalInfo'), yPosition)

    resetPDFStyles(doc)
    const textLines = doc.splitTextToSize(eventDetails.txt_hinweise, contentArea.width - 20)
    textLines.forEach((line: string) => {
      yPosition = checkPageBreak(yPosition, 10)
      doc.text(line, contentArea.startX, yPosition)
      yPosition += PDF_CONFIG.spacing.line + 1
    })
  }

  // Header/footer only after all pages exist, otherwise "page x / total" shows a wrong total
  const totalPages = (doc as any).internal.getNumberOfPages()
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page)
    addPDFHeaderFooter({
      doc,
      event: eventForPDF,
      documentTitle: t('pdf.documentTitles.eventManagement'),
      pageWidth,
      pageHeight
    })
  }

  const fileName = `event-management-${selectedEvent.var_eventname.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
  return fileName
}
