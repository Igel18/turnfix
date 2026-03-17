/**
 * Squad PDF Export Utility
 * Handles PDF generation for squad management
 * Extracted from SquadManagement.tsx
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addPDFHeaderFooter,
  getUnifiedTableStyles,
  addSeparatorLine,
  PDF_CONFIG,
} from '@/utils/pdfUtils';
import {
  pdfColors,
  pdfFonts,
} from '@/utils/pdfStyles';
import type { Squad } from '../SquadManagement.types';

interface ExportSquadsPDFParams {
  squads: Squad[];
  selectedEvent: any;
  t: (key: string, options?: any) => string;
}

/**
 * Export squads to PDF (Riegenliste)
 *
 * Layout:
 *  - Page header/footer added last so page-count is correct
 *  - Summary line at top of page 1
 *  - Each squad rendered with: section title → separator → metadata → participant table
 *  - Consistent yPosition reset (= PDF_CONFIG.margins.header) on every new page
 */
export const exportSquadsPDF = ({ squads, selectedEvent, t }: ExportSquadsPDFParams): void => {
  if (!selectedEvent) return;

  const normalizeLabel = (label: string) => label.trim().replace(/[:：]\s*$/, '');

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Content area boundaries – consistent across every page
  const margin = PDF_CONFIG.margins.page;          // 10 mm
  const contentStartY = PDF_CONFIG.margins.header; // 32 mm  (below header + separator)
  const contentEndY = pageHeight - PDF_CONFIG.margins.footer; // 272 mm  (above footer)

  let yPosition = contentStartY;

  const unifiedStyles = getUnifiedTableStyles();

  // ── Helpers ────────────────────────────────────────────────────

  /** Start a fresh page and reset yPosition to the content top. */
  const addNewPage = () => {
    doc.addPage();
    yPosition = contentStartY;
  };

  /**
   * Ensure at least `needed` mm of vertical space remain.
   * If not, start a new page.
   */
  const ensureSpace = (needed: number) => {
    if (yPosition + needed > contentEndY) {
      addNewPage();
    }
  };

  // ── Page 1: Summary ────────────────────────────────────────────

  const totalParticipants = squads.reduce((sum, s) => sum + s.participantCount, 0);
  const summaryText = `${t('squadManagement.pdf.totalSquads', { count: squads.length })} | ${t('squadManagement.pdf.totalParticipants', { count: totalParticipants })}`;

  doc.setFontSize(PDF_CONFIG.fonts.body.size);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...pdfColors.text.secondary);
  doc.text(summaryText, margin, yPosition);
  yPosition += PDF_CONFIG.spacing.section; // 10 mm gap after summary

  // ── Squad sections ─────────────────────────────────────────────

  squads.forEach((squad, squadIndex) => {
    // Need space for: title (6) + separator (5) + meta (12) + at least one table row (8) = ~31 mm
    ensureSpace(31);

    // ── Squad name ──────────────────────────────────────────────
    doc.setFontSize(pdfFonts.sectionTitle.size);
    doc.setFont('helvetica', pdfFonts.sectionTitle.weight);
    doc.setTextColor(...pdfColors.text.primary);
    doc.text(squad.name || `Riege ${squadIndex + 1}`, margin, yPosition);
    yPosition += 5; // compact spacing from title baseline to separator
    yPosition = addSeparatorLine(doc, yPosition);

    // ── Metadata: participant count ──────────────────────────────
    doc.setFontSize(pdfFonts.tableBody.size);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...pdfColors.text.primary);
    doc.text(
      `${normalizeLabel(t('squadManagement.pdf.participants'))}: ${squad.participantCount}`,
      margin,
      yPosition,
    );
    yPosition += PDF_CONFIG.spacing.line; // 5 mm

    // ── Metadata: competitions ───────────────────────────────────
    if (squad.competitions && squad.competitions.length > 0) {
      ensureSpace(PDF_CONFIG.spacing.line * (squad.competitions.length + 1) + 4);
      doc.text(
        `${normalizeLabel(t('squadManagement.pdf.competitions'))}:`,
        margin,
        yPosition,
      );
      yPosition += PDF_CONFIG.spacing.line;

      squad.competitions.forEach((comp) => {
        const compText = comp.number
          ? `  - ${comp.name} (Nr. ${comp.number})`
          : `  - ${comp.name}`;
        doc.text(compText, margin, yPosition);
        yPosition += PDF_CONFIG.spacing.line;
      });
    }

    yPosition += PDF_CONFIG.spacing.paragraph; // breathing room before table

    // ── Participant table ────────────────────────────────────────
    if (squad.participants && squad.participants.length > 0) {
      const tableData = squad.participants.map(p => [
        `${p.firstname} ${p.lastname}`,
        p.birthYear ? p.birthYear.toString() : t('squadManagement.pdf.notAvailable'),
        p.club || t('squadManagement.pdf.noClub'),
        (p.competitions && p.competitions.length > 0)
          ? p.competitions.map(c => c.name).join(', ')
          : '',
        p.startNumber ? p.startNumber.toString() : '',
      ]);

      autoTable(doc, {
        head: [[
          t('squadManagement.pdf.name'),
          t('squadManagement.pdf.birthYear'),
          t('squadManagement.pdf.club'),
          t('competitions.fields.name'),
          t('groupTeamScoring.startNumber'),
        ]],
        body: tableData,
        startY: yPosition,
        ...unifiedStyles,
        columnStyles: {
          0: { halign: 'left',   cellWidth: 50 }, // Name
          1: { halign: 'center', cellWidth: 22 }, // Birth year
          2: { halign: 'left',   cellWidth: 40 }, // Club
          3: { halign: 'left',   cellWidth: 40 }, // Competition
          4: { halign: 'center', cellWidth: 22 }, // Start number
        },
      });

      yPosition = (doc as any).lastAutoTable.finalY + PDF_CONFIG.spacing.paragraph;
    } else {
      doc.setFontSize(pdfFonts.tableBody.size);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...pdfColors.text.secondary);
      doc.text(t('squadManagement.pdf.noParticipants'), margin, yPosition);
      yPosition += PDF_CONFIG.spacing.section;
    }

    // Extra gap between squads (not after the last one)
    if (squadIndex < squads.length - 1) {
      yPosition += PDF_CONFIG.spacing.section;
    }
  });

  // ── Add header/footer to ALL pages after content is final ──────
  // (so getNumberOfPages() reports the correct total)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPDFHeaderFooter({
      doc,
      event: selectedEvent,
      documentTitle: t('squadManagement.title'),
      pageWidth,
      pageHeight,
    });
  }

  // ── Save ───────────────────────────────────────────────────────
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `squad-management-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
  doc.save(filename);
};
