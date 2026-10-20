import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { TestUtils } from '../utils/testUtils';
import timePlanningMatrixRoutes from '../../src/routes/timePlanningMatrix';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningMatrix router', () => {
  const context = createTimePlanningTestContext(timePlanningMatrixRoutes);

  it('returns session and lane-specific discipline ids', async () => {
    const disciplineA = await context.createDiscipline('MatrixA');
    const disciplineB = await context.createDiscipline('MatrixB');
    const secondCompetition = await TestUtils.createTestCompetition({
      name: `Second Matrix Competition ${Date.now()}`,
      int_veranstaltungenid: context.event.int_veranstaltungenid,
    });
    await context.prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
      data: { int_durchgang: 1, int_bahn: 1 },
    });
    await context.prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: secondCompetition.int_wettkaempfeid },
      data: { int_durchgang: 2, int_bahn: 2 },
    });
    await context.prisma.tfx_wettkaempfe_x_disziplinen.createMany({
      data: [
        { int_wettkaempfeid: context.competition.int_wettkaempfeid, int_disziplinenid: disciplineA.int_disziplinenid, int_sortierung: 1 },
        { int_wettkaempfeid: secondCompetition.int_wettkaempfeid, int_disziplinenid: disciplineB.int_disziplinenid, int_sortierung: 1 },
      ],
    });

    const response = await request(context.app)
      .get('/api/time-planning/matrix')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.sessionDisciplineIds).toEqual({
      '1': [disciplineA.int_disziplinenid],
      '2': [disciplineB.int_disziplinenid],
    });
    expect(response.body.sessionLaneDisciplineIds).toEqual({
      '1': { '1': [disciplineA.int_disziplinenid] },
      '2': { '2': [disciplineB.int_disziplinenid] },
    });
  });

  it('saves and deletes a discipline cell assignment', async () => {
    const discipline = await context.createDiscipline('Cell');
    const cell = {
      eventId: context.event.int_veranstaltungenid,
      disciplineId: discipline.int_disziplinenid,
      round: 1,
      squadName: 'CA',
    };

    await request(context.app)
      .put('/api/time-planning/matrix/cell')
      .send(cell)
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ success: true, action: 'saved' }));

    const saved = await context.prisma.tfx_riegen_x_disziplinen.findFirstOrThrow({
      where: {
        int_veranstaltungenid: context.event.int_veranstaltungenid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_runde: 1,
      },
    });
    expect(saved.var_riege).toBe('CA');

    await request(context.app)
      .put('/api/time-planning/matrix/cell')
      .send({ ...cell, squadName: '' })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ success: true, action: 'deleted' }));
    await expect(context.prisma.tfx_riegen_x_disziplinen.findFirst({
      where: {
        int_veranstaltungenid: context.event.int_veranstaltungenid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_runde: 1,
      },
    })).resolves.toBeNull();
  });

  it('saves and deletes a squad round assignment', async () => {
    const discipline = await context.createDiscipline('Squad');
    const cell = {
      eventId: context.event.int_veranstaltungenid,
      squadName: 'SA',
      round: 1,
    };

    await request(context.app)
      .put('/api/time-planning/matrix/squad-cell')
      .send({ ...cell, disciplineId: discipline.int_disziplinenid })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ success: true, action: 'saved' }));

    const saved = await context.prisma.tfx_riegen_x_disziplinen.findFirstOrThrow({
      where: {
        int_veranstaltungenid: context.event.int_veranstaltungenid,
        var_riege: cell.squadName,
        int_runde: cell.round,
      },
    });
    expect(saved.int_disziplinenid).toBe(discipline.int_disziplinenid);

    await request(context.app)
      .put('/api/time-planning/matrix/squad-cell')
      .send({ ...cell, disciplineId: null })
      .expect(200)
      .expect(({ body }) => expect(body).toMatchObject({ success: true, action: 'deleted' }));
    await expect(context.prisma.tfx_riegen_x_disziplinen.findFirst({
      where: {
        int_veranstaltungenid: context.event.int_veranstaltungenid,
        var_riege: cell.squadName,
        int_runde: cell.round,
      },
    })).resolves.toBeNull();
  });
});