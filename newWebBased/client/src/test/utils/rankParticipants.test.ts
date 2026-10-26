import { describe, it, expect } from 'vitest'
import { rankParticipants } from '@/pages/Results/utils/rankParticipants'
import type { Participant } from '@/pages/Results/Results.types'

const participant = (id: number, scores: Record<string, number>): Participant => ({
  id, name: `P${id}`, club: 'TV', startNumber: id, age: 10, gender: 'weiblich', scores, totalScore: 0, rank: 0,
})

const scoresOf = (p: Participant) => Object.values(p.scores)

describe('rankParticipants', () => {
  it('sets total and rank and orders by placement', () => {
    const ranked = rankParticipants(
      [participant(1, { a: 5, b: 5 }), participant(2, { a: 9, b: 9 })],
      scoresOf,
      {},
    )
    expect(ranked.map(p => [p.id, p.totalScore, p.rank])).toEqual([[2, 18, 1], [1, 10, 2]])
  })

  it('gives equal totals the same rank despite floating-point summation order', () => {
    const ranked = rankParticipants(
      [
        participant(1, { a: 13.35, b: 14.15, c: 12.1, d: 12.6 }),
        participant(2, { a: 14.3, b: 10.5, c: 14, d: 13.4 }),
      ],
      scoresOf,
      {},
    )
    expect(ranked.map(p => p.rank)).toEqual([1, 1])
  })

  it('keeps participants without scores at the end with total 0', () => {
    const ranked = rankParticipants([participant(1, {}), participant(2, { a: 4 })], scoresOf, {})
    expect(ranked.map(p => [p.id, p.totalScore, p.rank])).toEqual([[2, 4, 1], [1, 0, 2]])
  })

  it('applies the sort direction and the Streichwertung', () => {
    const ascending = rankParticipants([participant(1, { a: 12 }), participant(2, { a: 9 })], scoresOf, { sortAscending: true })
    expect(ascending.map(p => p.id)).toEqual([2, 1])

    const dropping = rankParticipants(
      [participant(1, { a: 10, b: 10, c: 1 }), participant(2, { a: 9, b: 9, c: 9 })],
      scoresOf,
      { dropWorstScore: true, dropCount: 1 },
    )
    expect(dropping.map(p => [p.id, p.totalScore])).toEqual([[1, 20], [2, 18]])
  })

  it('does not mutate the input', () => {
    const input = [participant(1, { a: 1 })]
    rankParticipants(input, scoresOf, {})
    expect(input[0].rank).toBe(0)
  })
})
