/**
 * TDD Tests — Variable-type formula field loading with disciplineId
 * 
 * BUG: When a linked formula resolves to a variable-type formula like "1*x"
 * AND a disciplineId is available, useFormulaFields skips loading DB fields
 * because `hasLowercaseVariables === true` causes early return in the first 
 * useEffect. Instead, the second useEffect creates synthetic fields with 
 * sequential IDs (1, 2, ...).
 * 
 * When ScoreInputCell's onFieldChange fires with fieldId=1, it tries to find
 * the field in disciplineFields (real DB fields with IDs like 15, 315, 16).
 * No match → save silently skipped → value lost.
 * 
 * FIX: When disciplineId is available, variable-type formulas should ALSO 
 * load DB fields from the API, using real field IDs. The variable names (x, y)
 * are just display labels, not structural.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFormulaFields } from '@/hooks/useFormulaFields';

describe('useFormulaFields - variable formula with disciplineId', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch to return real discipline fields from API
    fetchSpy = vi.fn(async (url: string) => {
      if (url.includes('/api/discipline-fields?disciplineId=')) {
        return {
          ok: true,
          json: async () => ([
            { id: 15, name: 'Wertung', disciplineId: 8, enabled: true, sortOrder: 1, isFinalScore: false, isStartingScore: false },
            { id: 16, name: 'Endwert', disciplineId: 8, enabled: true, sortOrder: 2, isFinalScore: true, isStartingScore: false },
          ]),
        } as Response;
      }
      if (url.includes('/api/formulas/')) {
        return {
          ok: true,
          json: async () => ({ int_formelid: 5, var_formel: '1*x' }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('BUG: variable formula "1*x" with disciplineId must load DB fields (not synthetic IDs)', async () => {
    const { result } = renderHook(() =>
      useFormulaFields({
        formula: '1*x',
        disciplineId: 8,
      })
    );

    // Wait for fields to be loaded
    await waitFor(() => {
      expect(result.current.fields.length).toBeGreaterThan(0);
    });

    const nonFinalFields = result.current.fields.filter(f => !f.isFinalScore);
    
    // Fields must use REAL DB IDs (like 15), not synthetic IDs (like 1)
    // With the bug, the first non-final field has id=1 (synthetic)
    // After fix, it should have id=15 (from DB)
    expect(nonFinalFields.length).toBeGreaterThanOrEqual(1);
    expect(nonFinalFields[0].id).toBe(15); // Real DB ID, not synthetic 1
  });

  it('BUG: variable formula "1*x" must call discipline-fields API when disciplineId provided', async () => {
    renderHook(() =>
      useFormulaFields({
        formula: '1*x',
        disciplineId: 8,
      })
    );

    await waitFor(() => {
      const fieldsCalls = fetchSpy.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('/api/discipline-fields')
      );
      expect(fieldsCalls.length).toBeGreaterThan(0);
    });
  });

  it('variable formula without disciplineId should still use synthetic fields', async () => {
    const { result } = renderHook(() =>
      useFormulaFields({
        formula: '1*x',
        // No disciplineId!
      })
    );

    await waitFor(() => {
      expect(result.current.fields.length).toBeGreaterThan(0);
    });

    const nonFinalFields = result.current.fields.filter(f => !f.isFinalScore);
    
    // Without disciplineId, synthetic fields are OK (can't load from DB)
    expect(nonFinalFields.length).toBeGreaterThanOrEqual(1);
    // Synthetic IDs are sequential starting from 1
    expect(nonFinalFields[0].id).toBe(1);
  });
});
