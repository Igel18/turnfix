import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningDurchgaengeRoutes from '../../src/routes/timePlanningDurchgaenge';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningDurchgaenge router', () => {
  const context = createTimePlanningTestContext(timePlanningDurchgaengeRoutes);

  it('requires an event id', async () => {
    const response = await request(context.app).get('/api/time-planning/durchgaenge').expect(400);
    expect(response.body.error).toContain('Event ID');
  });

  it('returns the Durchgang of the event competition with its squads', async () => {
    await context.prisma.tfx_wettkaempfe.update({
      where: { int_wettkaempfeid: context.competition.int_wettkaempfeid },
      data: { int_durchgang: 2, tim_startzeit: new Date(1970, 0, 1, 10, 15, 0) },
    });
    await context.createSquadScore('AA');
    await context.createSquadScore('AA');
    await context.createSquadScore('BB');

    const response = await request(context.app)
      .get('/api/time-planning/durchgaenge')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.durchgaenge).toHaveLength(1);
    const durchgang = response.body.durchgaenge[0];
    expect(durchgang.durchgang).toBe(2);
    expect(durchgang.startTime).toBe('10:15');
    expect(durchgang.competitions.map((c: any) => c.id)).toEqual([context.competition.int_wettkaempfeid]);
    expect(durchgang.squads).toEqual([
      { name: 'AA', participantCount: 2 },
      { name: 'BB', participantCount: 1 },
    ]);
  });

  it('returns an empty list for an event without competitions', async () => {
    const response = await request(context.app)
      .get('/api/time-planning/durchgaenge')
      .query({ eventId: 999999999 })
      .expect(200);
    expect(response.body.durchgaenge).toEqual([]);
  });
});
