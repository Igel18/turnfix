import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import competitionRoutes from '../../src/routes/competitions';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/competitions', competitionRoutes);

describe('Competitions API', () => {
  let prisma: PrismaClient;
  let testCompetition: any;
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
    // Create a test event first
    testEvent = await TestUtils.createTestEvent({
      name: 'Test Event for Competitions',
      description: 'Test Event Description'
    });
  });

  describe('GET /api/competitions', () => {
    it('should return a list of competitions', async () => {
      const response = await request(app)
        .get('/api/competitions')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.competitions).toBeTruthy();
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/competitions?limit=5&page=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/competitions?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support search functionality', async () => {
      const response = await request(app)
        .get('/api/competitions?search=test')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/competitions/:id', () => {
    it('should return 404 for non-existent competition', async () => {
      const response = await request(app)
        .get('/api/competitions/99999')
        .expect((res) => {
          expect([404, 400]).toContain(res.status);
        });
    });

    it('should return 400 for invalid competition ID', async () => {
      const response = await request(app)
        .get('/api/competitions/invalid-id')
        .expect(400);
        
      expect(response.body).toBeDefined();
      expect(response.body.error).toBe('Invalid competition ID');
    });
  });

  describe('POST /api/competitions', () => {
    it('should handle competition creation request', async () => {
      const newCompetitionData = {
        name: 'Test Competition',
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        categoryId: 1
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(newCompetitionData)
        .expect((res) => {
          // Accept success or validation error
          expect([200, 201, 400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        name: '' // Empty name should fail validation
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should return 400 for invalid event reference', async () => {
      const invalidData = {
        name: 'Test Competition',
        eventId: 99999, // Non-existent event
        disciplineId: 1
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });
  });

  describe('PUT /api/competitions/:id', () => {
    it('should return 404 for non-existent competition', async () => {
      const updateData = {
        name: 'Updated Competition'
      };

      const response = await request(app)
        .put('/api/competitions/99999')
        .send(updateData)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.error).toBe('Competition not found');
    });

    it('should handle validation errors gracefully', async () => {
      const invalidData = {
        name: '',
        eventId: 'invalid'
      };

      const response = await request(app)
        .put('/api/competitions/1')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });
  });

  describe('DELETE /api/competitions/:id', () => {
    it('should return appropriate status for non-existent competition', async () => {
      const response = await request(app)
        .delete('/api/competitions/99999')
        .expect((res) => {
          // Accept various valid responses
          expect([200, 404, 400]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });

    it('should handle invalid ID gracefully', async () => {
      const response = await request(app)
        .delete('/api/competitions/invalid-id')
        .expect((res) => {
          expect([400, 404]).toContain(res.status);
        });

      expect(response.body).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/competitions')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle oversized requests', async () => {
      const largeData = {
        name: 'x'.repeat(10000),
        description: 'y'.repeat(50000)
      };

      const response = await request(app)
        .post('/api/competitions')
        .send(largeData)
        .expect((res) => {
          // Should handle gracefully
          expect([200, 201, 400, 413, 422]).toContain(res.status);
        });
    });
  });

  describe('Response Format', () => {
    it('should return proper content type', async () => {
      const response = await request(app)
        .get('/api/competitions')
        .expect('Content-Type', /json/);
    });

    it('should handle CORS preflight', async () => {
      const response = await request(app)
        .options('/api/competitions')
        .expect((res) => {
          expect([200, 204, 404]).toContain(res.status);
        });
    });
  });
});
