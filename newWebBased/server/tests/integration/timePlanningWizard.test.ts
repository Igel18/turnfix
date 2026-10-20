import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningWizardRoutes from '../../src/routes/timePlanningWizard';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningWizard router', () => {
  const context = createTimePlanningTestContext(timePlanningWizardRoutes);

  it('returns per-round disciplines and squads', async () => {
    const discipline = await context.createDiscipline('Wizard');
    await context.prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: context.competition.int_wettkaempfeid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_sortierung: 1,
      },
    });
    await context.createSquadScore('WA');

    const response = await request(context.app)
      .get('/api/time-planning/wizard/durchgang-data')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.durchgaenge).toEqual([{
      durchgang: 1,
      squads: ['WA'],
      disciplines: [{ id: discipline.int_disziplinenid, name: discipline.var_name, shortName: discipline.var_kurz1 }],
    }]);
  });

  it('generates and persists a rotation matrix and local start time', async () => {
    const disciplineA = await context.createDiscipline('RotA');
    const disciplineB = await context.createDiscipline('RotB');
    await context.prisma.tfx_wettkaempfe_x_disziplinen.createMany({
      data: [
        { int_wettkaempfeid: context.competition.int_wettkaempfeid, int_disziplinenid: disciplineA.int_disziplinenid, int_sortierung: 1 },
        { int_wettkaempfeid: context.competition.int_wettkaempfeid, int_disziplinenid: disciplineB.int_disziplinenid, int_sortierung: 2 },
      ],
    });
    await context.createSquadScore('WA');

    const response = await request(context.app)
      .post('/api/time-planning/wizard/generate')
      .send({
        eventId: context.event.int_veranstaltungenid,
        rounds: [{ durchgang: 1, startAssignments: { WA: disciplineB.int_disziplinenid } }],
        durchgangStartTimes: { '1': '08:30' },
      })
      .expect(200);

    expect(response.body).toMatchObject({ success: true, totalCells: 2, durchgaengeCount: 1 });
    const assignments = await context.prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: context.event.int_veranstaltungenid },
      orderBy: { int_runde: 'asc' },
    });
    expect(assignments.map(row => [row.int_runde, row.int_disziplinenid, row.bol_erstes_geraet])).toEqual([
      [1, disciplineB.int_disziplinenid, true],
      [2, disciplineA.int_disziplinenid, false],
    ]);

    const updatedCompetition = await context.prisma.tfx_wettkaempfe.findUniqueOrThrow({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
    });
    expect(updatedCompetition.tim_startzeit?.getHours()).toBe(8);
    expect(updatedCompetition.tim_startzeit?.getMinutes()).toBe(30);
  });
});