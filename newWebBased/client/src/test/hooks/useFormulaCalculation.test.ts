/**
 * Tests for useFormulaCalculation Hook
 * Covers: parseFormulaDisplay, evaluateFormula
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormulaCalculation } from '@/pages/ScoreCapture/hooks/useFormulaCalculation';
import type { DisciplineField } from '@/types/ScoreCapture.types';

// Mock formulaUtils
vi.mock('@/utils/formulaUtils', () => ({
  FORMULA_VARIABLES: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  calculateFormula: vi.fn((formula: string, symbolValues: Record<string, number>) => {
    // Simple mock implementation: evaluate basic formulas
    try {
      let expr = formula;
      for (const [key, val] of Object.entries(symbolValues)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), val.toString());
      }
      // Safe eval for test formulas like "(10 + 6) - 3.5"
      const result = Function(`"use strict"; return (${expr})`)();
      return typeof result === 'number' && !isNaN(result) ? result : null;
    } catch {
      return null;
    }
  }),
}));

const makeField = (overrides: Partial<DisciplineField> = {}): DisciplineField => ({
  id: 1,
  disciplineId: 100,
  disciplineName: 'Boden',
  disciplineShort: 'Bo',
  name: 'Stufe',
  sortOrder: 1,
  isFinalScore: false,
  isStartingScore: false,
  group: 0,
  enabled: true,
  ...overrides,
});

describe('useFormulaCalculation', () => {
  // ─── parseFormulaDisplay ───────────────────────────────────

  describe('parseFormulaDisplay', () => {
    it('returns null when formula is empty', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const display = result.current.parseFormulaDisplay('', [], 'Endnote');
      expect(display).toBeNull();
    });

    it('returns null when fields array is empty', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const display = result.current.parseFormulaDisplay('(10 + A) - B', [], 'Endnote');
      expect(display).toBeNull();
    });

    it('replaces A and B with field names in display', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ name: 'Stufe', sortOrder: 1 }),
        makeField({ id: 2, name: 'AbzugAusf', sortOrder: 2 }),
      ];
      const display = result.current.parseFormulaDisplay('(10 + A) - B', fields, 'Endnote');
      expect(display).toBe('Endnote = (10 + Stufe) - AbzugAusf');
    });

    it('skips fields marked as isFinalScore', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ name: 'Endnote', sortOrder: 0, isFinalScore: true }),
        makeField({ id: 2, name: 'Stufe', sortOrder: 1 }),
        makeField({ id: 3, name: 'Abzug', sortOrder: 2 }),
      ];
      const display = result.current.parseFormulaDisplay('(10 + A) - B', fields, 'Endnote');
      // A should map to Stufe (first non-final sorted field), B to Abzug
      expect(display).toBe('Endnote = (10 + Stufe) - Abzug');
    });

    it('sorts fields by sortOrder before mapping', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ id: 3, name: 'Third', sortOrder: 3 }),
        makeField({ id: 1, name: 'First', sortOrder: 1 }),
        makeField({ id: 2, name: 'Second', sortOrder: 2 }),
      ];
      const display = result.current.parseFormulaDisplay('A + B + C', fields, 'Total');
      expect(display).toBe('Total = First + Second + Third');
    });

    it('handles single-variable formula', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ name: 'Score', sortOrder: 1 }),
      ];
      const display = result.current.parseFormulaDisplay('A', fields, 'Result');
      expect(display).toBe('Result = Score');
    });

    it('handles formula with constants only (no variables to replace)', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ name: 'Score', sortOrder: 1 }),
      ];
      const display = result.current.parseFormulaDisplay('10 + 5', fields, 'Const');
      expect(display).toBe('Const = 10 + 5');
    });
  });

  // ─── evaluateFormula ──────────────────────────────────────

  describe('evaluateFormula', () => {
    it('returns 0 when formula is empty', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      expect(result.current.evaluateFormula('', {})).toBe(0);
    });

    it('evaluates simple addition with field mapping', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ name: 'Stufe', sortOrder: 1 }),
        makeField({ id: 2, name: 'AbzugAusf', sortOrder: 2 }),
      ];
      const score = result.current.evaluateFormula(
        '(10 + A) - B',
        { 'Stufe': 6.0, 'AbzugAusf': 3.5 },
        fields
      );
      expect(score).toBe(12.5);
    });

    it('evaluates without explicit fields (falls back to key order)', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const score = result.current.evaluateFormula(
        'A + B',
        { 'field1': 5, 'field2': 3 }
      );
      expect(score).toBe(8);
    });

    it('returns 0 when calculateFormula returns null', async () => {
      const formulaUtils = await import('@/utils/formulaUtils');
      vi.mocked(formulaUtils.calculateFormula).mockReturnValueOnce(null);

      const { result } = renderHook(() => useFormulaCalculation());
      const score = result.current.evaluateFormula('INVALID', { 'x': 1 });
      expect(score).toBe(0);
    });

    it('correctly sorts fields by sortOrder when mapping', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ id: 3, name: 'C_field', sortOrder: 3 }),
        makeField({ id: 1, name: 'A_field', sortOrder: 1 }),
        makeField({ id: 2, name: 'B_field', sortOrder: 2 }),
      ];
      // A maps to A_field (sortOrder 1), B to B_field (sortOrder 2)
      const score = result.current.evaluateFormula(
        'A - B',
        { 'A_field': 10, 'B_field': 3, 'C_field': 99 },
        fields
      );
      expect(score).toBe(7);
    });

    it('ignores isFinalScore fields in mapping', () => {
      const { result } = renderHook(() => useFormulaCalculation());
      const fields: DisciplineField[] = [
        makeField({ name: 'Final', sortOrder: 0, isFinalScore: true }),
        makeField({ id: 2, name: 'Score', sortOrder: 1 }),
      ];
      // A should map to Score (skipping Final)
      const score = result.current.evaluateFormula(
        'A',
        { 'Final': 999, 'Score': 7.5 },
        fields
      );
      expect(score).toBe(7.5);
    });
  });
});
