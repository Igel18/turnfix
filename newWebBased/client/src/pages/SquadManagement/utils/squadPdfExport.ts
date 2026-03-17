/**
 * Squad PDF Export Utility
 * Handles PDF generation for squad management
 * Extracted from SquadManagement.tsx
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  setupPDFWithHeaderFooter, 
  addPDFHeaderFooter,
  addSectionTitle, 
  addBodyText,
  getUnifiedTableStyles, 
  addSeparatorLine
} from '@/utils/pdfUtils';
import {
  pdfSpacing,
  pdfFonts
} from '@/utils/pdfStyles';
import type { Squad } from '../SquadManagement.types';

interface ExportSquadsPDFParams {
  squads: Squad[];
  selectedEvent: any;
  t: (key: string, options?: any) => string;
}

/**
 * Export squads to PDF
 */
export const exportSquadsPDF = ({ squads, selectedEvent, t }: ExportSquadsPDFParams): void => {
  if (!selectedEvent) return;

  const normalizeLabel = (label: string) => label.trim().replace(/[:：]\s*$/, '');

  const doc = new jsPDF('p', 'mm', 'a4');
  const contentArea = setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
  
  // Always start at the very top after header/footer
  let yPosition = contentArea.startY + 10;
  const leftMargin = contentArea.startX;

  // Add fixed offset to ensure first squad name is visible (not hidden behind header)
    yPosition += 20;

  // If yPosition is too low (e.g. header/footer pushed it down), force a new page and reset
  if (yPosition > contentArea.endY - 120) {
    doc.addPage();
    setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
    yPosition = contentArea.startY + 10;
    yPosition += 20;
  }

  // --- Always render summary and first squad name at the very top of the first page ---
  const totalParticipants = squads.reduce((sum, squad) => sum + squad.participantCount, 0);
  const summaryText = `${t('squadManagement.pdf.totalSquads', { count: squads.length })} | ${t('squadManagement.pdf.totalParticipants', { count: totalParticipants })}`;
  yPosition = addBodyText(doc, summaryText, yPosition, leftMargin);
  yPosition += pdfSpacing.section.spacing;

  const unifiedStyles = getUnifiedTableStyles();
  // --- Render summary and first squad name as a fixed block at the top ---
  // Render summary at the top
  if (squads.length > 0) {
    // nothing extra for first squad name here
  }

  // Iterate through squads
  squads.forEach((squad, squadIndex) => {
    // Always check for page break before rendering squad name
    if (yPosition > contentArea.endY - 80) {
      doc.addPage();
      setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
      yPosition = contentArea.startY + 10;
    }
  
    // Squad Name as section title
    yPosition = addSectionTitle(
      doc,
      squad.name || `Riege ${squadIndex + 1}`,
      yPosition,
      { fontSize: pdfFonts.sectionTitle.size }
    );
    yPosition += pdfSpacing.section.title;
    yPosition = addSeparatorLine(doc, yPosition);

    yPosition += pdfSpacing.section.spacing;
    // Squad info: Participant count
    doc.setFontSize(pdfFonts.tableBody.size);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${normalizeLabel(t('squadManagement.pdf.participants'))}: ${squad.participantCount}`,
      leftMargin,
      yPosition
    );
    yPosition += pdfSpacing.section.spacing;

    // Squad Competitions - each on a separate line
    if (squad.competitions && squad.competitions.length > 0) {
      doc.text(
        `${normalizeLabel(t('squadManagement.pdf.competitions'))}:`,
        leftMargin,
        yPosition
      );
      yPosition += pdfSpacing.section.spacing;

      squad.competitions.forEach((comp) => {
        const compText = comp.number ? `  - ${comp.name} (Nr. ${comp.number})` : `  - ${comp.name}`;
        doc.text(compText, leftMargin, yPosition);
        yPosition += pdfSpacing.section.spacing;
      });

      yPosition += pdfSpacing.section.spacing;
    } else {
      yPosition += pdfSpacing.section.spacing;
    }

    // Squad Participants Table
    if (squad.participants && squad.participants.length > 0) {
      // Prepare table data with competition and start number
      const tableData = squad.participants.map(p => [
        `${p.firstname} ${p.lastname}`,
        p.birthYear ? p.birthYear.toString() : t('squadManagement.pdf.notAvailable'),
        p.club || t('squadManagement.pdf.noClub'),
        // Competition: show first competition name (or all joined)
        (p.competitions && p.competitions.length > 0)
          ? p.competitions.map(c => c.name).join(', ')
          : t('competitions.fields.name'),
        // Start number
        p.startNumber ? p.startNumber.toString() : ''
      ]);

      // Add participants table
      autoTable(doc, {
        head: [[
          t('squadManagement.pdf.name'),
          t('squadManagement.pdf.birthYear'),
          t('squadManagement.pdf.club'),
          t('competitions.fields.name'), // Competition
          t('groupTeamScoring.startNumber') // Start number
        ]],
        body: tableData,
        startY: yPosition,
        ...unifiedStyles,
        columnStyles: {
          0: { halign: 'left', cellWidth: 50 },   // Name
          1: { halign: 'center', cellWidth: 22 }, // Birth Year
          2: { halign: 'left', cellWidth: 40 },   // Club
          3: { halign: 'left', cellWidth: 40 },   // Competition
          4: { halign: 'center', cellWidth: 22 }  // Start Number
        },
      });

      // Update yPosition after table
      yPosition = (doc as any).lastAutoTable.finalY + pdfSpacing.section.spacing;
    } else {
      doc.setFontSize(pdfFonts.tableBody.size);
      doc.setFont('helvetica', 'italic');
      doc.text(t('squadManagement.pdf.noParticipants'), leftMargin, yPosition);
      yPosition += pdfSpacing.section.spacing;
    }

    // Add spacing between squads (except for the last one)
    if (squadIndex < squads.length - 1) {
      yPosition += pdfSpacing.section.spacing;
    }
  });

  // Add header/footer to ALL pages AFTER all content is generated
  // so that getNumberOfPages() returns the correct final total
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addPDFHeaderFooter({ doc, event: selectedEvent, documentTitle: t('squadManagement.title'), pageWidth, pageHeight });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `squad-management-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
  
  doc.save(filename);
};
