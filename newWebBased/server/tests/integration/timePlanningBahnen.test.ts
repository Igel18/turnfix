import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningBahnenRoutes from '../../src/routes/timePlanningBahnen';
import { createTimePlanningTestContext } from './timePlanningTestContext';
import { TestUtils } from '../utils/testUtils';

describe('timePlanningBahnen router', () => {
  const context = createTimePlanningTestContext(timePlanningBahnenRoutes);

  it('requires an event id', async () => {
    const response = await request(context.app).get('/api/time-planning/bahn-details').expect(400);
    expect(response.body.error).toContain('Event ID');
  });

  it('returns an empty list for an event without competitions', async () => {
    const response = await request(context.app)
      .get('/api/time-planning/bahn-details')
      .query({ eventId: 999999999 })
      .expect(200);
    expect(response.body.bahnen).toEqual([]);
  });

  it('returns Bahnen with competitions, disciplines and squads', async () => {
    const discipline = await context.createDiscipline('Bahn');
    await context.prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
      data: { int_durchgang: 1, int_bahn: 2 },
    });
    await context.prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: context.competition.int_wettkaempfeid,
        int_disziplinenid: discipline.int_disziplinenid,
        int_sortierung: 1,
      },
    });
    await context.createSquadScore('AA');
    await context.createSquadScore('AA');

    const response = await request(context.app)
      .get('/api/time-planning/bahn-details')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.bahnen).toHaveLength(1);
    const bahn = response.body.bahnen[0];
    expect(bahn.durchgang).toBe(1);
    expect(bahn.bahn).toBe(2);
    expect(bahn.competitions).toHaveLength(1);
    expect(bahn.competitions[0].id).toBe(context.competition.int_wettkaempfeid);
    expect(bahn.competitions[0].disciplineIds).toEqual([discipline.int_disziplinenid]);
    expect(bahn.squads).toEqual([{ name: 'AA', participantCount: 2 }]);
  });

  it('separates competitions with different Bahnen', async () => {
    const second = await TestUtils.createTestCompetition({
      name: `Second ${Date.now()}`,
      int_veranstaltungenid: context.event.int_veranstaltungenid,
    });
    await context.prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
      data: { int_durchgang: 1, int_bahn: 1 },
    });
    await context.prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: second.int_wettkaempfeid },
      data: { int_durchgang: 1, int_bahn: 2 },
    });

    const response = await request(context.app)
      .get('/api/time-planning/bahn-details')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.bahnen.map((b: any) => b.bahn)).toEqual([1, 2]);
  });
});
