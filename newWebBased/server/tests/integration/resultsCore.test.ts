import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { TestUtils } from '../utils/testUtils';
import resultsRoutes from '../../src/routes/results';

const app = express();
app.use(express.json());
app.use('/api/results', resultsRoutes);

describe('results core router', () => {
  let event: any;

  beforeAll(() => {
    TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    event = await TestUtils.createTestEvent({ name: `Results core ${Date.now()}` });
  });

  afterEach(async () => {
    await TestUtils.cleanupCreatedRecords();
  });

  it('returns paginated results and statistics', async () => {
    const page = await request(app)
      .get('/api/results?limit=5&offset=0')
      .expect(200);
    expect(page.body.results).toBeInstanceOf(Array);
    expect(page.body.pagination).toMatchObject({ limit: 5, offset: 0 });
    expect(typeof page.body.pagination.total).toBe('number');

    const statistics = await request(app)
      .get('/api/results/statistics')
      .expect(200);
    expect(statistics.body).toHaveProperty('total_results');
  });

  it('returns rankings for an event and validates a missing event id', async () => {
    const rankings = await request(app)
      .get('/api/results/rankings')
      .query({ eventId: event.int_veranstaltungenid })
      .expect(200);
    expect(rankings.body).toBeInstanceOf(Array);

    await request(app)
      .get('/api/results/rankings')
      .expect(400);
  });
});
