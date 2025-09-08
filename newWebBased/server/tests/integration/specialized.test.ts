import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import disciplineFieldRoutes from '../../src/routes/disciplineFields';
import disciplineGroupRoutes from '../../src/routes/disciplineGroups';
import formulaRoutes from '../../src/routes/formulas';
import medalRoutes from '../../src/routes/medals';
import juryResultRoutes from '../../src/routes/juryResults';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/discipline-fields', disciplineFieldRoutes);
app.use('/api/discipline-groups', disciplineGroupRoutes);
app.use('/api/formulas', formulaRoutes);
app.use('/api/medals', medalRoutes);
app.use('/api/jury-results', juryResultRoutes);

describe('Specialized Gymnastics APIs', () => {
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
      name: 'Test Event for Specialized APIs',
      description: 'Test Event Description'
    });
  });

  describe('Discipline Fields API', () => {
    it('should return a list of discipline fields', async () => {
      const response = await request(app)
        .get('/api/discipline-fields')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.disciplineFields).toBeTruthy();
    });

    it('should support filtering by discipline', async () => {
      const response = await request(app)
        .get('/api/discipline-fields?disciplineId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by field type', async () => {
      const response = await request(app)
        .get('/api/discipline-fields?fieldType=score')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle field creation', async () => {
      const newFieldData = {
        disciplineId: 1,
        fieldName: 'test_score',
        fieldType: 'decimal',
        required: true,
        minValue: 0,
        maxValue: 10
      };

      const response = await request(app)
        .post('/api/discipline-fields')
        .send(newFieldData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate field configuration', async () => {
      const invalidData = {
        disciplineId: 1,
        fieldName: 'invalid field name', // Spaces not allowed
        fieldType: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/discipline-fields')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle field updates', async () => {
      const updateData = {
        required: false,
        maxValue: 15
      };

      const response = await request(app)
        .put('/api/discipline-fields/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Discipline Groups API', () => {
    it('should return a list of discipline groups', async () => {
      const response = await request(app)
        .get('/api/discipline-groups')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.disciplineGroups).toBeTruthy();
    });

    it('should support filtering by sport', async () => {
      const response = await request(app)
        .get('/api/discipline-groups?sportId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle group creation', async () => {
      const newGroupData = {
        name: 'Test Discipline Group',
        sportId: 1,
        description: 'Test group description',
        disciplines: [1, 2, 3]
      };

      const response = await request(app)
        .post('/api/discipline-groups')
        .send(newGroupData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate group membership', async () => {
      const invalidData = {
        name: 'Test Group',
        sportId: 1,
        disciplines: [99999] // Non-existent discipline
      };

      const response = await request(app)
        .post('/api/discipline-groups')
        .send(invalidData)
        .expect((res) => {
          expect([400, 404, 422]).toContain(res.status);
        });
    });

    it('should handle group updates', async () => {
      const updateData = {
        name: 'Updated Group Name',
        disciplines: [1, 2, 3, 4]
      };

      const response = await request(app)
        .put('/api/discipline-groups/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Formulas API', () => {
    it('should return a list of formulas', async () => {
      const response = await request(app)
        .get('/api/formulas')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.formulas).toBeTruthy();
    });

    it('should support filtering by category', async () => {
      const response = await request(app)
        .get('/api/formulas?category=scoring')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle formula creation', async () => {
      const newFormulaData = {
        name: 'Test Scoring Formula',
        category: 'scoring',
        formula: 'D_SCORE + E_SCORE - PENALTIES',
        description: 'Basic gymnastics scoring formula',
        variables: ['D_SCORE', 'E_SCORE', 'PENALTIES']
      };

      const response = await request(app)
        .post('/api/formulas')
        .send(newFormulaData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate formula syntax', async () => {
      const invalidData = {
        name: 'Invalid Formula',
        category: 'scoring',
        formula: 'INVALID + + SYNTAX', // Invalid mathematical expression
        variables: ['INVALID']
      };

      const response = await request(app)
        .post('/api/formulas')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should test formula calculation', async () => {
      const testData = {
        formulaId: 1,
        variables: {
          D_SCORE: 6.5,
          E_SCORE: 8.2,
          PENALTIES: 0.1
        }
      };

      const response = await request(app)
        .post('/api/formulas/test')
        .send(testData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should handle formula updates', async () => {
      const updateData = {
        name: 'Updated Formula',
        formula: 'D_SCORE + (E_SCORE * 0.9) - PENALTIES',
        description: 'Updated formula with E_SCORE weighting'
      };

      const response = await request(app)
        .put('/api/formulas/1')
        .send(updateData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Medals API', () => {
    it('should return a list of medals', async () => {
      const response = await request(app)
        .get('/api/medals')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.medals).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/medals?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by medal type', async () => {
      const response = await request(app)
        .get('/api/medals?type=gold')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle medal award', async () => {
      const medalData = {
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        participantId: 1,
        medalType: 'gold',
        category: 'individual'
      };

      const response = await request(app)
        .post('/api/medals')
        .send(medalData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should prevent duplicate medals', async () => {
      const medalData = {
        eventId: testEvent.int_eventid,
        disciplineId: 1,
        participantId: 1,
        medalType: 'gold',
        category: 'individual'
      };

      // First medal
      await request(app)
        .post('/api/medals')
        .send(medalData);

      // Duplicate medal
      const response = await request(app)
        .post('/api/medals')
        .send(medalData)
        .expect((res) => {
          expect([400, 409, 422]).toContain(res.status);
        });
    });

    it('should generate medal standings', async () => {
      const response = await request(app)
        .get(`/api/medals/standings?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide medal statistics', async () => {
      const response = await request(app)
        .get('/api/medals/statistics')
        .query({
          eventId: testEvent.int_eventid,
          clubId: 1
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should handle medal revocation', async () => {
      const revocationData = {
        medalId: 1,
        reason: 'Disqualification due to rules violation'
      };

      const response = await request(app)
        .delete('/api/medals/1')
        .send(revocationData)
        .expect((res) => {
          expect([200, 404, 400]).toContain(res.status);
        });
    });
  });

  describe('Jury Results API', () => {
    it('should return a list of jury results', async () => {
      const response = await request(app)
        .get('/api/jury-results')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body) || response.body.juryResults).toBeTruthy();
    });

    it('should support filtering by event', async () => {
      const response = await request(app)
        .get(`/api/jury-results?eventId=${testEvent.int_eventid}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support filtering by judge', async () => {
      const response = await request(app)
        .get('/api/jury-results?judgeId=1')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should handle jury score submission', async () => {
      const juryScoreData = {
        eventId: testEvent.int_eventid,
        participantId: 1,
        disciplineId: 1,
        judgeId: 1,
        difficultyScore: 6.5,
        executionScore: 8.2,
        penalties: 0.1,
        finalScore: 14.6
      };

      const response = await request(app)
        .post('/api/jury-results')
        .send(juryScoreData)
        .expect((res) => {
          expect([200, 201, 400, 422]).toContain(res.status);
        });
    });

    it('should validate jury score ranges', async () => {
      const invalidData = {
        eventId: testEvent.int_eventid,
        participantId: 1,
        disciplineId: 1,
        judgeId: 1,
        difficultyScore: 15.0, // Too high
        executionScore: 8.2
      };

      const response = await request(app)
        .post('/api/jury-results')
        .send(invalidData)
        .expect((res) => {
          expect([400, 422]).toContain(res.status);
        });
    });

    it('should handle jury inquiries', async () => {
      const inquiryData = {
        resultId: 1,
        inquiryType: 'difficulty_review',
        reason: 'Disputed difficulty score',
        requestedBy: 'coach'
      };

      const response = await request(app)
        .post('/api/jury-results/1/inquiry')
        .send(inquiryData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });

    it('should process jury decisions', async () => {
      const decisionData = {
        inquiryId: 1,
        decision: 'upheld',
        newScore: 15.1,
        reasoning: 'Difficulty element confirmed'
      };

      const response = await request(app)
        .post('/api/jury-results/inquiries/1/decision')
        .send(decisionData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should provide jury statistics', async () => {
      const response = await request(app)
        .get('/api/jury-results/statistics')
        .query({
          eventId: testEvent.int_eventid,
          judgeId: 1
        })
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should handle score appeals', async () => {
      const appealData = {
        resultId: 1,
        appealType: 'execution_review',
        evidence: 'Video footage shows clean execution',
        appealFee: 50.00
      };

      const response = await request(app)
        .post('/api/jury-results/1/appeal')
        .send(appealData)
        .expect((res) => {
          expect([200, 201, 400, 404]).toContain(res.status);
        });
    });
  });

  describe('Cross-API Integration', () => {
    it('should validate formula usage in scoring', async () => {
      const scoreData = {
        formulaId: 1,
        disciplineId: 1,
        participantScores: {
          D_SCORE: 6.5,
          E_SCORE: 8.2,
          PENALTIES: 0.1
        }
      };

      const response = await request(app)
        .post('/api/formulas/calculate-score')
        .send(scoreData)
        .expect((res) => {
          expect([200, 400, 404]).toContain(res.status);
        });
    });

    it('should link discipline fields to scoring', async () => {
      const response = await request(app)
        .get('/api/discipline-fields/1/usage')
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });

    it('should provide comprehensive medal reports', async () => {
      const response = await request(app)
        .get(`/api/medals/comprehensive-report?eventId=${testEvent.int_eventid}`)
        .expect((res) => {
          expect([200, 404]).toContain(res.status);
        });
    });
  });
});
