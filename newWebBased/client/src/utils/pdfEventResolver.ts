interface PDFEvent {
  int_eventid: number
  var_eventname: string
  dat_eventstartdate: string
  dat_eventenddate: string
  var_location: string
  status: 'upcoming' | 'active' | 'completed'
}

type PartialPDFEvent = Partial<PDFEvent>

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const pickString = (...values: unknown[]): string => {
  for (const value of values) {
    if (isNonEmptyString(value)) {
      return value.trim()
    }
  }
  return ''
}

const normalizeStatus = (value: unknown): PDFEvent['status'] => {
  if (value === 'upcoming' || value === 'active' || value === 'completed') {
    return value
  }
  return 'completed'
}

const buildMergedEvent = (
  selectedEvent: PartialPDFEvent | null,
  fallback: PartialPDFEvent,
  freshEvent: PartialPDFEvent | null
): PDFEvent | null => {
  const id = Number(
    freshEvent?.int_eventid ?? selectedEvent?.int_eventid ?? fallback.int_eventid
  )

  if (!Number.isFinite(id)) {
    return null
  }

  return {
    int_eventid: id,
    var_eventname: pickString(
      freshEvent?.var_eventname,
      selectedEvent?.var_eventname,
      fallback.var_eventname,
      'Event'
    ),
    dat_eventstartdate: pickString(
      freshEvent?.dat_eventstartdate,
      selectedEvent?.dat_eventstartdate,
      fallback.dat_eventstartdate
    ),
    dat_eventenddate: pickString(
      freshEvent?.dat_eventenddate,
      selectedEvent?.dat_eventenddate,
      fallback.dat_eventenddate
    ),
    var_location: pickString(
      freshEvent?.var_location,
      selectedEvent?.var_location,
      fallback.var_location
    ),
    status: normalizeStatus(
      freshEvent?.status ?? selectedEvent?.status ?? fallback.status
    )
  }
}

const fetchEventForHeader = async (eventId: number): Promise<PartialPDFEvent | null> => {
  try {
    const response = await fetch(`/api/events/${eventId}`)
    if (!response.ok) {
      return null
    }

    const eventData = await response.json()
    if (!eventData || typeof eventData !== 'object') {
      return null
    }

    return eventData as PartialPDFEvent
  } catch {
    return null
  }
}

/**
 * Resolve the freshest event metadata for PDF headers.
 * Priority per field: fresh API event > selectedEvent from context > provided fallback.
 */
export const resolveEventForPDFHeader = async (
  selectedEvent: PartialPDFEvent | null,
  fallback: PartialPDFEvent = {}
): Promise<PDFEvent | null> => {
  const eventId = Number(selectedEvent?.int_eventid ?? fallback.int_eventid)
  const freshEvent = Number.isFinite(eventId) ? await fetchEventForHeader(eventId) : null

  return buildMergedEvent(selectedEvent, fallback, freshEvent)
}
