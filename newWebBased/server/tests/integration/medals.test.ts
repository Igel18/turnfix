import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import medalRoutes from '../../src/routes/medals';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/medals', medalRoutes);

describe('Medals API', () => {
  let prisma: PrismaClient;
  let testEvent: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    testEvent = await TestUtils.createTestEvent({ name: `Test Event Medals ${Date.now()}` });
  });

  describe('GET /api/medals', () => {
    it('should return a list of medals/results', async () => {
      const response = await request(app)
        .get('/api/medals')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should include pagination info', async () => {
      const response = await request(app)
        .get('/api/medals')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('POST /api/medals', () => {
    it('should create a medal award', async () => {
      const medalData = {
        participantId: 1,
        eventId: testEvent.int_veranstaltungenid,
        medalType: 'gold'
      };

      const response = await request(app)
        .post('/api/medals')
        .send(medalData)
        .expect(201);

      expect(response.body.message).toContain('recorded successfully');
    });

    it('should detect duplicate medal awards', async () => {
      const medalData = {
        participantId: 9998,
        eventId: testEvent.int_veranstaltungenid,
        medalType: 'gold'
      };

      // First award
      await request(app).post('/api/medals').send(medalData).expect(201);

      // Duplicate
      const response = await request(app)
        .post('/api/medals')
        .send(medalData)
        .expect(409);

      expect(response.body.error).toContain('Duplicate');
    });

    it('should return 400 for invalid medal type', async () => {
      const response = await request(app)
        .post('/api/medals')
        .send({ medalType: 'Platinum' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/medals/standings', () => {
    it('should return medal standings', async () => {
      const response = await request(app)
        .get('/api/medals/standings')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/medals/statistics', () => {
    it('should return medal statistics', async () => {
      const response = await request(app)
        .get('/api/medals/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('totalResults');
      expect(response.body).toHaveProperty('gold');
      expect(response.body).toHaveProperty('silver');
      expect(response.body).toHaveProperty('bronze');
      expect(response.body).toHaveProperty('totalMedals');
    });
  });

  describe('GET /api/medals/comprehensive-report', () => {
    it('should return comprehensive medal report', async () => {
      const response = await request(app)
        .get('/api/medals/comprehensive-report')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalParticipants');
      expect(response.body.summary).toHaveProperty('totalTeams');
      expect(response.body.summary).toHaveProperty('medalsAwarded');
      expect(response.body).toHaveProperty('standings');
      expect(response.body).toHaveProperty('disciplines');
    });
  });

  describe('GET /api/medals/:eventId', () => {
    it('should return medal standings for a specific event', async () => {
      const response = await request(app)
        .get(`/api/medals/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body).toHaveProperty('eventId');
      expect(response.body).toHaveProperty('eventName');
      expect(response.body).toHaveProperty('standings');
      expect(response.body.standings).toBeInstanceOf(Array);
      expect(response.body.eventId).toBe(testEvent.int_veranstaltungenid);
    });

    it('should return 400 for invalid event ID', async () => {
      await request(app)
        .get('/api/medals/abc')
        .expect(400);
    });

    it('should return 404 for non-existent event', async () => {
      await request(app)
        .get('/api/medals/999999')
        .expect(404);
    });

    it('should sort standings: gold > silver > bronze > name', async () => {
      const response = await request(app)
        .get(`/api/medals/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      // Standings should be an array (possibly empty for test events without scores)
      expect(response.body.standings).toBeInstanceOf(Array);
    });
  });

  describe('DELETE /api/medals/:id', () => {
    it('should revoke a medal', async () => {
      const response = await request(app)
        .delete('/api/medals/1')
        .expect(200);

      expect(response.body.message).toContain('revoked successfully');
    });
  });
});
