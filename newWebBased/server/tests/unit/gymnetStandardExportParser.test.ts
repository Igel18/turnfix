import * as XLSX from 'xlsx';
import { parseGymnetStandardExport } from '../../src/utils/gymnetStandardExportParser';

function buildXlsxBuffer(headers: string[], rows: (string | number)[][]): Buffer {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Meldungen');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseGymnetStandardExport', () => {
  it('extracts evName, evStart, evStop and evId from a matching header row', () => {
    const buffer = buildXlsxBuffer(
      ['evName', 'evStart', 'evStop', 'evID'],
      [['Landesmeisterschaft 2026', '2026-05-01', '2026-05-02', '123456']]
    );

    const result = parseGymnetStandardExport(buffer);

    expect(result.evName).toBe('Landesmeisterschaft 2026');
    expect(result.evStart).toBe('2026-05-01');
    expect(result.evStop).toBe('2026-05-02');
    expect(result.evId).toBe('123456');
    expect(result.hasInconsistentEventId).toBe(false);
  });

  it('matches header variants case-insensitively and ignoring separators', () => {
    const buffer = buildXlsxBuffer(
      ['ev_Name', 'EV_START', 'EvStop', 'ev id'],
      [['Test Event', '2026-01-01', '2026-01-02', '42']]
    );

    const result = parseGymnetStandardExport(buffer);

    expect(result.evName).toBe('Test Event');
    expect(result.evId).toBe('42');
  });

  it('flags inconsistent evID values across rows', () => {
    const buffer = buildXlsxBuffer(
      ['evName', 'evStart', 'evStop', 'evID'],
      [
        ['Event', '2026-01-01', '2026-01-02', '111'],
        ['Event', '2026-01-01', '2026-01-02', '222'],
      ]
    );

    const result = parseGymnetStandardExport(buffer);

    expect(result.hasInconsistentEventId).toBe(true);
    expect(result.distinctEventIds).toEqual(['111', '222']);
  });

  it('uses the first evID as the representative value when inconsistent', () => {
    const buffer = buildXlsxBuffer(
      ['evName', 'evStart', 'evStop', 'evID'],
      [
        ['Event', '2026-01-01', '2026-01-02', '111'],
        ['Event', '2026-01-01', '2026-01-02', '222'],
      ]
    );

    expect(parseGymnetStandardExport(buffer).evId).toBe('111');
  });

  it('throws when required columns are missing', () => {
    const buffer = buildXlsxBuffer(['name', 'start'], [['Event', '2026-01-01']]);

    expect(() => parseGymnetStandardExport(buffer)).toThrow(/Spalten fehlen/);
  });

  it('throws when the sheet has no data rows', () => {
    const buffer = buildXlsxBuffer(['evName', 'evStart', 'evStop', 'evID'], []);

    expect(() => parseGymnetStandardExport(buffer)).toThrow(/keine Datenzeilen/);
  });
});
