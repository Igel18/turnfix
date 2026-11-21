export interface EvaluationReference {
  id: number;
  competitionId: number;
  squadName: string | null;
  teamId: number | null;
}

export function selectEvaluation(
  evaluations: EvaluationReference[],
  context: { squadName?: string; competitionIds?: number[] }
):
  | { kind: 'found'; evaluation: EvaluationReference }
  | { kind: 'missing' | 'ambiguous' } {
  const matches = evaluations.filter(evaluation =>
    (!context.squadName || evaluation.squadName === context.squadName) &&
    (!context.competitionIds || context.competitionIds.includes(evaluation.competitionId))
  );
  if (matches.length === 0) return { kind: 'missing' };
  if (matches.length > 1) return { kind: 'ambiguous' };
  return { kind: 'found', evaluation: matches[0] };
}
