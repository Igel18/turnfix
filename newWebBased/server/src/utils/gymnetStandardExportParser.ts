/**
 * Parser for GymNet's "Standardexport.xls" (Meldungen erfassen → Meldungen →
 * Funktionen → Standardexport.xls). Used to recover the GymNet event ID
 * (evID), which is not part of the regular Datenexport.xml and cannot be
 * derived from the TurnFix database (TurnFix generates its own event IDs).
 */

import * as XLSX from 'xlsx';

export interface GymnetStandardExportRow {
  evName: string;
  evStart: string;
  evStop: string;
  evId: string;
}

export interface GymnetStandardExportResult {
  rows: GymnetStandardExportRow[];
  distinctEventIds: string[];
  evName: string;
  evStart: string;
  evStop: string;
  evId: string;
  hasInconsistentEventId: boolean;
}

type ExportField = keyof GymnetStandardExportRow;

const HEADER_ALIASES: Record<ExportField, string[]> = {
  evName: ['evname', 'eventname'],
  evStart: ['evstart', 'eventstart'],
  evStop: ['evstop', 'evend', 'eventstop', 'eventend'],
  evId: ['evid', 'eventid'],
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses a GymNet Standardexport file (.xls/.xlsx) and extracts evName,
 * evStart, evStop and evID. Throws if required columns are missing.
 */
export function parseGymnetStandardExport(buffer: Buffer): GymnetStandardExportResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Die Datei enthält kein Tabellenblatt.');
  }

  const sheet = workbook.Sheets[sheetName];
  const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  if (table.length === 0) {
    throw new Error('Die Datei enthält keine Datenzeilen.');
  }

  const columnMap: Partial<Record<ExportField, string>> = {};
  for (const key of Object.keys(table[0])) {
    const normalized = normalizeHeader(key);
    for (const field of Object.keys(HEADER_ALIASES) as ExportField[]) {
      if (!columnMap[field] && HEADER_ALIASES[field].includes(normalized)) {
        columnMap[field] = key;
      }
    }
  }

  const missingFields = (['evName', 'evStart', 'evStop', 'evId'] as ExportField[]).filter(field => !columnMap[field]);
  if (missingFields.length > 0) {
    throw new Error(`Erforderliche Spalten fehlen in der Datei: ${missingFields.join(', ')}`);
  }

  const rows: GymnetStandardExportRow[] = table.map(row => ({
    evName: String(row[columnMap.evName!] ?? '').trim(),
    evStart: String(row[columnMap.evStart!] ?? '').trim(),
    evStop: String(row[columnMap.evStop!] ?? '').trim(),
    evId: String(row[columnMap.evId!] ?? '').trim(),
  }));

  const distinctEventIds = Array.from(new Set(rows.map(row => row.evId).filter(Boolean)));
  const first = rows[0];

  return {
    rows,
    distinctEventIds,
    evName: first.evName,
    evStart: first.evStart,
    evStop: first.evStop,
    evId: distinctEventIds[0] ?? first.evId,
    hasInconsistentEventId: distinctEventIds.length > 1,
  };
}
