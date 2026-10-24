import type { Participant } from '../Results.types'

interface CompetitionRef {
  id: number
  name?: string
  number?: string | number | null
}

const UNKNOWN_COMPETITION_ORDER = Number.MAX_SAFE_INTEGER

/** Competition first (by number, like the results view), then rank in the requested direction. */
export const sortParticipantsForCertificates = (
  participants: Participant[],
  competitions: CompetitionRef[],
  rankOrder: 'asc' | 'desc'
): Participant[] => {
  const competitionIndex = new Map<number, number>()
  ;[...competitions]
    .sort((a, b) => {
      const byNumber = String(a.number ?? '').localeCompare(String(b.number ?? ''), undefined, { numeric: true })
      return byNumber !== 0 ? byNumber : (a.name ?? '').localeCompare(b.name ?? '')
    })
    .forEach((competition, index) => competitionIndex.set(competition.id, index))

  const orderOf = (participant: Participant) =>
    competitionIndex.get(participant.competitionId ?? -1) ?? UNKNOWN_COMPETITION_ORDER

  return [...participants].sort((a, b) => {
    const byCompetition = orderOf(a) - orderOf(b)
    if (byCompetition !== 0) return byCompetition
    const rankA = a.rank ?? 0
    const rankB = b.rank ?? 0
    return rankOrder === 'desc' ? rankB - rankA : rankA - rankB
  })
}
