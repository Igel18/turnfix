import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import resultRoutes from '../../src/routes/results';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/results', resultRoutes);

describe('Results API - Pagination Total Count', () => {
  let prisma: PrismaClient;

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

  describe('GET /api/results - pagination.total', () => {
    it('should return a numeric total in pagination', async () => {
      const response = await request(app)
        .get('/api/results')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.pagination).toBeDefined();
      expect(typeof response.body.pagination.total).toBe('number');
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should return total that is not always zero', async () => {
      // First, get total count from DB directly
      const countResult = await prisma.$queryRawUnsafe(
        'SELECT COUNT(*)::int as total FROM tfx_wertungen'
      ) as any[];
      const actualTotal = countResult[0]?.total || 0;

      const response = await request(app)
        .get('/api/results?limit=5&offset=0')
        .expect(200);

      expect(response.body.pagination.total).toBe(actualTotal);
    });

    it('should have hasMore flag when more results exist', async () => {
      const response = await request(app)
        .get('/api/results?limit=1&offset=0')
        .expect(200);

      const { pagination } = response.body;
      expect(pagination).toBeDefined();
      expect(typeof pagination.hasMore).toBe('boolean');

      // If total > 1, hasMore should be true with limit=1
      if (pagination.total > 1) {
        expect(pagination.hasMore).toBe(true);
      }
    });

    it('should have hasMore=false when at end of results', async () => {
      // Get total count first
      const firstResponse = await request(app)
        .get('/api/results?limit=1&offset=0')
        .expect(200);

      const total = firstResponse.body.pagination.total;

      // Request with offset >= total
      const response = await request(app)
        .get(`/api/results?limit=10&offset=${Math.max(0, total)}`)
        .expect(200);

      expect(response.body.pagination.hasMore).toBe(false);
    });

    it('should return correct pagination with filters', async () => {
      // Test with a competitionId filter
      const response = await request(app)
        .get('/api/results?competitionId=1&limit=5&offset=0')
        .expect(200);

      const { pagination, results } = response.body;
      expect(pagination).toBeDefined();
      expect(typeof pagination.total).toBe('number');
      expect(pagination.limit).toBe(5);
      expect(pagination.offset).toBe(0);

      // Total should be >= result count (since we might be paginating)
      if (Array.isArray(results)) {
        expect(pagination.total).toBeGreaterThanOrEqual(results.length);
      }
    });

    it('should preserve limit and offset in pagination response', async () => {
      const response = await request(app)
        .get('/api/results?limit=25&offset=10')
        .expect(200);

      expect(response.body.pagination.limit).toBe(25);
      expect(response.body.pagination.offset).toBe(10);
    });
  });
});
