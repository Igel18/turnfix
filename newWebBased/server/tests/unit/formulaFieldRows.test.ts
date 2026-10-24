import { fetchFormulaFieldRows, FORMULA_FIELD_ROWS_SQL } from '../../src/utils/formulaFieldRows';
import { buildFieldSymbolsMap, calculateFormula } from '../../src/utils/formulaUtils';

describe('FORMULA_FIELD_ROWS_SQL', () => {
  it('selects the field id so a field can never be counted for two formula symbols', () => {
    expect(FORMULA_FIELD_ROWS_SQL).toContain('df.int_disziplinen_felderid as "fieldId"');
  });

  it('exposes final/starting flags so they are excluded from the formula mapping', () => {
    expect(FORMULA_FIELD_ROWS_SQL).toContain('"isFinalScore"');
    expect(FORMULA_FIELD_ROWS_SQL).toContain('"isStartingScore"');
  });

  it('only uses enabled fields of the given discipline and attempt', () => {
    expect(FORMULA_FIELD_ROWS_SQL).toContain('df.int_disziplinenid = $2');
    expect(FORMULA_FIELD_ROWS_SQL).toContain('jr.int_versuch = $3');
    expect(FORMULA_FIELD_ROWS_SQL).toContain('df.bol_enabled = true');
  });

  it('orders rows so that the newest row of a field comes last', () => {
    expect(FORMULA_FIELD_ROWS_SQL).toMatch(/ORDER BY[\s\S]*jr\.int_juryresultsid ASC/);
  });
});

describe('fetchFormulaFieldRows', () => {
  it('passes wertungenId, disciplineId and attempt to the query', async () => {
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue([]) };
    await fetchFormulaFieldRows(prisma as any, 11, 22, 1);
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(FORMULA_FIELD_ROWS_SQL, 11, 22, 1);
  });

  it('A=5, B=7.5 with a duplicated A row and a starting value still gives 12.5', async () => {
    const rows = [
      { performance: 5, fieldId: 1, fieldName: 'D/A-Note', fieldShortName: 'D/A-Note', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { performance: 5, fieldId: 1, fieldName: 'D/A-Note', fieldShortName: 'D/A-Note', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { performance: 7.5, fieldId: 2, fieldName: 'E/B-Note', fieldShortName: 'E/B-Note', sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { performance: 10, fieldId: 4, fieldName: 'Ausgangswert', fieldShortName: 'Ausgangswert', sortOrder: 4, isFinalScore: false, isStartingScore: true },
    ];
    const prisma = { $queryRawUnsafe: jest.fn().mockResolvedValue(rows) };

    const fetched = await fetchFormulaFieldRows(prisma as any, 1, 1, 1);
    const map = buildFieldSymbolsMap(fetched, 'A + B - C');
    const values: Record<string, number> = {};
    Object.values(map).forEach(f => { if (f.value !== null) values[f.symbol] = f.value; });

    expect(calculateFormula('A + B - C', values)).toBe(12.5);
  });
});
