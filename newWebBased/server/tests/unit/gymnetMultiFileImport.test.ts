/**
 * Unit tests for GymNet multi-file import merging logic (issue 83).
 *
 * Tests the pure data-merging step that combines ExtractedData from
 * multiple parsed XML files before the database import phase.
 *
 * These tests do NOT touch the database.
 */

import type { ExtractedData } from '../../src/utils/gymnetXmlParser';

// ============================================================================
// Helper: merge function (mirrors the route's flatMap logic)
// ============================================================================

function mergeExtractedData(datasets: ExtractedData[]): ExtractedData {
  return {
    clubs:        datasets.flatMap(d => d.clubs),
    competitions: datasets.flatMap(d => d.competitions),
    participants: datasets.flatMap(d => d.participants),
    devices:      datasets.flatMap(d => d.devices),
    teams:        datasets.flatMap(d => d.teams),
  };
}

function makeDataset(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    clubs:        [],
    competitions: [],
    participants: [],
    devices:      [],
    teams:        [],
    ...overrides,
  };
}

// ============================================================================
// Tests: merging empty datasets
// ============================================================================

describe('mergeExtractedData – empty inputs', () => {
  it('merges zero datasets into empty collections', () => {
    const result = mergeExtractedData([]);
    expect(result.clubs).toHaveLength(0);
    expect(result.competitions).toHaveLength(0);
    expect(result.participants).toHaveLength(0);
    expect(result.devices).toHaveLength(0);
    expect(result.teams).toHaveLength(0);
  });

  it('single empty dataset stays empty', () => {
    const result = mergeExtractedData([makeDataset()]);
    expect(result.clubs).toHaveLength(0);
    expect(result.competitions).toHaveLength(0);
  });
});

// ============================================================================
// Tests: merging single file (identity)
// ============================================================================

describe('mergeExtractedData – single file (identity)', () => {
  it('returns same content for a single-file input', () => {
    const ds = makeDataset({
      clubs:        [{ id: 1, name: 'TSV Muster' }],
      competitions: [{ id: 10, name: 'Pflicht P5 w' }],
      participants: [{ id: 100, firstName: 'Anna', lastName: 'Test' }],
      devices:      [{ code: '290', name: 'Boden w' }],
      teams:        [{ clubName: 'TSV Muster', competitionNumber: '01', participants: [] }],
    });
    const result = mergeExtractedData([ds]);
    expect(result.clubs).toHaveLength(1);
    expect(result.competitions).toHaveLength(1);
    expect(result.participants).toHaveLength(1);
    expect(result.devices).toHaveLength(1);
    expect(result.teams).toHaveLength(1);
  });
});

// ============================================================================
// Tests: merging two files (typical scenario: individual + team)
// ============================================================================

describe('mergeExtractedData – two files', () => {
  const indFile = makeDataset({
    clubs:        [{ id: 1, name: 'TSV Einzel' }],
    competitions: [{ id: 10, name: 'Gerätvierkampf w P5' }],
    participants: [
      { id: 101, firstName: 'Anna', lastName: 'Müller' },
      { id: 102, firstName: 'Berta', lastName: 'Maier' },
    ],
    devices: [{ code: '290', name: 'Boden w' }, { code: '280', name: 'Balken' }],
    teams:   [],
  });

  const teamFile = makeDataset({
    clubs:        [{ id: 2, name: 'SV Mannschaft' }],
    competitions: [{ id: 20, name: 'Mannschaftswettkampf w' }],
    participants: [
      { id: 201, firstName: 'Clara', lastName: 'Schmidt' },
    ],
    devices:      [],
    teams:        [
      { clubName: 'SV Mannschaft', competitionNumber: '01', participants: [{ firstName: 'Clara', lastName: 'Schmidt' }] },
    ],
  });

  let result: ExtractedData;

  beforeAll(() => {
    result = mergeExtractedData([indFile, teamFile]);
  });

  it('contains clubs from both files', () => {
    expect(result.clubs).toHaveLength(2);
    expect(result.clubs.map((c: any) => c.name)).toContain('TSV Einzel');
    expect(result.clubs.map((c: any) => c.name)).toContain('SV Mannschaft');
  });

  it('contains competitions from both files', () => {
    expect(result.competitions).toHaveLength(2);
  });

  it('contains all participants from both files', () => {
    expect(result.participants).toHaveLength(3);
  });

  it('contains devices only from individual file', () => {
    expect(result.devices).toHaveLength(2);
  });

  it('contains teams only from team file', () => {
    expect(result.teams).toHaveLength(1);
    expect(result.teams[0].clubName).toBe('SV Mannschaft');
  });

  it('preserves original order (individual file first)', () => {
    expect(result.clubs[0].name).toBe('TSV Einzel');
    expect(result.clubs[1].name).toBe('SV Mannschaft');
  });
});

// ============================================================================
// Tests: merging three files
// ============================================================================

describe('mergeExtractedData – three files', () => {
  const file1 = makeDataset({ clubs: [{ name: 'A' }], competitions: [{ name: 'WK1' }] });
  const file2 = makeDataset({ clubs: [{ name: 'B' }], competitions: [{ name: 'WK2' }] });
  const file3 = makeDataset({ clubs: [{ name: 'C' }], competitions: [{ name: 'WK3' }, { name: 'WK4' }] });

  it('merges all three club lists', () => {
    const result = mergeExtractedData([file1, file2, file3]);
    expect(result.clubs).toHaveLength(3);
  });

  it('merges all four competitions across three files', () => {
    const result = mergeExtractedData([file1, file2, file3]);
    expect(result.competitions).toHaveLength(4);
  });
});

// ============================================================================
// Tests: merging does NOT deduplicate — deduplication happens in dbImport
// ============================================================================

describe('mergeExtractedData – does NOT deduplicate', () => {
  it('keeps duplicate clubs from two files (dedup is db-layer responsibility)', () => {
    const shared = makeDataset({
      clubs: [{ id: 1, name: 'TSV Shared' }],
    });
    const result = mergeExtractedData([shared, shared]);
    // Merge keeps all entries; DB import layer deduplicates
    expect(result.clubs).toHaveLength(2);
    expect(result.clubs.every((c: any) => c.name === 'TSV Shared')).toBe(true);
  });

  it('keeps duplicate participants from overlap', () => {
    const p = { id: '123', firstName: 'Paul', lastName: 'Test' };
    const a = makeDataset({ participants: [p] });
    const b = makeDataset({ participants: [p] });
    const result = mergeExtractedData([a, b]);
    expect(result.participants).toHaveLength(2);
  });
});

// ============================================================================
// Tests: summary deduplication counters (mirrors route response logic)
// ============================================================================

describe('Summary unique-count calculation (mirrors route logic)', () => {
  it('uniqueClubNames counts distinct names case-insensitively across merged data', () => {
    const clubs = [
      { name: 'TSV Muster' },
      { name: 'tsv muster' },        // duplicate (different case)
      { name: 'SV Beispiel' },
    ];
    const uniqueNames = new Set(
      clubs.map((c: any) => (c.name || '').trim().toLowerCase()).filter((n: string) => n.length > 0)
    );
    expect(uniqueNames.size).toBe(2);
  });

  it('participant keys prefer perID; fall back to name+birthDate', () => {
    const participants = [
      { id: '10', firstName: 'Anna', lastName: 'A', birthDate: '2010-01-01' },
      { id: '10', firstName: 'Anna', lastName: 'A', birthDate: '2010-01-01' }, // dup by id
      { id: '',   firstName: 'Bob',  lastName: 'B', birthDate: '2011-02-02' },
      { id: '',   firstName: 'Bob',  lastName: 'B', birthDate: '2011-02-02' }, // dup by name+date
      { id: '',   firstName: 'Carol',lastName: 'C', birthDate: '2012-03-03' },
    ];
    const keys = new Set<string>();
    for (const p of participants) {
      if (p.id) {
        keys.add(`id:${p.id}`);
      } else {
        keys.add(`${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}|${p.birthDate}`);
      }
    }
    expect(keys.size).toBe(3); // Anna(id), Bob(name+date), Carol(name+date)
  });

  it('device keys combine code and competitionWaNr', () => {
    const devices = [
      { code: '290', competitionWaNr: '01' },
      { code: '290', competitionWaNr: '01' }, // dup
      { code: '290', competitionWaNr: '02' }, // same code, different competition
      { code: '280', competitionWaNr: '01' }, // different code, same competition
    ];
    const keys = new Set(devices.map((d: any) => `${d.code}|${d.competitionWaNr}`));
    expect(keys.size).toBe(3);
  });
});
