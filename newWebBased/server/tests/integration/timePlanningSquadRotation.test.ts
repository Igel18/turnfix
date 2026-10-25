import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningSquadRotationRoutes from '../../src/routes/timePlanningSquadRotation';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningSquadRotation router', () => {
  const context = createTimePlanningTestContext(timePlanningSquadRotationRoutes);

  async function assign(squad: string, round: number, disciplineId: number) {
    const status = await context.prisma.tfx_status.findFirstOrThrow();
    await context.prisma.tfx_riegen_x_disziplinen.create({
      data: {
        int_veranstaltungenid: context.event.int_veranstaltungenid,
        int_disziplinenid: disciplineId,
        int_statusid: status.int_statusid,
        var_riege: squad,
        int_runde: round,
      },
    });
  }

  it('requires event id and squad', async () => {
    const noEvent = await request(context.app).get('/api/time-planning/squad-rotation').expect(400);
    expect(noEvent.body.error).toContain('Event ID');

    const noSquad = await request(context.app)
      .get('/api/time-planning/squad-rotation')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(400);
    expect(noSquad.body.error).toContain('squad');
  });

  it('returns an empty rotation for a squad without matrix entries', async () => {
    const response = await request(context.app)
      .get('/api/time-planning/squad-rotation')
      .query({ eventId: context.event.int_veranstaltungenid, squad: 'ZZ' })
      .expect(200);
    expect(response.body.devices).toEqual([]);
  });

  it('returns the devices of the squad in rotation order', async () => {
    const first = await context.createDiscipline('RotFirst');
    const second = await context.createDiscipline('RotSecond');
    await assign('AA', 2, second.int_disziplinenid);
    await assign('AA', 1, first.int_disziplinenid);
    await assign('BB', 1, second.int_disziplinenid);

    const response = await request(context.app)
      .get('/api/time-planning/squad-rotation')
      .query({ eventId: context.event.int_veranstaltungenid, squad: 'AA' })
      .expect(200);

    expect(response.body.devices.map((d: any) => [d.round, d.disciplineId])).toEqual([
      [1, first.int_disziplinenid],
      [2, second.int_disziplinenid],
    ]);
    expect(response.body.devices[0].name).toBe(first.var_name);
  });

  it('does not mix up squads of other events', async () => {
    const discipline = await context.createDiscipline('Other');
    await assign('AA', 1, discipline.int_disziplinenid);

    const response = await request(context.app)
      .get('/api/time-planning/squad-rotation')
      .query({ eventId: 999999999, squad: 'AA' })
      .expect(200);
    expect(response.body.devices).toEqual([]);
  });
});
