/**
 * useExportTimeplan hook
 * Point 124: Separation of Concerns
 *
 * Encapsulates the PDF export logic for the time planning page.
 */

import { useCallback } from 'react';
import { TFunction } from 'i18next';
import type { SessionGroup, Squad } from '../TimePlanning.types';

interface UseExportTimeplanProps {
  selectedEvent: any;
  eventId: string | null | undefined;
  sessionGroups: SessionGroup[];
  squads: Squad[];
  t: TFunction;
}

export function useExportTimeplan({
  selectedEvent,
  eventId,
  sessionGroups,
  squads,
  t,
}: UseExportTimeplanProps) {
  const exportTimeplan = useCallback(async () => {
    if (!selectedEvent || !eventId) {
      alert(t('timePlanning.selectEventFirst'));
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const { setupPDFWithHeaderFooter, addPDFHeaderFooter, getUnifiedTableStyles } = await import('../../../utils/pdfUtils');

      const doc = new jsPDF('landscape', 'mm', 'a4');
      setupPDFWithHeaderFooter(doc, selectedEvent, t('timePlanning.title'));

      let startY = 40;

      sessionGroups.forEach(sessionGroup => {
        if (startY > 160) {
          doc.addPage();
          startY = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${t('timePlanning.round')} ${sessionGroup.session}` +
            (sessionGroup.startTime ? ` - ${t('timePlanning.startTime')}: ${sessionGroup.startTime}` : ''),
          14,
          startY
        );
        startY += 8;

        const tableData = sessionGroup.competitions.map(comp => {
          const compSquads = squads.filter(
            (s: any) => s.competitionIds && s.competitionIds.includes(comp.id)
          );
          const squadNames = compSquads.map((s: any) => s.name).join(', ') || '-';
          const participantCount = compSquads.reduce((sum: number, s: any) => sum + (s.participantCount || 0), 0);
          return [
            comp.number || '-',
            comp.name,
            comp.int_bahn?.toString() || '-',
            squadNames,
            participantCount.toString(),
            comp.warmupTime || '-',
            comp.startTime || '-',
          ];
        });

        autoTable(doc, {
          head: [[
            t('timePlanning.number'),
            t('common.competition'),
            'Bahn',
            t('timePlanning.squads'),
            t('timePlanning.participants'),
            t('timePlanning.warmupTime'),
            t('timePlanning.startTime'),
          ]],
          body: tableData,
          ...getUnifiedTableStyles(),
          startY,
          margin: { left: 14, right: 14 },
        });

        startY = (doc as any).lastAutoTable.finalY + 12;
      });

      addPDFHeaderFooter({ doc, event: selectedEvent, documentTitle: t('timePlanning.title') });
      doc.save(`zeitplan-${eventId}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting timeplan:', error);
      alert(t('common.error') + ': ' + (error as Error).message);
    }
  }, [selectedEvent, eventId, sessionGroups, squads, t]);

  return { exportTimeplan };
}
