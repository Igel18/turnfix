/**
 * TDD Tests — Jury Portal: Formula Field A/B Swap Bug
 *
 * ROOT CAUSE: When saving formula fields A and B, then reloading, the values swap.
 *
 * THREE interrelated bugs:
 *
 * BUG 1 (PRIMARY): Server returns jury results with ORDER BY int_juryresultsid DESC
 *   as tiebreaker. Since A is saved first (lower jrid) and B second (higher jrid),
 *   loading with DESC reverses B before A → symbols swap.
 *
 * BUG 2 (NAMING): useJuryData.ts reads f.isEndValue/f.isStartValue but the API
 *   returns isFinalScore/isStartingScore → both always false → filter broken.
 *
 * BUG 3 (FRAGILE MAPPING): loadJuryResults maps by positional index → symbol,
 *   instead of matching by disciplineFieldId. Any ordering mismatch breaks it.
 *
 * FIX: Map loaded results by disciplineFieldId to input-field index for symbol mapping.
 *   Also fix the naming mismatch so Endwert/StartValue fields are properly excluded.
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers that simulate the BUGGY current code
// ─────────────────────────────────────────────────────────────────────────────

/** Simulates the current buggy mapping in useJuryData.ts lines 436-443 */
function buggyMapApiFieldToClient(apiField: any) {
  return {
    id: apiField.id,
    name: apiField.name,
    sortOrder: apiField.sortOrder,
    // BUG: reads f.isEndValue but API returns isFinalScore
    isEndValue: apiField.isEndValue || false,
    isStartValue: apiField.isStartValue || false,
  };
}

/** Simulates the current buggy loadJuryResults mapping (positional index → symbol) */
function buggyMapResultsToSymbols(
  results: Array<{ disciplineFieldId: number; performance: number; isFinalScore: boolean; sortOrder: number }>,
  _disciplineFields: any[]
): Record<string, number> {
  const sorted = results
    .filter(r => r.isFinalScore === false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const map: Record<string, number> = {};
  sorted.forEach((result, index) => {
    const symbol = String.fromCharCode(65 + index);
    if (result.performance !== null && result.performance !== undefined) {
      map[symbol] = result.performance;
    }
  });
  return map;
}

/** Simulates the buggy saveFormulaFields field lookup */
function buggyGetFieldForSymbol(symbol: string, disciplineFields: any[]) {
  const inputFields = disciplineFields.filter((f: any) => !f.isEndValue && !f.isStartValue);
  const fieldIndex = symbol.charCodeAt(0) - 65;
  return inputFields[fieldIndex];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers that simulate the FIXED code (to be implemented)
// ─────────────────────────────────────────────────────────────────────────────

// Import the actual functions once they exist:
// import { mapApiFieldToClient, mapResultsToSymbols, getInputFieldForSymbol } from '../utils/juryFieldMapping';

// For now, we define the expected behavior inline.
// These will be replaced with actual imports once the fix is implemented.

/** FIXED: Correctly reads isFinalScore/isStartingScore from API response */
function fixedMapApiFieldToClient(apiField: any) {
  return {
    id: apiField.id,
    name: apiField.name,
    sortOrder: apiField.sortOrder,
    isEndValue: apiField.isFinalScore || false,
    isStartValue: apiField.isStartingScore || false,
  };
}

/**
 * FIXED: Maps loaded jury results to symbols using disciplineFieldId
 * instead of fragile positional index mapping.
 *
 * Algorithm:
 *   1. Build ordered list of INPUT fields (exclude Endwert + StartValue)
 *   2. For each result, find its position in the input fields list
 *   3. Map position → symbol (A=0, B=1, C=2...)
 */
function fixedMapResultsToSymbols(
  results: Array<{ disciplineFieldId: number; performance: number; isFinalScore: boolean; sortOrder: number }>,
  disciplineFields: Array<{ id: number; isEndValue: boolean; isStartValue: boolean; sortOrder: number }>
): Record<string, number> {
  // Filter to input fields only (same filter as save uses)
  const inputFields = disciplineFields
    .filter(f => !f.isEndValue && !f.isStartValue)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const map: Record<string, number> = {};

  // Filter out final score results
  const nonFinalResults = results.filter(r => r.isFinalScore === false);

  for (const result of nonFinalResults) {
    // Find this result's field in the ordered input fields
    const fieldIndex = inputFields.findIndex(f => f.id === result.disciplineFieldId);
    if (fieldIndex === -1) continue; // Result for a non-input field (e.g., Endwert)

    const symbol = String.fromCharCode(65 + fieldIndex);
    if (result.performance !== null && result.performance !== undefined) {
      map[symbol] = result.performance;
    }
  }

  return map;
}

/** FIXED: Uses properly mapped isEndValue/isStartValue for filtering */
function fixedGetFieldForSymbol(
  symbol: string,
  disciplineFields: Array<{ id: number; isEndValue: boolean; isStartValue: boolean; sortOrder: number }>
) {
  const inputFields = disciplineFields
    .filter(f => !f.isEndValue && !f.isStartValue)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const fieldIndex = symbol.charCodeAt(0) - 65;
  return inputFields[fieldIndex];
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe('BUG 2: API field naming mismatch (isEndValue vs isFinalScore)', () => {
  const apiField = {
    id: 30,
    name: 'Endwert',
    sortOrder: 3,
    isFinalScore: true,      // ← API returns this
    isStartingScore: false,
  };

  it('BUG: buggy mapping always sets isEndValue to false', () => {
    const mapped = buggyMapApiFieldToClient(apiField);
    // Buggy: isEndValue is always false because API uses "isFinalScore" not "isEndValue"
    expect(mapped.isEndValue).toBe(false); // Demonstrates the bug
  });

  it('FIX: correct mapping reads isFinalScore and sets isEndValue', () => {
    const mapped = fixedMapApiFieldToClient(apiField);
    expect(mapped.isEndValue).toBe(true);
    expect(mapped.isStartValue).toBe(false);
  });

  it('FIX: correctly maps isStartingScore to isStartValue', () => {
    const apiStartField = {
      id: 10,
      name: 'Ausgangswert',
      sortOrder: 1,
      isFinalScore: false,
      isStartingScore: true,  // ← API returns this
    };
    const mapped = fixedMapApiFieldToClient(apiStartField);
    expect(mapped.isEndValue).toBe(false);
    expect(mapped.isStartValue).toBe(true);
  });

  it('BUG: broken filter includes Endwert in input fields', () => {
    // Simulate fields as they come from buggy mapping (isEndValue always false)
    const buggyFields = [
      { id: 10, name: 'Wertung', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { id: 11, name: 'Endwert', sortOrder: 2, isFinalScore: true, isStartingScore: false },
      { id: 12, name: 'Field B', sortOrder: 3, isFinalScore: false, isStartingScore: false },
    ].map(buggyMapApiFieldToClient);

    // With buggy mapping, isEndValue is always false → ALL 3 fields pass filter
    // So B maps to index 1 = Endwert (wrong!)
    const buggyFieldForB = buggyGetFieldForSymbol('B', buggyFields);
    expect(buggyFieldForB).toBeDefined();
    expect(buggyFieldForB.name).toBe('Endwert'); // Bug: B maps to Endwert instead of Field B
  });

  it('FIX: correct filter excludes Endwert from input fields', () => {
    const fixedFields = [
      { id: 10, name: 'Wert', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { id: 20, name: 'Abzug', sortOrder: 3, isFinalScore: false, isStartingScore: false },
      { id: 30, name: 'Endwert', sortOrder: 2, isFinalScore: true, isStartingScore: false },
    ].map(fixedMapApiFieldToClient);

    const fieldA = fixedGetFieldForSymbol('A', fixedFields);
    const fieldB = fixedGetFieldForSymbol('B', fixedFields);
    const fieldC = fixedGetFieldForSymbol('C', fixedFields);

    expect(fieldA?.name).toBe('Wert');
    expect(fieldB?.name).toBe('Abzug');
    expect(fieldC).toBeUndefined(); // Correctly excluded Endwert
  });
});

describe('BUG 1 + 3: A/B value swap on save→load cycle', () => {
  /**
   * Scenario: Discipline has Wert(sortOrder=1) and Abzug(sortOrder=1) — SAME sortOrder.
   * Save: A→Wert (jrid=1000), B→Abzug (jrid=1001)
   * Load with DESC jrid: Abzug(1001) comes first → index 0 → A = Abzug value = SWAP!
   */
  const disciplineFields = [
    { id: 10, name: 'Wert', sortOrder: 1, isEndValue: false, isStartValue: false },
    { id: 20, name: 'Abzug', sortOrder: 1, isEndValue: false, isStartValue: false },
    { id: 30, name: 'Endwert', sortOrder: 2, isEndValue: true, isStartValue: false },
  ];

  // User enters: A=5.0, B=3.0
  const formulaFieldValues = { A: 5.0, B: 3.0 };

  // Simulate save: A→field 10 (Wert), B→field 20 (Abzug)
  // After save, jury_results contains:
  //   jrid=1000: field=10: performance=5.0, sortOrder=1, isFinalScore=false
  //   jrid=1001: field=20: performance=3.0, sortOrder=1, isFinalScore=false
  const savedResults = [
    { disciplineFieldId: 10, performance: 5.0, sortOrder: 1, isFinalScore: false, juryResultsId: 1000 },
    { disciplineFieldId: 20, performance: 3.0, sortOrder: 1, isFinalScore: false, juryResultsId: 1001 },
  ];

  // Server returns with ORDER BY int_sortierung ASC, int_juryresultsid DESC
  // → jrid 1001 (Abzug=3.0) comes BEFORE jrid 1000 (Wert=5.0)
  const serverOrderedResults = [...savedResults].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return b.juryResultsId - a.juryResultsId; // DESC by jrid
  });

  it('BUG: positional mapping swaps A and B when sortOrder matches', () => {
    const loaded = buggyMapResultsToSymbols(serverOrderedResults, disciplineFields);

    // Because server sends Abzug first (higher jrid), positional mapping makes:
    // index 0 → A = 3.0 (Abzug's value) — WRONG!
    // index 1 → B = 5.0 (Wert's value) — WRONG!
    expect(loaded.A).toBe(3.0); // Demonstrates: A got B's value
    expect(loaded.B).toBe(5.0); // Demonstrates: B got A's value
  });

  it('FIX: field-based mapping preserves correct A/B values regardless of order', () => {
    // Use properly-mapped discipline fields
    const properFields = [
      { id: 10, name: 'Wert', sortOrder: 1, isEndValue: false, isStartValue: false },
      { id: 20, name: 'Abzug', sortOrder: 1, isEndValue: false, isStartValue: false },
      { id: 30, name: 'Endwert', sortOrder: 2, isEndValue: true, isStartValue: false },
    ];

    const loaded = fixedMapResultsToSymbols(serverOrderedResults, properFields);

    // Fixed: maps by disciplineFieldId → field 10 is input[0] (A), field 20 is input[1] (B)
    expect(loaded.A).toBe(5.0); // Correctly preserved
    expect(loaded.B).toBe(3.0); // Correctly preserved
  });

  it('FIX: save→load roundtrip preserves all values', () => {
    const properFields = [
      { id: 10, name: 'Wert', sortOrder: 1, isEndValue: false, isStartValue: false },
      { id: 20, name: 'Abzug', sortOrder: 1, isEndValue: false, isStartValue: false },
      { id: 30, name: 'Endwert', sortOrder: 2, isEndValue: true, isStartValue: false },
    ];

    // Step 1: Save — map symbols to field IDs
    const fieldForA = fixedGetFieldForSymbol('A', properFields);
    const fieldForB = fixedGetFieldForSymbol('B', properFields);
    expect(fieldForA?.id).toBe(10);
    expect(fieldForB?.id).toBe(20);

    // Step 2: Simulate server returning results in any order
    const serverResults = [
      { disciplineFieldId: 20, performance: 3.0, sortOrder: 1, isFinalScore: false },
      { disciplineFieldId: 10, performance: 5.0, sortOrder: 1, isFinalScore: false },
    ];

    // Step 3: Load — map results back to symbols
    const loaded = fixedMapResultsToSymbols(serverResults, properFields);

    // Step 4: Assert roundtrip preserved values
    expect(loaded.A).toBe(formulaFieldValues.A);
    expect(loaded.B).toBe(formulaFieldValues.B);
  });
});

describe('BUG 1 + 3: A/B swap with different sortOrder (no collision)', () => {
  it('works correctly when sortOrder values are unique', () => {
    const fields = [
      { id: 10, name: 'Wert', sortOrder: 1, isEndValue: false, isStartValue: false },
      { id: 20, name: 'Abzug', sortOrder: 2, isEndValue: false, isStartValue: false },
      { id: 30, name: 'Endwert', sortOrder: 3, isEndValue: true, isStartValue: false },
    ];

    const results = [
      { disciplineFieldId: 20, performance: 3.0, sortOrder: 2, isFinalScore: false },
      { disciplineFieldId: 10, performance: 5.0, sortOrder: 1, isFinalScore: false },
    ];

    const loaded = fixedMapResultsToSymbols(results, fields);
    expect(loaded.A).toBe(5.0);
    expect(loaded.B).toBe(3.0);
  });
});

describe('BUG 2 + 3: Endwert included in save but excluded from load', () => {
  it('BUG: Endwert with low sortOrder shifts save indices', () => {
    // Endwert at sortOrder=0 (before input fields)
    const apiFields = [
      { id: 30, name: 'Endwert', sortOrder: 0, isFinalScore: true, isStartingScore: false },
      { id: 10, name: 'Wert', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { id: 20, name: 'Abzug', sortOrder: 2, isFinalScore: false, isStartingScore: false },
    ];

    // With buggy mapping, isEndValue is always false → Endwert not filtered
    const buggyFields = apiFields.map(buggyMapApiFieldToClient);
    buggyFields.sort((a, b) => a.sortOrder - b.sortOrder);

    // A → index 0 → Endwert (WRONG!)
    const buggyFieldForA = buggyGetFieldForSymbol('A', buggyFields);
    expect(buggyFieldForA.id).toBe(30); // Bug: A maps to Endwert

    // B → index 1 → Wert (shifted!)
    const buggyFieldForB = buggyGetFieldForSymbol('B', buggyFields);
    expect(buggyFieldForB.id).toBe(10); // Bug: B maps to Wert instead of Abzug
  });

  it('FIX: Endwert properly excluded, A→Wert, B→Abzug', () => {
    const apiFields = [
      { id: 30, name: 'Endwert', sortOrder: 0, isFinalScore: true, isStartingScore: false },
      { id: 10, name: 'Wert', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { id: 20, name: 'Abzug', sortOrder: 2, isFinalScore: false, isStartingScore: false },
    ];

    const fixedFields = apiFields.map(fixedMapApiFieldToClient);
    fixedFields.sort((a, b) => a.sortOrder - b.sortOrder);

    const fieldForA = fixedGetFieldForSymbol('A', fixedFields);
    const fieldForB = fixedGetFieldForSymbol('B', fixedFields);

    expect(fieldForA?.id).toBe(10); // Wert
    expect(fieldForB?.id).toBe(20); // Abzug
  });
});

describe('Full roundtrip: FormulaInput display ↔ save ↔ load consistency', () => {
  it('discipline with 3 fields (Wert, Abzug, Endwert): A/B roundtrip correct', () => {
    // 1. API response
    const apiFields = [
      { id: 10, name: 'Wert', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { id: 20, name: 'Abzug', sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { id: 30, name: 'Endwert', sortOrder: 3, isFinalScore: true, isStartingScore: false },
    ];

    // 2. Map to client (FIXED)
    const fields = apiFields.map(fixedMapApiFieldToClient);
    fields.sort((a, b) => a.sortOrder - b.sortOrder);

    // 3. FormulaInput should show: A=Wert, B=Abzug (excluding Endwert)
    const inputFields = fields.filter(f => !f.isEndValue && !f.isStartValue);
    expect(inputFields).toHaveLength(2);
    expect(inputFields[0].name).toBe('Wert');
    expect(inputFields[1].name).toBe('Abzug');

    // 4. User enters A=8.5, B=1.0
    const userValues = { A: 8.5, B: 1.0 };

    // 5. Save: A→field 10, B→field 20
    const savedFieldA = fixedGetFieldForSymbol('A', fields);
    const savedFieldB = fixedGetFieldForSymbol('B', fields);
    expect(savedFieldA?.id).toBe(10);
    expect(savedFieldB?.id).toBe(20);

    // 6. Server returns results (possibly in any order)
    const serverResults = [
      { disciplineFieldId: 20, performance: 1.0, sortOrder: 2, isFinalScore: false },
      { disciplineFieldId: 10, performance: 8.5, sortOrder: 1, isFinalScore: false },
      { disciplineFieldId: 30, performance: 7.5, sortOrder: 3, isFinalScore: true }, // Endwert
    ];

    // 7. Load: map back to symbols (FIXED)
    const loaded = fixedMapResultsToSymbols(serverResults, fields);
    expect(loaded.A).toBe(8.5);
    expect(loaded.B).toBe(1.0);
    expect(loaded.C).toBeUndefined(); // Endwert correctly excluded
  });

  it('discipline with Ausgangswert, Wert, Abzug, Endwert: A/B roundtrip correct', () => {
    const apiFields = [
      { id: 5, name: 'Ausgangswert', sortOrder: 0, isFinalScore: false, isStartingScore: true },
      { id: 10, name: 'Wert', sortOrder: 1, isFinalScore: false, isStartingScore: false },
      { id: 20, name: 'Abzug', sortOrder: 2, isFinalScore: false, isStartingScore: false },
      { id: 30, name: 'Endwert', sortOrder: 3, isFinalScore: true, isStartingScore: false },
    ];

    const fields = apiFields.map(fixedMapApiFieldToClient);
    fields.sort((a, b) => a.sortOrder - b.sortOrder);

    // Input fields should only be Wert and Abzug
    const inputFields = fields.filter(f => !f.isEndValue && !f.isStartValue);
    expect(inputFields).toHaveLength(2);
    expect(inputFields[0].name).toBe('Wert');
    expect(inputFields[1].name).toBe('Abzug');

    // Save
    const savedFieldA = fixedGetFieldForSymbol('A', fields);
    const savedFieldB = fixedGetFieldForSymbol('B', fields);
    expect(savedFieldA?.id).toBe(10);
    expect(savedFieldB?.id).toBe(20);

    // Load (server returns all results in random order)
    const serverResults = [
      { disciplineFieldId: 30, performance: 7.5, sortOrder: 3, isFinalScore: true },
      { disciplineFieldId: 5, performance: 0, sortOrder: 0, isFinalScore: false },
      { disciplineFieldId: 20, performance: 1.0, sortOrder: 2, isFinalScore: false },
      { disciplineFieldId: 10, performance: 8.5, sortOrder: 1, isFinalScore: false },
    ];

    const loaded = fixedMapResultsToSymbols(serverResults, fields);
    expect(loaded.A).toBe(8.5); // Wert, not Ausgangswert
    expect(loaded.B).toBe(1.0); // Abzug
  });
});
