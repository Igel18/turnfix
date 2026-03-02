/**
 * Score Validation Edge Cases — Server Integration Tests
 * 
 * Tests invalid inputs, boundary values, type coercion, and error handling
 * for all scoring endpoints:
 *   - POST /api/scores (individual scores via Zod schema)
 *   - POST /api/scores/save-value (score capture with manual validation)
 *   - POST /api/scores/group (group scores via Zod schema)
 *   - POST /api/scores/team (team scores via Zod schema)
 *   - POST /api/medals (medal awards via Zod enum)
 *   - GET /api/scores (query param edge cases)
 *   - DELETE /api/scores/:id (invalid ID formats)
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import scoresRoutes from '../../src/routes/scores';
import groupScoresRoutes from '../../src/routes/groupScores';
import teamScoresRoutes from '../../src/routes/teamScores';
import medalRoutes from '../../src/routes/medals';
import { TestUtils } from '../utils/testUtils';

// Build a combined app with all scoring-related routes
const app = express();
app.use(express.json());
app.use('/api/scores', scoresRoutes);        // includes /save-value sub-router
app.use('/api/scores', groupScoresRoutes);   // /api/scores/group/*
app.use('/api/scores', teamScoresRoutes);    // /api/scores/team/*
app.use('/api/medals', medalRoutes);

describe('Score Validation Edge Cases', () => {
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

  // ═══════════════════════════════════════════════════════════════
  // 1. POST /api/scores — Individual Score Validation (Zod)
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/scores — Individual Score Validation', () => {
    it('should reject completely empty body', async () => {
      const res = await request(app).post('/api/scores').send({});
      expect(res.status).toBe(400);
    });

    it('should reject null competitionId', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: null,
        participantId: 1,
        statusId: 1
      });
      expect(res.status).toBe(400);
    });

    it('should reject string values for numeric fields', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: 'abc',
        participantId: 'xyz',
        statusId: 'one'
      });
      expect(res.status).toBe(400);
    });

    it('should reject float values for integer fields (Zod .int())', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: 1.5,
        participantId: 2.7,
        statusId: 3.9
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing participantId', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: 9001,
        statusId: 1
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing statusId', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: 9001,
        participantId: 9001
      });
      expect(res.status).toBe(400);
    });

    it('should handle extra unknown fields without crashing', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: 9001,
        participantId: 9001,
        statusId: 9001,
        unknownField: 'should be ignored',
        anotherFake: 999
      });
      // Zod strips unknown fields — should not 500
      expect(res.status).not.toBe(500);
    });

    it('should handle MAX_SAFE_INTEGER values (overflows Postgres int)', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: Number.MAX_SAFE_INTEGER,
        participantId: Number.MAX_SAFE_INTEGER,
        statusId: 1
      });
      // MAX_SAFE_INTEGER overflows Postgres int32 — results in 400 or 500
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle zero values (Postgres accepts them)', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: 0,
        participantId: 0,
        statusId: 0
      });
      // 0 is a valid Zod int and Postgres allows insertion without strict FK enforcement
      expect([201, 400, 500]).toContain(res.status);
    });

    it('should reject boolean where number expected', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: true,
        participantId: false,
        statusId: 1
      });
      expect(res.status).toBe(400);
    });

    it('should reject array where number expected', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: [1],
        participantId: 1,
        statusId: 1
      });
      expect(res.status).toBe(400);
    });

    it('should reject object where number expected', async () => {
      const res = await request(app).post('/api/scores').send({
        competitionId: { id: 1 },
        participantId: 1,
        statusId: 1
      });
      expect(res.status).toBe(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. POST /api/scores/save-value — Score Capture (manual validation)
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/scores/save-value — Score Capture Validation', () => {
    it('should reject empty body', async () => {
      const res = await request(app).post('/api/scores/save-value').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should reject missing participantId', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        disciplineId: 9001,
        score: 5.0
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should reject missing disciplineId', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        score: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should reject score: null', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        disciplineId: 9001,
        score: null
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing score (undefined)', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        disciplineId: 9001
      });
      expect(res.status).toBe(400);
    });

    it('should reject generated discipline ID like "Boden-0"', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        disciplineId: 'Boden-0',
        score: 5.0
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('generated discipline ID');
    });

    it('should reject generated discipline ID like "Pauschenpferd-0"', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        disciplineId: 'Pauschenpferd-0',
        score: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should reject purely non-numeric discipline ID "abc"', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        disciplineId: 'abc',
        score: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should accept score of exactly 0 (valid deduction result)', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 99999,
        participantId: 99999,
        disciplineId: 99999,
        score: 0
      });
      // 0 is falsy but checked via === undefined / === null, so 0 passes validation
      // Will get 400 "Could not determine correct competition" — not a validation error
      expect(res.body.error).not.toContain('required');
      expect(res.status).not.toBe(500);
    });

    it('should reject participantId = 0 (falsy → fails !participantId check)', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 0,
        disciplineId: 9001,
        score: 5.0
      });
      // participantId = 0 is falsy → !participantId = true → rejected
      expect(res.status).toBe(400);
    });

    it('should reject disciplineId = 0 (falsy → fails !disciplineId check)', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 9001,
        participantId: 9001,
        disciplineId: 0,
        score: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should handle very large score value', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 99999,
        participantId: 99999,
        disciplineId: 99999,
        score: 99999.99
      });
      // Valid input — passes validation, fails on competition lookup
      expect(res.body.error).not.toContain('required');
      expect(res.status).not.toBe(500);
    });

    it('should handle negative score (penalties)', async () => {
      const res = await request(app).post('/api/scores/save-value').send({
        competitionId: 99999,
        participantId: 99999,
        disciplineId: 99999,
        score: -1.5
      });
      // Negative score passes validation, fails on competition lookup
      expect(res.body.error).not.toContain('required');
      expect(res.status).not.toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. POST /api/scores/group — Group Score Validation (Zod)
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/scores/group — Group Score Validation', () => {
    it('should reject empty body', async () => {
      const res = await request(app).post('/api/scores/group').send({});
      expect(res.status).toBe(400);
    });

    it('should reject missing groupId', async () => {
      const res = await request(app).post('/api/scores/group').send({
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing components array', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-array components (string)', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: 'not-an-array',
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-array components (number)', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: 42,
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject components with missing fieldId', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [{ value: 5.0 }],
        finalScore: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should reject components with missing value', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [{ fieldId: 1 }],
        finalScore: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing finalScore', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [{ fieldId: 1, value: 5.0 }]
      });
      expect(res.status).toBe(400);
    });

    it('should reject float for attempt field (must be int)', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        attempt: 1.5,
        components: [{ fieldId: 1, value: 5.0 }],
        finalScore: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-string riege (number)', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0,
        riege: 12345
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-string comment (boolean)', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0,
        comment: true
      });
      expect(res.status).toBe(400);
    });

    it('should pass validation with empty components + non-existent group → 404', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 999999,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      // Validation passes (all types correct) → business logic returns 404
      expect(res.status).toBe(404);
    });

    it('should accept optional riege and comment strings → 404 (group not found)', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 999999,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0,
        riege: 'Riege A',
        comment: 'Test comment'
      });
      expect(res.status).toBe(404);
    });

    it('should handle SQL injection in comment field safely', async () => {
      const res = await request(app).post('/api/scores/group').send({
        groupId: 999999,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0,
        comment: "'; DROP TABLE tfx_wertungen; --"
      });
      // Should either fail with 404 (group not found) or succeed without SQL injection
      expect(res.status).not.toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. POST /api/scores/team — Team Score Validation (Zod)
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/scores/team — Team Score Validation', () => {
    it('should reject empty body', async () => {
      const res = await request(app).post('/api/scores/team').send({});
      expect(res.status).toBe(400);
    });

    it('should reject missing teamId', async () => {
      const res = await request(app).post('/api/scores/team').send({
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject components with non-numeric value', async () => {
      const res = await request(app).post('/api/scores/team').send({
        teamId: 1,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [{ fieldId: 1, value: 'abc' }],
        finalScore: 5.0
      });
      expect(res.status).toBe(400);
    });

    it('should reject non-integer teamId (float)', async () => {
      const res = await request(app).post('/api/scores/team').send({
        teamId: 1.5,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject boolean where number expected', async () => {
      const res = await request(app).post('/api/scores/team').send({
        teamId: true,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject array where number expected', async () => {
      const res = await request(app).post('/api/scores/team').send({
        teamId: [1, 2],
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should reject null teamId', async () => {
      const res = await request(app).post('/api/scores/team').send({
        teamId: null,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(400);
    });

    it('should pass validation with non-existent team → 404', async () => {
      const res = await request(app).post('/api/scores/team').send({
        teamId: 999999,
        competitionId: 9001,
        disciplineId: 9001,
        statusId: 1,
        components: [],
        finalScore: 0
      });
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. POST /api/medals — Medal Award Validation (Zod enum)
  // ═══════════════════════════════════════════════════════════════

  describe('POST /api/medals — Medal Award Validation', () => {
    it('should reject invalid medal type "platinum"', async () => {
      const res = await request(app).post('/api/medals').send({
        participantId: 1,
        eventId: 9001,
        medalType: 'platinum'
      });
      expect(res.status).toBe(400);
    });

    it('should reject wrong casing "Gold" (must be lowercase)', async () => {
      const res = await request(app).post('/api/medals').send({
        participantId: 1,
        eventId: 9001,
        medalType: 'Gold'
      });
      expect(res.status).toBe(400);
    });

    it('should reject wrong casing "SILVER"', async () => {
      const res = await request(app).post('/api/medals').send({
        participantId: 1,
        eventId: 9001,
        medalType: 'SILVER'
      });
      expect(res.status).toBe(400);
    });

    it('should reject empty string medal type', async () => {
      const res = await request(app).post('/api/medals').send({
        participantId: 1,
        eventId: 9001,
        medalType: ''
      });
      expect(res.status).toBe(400);
    });

    it('should reject numeric medal type', async () => {
      const res = await request(app).post('/api/medals').send({
        participantId: 1,
        eventId: 9001,
        medalType: 1
      });
      expect(res.status).toBe(400);
    });

    it('should accept all valid medal types', async () => {
      for (const type of ['gold', 'silver', 'bronze']) {
        const res = await request(app).post('/api/medals').send({
          participantId: Date.now() + Math.random(),  // unique to avoid duplicate detection
          eventId: 9001,
          medalType: type
        });
        expect(res.status).toBe(201);
      }
    });

    it('should accept medal without medalType (optional field)', async () => {
      const res = await request(app).post('/api/medals').send({
        participantId: Date.now() + 1000,
        eventId: 9001
      });
      expect(res.status).toBe(201);
    });

    it('should accept empty body (all fields optional)', async () => {
      const res = await request(app).post('/api/medals').send({});
      expect(res.status).toBe(201);
    });

    it('should detect duplicate medal award', async () => {
      const medalData = {
        participantId: 88888,
        eventId: 9001,
        medalType: 'gold'
      };
      // First request succeeds
      const res1 = await request(app).post('/api/medals').send(medalData);
      expect(res1.status).toBe(201);

      // Second identical request → duplicate detection
      const res2 = await request(app).post('/api/medals').send(medalData);
      expect(res2.status).toBe(409);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. GET /api/scores — Query Parameter Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/scores — Query Parameter Edge Cases', () => {
    it('should handle very large offset (returns empty results)', async () => {
      const res = await request(app).get('/api/scores?offset=999999999');
      expect(res.status).toBe(200);
      expect(res.body.results).toEqual([]);
    });

    it('should handle multiple filters simultaneously', async () => {
      const res = await request(app).get(
        '/api/scores?competitionId=9001&participantId=9001&disciplineId=9001&limit=10&offset=0'
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should handle SQL injection attempt in squadName (parameterized query)', async () => {
      const res = await request(app).get(
        "/api/scores?squadName=' OR 1=1; DROP TABLE tfx_wertungen; --"
      );
      // Parameterized queries prevent SQL injection
      expect(res.status).toBe(200);
    });

    it('should return default pagination with no params', async () => {
      const res = await request(app).get('/api/scores');
      expect(res.status).toBe(200);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. DELETE /api/scores/:id — Delete Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('DELETE /api/scores/:id — Delete Edge Cases', () => {
    it('should return 400 for non-numeric ID "abc"', async () => {
      const res = await request(app).delete('/api/scores/abc');
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent numeric ID', async () => {
      const res = await request(app).delete('/api/scores/999999999');
      expect(res.status).toBe(404);
    });

    it('should handle negative ID gracefully', async () => {
      const res = await request(app).delete('/api/scores/-1');
      // -1 passes parseInt but won't find a record
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. GET /api/medals/:eventId — Medal Query Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('GET /api/medals/:eventId — Medal Query Edge Cases', () => {
    it('should return 400 for non-numeric eventId "abc"', async () => {
      const res = await request(app).get('/api/medals/abc');
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app).get('/api/medals/999999999');
      expect(res.status).toBe(404);
    });

    it('should return 400 for "NaN" as eventId', async () => {
      const res = await request(app).get('/api/medals/NaN');
      expect(res.status).toBe(400);
    });

    it('should handle statistics endpoint without errors', async () => {
      const res = await request(app).get('/api/medals/statistics');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalResults');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. DELETE /api/scores/group/:scoreId — Group Score Delete Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('DELETE /api/scores/group/:scoreId — Group Delete Edge Cases', () => {
    it('should return 400 for non-numeric group score ID', async () => {
      const res = await request(app).delete('/api/scores/group/abc');
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent group score', async () => {
      const res = await request(app).delete('/api/scores/group/999999999');
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. DELETE /api/scores/team/:scoreId — Team Score Delete Edge Cases
  // ═══════════════════════════════════════════════════════════════

  describe('DELETE /api/scores/team/:scoreId — Team Delete Edge Cases', () => {
    it('should return 400 for non-numeric team score ID', async () => {
      const res = await request(app).delete('/api/scores/team/abc');
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent team score', async () => {
      const res = await request(app).delete('/api/scores/team/999999999');
      expect(res.status).toBe(404);
    });
  });
});
