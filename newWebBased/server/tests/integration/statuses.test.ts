import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import statusRoutes from '../../src/routes/statuses';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/statuses', statusRoutes);

describe('Statuses API', () => {
  let prisma: PrismaClient;
  let testStatus: any;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    if (testStatus) {
      await (prisma as any).tfx_status.delete({
        where: { int_statusid: testStatus.int_statusid }
      }).catch(() => {});
      testStatus = null;
    }
    await TestUtils.cleanupCreatedRecords();
  });

  beforeEach(async () => {
    testStatus = await (prisma as any).tfx_status.create({
      data: {
        var_name: `Test Status ${Date.now()}`,
        ary_colorcode: '{255,0,0}',
        bol_bogen: true,
        bol_karte: true
      }
    });
  });

  describe('GET /api/statuses', () => {
    it('should return a list of statuses with pagination', async () => {
      const response = await request(app)
        .get('/api/statuses')
        .expect(200);

      expect(response.body).toHaveProperty('statuses');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.statuses).toBeInstanceOf(Array);
      expect(response.body.statuses.length).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
      expect(response.body.pagination).toHaveProperty('pages');
    });

    it('should support search by name', async () => {
      const response = await request(app)
        .get('/api/statuses')
        .query({ search: testStatus.var_name })
        .expect(200);

      expect(response.body.statuses.length).toBeGreaterThanOrEqual(1);
      const found = response.body.statuses.find(
        (s: any) => s.int_statusid === testStatus.int_statusid
      );
      expect(found).toBeDefined();
    });

    it('should respect limit and offset', async () => {
      const response = await request(app)
        .get('/api/statuses')
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body.statuses.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/statuses/:id', () => {
    it('should return a specific status', async () => {
      const response = await request(app)
        .get(`/api/statuses/${testStatus.int_statusid}`)
        .expect(200);

      expect(response.body.int_statusid).toBe(testStatus.int_statusid);
      expect(response.body.var_name).toBe(testStatus.var_name);
      expect(response.body.ary_colorcode).toBe('{255,0,0}');
    });

    it('should return 404 for non-existent status', async () => {
      await request(app)
        .get('/api/statuses/999999')
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .get('/api/statuses/abc')
        .expect(400);
    });
  });

  describe('POST /api/statuses', () => {
    it('should create a status with all fields', async () => {
      const statusData = {
        var_name: `New Status ${Date.now()}`,
        ary_colorcode: '{0,128,255}',
        bol_bogen: false,
        bol_karte: true
      };

      const response = await request(app)
        .post('/api/statuses')
        .send(statusData)
        .expect(201);

      expect(response.body.var_name).toBe(statusData.var_name);
      expect(response.body.ary_colorcode).toBe('{0,128,255}');
      expect(response.body.bol_bogen).toBe(false);
      expect(response.body.bol_karte).toBe(true);

      // Clean up
      await (prisma as any).tfx_status.delete({
        where: { int_statusid: response.body.int_statusid }
      }).catch(() => {});
    });

    it('should create a status with only the name (defaults)', async () => {
      const response = await request(app)
        .post('/api/statuses')
        .send({ var_name: `Minimal Status ${Date.now()}` })
        .expect(201);

      expect(response.body).toHaveProperty('int_statusid');
      expect(response.body.bol_bogen).toBe(true); // default
      expect(response.body.bol_karte).toBe(true); // default

      // Clean up
      await (prisma as any).tfx_status.delete({
        where: { int_statusid: response.body.int_statusid }
      }).catch(() => {});
    });

    it('should reject empty name', async () => {
      await request(app)
        .post('/api/statuses')
        .send({ var_name: '' })
        .expect(400);
    });

    it('should reject missing name', async () => {
      await request(app)
        .post('/api/statuses')
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/statuses/:id', () => {
    it('should update a status name', async () => {
      const newName = `Updated Status ${Date.now()}`;
      const response = await request(app)
        .put(`/api/statuses/${testStatus.int_statusid}`)
        .send({ var_name: newName })
        .expect(200);

      expect(response.body.var_name).toBe(newName);
    });

    it('should update color code', async () => {
      const response = await request(app)
        .put(`/api/statuses/${testStatus.int_statusid}`)
        .send({ ary_colorcode: '{0,255,0}' })
        .expect(200);

      expect(response.body.ary_colorcode).toBe('{0,255,0}');
    });

    it('should update boolean flags', async () => {
      const response = await request(app)
        .put(`/api/statuses/${testStatus.int_statusid}`)
        .send({ bol_bogen: false, bol_karte: false })
        .expect(200);

      expect(response.body.bol_bogen).toBe(false);
      expect(response.body.bol_karte).toBe(false);
    });

    it('should return 404 for non-existent status', async () => {
      await request(app)
        .put('/api/statuses/999999')
        .send({ var_name: 'Ghost' })
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .put('/api/statuses/abc')
        .send({ var_name: 'Invalid' })
        .expect(400);
    });
  });

  describe('DELETE /api/statuses/:id', () => {
    it('should delete a status', async () => {
      await request(app)
        .delete(`/api/statuses/${testStatus.int_statusid}`)
        .expect(204);

      testStatus = null;
    });

    it('should return 404 for non-existent status', async () => {
      await request(app)
        .delete('/api/statuses/999999')
        .expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app)
        .delete('/api/statuses/abc')
        .expect(400);
    });
  });
});
