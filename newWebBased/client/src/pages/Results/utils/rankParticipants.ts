import { rankCompetition, type CompetitionRankingOptions } from '@turnfix/shared'
import type { Participant } from '../Results.types'

/** Sets totalScore and rank through the shared ranking; returns the participants in placement order. */
export function rankParticipants(
  participants: Participant[],
  scoresOf: (participant: Participant) => number[],
  options: CompetitionRankingOptions
): Participant[] {
  const results = rankCompetition(
    participants.map((participant, index) => {
      const scores = scoresOf(participant)
      // No score at all still counts as 0 so the participant is ranked last
      return { key: index, scores: scores.length > 0 ? scores : [0] }
    }),
    options
  )

  return participants
    .map((participant, index) => ({
      ...participant,
      totalScore: results.get(index)?.totalScore ?? 0,
      rank: results.get(index)?.rank ?? 0,
    }))
    .sort((a, b) => a.rank - b.rank)
}
