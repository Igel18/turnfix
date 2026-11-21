import { describe, expect, it } from 'vitest';
import { selectEvaluation } from '../evaluationSelection';

describe('selectEvaluation', () => {
  const evaluations = [
    { id: 1, competitionId: 10, squadName: 'I1', teamId: null },
    { id: 2, competitionId: 10, squadName: 'T1', teamId: 5 },
    { id: 3, competitionId: 11, squadName: 'T1', teamId: 6 },
  ];

  it('selects by squad and competition without mixing team and individual scores', () => {
    expect(selectEvaluation(evaluations, { squadName: 'I1', competitionIds: [10] })).toEqual({ kind: 'found', evaluation: evaluations[0] });
    expect(selectEvaluation(evaluations, { squadName: 'T1', competitionIds: [10] })).toEqual({ kind: 'found', evaluation: evaluations[1] });
  });

  it('reports ambiguous and missing evaluations instead of choosing one', () => {
    expect(selectEvaluation(evaluations, { squadName: 'T1' }).kind).toBe('ambiguous');
    expect(selectEvaluation(evaluations, { squadName: 'X' }).kind).toBe('missing');
    expect(selectEvaluation([evaluations[0], { ...evaluations[1], squadName: 'I1' }], { squadName: 'I1', competitionIds: [10] }).kind).toBe('ambiguous');
  });
});
