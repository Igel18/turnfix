import { describe, it, expect, vi, beforeEach } from 'vitest'

const { addPDFHeaderFooterMock, docState, saveMock } = vi.hoisted(() => ({
  addPDFHeaderFooterMock: vi.fn(),
  saveMock: vi.fn(),
  docState: { pages: 1, current: 1, pagesAtHeaderCall: [] as number[], currentAtHeaderCall: [] as number[] }
}))

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: { width: 210, height: 297, getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => docState.pages,
      getCurrentPageInfo: () => ({ pageNumber: docState.current })
    },
    addPage: () => { docState.pages += 1; docState.current = docState.pages },
    setPage: (n: number) => { docState.current = n },
    text: vi.fn(),
    splitTextToSize: (text: string) => [text],
    save: saveMock
  }))
}))

vi.mock('@/utils/pdfUtils', () => ({
  addPDFHeaderFooter: (opts: any) => {
    docState.pagesAtHeaderCall.push(docState.pages)
    docState.currentAtHeaderCall.push(docState.current)
    addPDFHeaderFooterMock(opts)
  },
  getContentArea: () => ({ startX: 15, startY: 40, endY: 270, width: 180 }),
  addSectionTitle: (_doc: any, _t: string, y: number) => y + 10,
  // Each row consumes a lot of space so the content spans several pages
  addLabeledValue: (_doc: any, _l: string, _v: string, _x: number, y: number) => y + 60,
  resetPDFStyles: vi.fn(),
  PDF_CONFIG: { spacing: { section: 5, line: 5 }, fonts: { header: { size: 12 } } }
}))

import { exportEventManagementPDF } from '@/utils/eventManagementPdf'

const baseArgs = () => ({
  selectedEvent: {
    int_eventid: 1, var_eventname: 'Cup', dat_eventstartdate: '2026-01-01',
    dat_eventenddate: '2026-01-02', var_location: 'Halle', status: 'active'
  } as any,
  eventDetails: { int_eventid: 1, var_eventname: 'Cup', var_location: 'Halle' } as any,
  statistics: {
    totalParticipants: 10, maleParticipants: 5, femaleParticipants: 5,
    totalClubs: 2, totalCompetitions: 3, totalGroups: 0,
    ageGroups: { '10': 4 }, clubBreakdown: [{ clubName: 'TV', count: 10 }]
  } as any,
  t: (key: string) => key
})

describe('exportEventManagementPDF page numbers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    docState.pages = 1
    docState.current = 1
    docState.pagesAtHeaderCall = []
    docState.currentAtHeaderCall = []
  })

  it('draws header/footer exactly once per page, after the final page count is known', () => {
    exportEventManagementPDF(baseArgs())

    const totalPages = docState.pages
    expect(totalPages).toBeGreaterThan(1)
    expect(addPDFHeaderFooterMock).toHaveBeenCalledTimes(totalPages)
    // every call must already see the final total, otherwise "x / total" is wrong
    expect(docState.pagesAtHeaderCall.every(n => n === totalPages)).toBe(true)
    expect(docState.currentAtHeaderCall).toEqual(Array.from({ length: totalPages }, (_, i) => i + 1))
    expect(saveMock).toHaveBeenCalledTimes(1)
  })

  it('works for a single page document', () => {
    const args = baseArgs()
    args.statistics = { ...args.statistics, ageGroups: {}, clubBreakdown: [] }
    // tiny content: override spacing by using few rows is not possible with the mock, so just
    // assert the invariant calls == pages
    exportEventManagementPDF(args)
    expect(addPDFHeaderFooterMock).toHaveBeenCalledTimes(docState.pages)
  })
})
