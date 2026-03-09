/**
 * Tests for pdfUtils.ts
 * Covers: PDF_CONFIG, addPDFHeaderFooter, getContentArea, getUnifiedTableStyles,
 *         addSectionTitle, drawRankingBadge, formatPDFDate, formatPDFDateRange,
 *         addBodyText, addLabeledValue, addSeparatorLine, resetPDFStyles
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PDF_CONFIG,
  addPDFHeaderFooter,
  getContentArea,
  getUnifiedTableStyles,
  addSectionTitle,
  drawRankingBadge,
  formatPDFDate,
  formatPDFDateRange,
  addBodyText,
  addLabeledValue,
  addSeparatorLine,
  resetPDFStyles,
  setupPDFWithHeaderFooter
} from '@/utils/pdfUtils';

// Create a mock jsPDF instance
const createMockDoc = () => ({
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
  splitTextToSize: vi.fn((text: string) => [text]),
  internal: {
    pageSize: {
      width: 297,
      height: 210,
      getWidth: () => 297,
      getHeight: () => 210,
    },
    getCurrentPageInfo: () => ({ pageNumber: 1 }),
    getNumberOfPages: () => 1,
  },
});

describe('pdfUtils', () => {
  // ─── PDF_CONFIG constants ─────────────────────────────────

  describe('PDF_CONFIG', () => {
    it('has font definitions', () => {
      expect(PDF_CONFIG.fonts.title.size).toBe(16);
      expect(PDF_CONFIG.fonts.title.style).toBe('bold');
      expect(PDF_CONFIG.fonts.body.size).toBe(10);
      expect(PDF_CONFIG.fonts.body.style).toBe('normal');
      expect(PDF_CONFIG.fonts.small.size).toBe(8);
    });

    it('has color definitions', () => {
      expect(PDF_CONFIG.colors.primary).toEqual([229, 236, 246]);
      expect(PDF_CONFIG.colors.text).toEqual([0, 0, 0]);
      expect(PDF_CONFIG.colors.white).toEqual([255, 255, 255]);
      expect(PDF_CONFIG.colors.gold).toEqual([255, 215, 0]);
      expect(PDF_CONFIG.colors.silver).toEqual([192, 192, 192]);
      expect(PDF_CONFIG.colors.bronze).toEqual([205, 127, 50]);
    });

    it('has margin definitions', () => {
      expect(PDF_CONFIG.margins.page).toBe(10);
      expect(PDF_CONFIG.margins.header).toBe(32);
      expect(PDF_CONFIG.margins.footer).toBe(25);
    });

    it('has spacing definitions', () => {
      expect(PDF_CONFIG.spacing.line).toBe(5);
      expect(PDF_CONFIG.spacing.section).toBe(10);
      expect(PDF_CONFIG.spacing.paragraph).toBe(7);
    });
  });

  // ─── getContentArea ──────────────────────────────────────

  describe('getContentArea', () => {
    it('returns correct content area for default A4 landscape', () => {
      const area = getContentArea();
      expect(area.startX).toBe(10);
      expect(area.startY).toBe(32);
      expect(area.endX).toBe(287); // 297 - 10
      expect(area.endY).toBe(185); // 210 - 25
      expect(area.width).toBe(277); // 297 - 20
      expect(area.height).toBe(153); // 210 - 32 - 25
    });

    it('returns correct content area for custom dimensions', () => {
      const area = getContentArea(595, 842); // A4 portrait
      expect(area.startX).toBe(10);
      expect(area.width).toBe(575); // 595 - 20
    });
  });

  // ─── addPDFHeaderFooter ───────────────────────────────────

  describe('addPDFHeaderFooter', () => {
    it('renders header without event', () => {
      const doc = createMockDoc();
      addPDFHeaderFooter({
        doc: doc as any,
        event: null,
        documentTitle: 'Test Document',
      });
      // Should still draw title
      expect(doc.text).toHaveBeenCalledWith(
        'Test Document',
        expect.any(Number),
        expect.any(Number),
        expect.objectContaining({ align: 'right' })
      );
    });

    it('renders header with event info', () => {
      const doc = createMockDoc();
      const event = {
        int_eventid: 1,
        var_eventname: 'Landesmeisterschaft',
        dat_eventstartdate: '2024-06-15',
        dat_eventenddate: '2024-06-16',
        var_location: 'Sporthalle',
        status: 'active' as const,
      };
      addPDFHeaderFooter({
        doc: doc as any,
        event,
        documentTitle: 'Results',
      });
      // Should render event name
      expect(doc.text).toHaveBeenCalledWith(
        'Landesmeisterschaft',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('renders footer with TurnFix credit', () => {
      const doc = createMockDoc();
      addPDFHeaderFooter({
        doc: doc as any,
        event: null,
        documentTitle: 'Test',
      });
      // Check for TurnFix credit
      const textCalls = doc.text.mock.calls;
      const hasTurnfix = textCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('TurnFix')
      );
      expect(hasTurnfix).toBe(true);
    });

    it('renders page number', () => {
      const doc = createMockDoc();
      addPDFHeaderFooter({
        doc: doc as any,
        event: null,
        documentTitle: 'Test',
      });
      const textCalls = doc.text.mock.calls;
      const hasPageNum = textCalls.some(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('1')
      );
      expect(hasPageNum).toBe(true);
    });

    it('shows single date when start and end are the same', () => {
      const doc = createMockDoc();
      const event = {
        int_eventid: 1,
        var_eventname: 'Event',
        dat_eventstartdate: '2024-06-15',
        dat_eventenddate: '2024-06-15',
        var_location: 'Halle',
        status: 'active' as const,
      };
      addPDFHeaderFooter({
        doc: doc as any,
        event,
        documentTitle: 'Test',
      });
      const textCalls = doc.text.mock.calls;
      // The date should appear once, not as a range
      const dateCalls = textCalls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('15')
      );
      // Should not contain a dash (range)
      const hasRange = dateCalls.some((call: any[]) => call[0].includes(' - '));
      expect(hasRange).toBe(false);
    });
  });

  // ─── getUnifiedTableStyles ────────────────────────────────

  describe('getUnifiedTableStyles', () => {
    it('returns correct head styles', () => {
      const styles = getUnifiedTableStyles();
      expect(styles.headStyles.fillColor).toEqual(PDF_CONFIG.colors.primary);
      expect(styles.headStyles.textColor).toEqual(PDF_CONFIG.colors.headingText);
      expect(styles.headStyles.fontStyle).toBe('bold');
      expect(styles.headStyles.halign).toBe('center');
    });

    it('returns correct body styles', () => {
      const styles = getUnifiedTableStyles();
      expect(styles.bodyStyles.fontSize).toBe(PDF_CONFIG.fonts.body.size);
      expect(styles.bodyStyles.textColor).toEqual(PDF_CONFIG.colors.text);
    });

    it('returns alternate row styles', () => {
      const styles = getUnifiedTableStyles();
      expect(styles.alternateRowStyles.fillColor).toEqual(PDF_CONFIG.colors.background);
    });

    it('returns margin settings', () => {
      const styles = getUnifiedTableStyles();
      expect(styles.margin.top).toBe(PDF_CONFIG.margins.header);
      expect(styles.margin.bottom).toBe(PDF_CONFIG.margins.footer);
    });
  });

  // ─── drawRankingBadge ────────────────────────────────────

  describe('drawRankingBadge', () => {
    it('draws gold badge for rank 1', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, 1, 50, 50, 'rank');
      expect(doc.setFillColor).toHaveBeenCalledWith(255, 250, 205);
      expect(doc.roundedRect).toHaveBeenCalled();
      expect(doc.text).toHaveBeenCalledWith('1', 50, expect.any(Number), expect.objectContaining({ align: 'center' }));
    });

    it('draws silver badge for rank 2', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, 2, 50, 50, 'rank');
      expect(doc.setFillColor).toHaveBeenCalledWith(245, 245, 245);
    });

    it('draws bronze badge for rank 3', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, 3, 50, 50, 'rank');
      expect(doc.setFillColor).toHaveBeenCalledWith(255, 243, 224);
    });

    it('draws default badge for rank > 3', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, 5, 50, 50, 'rank');
      expect(doc.setFillColor).toHaveBeenCalledWith(255, 255, 255);
    });

    it('uses gold type colors', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, '★', 50, 50, 'gold');
      expect(doc.setFillColor).toHaveBeenCalledWith(255, 235, 59);
    });

    it('uses silver type colors', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, '★', 50, 50, 'silver');
      expect(doc.setFillColor).toHaveBeenCalledWith(224, 224, 224);
    });

    it('uses bronze type colors', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, '★', 50, 50, 'bronze');
      expect(doc.setFillColor).toHaveBeenCalledWith(255, 193, 7);
    });

    it('applies custom size options', () => {
      const doc = createMockDoc();
      drawRankingBadge(doc as any, 1, 100, 100, 'rank', {
        width: 20,
        height: 10,
        radius: 5,
        fontSize: 12,
      });
      expect(doc.roundedRect).toHaveBeenCalledWith(90, 95, 20, 10, 5, 5, 'F');
      expect(doc.setFontSize).toHaveBeenCalledWith(12);
    });
  });

  // ─── addSectionTitle ─────────────────────────────────────

  describe('addSectionTitle', () => {
    it('draws title text and returns new Y position', () => {
      const doc = createMockDoc();
      const newY = addSectionTitle(doc as any, 'My Section', 60);
      expect(doc.text).toHaveBeenCalledWith('My Section', expect.any(Number), 60, expect.objectContaining({ align: 'left' }));
      expect(newY).toBe(60 + PDF_CONFIG.spacing.section);
    });

    it('supports center alignment', () => {
      const doc = createMockDoc();
      addSectionTitle(doc as any, 'Centered', 40, { align: 'center' });
      expect(doc.text).toHaveBeenCalledWith(
        'Centered',
        expect.any(Number),
        40,
        expect.objectContaining({ align: 'center' })
      );
    });

    it('supports custom fontSize and color', () => {
      const doc = createMockDoc();
      addSectionTitle(doc as any, 'Custom', 30, {
        fontSize: 20,
        color: [255, 0, 0],
      });
      expect(doc.setFontSize).toHaveBeenCalledWith(20);
      expect(doc.setTextColor).toHaveBeenCalledWith(255, 0, 0);
    });
  });

  // ─── addSeparatorLine ────────────────────────────────────

  describe('addSeparatorLine', () => {
    it('draws a horizontal line and returns new Y position', () => {
      const doc = createMockDoc();
      const newY = addSeparatorLine(doc as any, 100);
      expect(doc.line).toHaveBeenCalled();
      expect(newY).toBe(100 + PDF_CONFIG.spacing.line);
    });

    it('uses custom color and lineWidth', () => {
      const doc = createMockDoc();
      addSeparatorLine(doc as any, 100, {
        color: [255, 0, 0],
        lineWidth: 2,
      });
      expect(doc.setDrawColor).toHaveBeenCalledWith(255, 0, 0);
      expect(doc.setLineWidth).toHaveBeenCalledWith(2);
    });
  });

  // ─── formatPDFDate ───────────────────────────────────────

  describe('formatPDFDate', () => {
    it('formats a date string to locale format', () => {
      const result = formatPDFDate('2024-06-15');
      // Result depends on locale, but should be non-empty
      expect(result).toBeTruthy();
      expect(result).toContain('15');
    });

    it('returns empty string for empty input', () => {
      expect(formatPDFDate('')).toBe('');
    });

    it('formats a Date object', () => {
      const date = new Date(2024, 5, 15); // June 15
      const result = formatPDFDate(date);
      expect(result).toBeTruthy();
    });
  });

  // ─── formatPDFDateRange ──────────────────────────────────

  describe('formatPDFDateRange', () => {
    it('returns single date when start and end are the same', () => {
      const result = formatPDFDateRange('2024-06-15', '2024-06-15');
      expect(result).not.toContain(' - ');
    });

    it('returns date range when dates differ', () => {
      const result = formatPDFDateRange('2024-06-15', '2024-06-16');
      expect(result).toContain(' - ');
    });

    it('returns just start date when end date is missing', () => {
      const result = formatPDFDateRange('2024-06-15');
      expect(result).toBeTruthy();
      expect(result).not.toContain(' - ');
    });

    it('returns empty string for empty start date', () => {
      expect(formatPDFDateRange('')).toBe('');
    });
  });

  // ─── addBodyText ─────────────────────────────────────────

  describe('addBodyText', () => {
    it('renders text and returns updated Y position', () => {
      const doc = createMockDoc();
      const newY = addBodyText(doc as any, 'Hello World', 10, 50);
      expect(doc.text).toHaveBeenCalledWith('Hello World', 10, 50);
      expect(newY).toBe(50 + PDF_CONFIG.spacing.line);
    });

    it('supports custom fontSize and color', () => {
      const doc = createMockDoc();
      addBodyText(doc as any, 'Text', 10, 50, {
        fontSize: 14,
        color: [0, 128, 0],
      });
      expect(doc.setFontSize).toHaveBeenCalledWith(14);
      expect(doc.setTextColor).toHaveBeenCalledWith(0, 128, 0);
    });
  });

  // ─── addLabeledValue ─────────────────────────────────────

  describe('addLabeledValue', () => {
    it('renders label in bold and value in normal', () => {
      const doc = createMockDoc();
      const newY = addLabeledValue(doc as any, 'Name', 'Test Event', 10, 50);
      expect(doc.setFont).toHaveBeenCalledWith('helvetica', 'bold');
      expect(doc.text).toHaveBeenCalledWith('Name:', 10, 50);
      expect(doc.setFont).toHaveBeenCalledWith('helvetica', 'normal');
      expect(doc.text).toHaveBeenCalledWith('Test Event', 60, 50); // 10 + default labelWidth 50
      expect(newY).toBe(50 + PDF_CONFIG.spacing.line + 1);
    });

    it('shows dash for empty value', () => {
      const doc = createMockDoc();
      addLabeledValue(doc as any, 'Field', '', 10, 50);
      expect(doc.text).toHaveBeenCalledWith('-', expect.any(Number), 50);
    });
  });

  // ─── resetPDFStyles ──────────────────────────────────────

  describe('resetPDFStyles', () => {
    it('resets all styles to defaults', () => {
      const doc = createMockDoc();
      resetPDFStyles(doc as any);
      expect(doc.setFontSize).toHaveBeenCalledWith(PDF_CONFIG.fonts.body.size);
      expect(doc.setFont).toHaveBeenCalledWith('helvetica', 'normal');
      expect(doc.setTextColor).toHaveBeenCalledWith(...PDF_CONFIG.colors.text);
      expect(doc.setDrawColor).toHaveBeenCalledWith(0, 0, 0);
      expect(doc.setFillColor).toHaveBeenCalledWith(255, 255, 255);
    });
  });

  // ─── setupPDFWithHeaderFooter ────────────────────────────

  describe('setupPDFWithHeaderFooter', () => {
    it('applies header/footer to all pages and returns content area', () => {
      const doc = createMockDoc();
      const area = setupPDFWithHeaderFooter(doc as any, null, 'My Title');
      expect(doc.setPage).toHaveBeenCalledWith(1);
      expect(area).toHaveProperty('startX');
      expect(area).toHaveProperty('startY');
      expect(area).toHaveProperty('width');
      expect(area).toHaveProperty('height');
    });
  });
});
