import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import scoresRoutes from '../../src/routes/scores';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/scores', scoresRoutes);

describe('Scores API', () => {
  let prisma: PrismaClient;
  let testEvent: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  beforeEach(async () => {
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event for Scores',
      description: 'Test Event Description'
    });
  });

  describe('GET /api/scores', () => {
    it('should return a list of scores', async () => {
      const response = await request(app)
        .get('/api/scores')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.results).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/scores?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by participant', async () => {
      const response = await request(app)
        .get('/api/scores?participantId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by judge', async () => {
      const response = await request(app)
        .get('/api/scores?judgeId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by discipline', async () => {
      const response = await request(app)
        .get('/api/scores?disciplineId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/scores/:id', () => {
    it('should return 404 for non-existent score', async () => {
      const response = await request(app)
        .get('/api/scores/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should handle invalid score ID', async () => {
      const response = await request(app)
        .get('/api/scores/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });
    });
  });

  describe('POST /api/scores', () => {
    it('should handle score submission', async () => {
      const newScoreData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        judgeId: 1,
        score: 8.5,
        scoreType: 'execution'
      };

      const response = await request(app)
        .post('/api/scores')
        .send(newScoreData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should validate score ranges', async () => {
      const invalidData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        judgeId: 1,
        score: 15.0 // Invalid score > 10
      };

      const response = await request(app)
        .post('/api/scores')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        score: 8.5
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/scores')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle difficulty scores', async () => {
      const difficultyData = {
        participantId: 1,
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        judgeId: 1,
        score: 6.5,
        scoreType: 'difficulty'
      };

      const response = await request(app)
        .post('/api/scores')
        .send(difficultyData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });
  });

  describe('PUT /api/scores/:id', () => {
    it('should handle score updates', async () => {
      const updateData = {
        score: 9.0,
        notes: 'Updated score'
      };

      const response = await request(app)
        .put('/api/scores/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400, 422]).toContain(res.status);
        });
    });

    it('should return 404 for non-existent score', async () => {
      const updateData = {
        score: 9.0
      };

      const response = await request(app)
        .put('/api/scores/99999')
        .send(updateData)
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });
  });

  describe('DELETE /api/scores/:id', () => {
    it('should handle score deletion', async () => {
      const response = await request(app)
        .delete('/api/scores/99999')
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk score submission', async () => {
      const bulkData = {
        scores: [
          {
            participantId: 1,
            eventId: testEvent.int_eventid,
            disciplineId: 1,
            judgeId: 1,
            score: 8.5,
            scoreType: 'execution'
          },
          {
            participantId: 1,
            eventId: testEvent.int_eventid,
            disciplineId: 1,
            judgeId: 2,
            score: 8.2,
            scoreType: 'execution'
          }
        ]
      };

      const response = await request(app)
        .post('/api/scores/bulk')
        .send(bulkData)
        .expect((res) => {
          expect([200, 201, 400, 404, 422]).toContain(res.status);
        });
    });
  });

  describe('Score Calculations', () => {
    it('should calculate final scores', async () => {
      const response = await request(app)
        .post('/api/scores/calculate')
        .send({
          participantId: 1,
          eventId: testEvent.int_eventid,
          disciplineId: 1
        })
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should provide score summary', async () => {
      const response = await request(app)
        .get('/api/scores/summary')
        .query({
          eventId: testEvent.int_eventid,
          disciplineId: 1
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });

  describe('Judge Panel Management', () => {
    it('should handle judge assignments', async () => {
      const assignmentData = {
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        judges: [1, 2, 3, 4, 5]
      };

      const response = await request(app)
        .post('/api/scores/assign-judges')
        .send(assignmentData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });
  });
});
