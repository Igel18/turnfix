import type { Participant } from '../components/JuryPortal/JuryPortal.types';

/** Competition ids of a participant, or null when the data carries no competition information. */
export function getParticipantCompetitionIds(participant: Participant): number[] | null {
  const fromCompetitions = (participant as any).competitions;
  if (Array.isArray(fromCompetitions)) {
    return fromCompetitions.map((c: any) => Number(c?.id)).filter(id => !Number.isNaN(id));
  }
  if (Array.isArray(participant.assignedCompetitions)) {
    return participant.assignedCompetitions.map(Number);
  }
  return null;
}
