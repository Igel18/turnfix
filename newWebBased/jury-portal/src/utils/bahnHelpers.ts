import type { BahnDetail, BahnOption, Durchgang, Participant, Squad } from '../components/JuryPortal/JuryPortal.types';
import { getParticipantCompetitionIds } from './participantCompetitions';

/** Keeps the participants competing on the Bahn; participants without competition data stay. */
export function filterParticipantsForBahn<T extends Participant>(
  participants: T[],
  bahn: Pick<BahnOption, 'competitionIds'> | null
): T[] {
  if (!bahn) return participants;
  const competitionIds = new Set(bahn.competitionIds);
  return participants.filter(participant => {
    const ids = getParticipantCompetitionIds(participant);
    return ids === null || ids.some(id => competitionIds.has(id));
  });
}

interface BahnSelectionContext {
  durchgang: Durchgang | null;
  squad: Squad;
  disciplineId: number | null;
}

/** Bahnen on which the squad competes in the chosen discipline (and Durchgang, if chosen). */
export function buildBahnOptions(bahnen: BahnDetail[], { durchgang, squad, disciplineId }: BahnSelectionContext): BahnOption[] {
  return bahnen
    .filter(detail => (durchgang === null || detail.durchgang === durchgang.durchgang)
      && detail.squads.some(s => s.name === squad.name))
    .map(detail => {
      const competitions = detail.competitions.filter(
        c => disciplineId === null || c.disciplineIds.includes(disciplineId)
      );
      const option: BahnOption = {
        bahn: detail.bahn,
        durchgang: detail.durchgang,
        competitions: competitions.map(({ id, name, number }) => ({ id, name, number })),
        competitionIds: competitions.map(c => c.id),
        participantCount: 0,
      };
      option.participantCount = filterParticipantsForBahn(squad.participants, option).length;
      return option;
    })
    .filter(option => option.competitionIds.length > 0)
    .sort((a, b) => a.bahn - b.bahn || a.durchgang - b.durchgang);
}

export function needsBahnSelection(options: BahnOption[]): boolean {
  return options.length > 1;
}
