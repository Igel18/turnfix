/**
 * Label Printing Hook
 * Point 131: Extracted from EventParticipants for SoC
 * 
 * Handles PDF generation for participant labels with configurable layout
 */

import jsPDF from 'jspdf';
import { pdfColors, pdfFonts } from '@/utils/pdfStyles';
import type { Participant } from '../EventParticipants.types';
import type { LabelConfig } from '../components/LabelConfigModal';

interface UseLabelPrintingProps {
  participants: Participant[];
  competitions: Array<{ id: number; name: string; number?: string }>;
  eventId: string;
}

/**
 * Calculates the number of label positions to skip at the start of the first page.
 * @param startRow - 1-based start row
 * @param startColumn - 1-based start column
 * @param columns - total columns per page
 */
export function calcLabelStartOffset(startRow: number, startColumn: number, columns: number): number {
  return (startRow - 1) * columns + (startColumn - 1);
}

/**
 * Calculates how many pages are needed to print `participantCount` labels given the config.
 * @param participantCount - number of labels to print
 * @param config - label layout config
 */
export function calcLabelPagesNeeded(
  participantCount: number,
  config: Pick<LabelConfig, 'rows' | 'columns' | 'startRow' | 'startColumn'>
): number {
  if (participantCount <= 0) return 0;
  const labelsPerPage = config.rows * config.columns;
  const skipped = calcLabelStartOffset(config.startRow, config.startColumn, config.columns);
  const availableOnFirstPage = labelsPerPage - skipped;
  if (availableOnFirstPage >= participantCount) return 1;
  return 1 + Math.ceil((participantCount - availableOnFirstPage) / labelsPerPage);
}

/**
 * Sorts participants by: 1. Gender (male first), 2. Squad name, 3. Club name.
 */
export function sortParticipantsForLabels(participants: Participant[]): Participant[] {
  return [...participants].sort((a, b) => {
    const genderOrder = { male: 0, female: 1, unknown: 2, both: 3 };
    const gA = genderOrder[a.gender as keyof typeof genderOrder] ?? 2;
    const gB = genderOrder[b.gender as keyof typeof genderOrder] ?? 2;
    if (gA !== gB) return gA - gB;

    const squadA = (a.squad_name || '').toLowerCase();
    const squadB = (b.squad_name || '').toLowerCase();
    if (squadA !== squadB) return squadA.localeCompare(squadB, 'de');

    return (a.club || '').toLowerCase().localeCompare((b.club || '').toLowerCase(), 'de');
  });
}

interface UseLabelPrintingProps {
  participants: Participant[];
  competitions: Array<{ id: number; name: string; number?: string }>;
  eventId: string;
}

export function useLabelPrinting({ participants, competitions, eventId }: UseLabelPrintingProps) {
  const generateLabelsPDF = (config: LabelConfig) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // A4 dimensions
    const pageWidth = 210;
    const pageHeight = 297;

    // Calculate available area for labels
    const availableWidth = pageWidth - config.marginLeft - config.marginRight;
    const availableHeight = pageHeight - config.marginTop - config.marginBottom;

    // Calculate actual label dimensions including spacing
    const labelWidth = availableWidth / config.columns;
    const labelHeight = availableHeight / config.rows;

    let currentRow = 0;
    let currentCol = 0;

    // Apply start offset for 48c: skip already-used label positions on first page
    const startOffset = calcLabelStartOffset(config.startRow, config.startColumn, config.columns);
    if (startOffset > 0) {
      for (let i = 0; i < startOffset; i++) {
        currentCol++;
        if (currentCol >= config.columns) {
          currentCol = 0;
          currentRow++;
          if (currentRow >= config.rows) {
            currentRow = 0;
          }
        }
      }
    }

    // Sort participants by: 1. Gender, 2. Squad, 3. Club
    const sortedParticipants = sortParticipantsForLabels(participants);

    sortedParticipants.forEach((participant, index) => {
      // Check if we need a new page
      if (index > 0 && currentRow === 0 && currentCol === 0) {
        doc.addPage();
      }

      // Calculate position
      const x = config.marginLeft + currentCol * labelWidth;
      const y = config.marginTop + currentRow * labelHeight;

      // Draw border if enabled
      if (config.showBorders) {
        doc.setDrawColor(...pdfColors.line.light);
        doc.setLineWidth(0.1);
        doc.rect(x, y, labelWidth, labelHeight);
      }

      // Add participant information
      const name = `${participant.firstname} ${participant.lastname}`;
      const club = participant.club;
      const startNumber = participant.startNumber ? `#${participant.startNumber}` : '';

      // Get competition names for this participant
      const participantCompetitions = competitions
        .filter((comp) => participant.assignedCompetitions.includes(comp.id))
        .map((comp) => (comp.number ? `${comp.number} ${comp.name}` : comp.name))
        .join(', ');

      // Get squad information
      const squadInfo = participant.squad_name || '';

      // Set font for label content
      doc.setFont(pdfFonts.tableHeader.family, 'bold');
      doc.setFontSize(10);

      // Name (top of label)
      const nameY = y + 4;
      doc.text(name, x + 2, nameY, { maxWidth: labelWidth - 4 });

      // Start number (top right)
      if (startNumber) {
        doc.setFont(pdfFonts.tableHeader.family, 'bold');
        doc.setFontSize(12);
        const startNumberWidth = doc.getTextWidth(startNumber);
        doc.text(startNumber, x + labelWidth - startNumberWidth - 2, nameY);
      }

      // Club
      doc.setFont(pdfFonts.tableBody.family, 'normal');
      doc.setFontSize(8);
      const clubY = nameY + 4;
      doc.text(club, x + 2, clubY, { maxWidth: labelWidth - 4 });

      // Competition information
      if (participantCompetitions) {
        doc.setFontSize(7);
        const competitionY = clubY + 3;
        doc.text(participantCompetitions, x + 2, competitionY, { maxWidth: labelWidth - 4 });
      }

      // Squad information (bottom of label)
      if (squadInfo) {
        doc.setFontSize(7);
        const squadY = y + labelHeight - 2;
        doc.text(squadInfo, x + 2, squadY, { maxWidth: labelWidth - 4 });
      }

      // Move to next position
      currentCol++;
      if (currentCol >= config.columns) {
        currentCol = 0;
        currentRow++;
        if (currentRow >= config.rows) {
          currentRow = 0;
        }
      }
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `participant-labels-${eventId}-${timestamp}.pdf`;

    doc.save(filename);
  };

  return {
    generateLabelsPDF,
  };
}
