/**
 * Squad PDF Export Utility
 * Handles PDF generation for squad management
 * Extracted from SquadManagement.tsx
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  setupPDFWithHeaderFooter, 
  addSectionTitle, 
  addBodyText,
  getUnifiedTableStyles
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
  
  let yPosition = contentArea.startY + 10;
  const leftMargin = contentArea.startX;

  // Summary
  const totalParticipants = squads.reduce((sum, squad) => sum + squad.participantCount, 0);
  const summaryText = `${t('squadManagement.pdf.totalSquads', { count: squads.length })} | ${t('squadManagement.pdf.totalParticipants', { count: totalParticipants })}`;
  yPosition = addBodyText(doc, summaryText, yPosition, leftMargin);
  yPosition += pdfSpacing.section.spacing;

  // Get unified table styles
  const unifiedStyles = getUnifiedTableStyles();

  // Iterate through squads
  squads.forEach((squad, squadIndex) => {
    // Check if we need a new page before squad header
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
      // Prepare table data
      const tableData = squad.participants.map(p => [
        `${p.firstname} ${p.lastname}`,
        p.birthYear ? p.birthYear.toString() : t('squadManagement.pdf.notAvailable'),
        p.club || t('squadManagement.pdf.noClub')
      ]);

      // Add participants table
      autoTable(doc, {
        head: [[
          t('squadManagement.pdf.name'),
          t('squadManagement.pdf.birthYear'),
          t('squadManagement.pdf.club')
        ]],
        body: tableData,
        startY: yPosition,
        ...unifiedStyles,
        columnStyles: {
          0: { halign: 'left', cellWidth: 70 },   // Name
          1: { halign: 'center', cellWidth: 30 }, // Birth Year
          2: { halign: 'left', cellWidth: 70 }    // Club
        },
        didDrawPage: () => {
          setupPDFWithHeaderFooter(doc, selectedEvent, t('squadManagement.title'));
        }
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

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const filename = `squad-management-${selectedEvent.var_eventname.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`;
  
  doc.save(filename);
};
