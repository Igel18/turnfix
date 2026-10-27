import { PrismaClient } from '@prisma/client';
import { loadEffectiveDisciplineScores } from '../../src/utils/effectiveScoreLoader';
import { TestUtils } from '../utils/testUtils';

describe('loadEffectiveDisciplineScores', () => {
  let prisma: PrismaClient;
  let event: any;
  let competition: any;
  let formulaIds: number[] = [];

  beforeAll(() => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    await TestUtils.cleanupCreatedRecords();
    if (formulaIds.length > 0) {
      await prisma.tfx_formeln.deleteMany({ where: { int_formelid: { in: formulaIds } } }).catch(() => {});
      formulaIds = [];
    }
  });

  beforeEach(async () => {
    event = await TestUtils.createTestEvent({ name: `Effective scores ${Date.now()}` });
    competition = await TestUtils.createTestCompetition({
      name: 'Effective scores competition',
      int_veranstaltungenid: event.int_veranstaltungenid,
    });
  });

  const createDiscipline = async (data: { formula?: string; formulaId?: number } = {}) => {
    const sport = await prisma.tfx_sport.findFirstOrThrow();
    const discipline = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport.int_sportid,
        var_name: `Gerät ${Date.now()}${Math.random()}`.slice(0, 40),
        var_formel: data.formula ?? null,
        int_formelid: data.formulaId ?? null,
      },
    });
    TestUtils.trackCreated('disciplines', discipline.int_disziplinenid);
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: { int_wettkaempfeid: competition.int_wettkaempfeid, int_disziplinenid: discipline.int_disziplinenid, int_sortierung: 1 },
    });
    return discipline;
  };

  const createWertung = async () => {
    const participant = await TestUtils.createTestParticipant({ firstName: 'Effektiv', lastName: 'Wert' });
    const status = await prisma.tfx_status.findFirstOrThrow();
    return prisma.tfx_wertungen.create({
      data: {
        int_wettkaempfeid: competition.int_wettkaempfeid,
        int_teilnehmerid: participant.int_teilnehmerid,
        int_statusid: status.int_statusid,
      },
    });
  };

  const addDetail = (wertungenId: number, disciplineId: number, score: number | null, attempt = 1, kp = 0) =>
    prisma.tfx_wertungen_details.create({
      data: { int_wertungenid: wertungenId, int_disziplinenid: disciplineId, int_versuch: attempt, rel_leistung: score, int_kp: kp },
    });

  const load = () => loadEffectiveDisciplineScores([competition.int_wettkaempfeid]);

  it('returns the stored score for a discipline without formula', async () => {
    const discipline = await createDiscipline();
    const wertung = await createWertung();
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 9.5);

    expect(await load()).toEqual([expect.objectContaining({
      wertungenId: wertung.int_wertungenid,
      participantId: wertung.int_teilnehmerid,
      competitionId: competition.int_wettkaempfeid,
      disciplineId: discipline.int_disziplinenid,
      rawScore: 9.5,
      effectiveScore: 9.5,
    })]);
  });

  it('applies the built-in formula var_formel of the discipline', async () => {
    const discipline = await createDiscipline({ formula: '20-x' });
    const wertung = await createWertung();
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 6);

    const [row] = await load();
    expect(row.rawScore).toBe(6);
    expect(row.calculatedScore).toBe(6);
    expect(row.effectiveScore).toBe(14);
  });

  it('uses the latest attempt and ignores Kampfpunkte rows', async () => {
    const discipline = await createDiscipline();
    const wertung = await createWertung();
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 8, 1);
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 9, 2);
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 99, 3, 1);

    const rows = await load();
    expect(rows).toHaveLength(1);
    expect(rows[0].rawScore).toBe(9);
  });

  it('recalculates a linked formula from the jury fields', async () => {
    const formula = await prisma.tfx_formeln.create({ data: { var_name: `Summe ${Date.now()}`, var_formel: 'A+B' } });
    formulaIds.push(formula.int_formelid);
    const discipline = await createDiscipline({ formulaId: formula.int_formelid });
    const [fieldA, fieldB] = await Promise.all([
      prisma.tfx_disziplinen_felder.create({ data: { int_disziplinenid: discipline.int_disziplinenid, var_name: 'A', int_sortierung: 1, bol_endwert: false, bol_ausgangswert: false } }),
      prisma.tfx_disziplinen_felder.create({ data: { int_disziplinenid: discipline.int_disziplinenid, var_name: 'B', int_sortierung: 2, bol_endwert: false, bol_ausgangswert: false } }),
    ]);
    const wertung = await createWertung();
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 1);
    await prisma.tfx_jury_results.create({ data: { int_wertungenid: wertung.int_wertungenid, int_disziplinen_felderid: fieldA.int_disziplinen_felderid, int_versuch: 1, rel_leistung: 5 } });
    await prisma.tfx_jury_results.create({ data: { int_wertungenid: wertung.int_wertungenid, int_disziplinen_felderid: fieldB.int_disziplinen_felderid, int_versuch: 1, rel_leistung: 3 } });

    const [row] = await load();
    expect(row.rawScore).toBe(1);
    expect(row.calculatedScore).toBe(8);
    expect(row.effectiveScore).toBe(8);
  });

  it('does not apply the built-in formula when the event only uses final scores', async () => {
    await prisma.tfx_veranstaltungen.update({
      where: { int_veranstaltungenid: event.int_veranstaltungenid },
      data: { var_verwendungszweck: 'TFX_SCORING_MODE:final_only' },
    });
    const discipline = await createDiscipline({ formula: '20-x' });
    const wertung = await createWertung();
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, 6);

    const [row] = await load();
    expect(row.effectiveScore).toBe(6);
  });

  it('keeps a missing score as null and returns nothing without competitions', async () => {
    const discipline = await createDiscipline({ formula: '20-x' });
    const wertung = await createWertung();
    await addDetail(wertung.int_wertungenid, discipline.int_disziplinenid, null);

    const [row] = await load();
    expect(row.rawScore).toBeNull();
    expect(row.effectiveScore).toBeNull();
    expect(await loadEffectiveDisciplineScores([])).toEqual([]);
  });
});
