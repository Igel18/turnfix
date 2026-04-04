/**
 * Unit Tests — ScoreSynchronizer
 *
 * Tests for item #89 fix:
 * The old TurnFix reads tfx_wertungen_details.rel_leistung for results.
 * ScoreSynchronizer must INSERT a row when none exists (plain UPDATE silently fails).
 *
 * Verified behaviour:
 * 1. ensureWertungsDetailsEntry inserts a NULL placeholder when no row exists
 * 2. ensureWertungsDetailsEntry is a no-op when a row already exists
 * 3. ensureWertungsDetailsEntry passes the correct wertungenId / disciplineId
 * 4. updateWertungsDetailsScore inserts a row with the score when no row exists
 * 5. updateWertungsDetailsScore updates the existing row when one row exists
 * 6. updateWertungsDetailsScore removes duplicate rows
 * 7. score 0 is stored correctly (not skipped as falsy)
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Prisma mock (must come before the module under test is imported) ─────

const mockQueryRawUnsafe = jest.fn<() => Promise<any[]>>();
const mockExecuteRawUnsafe = jest.fn<() => Promise<any>>();

jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
      return fn({
        $executeRawUnsafe: mockExecuteRawUnsafe,
        $queryRawUnsafe: mockQueryRawUnsafe,
      });
    }),
  },
}));

import { ScoreSynchronizer } from '../../src/utils/scoreSynchronizer';

// ═══════════════════════════════════════════════════════════════════════════

describe('ScoreSynchronizer', () => {

  beforeEach(() => {
    mockQueryRawUnsafe.mockReset();
    mockExecuteRawUnsafe.mockReset();
    // Advisory lock always succeeds silently
    mockExecuteRawUnsafe.mockResolvedValue(undefined);
  });

  // Helper – find a call by SQL fragment
  function findCall(fragment: string): any[] | undefined {
    const calls = mockQueryRawUnsafe.mock.calls as any[][];
    return calls.find(
      (args) => typeof args[0] === 'string' && (args[0] as string).includes(fragment)
    );
  }

  // ─── ensureWertungsDetailsEntry ─────────────────────────────────────

  describe('ensureWertungsDetailsEntry', () => {

    it('creates a NULL placeholder when no row exists', async () => {
      mockQueryRawUnsafe
        .mockResolvedValueOnce([])  // SELECT int_wertungen_detailsid → empty
        .mockResolvedValue([]);     // fallback

      await ScoreSynchronizer.ensureWertungsDetailsEntry(10, 74, 1, 0);

      const insertCall = findCall('INSERT INTO tfx_wertungen_details');
      expect(insertCall).toBeDefined();
      // 5th argument (index 4) = rel_leistung = null
      expect(insertCall![4]).toBeNull();
    });

    it('does not insert when a row already exists', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([{ int_wertungen_detailsid: 99 }]);

      await ScoreSynchronizer.ensureWertungsDetailsEntry(10, 74, 1, 0);

      const insertCall = findCall('INSERT INTO tfx_wertungen_details');
      expect(insertCall).toBeUndefined();
    });

    it('passes the correct wertungenId and disciplineId to the SELECT', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([]); // SELECT → empty

      await ScoreSynchronizer.ensureWertungsDetailsEntry(42, 88, 1, 0);

      const selectCall = findCall('SELECT int_wertungen_detailsid');
      expect(selectCall).toBeDefined();
      expect(selectCall![1]).toBe(42); // wertungenId
      expect(selectCall![2]).toBe(88); // disciplineId
    });
  });

  // ─── updateWertungsDetailsScore ─────────────────────────────────────

  describe('updateWertungsDetailsScore', () => {

    it('inserts a new row with the score when no row exists', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([]); // SELECT → empty

      await ScoreSynchronizer.updateWertungsDetailsScore(10, 74, 12.5, 1, 0);

      const insertCall = findCall('INSERT INTO tfx_wertungen_details');
      expect(insertCall).toBeDefined();
      // 5th argument (index 4) = rel_leistung = 12.5
      expect(insertCall![4]).toBe(12.5);
    });

    it('updates the existing row when one row exists (no insert)', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([{ int_wertungen_detailsid: 55 }]);

      await ScoreSynchronizer.updateWertungsDetailsScore(10, 74, 9.75, 1, 0);

      const updateCall = findCall('UPDATE tfx_wertungen_details');
      expect(updateCall).toBeDefined();
      expect(updateCall![1]).toBe(9.75); // new score
      expect(updateCall![2]).toBe(55);   // WHERE id = ?

      const insertCall = findCall('INSERT INTO tfx_wertungen_details');
      expect(insertCall).toBeUndefined();
    });

    it('cleans up duplicate rows and keeps the first', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([
        { int_wertungen_detailsid: 55 },
        { int_wertungen_detailsid: 56 },
      ]);

      await ScoreSynchronizer.updateWertungsDetailsScore(10, 74, 8.0, 1, 0);

      const updateCall = findCall('UPDATE tfx_wertungen_details');
      expect(updateCall![2]).toBe(55); // first row kept

      const deleteCall = findCall('DELETE FROM tfx_wertungen_details');
      expect(deleteCall).toBeDefined(); // duplicate removed
    });

    it('stores score 0 without skipping it as falsy', async () => {
      mockQueryRawUnsafe.mockResolvedValueOnce([]); // SELECT → empty

      await ScoreSynchronizer.updateWertungsDetailsScore(10, 74, 0, 1, 0);

      const insertCall = findCall('INSERT INTO tfx_wertungen_details');
      expect(insertCall).toBeDefined();
      expect(insertCall![4]).toBe(0);
    });
  });
});
