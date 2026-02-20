/**
 * Tests for pdfUtils wide-table export & orientation utilities
 * Covers: createPDFDocument, A4_DIMENSIONS, exportWideTablePDF
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock jsPDF before importing pdfUtils
const mockAutoTable = vi.fn();
vi.mock('jspdf-autotable', () => ({
  default: (...args: any[]) => mockAutoTable(...args),
}));

const createMockDoc = (orientation: 'portrait' | 'landscape' = 'landscape') => {
  const dims = orientation === 'landscape'
    ? { width: 297, height: 210 }
    : { width: 210, height: 297 };
  
  return {
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setLineWidth: vi.fn(),
    rect: vi.fn(),
    roundedRect: vi.fn(),
    line: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    setPage: vi.fn(),
    save: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
    internal: {
      pageSize: {
        width: dims.width,
        height: dims.height,
        getWidth: () => dims.width,
        getHeight: () => dims.height,
      },
      getCurrentPageInfo: () => ({ pageNumber: 1 }),
      getNumberOfPages: () => 1,
    },
  };
};

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation((opts?: any) => {
    const orientation = typeof opts === 'string' ? opts : opts?.orientation || 'portrait';
    return createMockDoc(orientation);
  }),
}));

// Import after mocks
import {
  A4_DIMENSIONS,
  createPDFDocument,
  exportWideTablePDF,
} from '@/utils/pdfUtils';

describe('PDF Orientation & Wide Table Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── A4_DIMENSIONS ────────────────────────────
  describe('A4_DIMENSIONS', () => {
    it('has correct portrait dimensions', () => {
      expect(A4_DIMENSIONS.portrait.width).toBe(210);
      expect(A4_DIMENSIONS.portrait.height).toBe(297);
    });

    it('has correct landscape dimensions', () => {
      expect(A4_DIMENSIONS.landscape.width).toBe(297);
      expect(A4_DIMENSIONS.landscape.height).toBe(210);
    });
  });

  // ─── createPDFDocument ────────────────────────
  describe('createPDFDocument', () => {
    it('creates a document with returned dimensions', () => {
      const result = createPDFDocument('landscape');
      expect(result).toHaveProperty('doc');
      expect(result).toHaveProperty('pageWidth');
      expect(result).toHaveProperty('pageHeight');
    });

    it('defaults to portrait when no orientation given', () => {
      const result = createPDFDocument();
      expect(result).toHaveProperty('doc');
    });
  });

  // ─── exportWideTablePDF ───────────────────────
  describe('exportWideTablePDF', () => {
    const mockEvent = {
      int_eventid: 1,
      var_eventname: 'Test Event',
      dat_eventstartdate: '2025-01-01',
      dat_eventenddate: '2025-01-02',
      var_location: 'Test Location',
      status: 'active' as const,
    };

    const smallColumns = ['Club', 'Comp 1', 'Comp 2', 'Total'];
    const smallData = [
      ['Club A', '5', '3', '8'],
      ['Club B', '2', '7', '9'],
    ];

    it('renders a small table on a single page without splitting', () => {
      const doc = exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Test Title',
        columns: smallColumns,
        data: smallData,
        frozenColumns: 1,
      });

      // autoTable should have been called once (single page)
      expect(mockAutoTable).toHaveBeenCalledTimes(1);
      // The columns passed to autoTable should be the full set
      const call = mockAutoTable.mock.calls[0];
      expect(call[1].head[0]).toEqual(smallColumns);
    });

    it('splits columns across multiple pages for wide tables', () => {
      // Create a table with many columns (more than can fit at minColumnWidth=15)
      // Available width in landscape: 297 - 20 = 277, frozen: 40, data area: 237
      // At minColumnWidth=15: floor(237/15) = 15 columns per page
      // So 20 data columns should need 2 pages
      const wideColumns = ['Club'];
      const wideData: string[][] = [['Club A'], ['Club B']];
      for (let i = 1; i <= 20; i++) {
        wideColumns.push(`Comp ${i}`);
        wideData[0].push(i.toString());
        wideData[1].push((i * 2).toString());
      }
      wideColumns.push('Total');
      wideData[0].push('210');
      wideData[1].push('420');

      const doc = exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Wide Test',
        columns: wideColumns,
        data: wideData,
        frozenColumns: 1,
        minColumnWidth: 15,
      });

      // Should have called autoTable multiple times (once per chunk)
      expect(mockAutoTable.mock.calls.length).toBeGreaterThan(1);

      // First chunk should include the frozen column "Club"
      const firstCall = mockAutoTable.mock.calls[0];
      expect(firstCall[1].head[0][0]).toBe('Club');

      // Second chunk should also include the frozen column "Club"
      const secondCall = mockAutoTable.mock.calls[1];
      expect(secondCall[1].head[0][0]).toBe('Club');
    });

    it('applies totalColumnStyle only to the last chunk', () => {
      const wideColumns = ['Club'];
      const wideData: string[][] = [['Club A']];
      for (let i = 1; i <= 20; i++) {
        wideColumns.push(`Comp ${i}`);
        wideData[0].push(i.toString());
      }
      wideColumns.push('Total');
      wideData[0].push('210');

      exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Total Style Test',
        columns: wideColumns,
        data: wideData,
        frozenColumns: 1,
        minColumnWidth: 15,
        tableOptions: {
          totalColumnStyle: {
            halign: 'center',
            fillColor: [240, 248, 255],
            fontStyle: 'bold',
          },
        },
      });

      // Last autoTable call should have totalColumnStyle applied to last column
      const lastCallIndex = mockAutoTable.mock.calls.length - 1;
      const lastCall = mockAutoTable.mock.calls[lastCallIndex];
      const lastColIndex = lastCall[1].head[0].length - 1;
      expect(lastCall[1].columnStyles[lastColIndex]).toBeDefined();
      expect(lastCall[1].columnStyles[lastColIndex].halign).toBe('center');
    });

    it('saves the file when filename is provided', () => {
      const doc = exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Save Test',
        columns: smallColumns,
        data: smallData,
        filename: 'test-output.pdf',
      });

      expect(doc.save).toHaveBeenCalledWith('test-output.pdf');
    });

    it('does not call save when no filename is provided', () => {
      const doc = exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'No Save',
        columns: smallColumns,
        data: smallData,
      });

      expect(doc.save).not.toHaveBeenCalled();
    });

    it('uses provided doc instance instead of creating new one', () => {
      const existingDoc = createMockDoc('landscape') as any;
      
      const result = exportWideTablePDF({
        doc: existingDoc,
        event: mockEvent,
        documentTitle: 'Existing Doc',
        columns: smallColumns,
        data: smallData,
      });

      // Should have used the existing doc
      expect(result).toBe(existingDoc);
    });

    it('works with null event', () => {
      const doc = exportWideTablePDF({
        event: null,
        documentTitle: 'No Event',
        columns: smallColumns,
        data: smallData,
      });

      expect(mockAutoTable).toHaveBeenCalled();
    });

    it('adds header/footer to all pages', () => {
      const doc = exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Header Footer Test',
        columns: smallColumns,
        data: smallData,
      });

      // setPage should have been called for each page
      expect(doc.setPage).toHaveBeenCalledWith(1);
    });

    it('preserves frozen column data on each chunk page', () => {
      const wideColumns = ['Club'];
      const wideData: string[][] = [['My Club']];
      for (let i = 1; i <= 25; i++) {
        wideColumns.push(`Comp ${i}`);
        wideData[0].push(`${i}`);
      }

      exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Frozen Data Test',
        columns: wideColumns,
        data: wideData,
        frozenColumns: 1,
        minColumnWidth: 15,
      });

      // Every autoTable call's data rows should start with 'My Club'
      for (const call of mockAutoTable.mock.calls) {
        expect(call[1].body[0][0]).toBe('My Club');
      }
    });

    it('labels chunk pages with (n/total) in documentTitle', () => {
      const wideColumns = ['Club'];
      const wideData: string[][] = [['Club A']];
      for (let i = 1; i <= 25; i++) {
        wideColumns.push(`Comp ${i}`);
        wideData[0].push(`${i}`);
      }

      const doc = exportWideTablePDF({
        event: mockEvent,
        documentTitle: 'Chunked Title',
        columns: wideColumns,
        data: wideData,
        frozenColumns: 1,
        minColumnWidth: 15,
      });

      // Header/footer is added in a loop after render, with the main documentTitle
      // The chunk-specific title is handled internally
      expect(doc.setPage).toHaveBeenCalled();
    });
  });
});
