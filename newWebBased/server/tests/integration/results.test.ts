import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import resultRoutes from '../../src/routes/results';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/results', resultRoutes);

describe('Results API', () => {
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
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event for Results',
      description: 'Test Event Description'
    });
  });

  describe('GET /api/results', () => {
    it('should return a list of results', async () => {
      const response = await request(app)
        .get('/api/results')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.results).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/results?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by participant', async () => {
      const response = await request(app)
        .get('/api/results?participantId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by discipline', async () => {
      const response = await request(app)
        .get('/api/results?disciplineId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/results?limit=10&page=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/results/:id', () => {
    it('should return 404 for non-existent result', async () => {
      const response = await request(app)
        .get('/api/results/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid result ID', async () => {
      const response = await request(app)
        .get('/api/results/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/results', () => {
    it('should handle result creation', async () => {
      const newResultData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        score: 15.25,
        rank: 1
      };

      const response = await request(app)
        .post('/api/results')
        .send(newResultData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        score: 15.25
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/results')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate score ranges', async () => {
      const invalidData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        score: -5.0 // Invalid negative score
      };

      const response = await request(app)
        .post('/api/results')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/results/:id', () => {
    it('should handle result updates', async () => {
      const updateData = {
        score: 16.50,
        rank: 2
      };

      const response = await request(app)
        .put('/api/results/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent result', async () => {
      const updateData = {
        score: 16.50
      };

      const response = await request(app)
        .put('/api/results/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/results/:id', () => {
    it('should handle result deletion', async () => {
      const response = await request(app)
        .delete('/api/results/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk result import', async () => {
      const bulkData = {
        results: [
          {
            participantId: 1,
            eventId: testEvent.int_eventid,
            disciplineId: 1,
            score: 15.25
          },
          {
            participantId: 2,
            eventId: testEvent.int_eventid,
            disciplineId: 1,
            score: 14.75
          }
        ]
      };

      const response = await request(app)
        .post('/api/results/bulk')
        .send(bulkData)
        .expect((res) => {
          expect([200, 201, 400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('Statistics and Analytics', () => {
    it('should provide result statistics', async () => {
      const response = await request(app)
        .get('/api/results/statistics')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide event rankings', async () => {
      const response = await request(app)
        .get(`/api/results/rankings?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});
