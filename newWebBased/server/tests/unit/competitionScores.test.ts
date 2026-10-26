import { latestDisciplineScores } from '../../src/utils/competitionScores';

describe('latestDisciplineScores', () => {
  const detail = (id: number, disciplineId: number, attempt: number | null, score: number | null, kp: number | null = 0) => ({
    int_wertungen_detailsid: id,
    int_disziplinenid: disciplineId,
    int_versuch: attempt,
    rel_leistung: score,
    int_kp: kp,
  });

  it('returns one score per discipline', () => {
    expect(latestDisciplineScores([detail(1, 10, 1, 9.5), detail(2, 20, 1, 8)])).toEqual([9.5, 8]);
  });

  it('uses the latest attempt of a discipline', () => {
    expect(latestDisciplineScores([detail(1, 10, 1, 9), detail(2, 10, 2, 9.5)])).toEqual([9.5]);
  });

  it('uses the highest id when the attempts are equal', () => {
    expect(latestDisciplineScores([detail(5, 10, 1, 9), detail(7, 10, 1, 9.2)])).toEqual([9.2]);
  });

  it('ignores Kampfpunkte rows', () => {
    expect(latestDisciplineScores([detail(1, 10, 1, 9), detail(2, 10, 1, 3, 1)])).toEqual([9]);
  });

  it('keeps empty scores as null', () => {
    expect(latestDisciplineScores([detail(1, 10, 1, null)])).toEqual([null]);
  });
});
