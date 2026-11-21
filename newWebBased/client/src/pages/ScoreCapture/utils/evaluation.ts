import { selectEvaluation } from '@turnfix/shared';
import type { Competition, Participant } from '@/types/ScoreCapture.types';

export function evaluationForDiscipline(
  participant: Participant | undefined,
  squadName: string | undefined,
  disciplineId: number | string,
  competitions: Competition[],
  competitionId?: string
) {
  if (!participant?.evaluations) return undefined;
  const competitionIds = competitionId
    ? [Number(competitionId)]
    : competitions.filter(competition => competition.disciplines?.some(discipline =>
        discipline.int_disziplinid === disciplineId || discipline.disciplineId === disciplineId
      )).map(competition => competition.id);
  return selectEvaluation(
    participant.evaluations.filter(evaluation => !evaluation.startetNicht),
    { squadName, competitionIds }
  );
}

export function participantInSquad(participant: Participant, squadName: string): boolean {
  return participant.evaluations
    ? participant.evaluations.some(evaluation => evaluation.squadName === squadName && !evaluation.startetNicht)
    : participant.squad_name === squadName;
}
