import type { TFunction } from 'i18next';
import type { MatrixData, SessionGroup, TimeSettings } from './TimePlanning.types';
import { buildRoundTimeMap, calculateRoundTime } from './scheduleMatrixUtils';
import type { AnyColumn, DisciplineColumn } from './matrixColumnHelpers';

interface ScheduleMatrixPdfOptions {
  eventId: string;
  totalRounds: number;
  columns: AnyColumn[];
  matrixData: MatrixData | null;
  baseStartTime: string | null;
  timeSettings: TimeSettings;
  selectedEvent?: Record<string, unknown> | null;
  sessionGroups?: SessionGroup[];
  t: TFunction;
}

export async function printScheduleMatrixPdf({
  eventId,
  totalRounds,
  columns,
  matrixData,
  baseStartTime,
  timeSettings,
  selectedEvent,
  sessionGroups,
  t,
}: ScheduleMatrixPdfOptions): Promise<void> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { setupPDFWithHeaderFooter, getUnifiedTableStyles } = await import('@/utils/pdfUtils');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const contentArea = setupPDFWithHeaderFooter(doc, selectedEvent as any, t('timePlanning.matrix.printTitle'));

    const startTime = baseStartTime || '09:00';
    const interval = timeSettings.rotationIntervalMinutes;
    const roundTimeMap = buildRoundTimeMap(
      totalRounds,
      sessionGroups ?? [],
      timeSettings.exerciseDurationMinutes,
      interval,
    );
    const getRoundTime = (round: number) =>
      roundTimeMap.get(round) ?? calculateRoundTime(startTime, round, interval);
    const disciplineColumns = columns.filter((column): column is DisciplineColumn => column.kind === 'discipline');
    const head = [[t('timePlanning.matrix.time'), ...disciplineColumns.map(column => column.shortName || column.name)]];
    const columnCount = disciplineColumns.length + 1;
    const body: any[] = [];
    let lastSession: number | null = null;

    for (let round = 1; round <= totalRounds; round++) {
      const time = getRoundTime(round);
      if (sessionGroups && sessionGroups.length >= 2) {
        let activeSession: { session: number; startTime: string } | null = null;
        for (const group of sessionGroups) {
          if (group.startTime && group.startTime <= time) {
            if (!activeSession || group.startTime > activeSession.startTime) {
              activeSession = { session: group.session, startTime: group.startTime };
            }
          }
        }

        if (activeSession && activeSession.session !== lastSession) {
          lastSession = activeSession.session;
          const label = `${t('timePlanning.round', 'Durchgang')} ${activeSession.session}  –  ${t('timePlanning.startTime', 'Startzeit')}: ${activeSession.startTime}`;
          body.push([{
            content: label,
            colSpan: columnCount,
            styles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          }]);
        }
      }

      body.push([
        time,
        ...disciplineColumns.map(column =>
          matrixData?.assignments.find(assignment =>
            assignment.disciplineId === column.id && assignment.round === round,
          )?.squadName || '',
        ),
      ]);
    }

    autoTable(doc, {
      startY: contentArea.startY,
      head,
      body,
      ...getUnifiedTableStyles(),
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 } },
      margin: { left: 14, right: 14 },
    });
    doc.save(`zeitplan-tabelle-${eventId}.pdf`);
  } catch (error) {
    console.error('[ScheduleMatrixView] PDF print failed', error);
  }
}