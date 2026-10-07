import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningActiveSquadsRoutes from '../../src/routes/timePlanningActiveSquads';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningActiveSquads router', () => {
  const context = createTimePlanningTestContext(timePlanningActiveSquadsRoutes);

  it('returns no squads when the event has no rotation rows', async () => {
    const response = await request(context.app)
      .get('/api/time-planning/active-squads')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.currentTime).toMatch(/^\d{2}:\d{2}$/);
    expect(response.body.squadInfos).toEqual([]);
  });

  it('returns unknown status for squads without configured competition times', async () => {
    const discipline = await context.createDiscipline('Active');
    const status = await context.prisma.tfx_status.findFirstOrThrow();
    await context.prisma.tfx_riegen_x_disziplinen.create({
      data: {
        int_veranstaltungenid: context.event.int_veranstaltungenid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_statusid: status.int_statusid,
        var_riege: 'AA',
        int_runde: 1,
      },
    });
    await context.createSquadScore('AA');

    const response = await request(context.app)
      .get('/api/time-planning/active-squads')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.squadInfos).toContainEqual({
      squadName: 'AA',
      status: 'unknown',
      currentDeviceName: null,
      currentDisciplineId: null,
      timeInfo: '',
    });
  });
});