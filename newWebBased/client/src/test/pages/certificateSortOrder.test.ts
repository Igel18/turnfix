/**
 * Certificate Sort Order Tests
 *
 * Feature: When exporting a certificate PDF from the Results page, the user
 * can choose the order in which participants appear in the PDF:
 *
 *   - 'desc' (default)  →  last place first, 1st place last  (printed on top)
 *   - 'asc'             →  1st place first, last place last
 *
 * The sort happens in Results/index.tsx – handleGenerateCertificates() –
 * before the participants array is passed to generateCertificates().
 * These tests verify that sort function in isolation so they stay fast and
 * require no browser / React renderer.
 *
 * Keep in sync with:
 *   client/src/pages/Results/index.tsx  — handleGenerateCertificates
 */

import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────────────────────────────────────────────
// Minimal Participant shape (only the fields the sort touches)
// ──────────────────────────────────────────────────────────────────────────────

interface Participant {
  id: number
  name: string
  rank: number
}

function makePart(rank: number, name = `Athlete ${rank}`): Participant {
  return { id: rank, name, rank }
}

// ──────────────────────────────────────────────────────────────────────────────
// Exact replica of the sort logic in handleGenerateCertificates()
// Keep this in sync with Results/index.tsx
// ──────────────────────────────────────────────────────────────────────────────

function sortParticipantsForCertificates(
  participants: Participant[],
  sortOrder: 'asc' | 'desc'
): Participant[] {
  return [...participants].sort((a, b) => {
    const rankA = a.rank ?? 0
    const rankB = b.rank ?? 0
    return sortOrder === 'desc' ? rankB - rankA : rankA - rankB
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('Certificate sort order', () => {
  /** Participants in an arbitrary (unsorted) order to start from. */
  const unsorted: Participant[] = [
    makePart(1),
    makePart(4),
    makePart(2),
    makePart(3),
  ]

  // ── Default order (desc) ───────────────────────────────────────────────────

  describe("desc order (default: last place first, 1st place last)", () => {
    it('places the participant with the highest rank number first', () => {
      const result = sortParticipantsForCertificates(unsorted, 'desc')
      expect(result[0].rank).toBe(4)
    })

    it('places the participant with rank 1 last', () => {
      const result = sortParticipantsForCertificates(unsorted, 'desc')
      expect(result[result.length - 1].rank).toBe(1)
    })

    it('produces fully descending rank order', () => {
      const result = sortParticipantsForCertificates(unsorted, 'desc')
      const ranks = result.map((p) => p.rank)
      expect(ranks).toEqual([4, 3, 2, 1])
    })

    it('does not mutate the original array', () => {
      const original = [...unsorted]
      sortParticipantsForCertificates(unsorted, 'desc')
      expect(unsorted.map((p) => p.rank)).toEqual(original.map((p) => p.rank))
    })
  })

  // ── Ascending order (asc) ──────────────────────────────────────────────────

  describe("asc order (1st place first, last place last)", () => {
    it('places the participant with rank 1 first', () => {
      const result = sortParticipantsForCertificates(unsorted, 'asc')
      expect(result[0].rank).toBe(1)
    })

    it('places the participant with the highest rank number last', () => {
      const result = sortParticipantsForCertificates(unsorted, 'asc')
      expect(result[result.length - 1].rank).toBe(4)
    })

    it('produces fully ascending rank order', () => {
      const result = sortParticipantsForCertificates(unsorted, 'asc')
      const ranks = result.map((p) => p.rank)
      expect(ranks).toEqual([1, 2, 3, 4])
    })

    it('does not mutate the original array', () => {
      const original = [...unsorted]
      sortParticipantsForCertificates(unsorted, 'asc')
      expect(unsorted.map((p) => p.rank)).toEqual(original.map((p) => p.rank))
    })
  })

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array unchanged for both orders', () => {
      expect(sortParticipantsForCertificates([], 'desc')).toEqual([])
      expect(sortParticipantsForCertificates([], 'asc')).toEqual([])
    })

    it('single participant stays in place for both orders', () => {
      const single = [makePart(1)]
      expect(sortParticipantsForCertificates(single, 'desc')[0].rank).toBe(1)
      expect(sortParticipantsForCertificates(single, 'asc')[0].rank).toBe(1)
    })

    it('handles participants with undefined rank (treated as 0)', () => {
      const withMissing = [
        { id: 1, name: 'A', rank: undefined as unknown as number },
        makePart(2),
        makePart(1),
      ]
      // rank undefined → treated as 0 → sorts before rank 1 in ascending order
      const asc = sortParticipantsForCertificates(withMissing, 'asc')
      expect(asc[0].rank).toBeUndefined()   // 0 (undefined) → first in asc
      expect(asc[1].rank).toBe(1)
      expect(asc[2].rank).toBe(2)

      // In descending order rank 2 first, then 1, then undefined (0) last
      const desc = sortParticipantsForCertificates(withMissing, 'desc')
      expect(desc[0].rank).toBe(2)
      expect(desc[1].rank).toBe(1)
      expect(desc[2].rank).toBeUndefined()
    })

    it('already-sorted desc input stays in order', () => {
      const alreadyDesc = [makePart(5), makePart(4), makePart(3), makePart(2), makePart(1)]
      const result = sortParticipantsForCertificates(alreadyDesc, 'desc')
      expect(result.map((p) => p.rank)).toEqual([5, 4, 3, 2, 1])
    })

    it('already-sorted asc input stays in order', () => {
      const alreadyAsc = [makePart(1), makePart(2), makePart(3), makePart(4), makePart(5)]
      const result = sortParticipantsForCertificates(alreadyAsc, 'asc')
      expect(result.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5])
    })

    it('handles large competition with 20 participants (desc)', () => {
      const large = Array.from({ length: 20 }, (_, i) => makePart(i + 1))
      const result = sortParticipantsForCertificates(large, 'desc')
      for (let i = 0; i < 20; i++) {
        expect(result[i].rank).toBe(20 - i)
      }
    })

    it('handles large competition with 20 participants (asc)', () => {
      const large = Array.from({ length: 20 }, (_, i) => makePart(20 - i)) // reverse order
      const result = sortParticipantsForCertificates(large, 'asc')
      for (let i = 0; i < 20; i++) {
        expect(result[i].rank).toBe(i + 1)
      }
    })
  })

  // ── Default state ──────────────────────────────────────────────────────────

  describe('default state', () => {
    it("default sort order is 'desc' (last place first, winner at end of PDF)", () => {
      // This test documents the UX decision: default is desc so when printing
      // the 1st-place certificate is the last page printed and therefore ends
      // up on top of the stack after the printer delivers the sheets.
      const defaultOrder: 'asc' | 'desc' = 'desc'
      const result = sortParticipantsForCertificates(unsorted, defaultOrder)
      expect(result[result.length - 1].rank).toBe(1)
    })
  })
})
