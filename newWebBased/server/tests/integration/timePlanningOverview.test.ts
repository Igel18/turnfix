import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import timePlanningOverviewRoutes from '../../src/routes/timePlanningOverview';
import { createTimePlanningTestContext } from './timePlanningTestContext';

describe('timePlanningOverview router', () => {
  const context = createTimePlanningTestContext(timePlanningOverviewRoutes);

  it('returns the overview collections for an event', async () => {
    const response = await request(context.app)
      .get('/api/time-planning')
      .query({ eventId: context.event.int_veranstaltungenid })
      .expect(200);

    expect(response.body.competitions).toBeInstanceOf(Array);
    expect(response.body.squadDisciplines).toBeInstanceOf(Array);
    expect(response.body.squads).toBeInstanceOf(Array);
    expect(response.body.timeSlots[0].time).toBe('08:00');
    expect(response.body.timeSlots[response.body.timeSlots.length - 1].time).toBe('18:45');
    expect(response.body.competitions[0]).toMatchObject({
      id: context.competition.int_wettkaempfeid,
      name: context.competition.var_name,
      round: 1,
      disciplineCount: 0,
      participantCount: 0,
    });
  });

  it('requires an event id', async () => {
    const response = await request(context.app)
      .get('/api/time-planning')
      .expect(400);

    expect(response.body.error).toContain('Event ID');
  });
});