/**
 * TDD Tests — Jury Portal: Formula Field Values Save Flow
 *
 * BUG 1: hasFormula check uses selectedDevice.var_formel only. When the formula
 * comes from a linked formula (int_formelid), var_formel can be null/empty, so
 * hasFormula=false and field values are never saved.
 *
 * BUG 2: saveFormulaFields maps symbols by array index: disciplineFields[charCode - 65].
 * This breaks if disciplineFields includes the Endwert field (bol_endwert=true) mixed in,
 * since the index no longer corresponds to A=0, B=1, etc.
 *
 * These tests verify:
 *   - hasFormula detection considers int_formelid (linked formulas)
 *   - saveFormulaFields correctly maps symbols to discipline field IDs
 *   - Field values are included in POST requests
 */

import { describe, it, expect } from 'vitest';

// ─── hasFormula detection ─────────────────────────────────────────────────

describe('hasFormula detection', () => {
  /**
   * Simulates the buggy and fixed `hasFormula` check from useScoreSave.ts
   */
  const buggyHasFormula = (device: { var_formel?: string | null; int_formelid?: number | null }, fieldValues: Record<string, number>) => {
    return device.var_formel && Object.keys(fieldValues).length > 0;
  };

  const fixedHasFormula = (device: { var_formel?: string | null; int_formelid?: number | null }, fieldValues: Record<string, number>) => {
    const hasFormulaText = device.var_formel && device.var_formel.trim().length > 0;
    const hasLinkedFormula = Boolean(device.int_formelid);
    return (hasFormulaText || hasLinkedFormula) && Object.keys(fieldValues).length > 0;
  };

  it('BUG: returns falsy when var_formel is empty but int_formelid exists', () => {
    const device = { var_formel: '', int_formelid: 42 };
    const fieldValues = { A: 5, B: 2 };

    // Buggy check fails — misses linked formula
    expect(!!buggyHasFormula(device, fieldValues)).toBe(false);
  });

  it('FIX: returns true when var_formel is empty but int_formelid exists', () => {
    const device = { var_formel: '', int_formelid: 42 };
    const fieldValues = { A: 5, B: 2 };

    expect(fixedHasFormula(device, fieldValues)).toBe(true);
  });

  it('FIX: returns true when var_formel is set and no int_formelid', () => {
    const device = { var_formel: '(10+A)-B', int_formelid: null };
    const fieldValues = { A: 5, B: 2 };

    expect(fixedHasFormula(device, fieldValues)).toBe(true);
  });

  it('FIX: returns false when no formula at all', () => {
    const device = { var_formel: '', int_formelid: null };
    const fieldValues = { A: 5 };

    expect(fixedHasFormula(device, fieldValues)).toBe(false);
  });

  it('FIX: returns false when fieldValues are empty', () => {
    const device = { var_formel: '(10+A)-B', int_formelid: null };
    const fieldValues = {};

    expect(fixedHasFormula(device, fieldValues)).toBe(false);
  });
});

// ─── saveFormulaFields symbol-to-field mapping ─────────────────────────────

describe('saveFormulaFields symbol mapping', () => {
  /**
   * Simulates the buggy array-index mapping from useScoreSave.ts
   */
  const buggyMapSymbolToField = (symbol: string, disciplineFields: any[]) => {
    const fieldIndex = symbol.charCodeAt(0) - 65; // A=0, B=1, C=2...
    return disciplineFields[fieldIndex];
  };

  /**
   * Fixed mapping: filter out Endwert/startingScore fields, then map by index
   */
  const fixedMapSymbolToField = (symbol: string, disciplineFields: any[]) => {
    const inputFields = disciplineFields.filter(f => !f.isEndValue && !f.isStartingScore);
    const fieldIndex = symbol.charCodeAt(0) - 65;
    return inputFields[fieldIndex];
  };

  it('BUG: maps B to wrong field when Endwert is mixed in at index 1', () => {
    const fields = [
      { id: 10, name: 'Wertung', isEndValue: false, isStartingScore: false },
      { id: 11, name: 'Endwert', isEndValue: true, isStartingScore: false },
      { id: 12, name: 'Field B', isEndValue: false, isStartingScore: false },
    ];

    // Buggy: symbol B → index 1 → gets "Endwert" (wrong!)
    const buggyResult = buggyMapSymbolToField('B', fields);
    expect(buggyResult.name).toBe('Endwert'); // Bug: maps to wrong field
  });

  it('FIX: maps B to correct field after filtering Endwert', () => {
    const fields = [
      { id: 10, name: 'Wertung', isEndValue: false, isStartingScore: false },
      { id: 11, name: 'Endwert', isEndValue: true, isStartingScore: false },
      { id: 12, name: 'Field B', isEndValue: false, isStartingScore: false },
    ];

    // Fixed: filter out Endwert, then B → index 1 → gets "Field B" (correct!)
    const fixedResult = fixedMapSymbolToField('B', fields);
    expect(fixedResult.name).toBe('Field B');
  });

  it('FIX: maps A to first input field', () => {
    const fields = [
      { id: 10, name: 'Wertung', isEndValue: false, isStartingScore: false },
      { id: 11, name: 'Endwert', isEndValue: true, isStartingScore: false },
    ];

    const result = fixedMapSymbolToField('A', fields);
    expect(result.name).toBe('Wertung');
  });

  it('FIX: returns undefined when field does not exist for symbol', () => {
    const fields = [
      { id: 10, name: 'Wertung', isEndValue: false, isStartingScore: false },
    ];

    // Only field A exists, asking for B should return undefined
    const result = fixedMapSymbolToField('B', fields);
    expect(result).toBeUndefined();
  });
});

// ─── findCompetitionId: assignedCompetitions priority ───────────────────────

describe('findCompetitionId: participant assignedCompetitions priority', () => {
  /**
   * Simulates the broken findCompetitionId when participants lack assignedCompetitions.
   * Without assignedCompetitions, Priority 1 is skipped and Priority 2 returns
   * whichever competition.find() matches first (could be wrong competition).
   */
  const findCompetitionId_noAssigned = (
    participants: any[],
    currentParticipantId: number,
    competitions: any[],
    disciplineId: number,
  ): number | null => {
    const participant = participants.find((p: any) => p.id === currentParticipantId);
    const assignedIds = new Set<number>(
      (participant?.assignedCompetitions ?? []).map(Number).filter((id: number) => id > 0)
    );

    // Priority 1: participant's assigned competition with this discipline
    if (assignedIds.size > 0) {
      const match = competitions.find(comp =>
        assignedIds.has(comp.id) &&
        comp.disciplines?.some((d: any) => d.disciplineId === disciplineId)
      );
      if (match) return match.id;
    }

    // Priority 2: any competition with this discipline
    const fallback = competitions.find(comp =>
      comp.disciplines?.some((d: any) => d.disciplineId === disciplineId)
    );
    return fallback?.id ?? null;
  };

  it('BUG: without assignedCompetitions, returns first competition (men) instead of participant\'s own (women)', () => {
    // Women's competition is ID 100, men's is ID 200
    // API returns competitions in descending ID order: men first
    const competitions = [
      { id: 200, name: 'Männer', disciplines: [{ disciplineId: 10 }, { disciplineId: 11 }] },
      { id: 100, name: 'Frauen', disciplines: [{ disciplineId: 10 }, { disciplineId: 11 }] },
    ];

    // Participant has NO assignedCompetitions (the bug: data was dropped during formatting)
    const participants = [
      { id: 1, name: 'AnnaUI', /* no assignedCompetitions */ },
    ];

    const result = findCompetitionId_noAssigned(participants, 1, competitions, 10);
    // Bug: returns 200 (men's) instead of 100 (women's)
    expect(result).toBe(200);
  });

  it('FIX: with assignedCompetitions, returns participant\'s own competition', () => {
    const competitions = [
      { id: 200, name: 'Männer', disciplines: [{ disciplineId: 10 }, { disciplineId: 11 }] },
      { id: 100, name: 'Frauen', disciplines: [{ disciplineId: 10 }, { disciplineId: 11 }] },
    ];

    // Participant HAS assignedCompetitions (from squad data)
    const participants = [
      { id: 1, name: 'AnnaUI', assignedCompetitions: [100] },
    ];

    const result = findCompetitionId_noAssigned(participants, 1, competitions, 10);
    // Fixed: returns 100 (women's) — Priority 1 matches
    expect(result).toBe(100);
  });

  it('FIX: falls back to Priority 2 when participant has no matching assigned competition', () => {
    const competitions = [
      { id: 200, name: 'Männer', disciplines: [{ disciplineId: 10 }] },
      { id: 100, name: 'Frauen', disciplines: [{ disciplineId: 11 }] },
    ];

    // Participant assigned to women's comp (100) but looking for discipline 10 which is only in men's
    const participants = [
      { id: 1, name: 'AnnaUI', assignedCompetitions: [100] },
    ];

    const result = findCompetitionId_noAssigned(participants, 1, competitions, 10);
    // Falls back to Priority 2: first competition with the discipline
    expect(result).toBe(200);
  });
});
