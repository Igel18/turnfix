import type { Competition, SessionGroup, Squad } from './TimePlanning.types'
import { getSquadCompetitionIds } from './rotationUtils'

export function getSquadsForCompetition(group: SessionGroup, competitionId: number): Squad[] {
  return group.squads.filter((squad) => getSquadCompetitionIds(squad).includes(competitionId))
}

export function getCompetitionParticipantCount(group: SessionGroup, competitionId: number): number {
  return getSquadsForCompetition(group, competitionId).reduce(
    (sum, squad) => sum + squad.participantCount,
    0
  )
}

export function getSessionParticipantCount(group: SessionGroup): number {
  return group.squads.reduce((sum, squad) => sum + squad.participantCount, 0)
}

export function getSessionDeviceCount(group: SessionGroup): number {
  return group.competitions.reduce((sum, comp) => sum + comp.disciplineCount, 0)
}

export function getEstimatedSessionDurationMinutes(
  group: SessionGroup,
  exerciseDurationMinutes: number
): number {
  return group.competitions.reduce((sum, comp) => {
    const participantsInCompetition = getCompetitionParticipantCount(group, comp.id)
    return sum + comp.disciplineCount * participantsInCompetition * exerciseDurationMinutes
  }, 0)
}

export function getCompetitionSquadNames(group: SessionGroup, competition: Competition): string[] {
  return getSquadsForCompetition(group, competition.id).map((squad) => squad.name)
}
