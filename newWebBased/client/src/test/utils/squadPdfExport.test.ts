/**
 * Unit tests for squadPdfExport.ts
 *
 * Covers:
 *  - exportSquadsPDF returns early when selectedEvent is null/undefined
 *  - summary text is rendered on page 1
 *  - each squad name (section title) is rendered
 *  - participant table is built only when participants exist
 *  - "no participants" fallback text is used when participant list is empty
 *  - competition metadata is rendered for each squad
 *  - jsPDF.save() is called with a non-empty .pdf filename
 *  - header/footer is applied to every page
 *  - consistent yPosition: contentStartY (PDF_CONFIG.margins.header + 2 = 34) on all pages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock jsPDF & autoTable BEFORE any import that uses them ───────

// Track autoTable calls so tests can inspect table data
const autoTableMock = vi.fn((doc: any, opts: any) => {
  // Simulate lastAutoTable.finalY on the doc
  doc.lastAutoTable = { finalY: 80 };
  autoTableCalls.push(opts);
});
const autoTableCalls: any[] = [];

vi.mock('jspdf-autotable', () => ({
  default: (doc: any, opts: any) => autoTableMock(doc, opts),
}));

// Track addSectionTitle & addSeparatorLine calls
const addPDFHeaderFooterMock = vi.fn();
const addSectionTitleMock = vi.fn((_doc: any, _title: string, y: number, _opts?: any) => y + 6);
const addSeparatorLineMock = vi.fn((_doc: any, y: number, _opts?: any) => y + 5);
const getUnifiedTableStylesMock = vi.fn(() => ({}));

vi.mock('@/utils/pdfUtils', () => ({
  addPDFHeaderFooter: (opts: any) => addPDFHeaderFooterMock(opts),
  addSectionTitle: (doc: any, title: string, y: number, options?: any) =>
    addSectionTitleMock(doc, title, y, options),
  addSeparatorLine: (doc: any, y: number, options?: any) =>
    addSeparatorLineMock(doc, y, options),
  getUnifiedTableStyles: () => getUnifiedTableStylesMock(),
  PDF_CONFIG: {
    fonts: { body: { size: 10, style: 'normal' } },
    colors: { text: [0, 0, 0], white: [255, 255, 255] },
    margins: { page: 10, header: 32, footer: 25 },
    spacing: { line: 5, section: 10, paragraph: 7 },
  },
}));

vi.mock('@/utils/pdfStyles', () => ({
  pdfColors: {
    text: {
      primary: [0, 0, 0] as [number, number, number],
      secondary: [64, 64, 64] as [number, number, number],
    },
  },
  pdfFonts: {
    tableBody: { size: 8 },
    sectionTitle: { size: 12, weight: 'bold' },
  },
}));

// ── Mock jsPDF factory ─────────────────────────────────────────────

/** Creates a fresh mock doc instance. All doc instances share lastAutoTable via reference. */
const createMockDoc = () => ({
  setFillColor: vi.fn(),
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  line: vi.fn(),
  text: vi.fn(),
  addPage: vi.fn(),
  setPage: vi.fn(),
  save: vi.fn(),
  splitTextToSize: vi.fn((t: string) => [t]),
  lastAutoTable: { finalY: 80 },
  internal: {
    pageSize: { getWidth: () => 210, getHeight: () => 297 },
    getCurrentPageInfo: () => ({ pageNumber: 1 }),
    getNumberOfPages: () => 1,
  },
});

// We need a mutable reference so each test can swap the doc
let currentDoc: ReturnType<typeof createMockDoc>;

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => currentDoc),
}));

// ── Import SUT & types after mocks are set up ─────────────────────

import { exportSquadsPDF } from '@/pages/SquadManagement/utils/squadPdfExport';
import type { Squad } from '@/pages/SquadManagement/SquadManagement.types';

// ── Data helpers ──────────────────────────────────────────────────

const makeEvent = () => ({
  int_eventid: 1,
  var_eventname: 'Testwettkampf 2026',
  dat_eventstartdate: '2026-03-17',
  dat_eventenddate: '2026-03-17',
  var_location: 'Sporthalle',
  status: 'active' as const,
});

const makeParticipant = (id: number) => ({
  id,
  firstname: `Vorname${id}`,
  lastname: `Nachname${id}`,
  club: `Verein ${id}`,
  gender: 'weiblich',
  birthYear: 2010 + id,
  competitions: [{ id: 1, name: '4-Kampf w P', number: '1' }],
  startNumber: id,
});

const makeSquad = (id: number, participantCount = 2): Squad => ({
  id,
  name: `Riege ${id}`,
  eventId: 1,
  participantCount,
  competitions: [{ id: 1, name: '4-Kampf w P', number: '1' }],
  participants: Array.from({ length: participantCount }, (_, i) => makeParticipant(i + 1)),
});

const makeT = () => (key: string, opts?: Record<string, unknown>) => {
  const map: Record<string, string> = {
    'squadManagement.pdf.totalSquads': `Riegen: ${opts?.count ?? 0}`,
    'squadManagement.pdf.totalParticipants': `Teilnehmer: ${opts?.count ?? 0}`,
    'squadManagement.pdf.participants': 'Teilnehmer',
    'squadManagement.pdf.competitions': 'Wettkämpfe',
    'squadManagement.pdf.name': 'Name',
    'squadManagement.pdf.birthYear': 'Jahrgang',
    'squadManagement.pdf.club': 'Verein',
    'squadManagement.pdf.noParticipants': 'Keine Teilnehmer',
    'squadManagement.pdf.notAvailable': 'N/A',
    'squadManagement.pdf.noClub': 'Kein Verein',
    'squadManagement.title': 'Riegenverwaltung',
    'competitions.fields.name': 'Wettkampf',
    'groupTeamScoring.startNumber': 'Nr.',
  };
  return map[key] ?? key;
};

// ── Setup ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  autoTableCalls.length = 0;
  currentDoc = createMockDoc();
});

// ── Tests ─────────────────────────────────────────────────────────

describe('exportSquadsPDF', () => {
  // ── Guard conditions ──────────────────────────────────────────

  describe('guard conditions', () => {
    it('returns early without saving when selectedEvent is null', () => {
      exportSquadsPDF({ squads: [], selectedEvent: null, t: makeT() });
      expect(currentDoc.save).not.toHaveBeenCalled();
    });

    it('returns early without saving when selectedEvent is undefined', () => {
      exportSquadsPDF({ squads: [], selectedEvent: undefined, t: makeT() });
      expect(currentDoc.save).not.toHaveBeenCalled();
    });
  });

  // ── Summary line ──────────────────────────────────────────────

  describe('summary line', () => {
    it('renders summary with total squads and participants count', () => {
      const squads = [makeSquad(1, 3), makeSquad(2, 2)];
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      const summaryCall = textArgs.find(
        (txt) => typeof txt === 'string' && txt.includes('Riegen: 2') && txt.includes('Teilnehmer: 5'),
      );
      expect(summaryCall).toBeDefined();
    });

    it('renders summary even when squads array is empty', () => {
      exportSquadsPDF({ squads: [], selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      const summaryCall = textArgs.find(
        (txt) => typeof txt === 'string' && txt.includes('Riegen: 0') && txt.includes('Teilnehmer: 0'),
      );
      expect(summaryCall).toBeDefined();
    });
  });

  // ── Squad sections ────────────────────────────────────────────

  describe('squad sections', () => {
    it('renders a section title for each squad', () => {
      const squads = [makeSquad(1), makeSquad(2), makeSquad(3)];
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(textArgs).toContain('Riege 1');
      expect(textArgs).toContain('Riege 2');
      expect(textArgs).toContain('Riege 3');
    });

    it('uses fallback name "Riege N" when squad.name is empty', () => {
      const squad: Squad = { ...makeSquad(1), name: '' };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(textArgs).toContain('Riege 1');
    });

    it('renders a separator line for each squad', () => {
      const squads = [makeSquad(1), makeSquad(2)];
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      expect(addSeparatorLineMock).toHaveBeenCalledTimes(squads.length);
    });

    it('renders participant count metadata for each squad', () => {
      const squads = [makeSquad(1, 4)];
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      const countLine = textArgs.find(
        (txt) => typeof txt === 'string' && txt.includes('Teilnehmer') && txt.includes('4'),
      );
      expect(countLine).toBeDefined();
    });
  });

  // ── Competition metadata ──────────────────────────────────────

  describe('competition metadata', () => {
    it('renders competition name for each competition in the squad', () => {
      const squad: Squad = {
        ...makeSquad(1),
        competitions: [
          { id: 1, name: '4-Kampf w P', number: '1' },
          { id: 2, name: '6-Kampf m P', number: '2' },
        ],
      };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(textArgs.some((t) => typeof t === 'string' && t.includes('4-Kampf w P'))).toBe(true);
      expect(textArgs.some((t) => typeof t === 'string' && t.includes('6-Kampf m P'))).toBe(true);
    });

    it('includes competition number (Nr. X) in the competition line', () => {
      const squad: Squad = {
        ...makeSquad(1),
        competitions: [{ id: 5, name: 'Sprung', number: '42' }],
      };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      const line = textArgs.find((t) => typeof t === 'string' && t.includes('Nr. 42'));
      expect(line).toBeDefined();
    });
  });

  // ── Participant tables ────────────────────────────────────────

  describe('participant tables', () => {
    it('calls autoTable once per squad with participants', () => {
      const squads = [makeSquad(1, 3), makeSquad(2, 0)]; // second has no participants
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      expect(autoTableMock).toHaveBeenCalledTimes(1);
    });

    it('calls autoTable for every squad that has participants', () => {
      const squads = [makeSquad(1, 2), makeSquad(2, 3), makeSquad(3, 1)];
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      expect(autoTableMock).toHaveBeenCalledTimes(3);
    });

    it('table body row contains name, year, club, competition, start number', () => {
      const p = makeParticipant(42);
      const squad: Squad = { ...makeSquad(1, 1), participants: [p] };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      expect(autoTableCalls.length).toBe(1);
      const row: string[] = autoTableCalls[0].body[0];
      expect(row[0]).toBe(`${p.firstname} ${p.lastname}`);
      expect(row[1]).toBe(p.birthYear.toString());
      expect(row[2]).toBe(p.club);
      expect(row[3]).toBe('4-Kampf w P');
      expect(row[4]).toBe(p.startNumber!.toString());
    });

    it('uses empty string for start number when undefined', () => {
      const p = { ...makeParticipant(1), startNumber: undefined };
      const squad: Squad = { ...makeSquad(1, 1), participants: [p as any] };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      const row: string[] = autoTableCalls[0].body[0];
      expect(row[4]).toBe('');
    });

    it('uses empty string for competition when no competitions on participant', () => {
      const p = { ...makeParticipant(1), competitions: [] };
      const squad: Squad = { ...makeSquad(1, 1), participants: [p] };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      const row: string[] = autoTableCalls[0].body[0];
      expect(row[3]).toBe('');
    });

    it('renders "no participants" italic text for empty participant list', () => {
      const squad: Squad = { ...makeSquad(1, 0), participants: [] };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      const textArgs: string[] = currentDoc.text.mock.calls.map((c: unknown[]) => c[0] as string);
      expect(textArgs).toContain('Keine Teilnehmer');

      const fontCalls = currentDoc.setFont.mock.calls as string[][];
      const hasItalic = fontCalls.some((c) => c[1] === 'italic');
      expect(hasItalic).toBe(true);
    });

    it('does not call autoTable for squads without participants', () => {
      const squad: Squad = { ...makeSquad(1, 0), participants: [] };
      exportSquadsPDF({ squads: [squad], selectedEvent: makeEvent(), t: makeT() });

      expect(autoTableMock).not.toHaveBeenCalled();
    });
  });

  // ── Consistent yPosition on new pages ────────────────────────

  describe('consistent yPosition on new pages', () => {
    it('starts content at PDF_CONFIG.margins.header + 2 (34) after a page break', () => {
      // Make autoTable push finalY close to the bottom (250mm).
      // yPosition after first table = 250 + paragraph(7) = 257.
      // ensureSpace(31) for squad 2: 257 + 31 = 288 > contentEndY(272) → addPage!
      // After addPage, yPosition resets to 34 (contentStartY = margins.header + 2).
      // The squad title text is the first doc.text() call with y=34 on the new page.
      autoTableMock.mockImplementation((doc: any, opts: any) => {
        doc.lastAutoTable = { finalY: 250 };
        autoTableCalls.push(opts);
      });

      const squads = Array.from({ length: 3 }, (_, i) => makeSquad(i + 1, 2));
      exportSquadsPDF({ squads, selectedEvent: makeEvent(), t: makeT() });

      // After a page break, yPosition is reset to 34 (contentStartY).
      // doc.text(title, margin, yPosition) → third arg === 34 for the first title on new page.
      const callsAtPageTop = currentDoc.text.mock.calls.filter(
        (c: unknown[]) => (c[2] as number) === 34,
      );
      expect(callsAtPageTop.length).toBeGreaterThan(0);
    });
  });

  // ── Header/footer on all pages ────────────────────────────────

  describe('header/footer applied on all pages', () => {
    it('calls addPDFHeaderFooter once per page', () => {
      // Simulate 3 pages
      currentDoc.internal.getNumberOfPages = () => 3;
      exportSquadsPDF({ squads: [makeSquad(1)], selectedEvent: makeEvent(), t: makeT() });

      expect(addPDFHeaderFooterMock).toHaveBeenCalledTimes(3);
    });

    it('passes the document title "Riegenverwaltung" to addPDFHeaderFooter', () => {
      exportSquadsPDF({ squads: [makeSquad(1)], selectedEvent: makeEvent(), t: makeT() });

      const call = addPDFHeaderFooterMock.mock.calls[0][0];
      expect(call.documentTitle).toBe('Riegenverwaltung');
    });

    it('passes the event object to addPDFHeaderFooter', () => {
      const event = makeEvent();
      exportSquadsPDF({ squads: [makeSquad(1)], selectedEvent: event, t: makeT() });

      const call = addPDFHeaderFooterMock.mock.calls[0][0];
      expect(call.event).toBe(event);
    });
  });

  // ── File save ─────────────────────────────────────────────────

  describe('file save', () => {
    it('saves the PDF with a .pdf extension', () => {
      exportSquadsPDF({ squads: [makeSquad(1)], selectedEvent: makeEvent(), t: makeT() });

      expect(currentDoc.save).toHaveBeenCalledTimes(1);
      const filename: string = (currentDoc.save.mock.calls[0] as [string])[0];
      expect(filename).toMatch(/\.pdf$/i);
    });

    it('saves with a filename containing the event name', () => {
      exportSquadsPDF({ squads: [makeSquad(1)], selectedEvent: makeEvent(), t: makeT() });

      const filename: string = (currentDoc.save.mock.calls[0] as [string])[0];
      expect(filename).toContain('Testwettkampf_2026');
    });

    it('does not save when selectedEvent is falsy', () => {
      exportSquadsPDF({ squads: [makeSquad(1)], selectedEvent: null, t: makeT() });
      expect(currentDoc.save).not.toHaveBeenCalled();
    });
  });
});

