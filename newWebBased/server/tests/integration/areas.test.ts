import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import areaRoutes from '../../src/routes/areas';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/areas', areaRoutes);

describe('Areas API', () => {
  let prisma: PrismaClient;
  let testArea: any;

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
    testArea = await prisma.tfx_bereiche.create({
      data: {
        var_name: 'Test Bereich ' + Date.now(),
        bol_maennlich: true,
        bol_weiblich: true,
      },
    });
    TestUtils.trackCreated('bereiche', testArea.int_bereicheid);
  });

  describe('GET /api/areas', () => {
    it('should return a list of areas', async () => {
      const response = await request(app).get('/api/areas').expect(200);

      expect(response.body).toHaveProperty('areas');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.areas)).toBe(true);
      expect(response.body.areas.length).toBeGreaterThan(0);
    });

    it('should support search parameter', async () => {
      const response = await request(app)
        .get(`/api/areas?search=${encodeURIComponent(testArea.var_name)}`)
        .expect(200);

      expect(response.body.areas.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.areas.some(
          (a: any) => a.int_bereicheid === testArea.int_bereicheid
        )
      ).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/areas?limit=2&offset=0')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit', 2);
      expect(response.body.pagination).toHaveProperty('offset', 0);
    });
  });

  describe('GET /api/areas/count', () => {
    it('should return the total count', async () => {
      const response = await request(app).get('/api/areas/count').expect(200);

      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('GET /api/areas/:id', () => {
    it('should return a single area by ID', async () => {
      const response = await request(app)
        .get(`/api/areas/${testArea.int_bereicheid}`)
        .expect(200);

      expect(response.body.int_bereicheid).toBe(testArea.int_bereicheid);
      expect(response.body.var_name).toBe(testArea.var_name);
    });

    it('should return 404 for non-existent ID', async () => {
      await request(app).get('/api/areas/999999').expect(404);
    });

    it('should return 400 for invalid ID', async () => {
      await request(app).get('/api/areas/abc').expect(400);
    });
  });

  describe('POST /api/areas', () => {
    it('should create a new area', async () => {
      const newArea = {
        var_name: 'Created Test Bereich ' + Date.now(),
        bol_maennlich: true,
        bol_weiblich: false,
      };

      const response = await request(app)
        .post('/api/areas')
        .send(newArea)
        .expect(201);

      TestUtils.trackCreated('bereiche', response.body.int_bereicheid);

      expect(response.body.var_name).toBe(newArea.var_name);
      expect(response.body.bol_maennlich).toBe(true);
      expect(response.body.bol_weiblich).toBe(false);
    });

    it('should reject empty name', async () => {
      await request(app)
        .post('/api/areas')
        .send({ var_name: '', bol_maennlich: true, bol_weiblich: true })
        .expect(400);
    });
  });

  describe('PUT /api/areas/:id', () => {
    it('should update an existing area', async () => {
      const updatedName = 'Updated Bereich ' + Date.now();

      const response = await request(app)
        .put(`/api/areas/${testArea.int_bereicheid}`)
        .send({ var_name: updatedName })
        .expect(200);

      expect(response.body.var_name).toBe(updatedName);
      expect(response.body.int_bereicheid).toBe(testArea.int_bereicheid);
    });

    it('should update gender flags', async () => {
      const response = await request(app)
        .put(`/api/areas/${testArea.int_bereicheid}`)
        .send({ bol_maennlich: false, bol_weiblich: true })
        .expect(200);

      expect(response.body.bol_maennlich).toBe(false);
      expect(response.body.bol_weiblich).toBe(true);
    });

    it('should return 404 for non-existent area', async () => {
      await request(app)
        .put('/api/areas/999999')
        .send({ var_name: 'Nonexistent' })
        .expect(404);
    });
  });

  describe('DELETE /api/areas/:id', () => {
    it('should delete an area without competitions', async () => {
      const areaToDelete = await prisma.tfx_bereiche.create({
        data: {
          var_name: 'Delete Test ' + Date.now(),
          bol_maennlich: true,
          bol_weiblich: true,
        },
      });
      // No need to track — we're deleting it immediately

      await request(app)
        .delete(`/api/areas/${areaToDelete.int_bereicheid}`)
        .expect(204);

      // Verify deletion
      const check = await prisma.tfx_bereiche.findUnique({
        where: { int_bereicheid: areaToDelete.int_bereicheid },
      });
      expect(check).toBeNull();
    });

    it('should return 404 for non-existent area', async () => {
      await request(app).delete('/api/areas/999999').expect(404);
    });
  });
});
