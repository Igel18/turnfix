import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import teamScoresRoutes from '../../src/routes/teamScores';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/scores', teamScoresRoutes);

describe('Team Scores API', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testCompetition: any;
  let testTeam: any;
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

  beforeEach(async () => {
    testStatus = await prisma.tfx_status.findFirst();

    testClub = await prisma.tfx_vereine.create({
      data: { var_name: `Test Club TeamScores ${Date.now()}` }
    });
    TestUtils.trackCreated('clubs', testClub.int_vereineid);

    testEvent = await TestUtils.createTestEvent({ name: `Test Event TeamScores ${Date.now()}` });
    testCompetition = await TestUtils.createTestCompetition({
      name: `Test Competition TeamScores ${Date.now()}`,
      int_veranstaltungenid: testEvent.int_veranstaltungenid
    });

    testDiscipline = await prisma.tfx_disziplinen.create({
      data: { var_name: `TestDis TS${Date.now()}`, var_kurz1: 'TT', int_versuche: 1, int_sportid: 9001 }
    });
    TestUtils.trackCreated('disciplines', testDiscipline.int_disziplinenid);

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

    testTeam = await prisma.tfx_mannschaften.create({
      data: {
        int_vereineid: testClub.int_vereineid,
        int_wettkaempfeid: testCompetition.int_wettkaempfeid,
        int_nummer: 1,
        int_startnummer: 100
      }
    });
    TestUtils.trackCreated('teams', testTeam.int_mannschaftenid);
  });

  afterEach(async () => {
    // Clean up wertungen details and wertungen for team
    if (testTeam) {
      await prisma.tfx_wertungen_details.deleteMany({
        where: { tfx_wertungen: { int_mannschaftenid: testTeam.int_mannschaftenid } }
      }).catch(() => {});
      await prisma.tfx_wertungen.deleteMany({
        where: { int_mannschaftenid: testTeam.int_mannschaftenid }
      }).catch(() => {});
    }
    if (testDisciplineField) {
      await prisma.tfx_disziplinen_felder.delete({
        where: { int_disziplinen_felderid: testDisciplineField.int_disziplinen_felderid }
      }).catch(() => {});
    }
    await TestUtils.cleanupCreatedRecords();
  });

  describe('GET /api/scores/team', () => {
    it('should return empty results when no team scores exist', async () => {
      const response = await request(app)
        .get('/api/scores/team')
        .query({ competitionId: testCompetition.int_wettkaempfeid })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should support filtering by teamId', async () => {
      const response = await request(app)
        .get('/api/scores/team')
        .query({ teamId: testTeam.int_mannschaftenid })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should support filtering by eventId', async () => {
      const response = await request(app)
        .get('/api/scores/team')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('hasMore');
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/scores/team')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should support filtering by disciplineId', async () => {
      const response = await request(app)
        .get('/api/scores/team')
        .query({ disciplineId: testDiscipline.int_disziplinenid })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/scores/team', () => {
    it('should create a team score successfully', async () => {
      const scoreData = {
        teamId: testTeam.int_mannschaftenid,
        competitionId: testCompetition.int_wettkaempfeid,
        disciplineId: testDiscipline.int_disziplinenid,
        statusId: testStatus?.int_statusid || 1,
        attempt: 1,
        components: [
          { fieldId: testDisciplineField.int_disziplinen_felderid, value: 45.50 }
        ],
        finalScore: 45.50
      };

      const response = await request(app)
        .post('/api/scores/team')
        .send(scoreData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.teamId).toBe(testTeam.int_mannschaftenid);
      expect(response.body.competitionId).toBe(testCompetition.int_wettkaempfeid);
      expect(response.body.message).toContain('successfully');
    });

    it('should return 404 for non-existent team', async () => {
      const response = await request(app)
        .post('/api/scores/team')
        .send({
          teamId: 999999,
          competitionId: testCompetition.int_wettkaempfeid,
          disciplineId: testDiscipline.int_disziplinenid,
          statusId: 1,
          components: [],
          finalScore: 0
        })
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });

    it('should return 404 for non-existent competition', async () => {
      const response = await request(app)
        .post('/api/scores/team')
        .send({
          teamId: testTeam.int_mannschaftenid,
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
        .post('/api/scores/team')
        .send({
          teamId: testTeam.int_mannschaftenid,
          competitionId: testCompetition.int_wettkaempfeid,
          disciplineId: 999999,
          statusId: 1,
          components: [],
          finalScore: 0
        })
        .expect(404);

      expect(response.body.error).toBe('Discipline not found');
    });

    it('should return 400 for validation errors', async () => {
      const response = await request(app)
        .post('/api/scores/team')
        .send({ teamId: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });

    it('should update existing score on duplicate team+competition', async () => {
      const baseData = {
        teamId: testTeam.int_mannschaftenid,
        competitionId: testCompetition.int_wettkaempfeid,
        disciplineId: testDiscipline.int_disziplinenid,
        statusId: testStatus?.int_statusid || 1,
        attempt: 1,
        components: [{ fieldId: testDisciplineField.int_disziplinen_felderid, value: 40.00 }],
        finalScore: 40.00
      };

      const first = await request(app).post('/api/scores/team').send(baseData).expect(201);
      const updated = { ...baseData, finalScore: 50.00, components: [{ fieldId: testDisciplineField.int_disziplinen_felderid, value: 50.00 }] };
      const second = await request(app).post('/api/scores/team').send(updated).expect(201);

      expect(second.body.id).toBe(first.body.id);
    });

    it('should support optional riege and comment fields', async () => {
      const scoreData = {
        teamId: testTeam.int_mannschaftenid,
        competitionId: testCompetition.int_wettkaempfeid,
        disciplineId: testDiscipline.int_disziplinenid,
        statusId: testStatus?.int_statusid || 1,
        attempt: 1,
        components: [{ fieldId: testDisciplineField.int_disziplinen_felderid, value: 42.00 }],
        finalScore: 42.00,
        riege: 'R1',
        comment: 'Team performed well'
      };

      const response = await request(app)
        .post('/api/scores/team')
        .send(scoreData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });

  describe('DELETE /api/scores/team/:scoreId', () => {
    it('should delete an existing team score', async () => {
      const createResponse = await request(app)
        .post('/api/scores/team')
        .send({
          teamId: testTeam.int_mannschaftenid,
          competitionId: testCompetition.int_wettkaempfeid,
          disciplineId: testDiscipline.int_disziplinenid,
          statusId: testStatus?.int_statusid || 1,
          attempt: 1,
          components: [{ fieldId: testDisciplineField.int_disziplinen_felderid, value: 35.00 }],
          finalScore: 35.00
        })
        .expect(201);

      const scoreId = createResponse.body.id;

      const deleteResponse = await request(app)
        .delete(`/api/scores/team/${scoreId}`)
        .expect(200);

      expect(deleteResponse.body.message).toContain('deleted successfully');
      expect(deleteResponse.body.id).toBe(scoreId);
    });

    it('should return 404 for non-existent score', async () => {
      await request(app)
        .delete('/api/scores/team/999999')
        .expect(404);
    });

    it('should return 400 for invalid score ID', async () => {
      await request(app)
        .delete('/api/scores/team/abc')
        .expect(400);
    });
  });
});
