/**
 * Label Printing Hook
 * Point 131: Extracted from EventParticipants for SoC
 * 
 * Handles PDF generation for participant labels with configurable layout
 */

import jsPDF from 'jspdf';
import type { Participant } from '../EventParticipants.types';
import type { LabelConfig } from '../components/LabelConfigModal';

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

    // Sort participants by: 1. Gender, 2. Squad, 3. Club
    const sortedParticipants = [...participants].sort((a, b) => {
      // Primary sort: Gender (male first, then female)
      const genderOrder = { male: 0, female: 1, unknown: 2, both: 3 };
      const genderA = genderOrder[a.gender as keyof typeof genderOrder] ?? 2;
      const genderB = genderOrder[b.gender as keyof typeof genderOrder] ?? 2;

      if (genderA !== genderB) {
        return genderA - genderB;
      }

      // Secondary sort: Squad (alphabetical)
      const squadA = (a.squad_name || '').toLowerCase();
      const squadB = (b.squad_name || '').toLowerCase();

      if (squadA !== squadB) {
        return squadA.localeCompare(squadB, 'de');
      }

      // Tertiary sort: Club (alphabetical)
      const clubA = (a.club || '').toLowerCase();
      const clubB = (b.club || '').toLowerCase();

      return clubA.localeCompare(clubB, 'de');
    });

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
        doc.setDrawColor(200, 200, 200);
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
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);

      // Name (top of label)
      const nameY = y + 4;
      doc.text(name, x + 2, nameY, { maxWidth: labelWidth - 4 });

      // Start number (top right)
      if (startNumber) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        const startNumberWidth = doc.getTextWidth(startNumber);
        doc.text(startNumber, x + labelWidth - startNumberWidth - 2, nameY);
      }

      // Club
      doc.setFont('helvetica', 'normal');
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
