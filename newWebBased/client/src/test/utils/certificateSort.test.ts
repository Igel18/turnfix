import { describe, it, expect } from 'vitest'
import { sortParticipantsForCertificates } from '@/pages/Results/utils/certificateSort'

const p = (id: number, competitionId: number, rank: number) => ({ id, competitionId, rank }) as any

const competitions = [
  { id: 10, name: 'WK B', number: '2' },
  { id: 20, name: 'WK A', number: '1' },
  { id: 30, name: 'WK C', number: '10' }
] as any[]

const people = [
  p(1, 10, 1), p(2, 20, 2), p(3, 30, 1), p(4, 20, 1), p(5, 10, 3), p(6, 10, 2)
]

const ids = (list: any[]) => list.map(x => x.id)

describe('sortParticipantsForCertificates', () => {
  it('sorts by competition first, then by rank ascending (1st place first)', () => {
    expect(ids(sortParticipantsForCertificates(people, competitions, 'asc'))).toEqual([4, 2, 1, 6, 5, 3])
  })

  it('sorts by competition first, then by rank descending (last place first)', () => {
    expect(ids(sortParticipantsForCertificates(people, competitions, 'desc'))).toEqual([2, 4, 5, 6, 1, 3])
  })

  it('orders competitions numerically by number (10 after 2)', () => {
    const result = sortParticipantsForCertificates(people, competitions, 'asc')
    expect(result.map(x => x.competitionId)).toEqual([20, 20, 10, 10, 10, 30])
  })

  it('keeps unknown competitions last and does not mutate the input', () => {
    const input = [p(1, 99, 1), p(2, 20, 1)]
    const copy = [...input]
    expect(ids(sortParticipantsForCertificates(input, competitions, 'asc'))).toEqual([2, 1])
    expect(input).toEqual(copy)
  })

  it('works for a single competition (rank only)', () => {
    const single = [p(1, 20, 3), p(2, 20, 1), p(3, 20, 2)]
    expect(ids(sortParticipantsForCertificates(single, competitions, 'asc'))).toEqual([2, 3, 1])
    expect(ids(sortParticipantsForCertificates(single, competitions, 'desc'))).toEqual([1, 3, 2])
  })
})
