import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningCoreRoutes from '../../src/routes/timePlanningCore';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningCore router', () => {
  const context = createTimePlanningTestContext(timePlanningCoreRoutes);

  it('returns lanes for an event', async () => {
    const response = await request(context.app)
      .get('/api/time-planning/bahnen')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.bahnen).toBeInstanceOf(Array);
  });

  it('updates a competition lane', async () => {
    await request(context.app)
      .put(`/api/time-planning/competition/${context.competition.int_wettkaempfeid}/bahn`)
      .send({ bahn: 3 })
      .expect(200);

    const updated = await context.prisma.tfx_wettkaempfe.findUniqueOrThrow({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
    });
    expect(updated.int_bahn).toBe(3);
  });

  it('creates the next implicit round and updates a competition round', async () => {
    const nextRound = await request(context.app)
      .post('/api/time-planning/round')
      .send({ eventId: context.event.int_veranstaltungenid })
      .expect(200);
    expect(nextRound.body.round).toBe(2);

    await request(context.app)
      .put(`/api/time-planning/competition/${context.competition.int_wettkaempfeid}/round`)
      .send({ round: 4 })
      .expect(200);

    const updated = await context.prisma.tfx_wettkaempfe.findUniqueOrThrow({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
    });
    expect(updated.int_durchgang).toBe(4);
  });

  it('marks only the selected discipline as the squad start device', async () => {
    const firstDiscipline = await context.createDiscipline('StartA');
    const selectedDiscipline = await context.createDiscipline('StartB');
    const status = await context.prisma.tfx_status.findFirstOrThrow();
    await context.prisma.tfx_riegen_x_disziplinen.createMany({
      data: [
        {
          int_veranstaltungenid: context.event.int_veranstaltungenid,
          int_disziplinenid: firstDiscipline.int_disziplinenid,
          int_statusid: status.int_statusid,
          var_riege: 'STA',
          int_runde: 1,
          bol_erstes_geraet: true,
        },
        {
          int_veranstaltungenid: context.event.int_veranstaltungenid,
          int_disziplinenid: selectedDiscipline.int_disziplinenid,
          int_statusid: status.int_statusid,
          var_riege: 'STA',
          int_runde: 1,
          bol_erstes_geraet: false,
        },
      ],
    });

    await request(context.app)
      .put('/api/time-planning/squad-start-device')
      .send({
        eventId: context.event.int_veranstaltungenid,
        squadName: 'STA',
        round: 1,
        disciplineId: selectedDiscipline.int_disziplinenid,
      })
      .expect(200);

    const rows = await context.prisma.tfx_riegen_x_disziplinen.findMany({
      where: { int_veranstaltungenid: context.event.int_veranstaltungenid, var_riege: 'STA' },
    });
    expect(rows.find(row => row.int_disziplinenid === firstDiscipline.int_disziplinenid)?.bol_erstes_geraet).toBe(false);
    expect(rows.find(row => row.int_disziplinenid === selectedDiscipline.int_disziplinenid)?.bol_erstes_geraet).toBe(true);
  });
});