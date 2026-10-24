/**
 * TDD: Formula symbol without a DB field (e.g. "A + B - C" with only 2 DB fields).
 * The missing field must NOT be auto-created in the DB; it is exposed as a
 * placeholder flagged `isMissingInDb` so the UI can disable it, and it must not
 * block the calculation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFormulaFields } from '@/hooks/useFormulaFields';

describe('useFormulaFields - formula symbol without DB field', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async (url: string) => {
      if (url.includes('/api/discipline-fields?disciplineId=')) {
        return {
          ok: true,
          json: async () => ([
            { id: 11, name: 'D/A-Note', disciplineId: 3, enabled: true, sortOrder: 1, isFinalScore: false, isStartingScore: false },
            { id: 12, name: 'E/B-Note', disciplineId: 3, enabled: true, sortOrder: 2, isFinalScore: false, isStartingScore: false },
            { id: 15, name: 'Endwert', disciplineId: 3, enabled: true, sortOrder: 5, isFinalScore: true, isStartingScore: false },
          ]),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not create missing fields in the database', async () => {
    const { result } = renderHook(() => useFormulaFields({ formula: 'A + B - C', disciplineId: 3 }));

    await waitFor(() => expect(result.current.fields.length).toBeGreaterThan(0));

    const posts = fetchSpy.mock.calls.filter((c: any[]) => c[1]?.method === 'POST');
    expect(posts).toHaveLength(0);
  });

  it('exposes the missing formula field as a flagged placeholder before the final score', async () => {
    const { result } = renderHook(() => useFormulaFields({ formula: 'A + B - C', disciplineId: 3 }));

    await waitFor(() => expect(result.current.fields.length).toBe(4));

    const fields = result.current.fields;
    expect(fields.map(f => f.isMissingInDb ?? false)).toEqual([false, false, true, false]);
    expect(fields[2].name).toBe('Field C');
    expect(fields[3].isFinalScore).toBe(true);
  });

  it('calculates using 0 for the missing field once the real fields are filled', async () => {
    const onCalculationComplete = vi.fn();
    const { result } = renderHook(() =>
      useFormulaFields({ formula: 'A + B - C', disciplineId: 3, onCalculationComplete })
    );

    await waitFor(() => expect(result.current.fields.length).toBe(4));

    act(() => result.current.updateFieldValue(11, '5'));
    act(() => result.current.updateFieldValue(12, '8'));

    await waitFor(() => expect(result.current.calculatedResult).toBe(13));
  });
});
