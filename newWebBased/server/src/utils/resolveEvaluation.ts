export type EvaluationResolution =
  | { kind: 'found'; id: number }
  | { kind: 'missing' }
  | { kind: 'ambiguous' }
  | { kind: 'invalid' };

export function resolveEvaluation(
  evaluations: { int_wertungenid: number }[],
  requestedId: unknown
): EvaluationResolution {
  if (requestedId !== undefined && requestedId !== null) {
    if (!Number.isInteger(requestedId) || Number(requestedId) <= 0) return { kind: 'invalid' };
    const evaluation = evaluations.find(item => item.int_wertungenid === requestedId);
    return evaluation ? { kind: 'found', id: evaluation.int_wertungenid } : { kind: 'invalid' };
  }
  if (evaluations.length > 1) return { kind: 'ambiguous' };
  if (evaluations.length === 0) return { kind: 'missing' };
  return { kind: 'found', id: evaluations[0].int_wertungenid };
}
