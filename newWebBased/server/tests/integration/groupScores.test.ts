import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import groupScoresRoutes from '../../src/routes/groupScores';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/scores', groupScoresRoutes);

describe('Group Scores API', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testCompetition: any;
  let testGroup: any;
  let testClub: any;
  let testDiscipline: any;
  let testDisciplineField: any;
  let testStatus: any;

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
    // Create test status
    testStatus = await prisma.tfx_status.findFirst();

    // Create test club
    testClub = await prisma.tfx_vereine.create({
      data: { var_name: `Test Club GroupScores ${Date.now()}` }
    });
    TestUtils.trackCreated('clubs', testClub.int_vereineid);

    // Create test event + competition
    testEvent = await TestUtils.createTestEvent({ name: `Test Event GroupScores ${Date.now()}` });
    testCompetition = await TestUtils.createTestCompetition({
      name: `Test Competition GroupScores ${Date.now()}`,
      int_veranstaltungenid: testEvent.int_veranstaltungenid
    });

    // Create test discipline
    testDiscipline = await prisma.tfx_disziplinen.create({
      data: { var_name: `TestDis GS${Date.now()}`, var_kurz1: 'GS', int_versuche: 1, int_sportid: 9001 }
    });
    TestUtils.trackCreated('disciplines', testDiscipline.int_disziplinenid);

    // Create a discipline field (endwert = true)
    testDisciplineField = await prisma.tfx_disziplinen_felder.create({
      data: {
        int_disziplinenid: testDiscipline.int_disziplinenid,
        var_name: 'Note',
        int_sortierung: 1,
        bol_endwert: true,
        bol_ausgangswert: false,
        int_gruppe: 1
      }
    });

    // Create test group
    testGroup = await prisma.tfx_gruppen.create({
      data: {
        var_name: `Test Gruppe ${Date.now()}`,
        int_vereineid: testClub.int_vereineid
      }
    });
  });

  afterEach(async () => {
    // Clean up group, discipline field, wertungen
    if (testGroup) {
      await prisma.tfx_wertungen_details.deleteMany({
        where: { tfx_wertungen: { int_gruppenid: testGroup.int_gruppenid } }
      }).catch(() => {});
      await prisma.tfx_wertungen.deleteMany({
        where: { int_gruppenid: testGroup.int_gruppenid }
      }).catch(() => {});
      await prisma.tfx_gruppen.delete({
        where: { int_gruppenid: testGroup.int_gruppenid }
      }).catch(() => {});
    }
    if (testDisciplineField) {
      await prisma.tfx_disziplinen_felder.delete({
        where: { int_disziplinen_felderid: testDisciplineField.int_disziplinen_felderid }
      }).catch(() => {});
    }
  });

  describe('GET /api/scores/group', () => {
    it('should return empty results when no group scores exist', async () => {
      const response = await request(app)
        .get('/api/scores/group')
        .query({ competitionId: testCompetition.int_wettkaempfeid })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should support filtering by groupId', async () => {
      const response = await request(app)
        .get('/api/scores/group')
        .query({ groupId: testGroup.int_gruppenid })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should support filtering by eventId', async () => {
      const response = await request(app)
        .get('/api/scores/group')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('offset');
    });

    it('should support pagination with limit and offset', async () => {
      const response = await request(app)
        .get('/api/scores/group')
        .query({ limit: 5, offset: 0 })
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.pagination.offset).toBe(0);
    });
  });

  describe('POST /api/scores/group', () => {
    it('should create a group score successfully', async () => {
      const scoreData = {
        groupId: testGroup.int_gruppenid,
        competitionId: testCompetition.int_wettkaempfeid,
        disciplineId: testDiscipline.int_disziplinenid,
        statusId: testStatus?.int_statusid || 1,
        attempt: 1,
        components: [
          { fieldId: testDisciplineField.int_disziplinen_felderid, value: 9.50 }
        ],
        finalScore: 9.50
      };

      const response = await request(app)
        .post('/api/scores/group')
        .send(scoreData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.groupId).toBe(testGroup.int_gruppenid);
      expect(response.body.competitionId).toBe(testCompetition.int_wettkaempfeid);
      expect(response.body.message).toContain('successfully');
    });

    it('should return 404 for non-existent group', async () => {
      const response = await request(app)
        .post('/api/scores/group')
        .send({
          groupId: 999999,
          competitionId: testCompetition.int_wettkaempfeid,
          disciplineId: testDiscipline.int_disziplinenid,
          statusId: 1,
          components: [],
          finalScore: 0
        })
        .expect(404);

      expect(response.body.error).toBe('Group not found');
    });

    it('should return 404 for non-existent competition', async () => {
      const response = await request(app)
        .post('/api/scores/group')
        .send({
          groupId: testGroup.int_gruppenid,
          competitionId: 999999,
          disciplineId: testDiscipline.int_disziplinenid,
          statusId: 1,
          components: [],
          finalScore: 0
        })
        .expect(404);

      expect(response.body.error).toBe('Competition not found');
    });

    it('should return 404 for non-existent discipline', async () => {
      const response = await request(app)
        .post('/api/scores/group')
        .send({
          groupId: testGroup.int_gruppenid,
          competitionId: testCompetition.int_wettkaempfeid,
          disciplineId: 999999,
          statusId: 1,
          components: [],
          finalScore: 0
        })
        .expect(404);

      expect(response.body.error).toBe('Discipline not found');
    });

    it('should return 400 for invalid body (missing required fields)', async () => {
      const response = await request(app)
        .post('/api/scores/group')
        .send({ groupId: 'not-a-number' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
      expect(response.body).toHaveProperty('details');
    });

    it('should update existing score on duplicate group+competition', async () => {
      const baseData = {
        groupId: testGroup.int_gruppenid,
        competitionId: testCompetition.int_wettkaempfeid,
        disciplineId: testDiscipline.int_disziplinenid,
        statusId: testStatus?.int_statusid || 1,
        attempt: 1,
        components: [
          { fieldId: testDisciplineField.int_disziplinen_felderid, value: 8.00 }
        ],
        finalScore: 8.00
      };

      // Create first
      const first = await request(app).post('/api/scores/group').send(baseData).expect(201);

      // Update with new score
      const updatedData = { ...baseData, finalScore: 9.00, components: [{ fieldId: testDisciplineField.int_disziplinen_felderid, value: 9.00 }] };
      const second = await request(app).post('/api/scores/group').send(updatedData).expect(201);

      // Should reuse same wertung ID
      expect(second.body.id).toBe(first.body.id);
    });
  });

  describe('DELETE /api/scores/group/:scoreId', () => {
    it('should delete an existing group score', async () => {
      // First create a score
      const createResponse = await request(app)
        .post('/api/scores/group')
        .send({
          groupId: testGroup.int_gruppenid,
          competitionId: testCompetition.int_wettkaempfeid,
          disciplineId: testDiscipline.int_disziplinenid,
          statusId: testStatus?.int_statusid || 1,
          attempt: 1,
          components: [{ fieldId: testDisciplineField.int_disziplinen_felderid, value: 7.50 }],
          finalScore: 7.50
        })
        .expect(201);

      const scoreId = createResponse.body.id;

      // Now delete
      const deleteResponse = await request(app)
        .delete(`/api/scores/group/${scoreId}`)
        .expect(200);

      expect(deleteResponse.body.message).toContain('deleted successfully');
      expect(deleteResponse.body.id).toBe(scoreId);
    });

    it('should return 404 for non-existent score', async () => {
      await request(app)
        .delete('/api/scores/group/999999')
        .expect(404);
    });

    it('should return 400 for invalid score ID', async () => {
      await request(app)
        .delete('/api/scores/group/abc')
        .expect(400);
    });
  });
});
