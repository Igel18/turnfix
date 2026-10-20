import { describe, expect, it } from 'vitest'
import { getSquadCompetitionIds, squadBelongsToRound, squadMatchesCompetition } from '../rotationUtils'

describe('rotationUtils', () => {
  it('collects all valid competition ids from single and multi mapping', () => {
    expect(getSquadCompetitionIds({ competitionId: 4 })).toEqual([4])
    expect(getSquadCompetitionIds({ competitionIds: [2, 3, 3, -1, 0] })).toEqual([2, 3])
    expect(getSquadCompetitionIds({ competitionId: 5, competitionIds: [5, 7] })).toEqual([5, 7])
  })

  it('matches a squad to a round when any linked competition is in that round', () => {
    const roundCompetitionIds = new Set([11, 12, 13])
    expect(squadBelongsToRound({ competitionIds: [9, 12] }, roundCompetitionIds)).toBe(true)
    expect(squadBelongsToRound({ competitionId: 8 }, roundCompetitionIds)).toBe(false)
  })

  it('matches squads to competitions across all linked competition ids', () => {
    const squad = { competitionId: 21, competitionIds: [21, 22, 23] }
    expect(squadMatchesCompetition(squad, 22)).toBe(true)
    expect(squadMatchesCompetition(squad, 99)).toBe(false)
  })
})
