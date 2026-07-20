import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import timePlanningRoutes from '../../src/routes/timePlanning';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/time-planning', timePlanningRoutes);

describe('Time Planning API', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testCompetition: any;

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
    testEvent = await TestUtils.createTestEvent({ name: `Test Event TP ${Date.now()}` });
    testCompetition = await TestUtils.createTestCompetition({
      name: `Test Competition TP ${Date.now()}`,
      int_veranstaltungenid: testEvent.int_veranstaltungenid
    });
  });

  describe('GET /api/time-planning', () => {
    it('should return time planning data for an event', async () => {
      const response = await request(app)
        .get('/api/time-planning')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body).toHaveProperty('competitions');
      expect(response.body).toHaveProperty('timeSlots');
      expect(response.body).toHaveProperty('squads');
      expect(response.body.competitions).toBeInstanceOf(Array);
      expect(response.body.timeSlots).toBeInstanceOf(Array);
    });

    it('should return 400 when eventId is missing', async () => {
      const response = await request(app)
        .get('/api/time-planning')
        .expect(400);

      expect(response.body.error).toContain('Event ID');
    });

    it('should include competition details with correct field mapping', async () => {
      const response = await request(app)
        .get('/api/time-planning')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body.competitions.length).toBeGreaterThanOrEqual(1);
      const comp = response.body.competitions[0];
      expect(comp).toHaveProperty('id');
      expect(comp).toHaveProperty('name');
      expect(comp).toHaveProperty('round');
      expect(comp).toHaveProperty('disciplineCount');
      expect(comp).toHaveProperty('participantCount');
    });

    it('should return time slots from 8:00 to 18:00 in 15-min intervals', async () => {
      const response = await request(app)
        .get('/api/time-planning')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      const timeSlots = response.body.timeSlots;
      expect(timeSlots.length).toBeGreaterThan(0);
      expect(timeSlots[0].time).toBe('08:00');
      expect(timeSlots[timeSlots.length - 1].time).toBe('18:45');

      // Check 15-minute intervals
      for (let i = 1; i < Math.min(timeSlots.length, 5); i++) {
        const [prevH, prevM] = timeSlots[i - 1].time.split(':').map(Number);
        const [currH, currM] = timeSlots[i].time.split(':').map(Number);
        const diffMinutes = (currH * 60 + currM) - (prevH * 60 + prevM);
        expect(diffMinutes).toBe(15);
      }
    });

    it('should include squadDisciplines array', async () => {
      const response = await request(app)
        .get('/api/time-planning')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body).toHaveProperty('squadDisciplines');
      expect(response.body.squadDisciplines).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/time-planning/matrix', () => {
    it('should return session-specific discipline ids for each round', async () => {
      const sport = await prisma.tfx_sport.findFirstOrThrow();
      const disciplineA = await prisma.tfx_disziplinen.create({
        data: {
          int_sportid: sport.int_sportid,
          var_name: `Matrix Disc A ${Date.now()}`,
          var_kurz1: 'MDA',
        }
      });
      const disciplineB = await prisma.tfx_disziplinen.create({
        data: {
          int_sportid: sport.int_sportid,
          var_name: `Matrix Disc B ${Date.now()}`,
          var_kurz1: 'MDB',
        }
      });
      TestUtils.trackCreated('disciplines', disciplineA.int_disziplinenid);
      TestUtils.trackCreated('disciplines', disciplineB.int_disziplinenid);

      const secondCompetition = await TestUtils.createTestCompetition({
        name: `Test Competition TP 2 ${Date.now()}`,
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
      });

      await prisma.tfx_wettkaempfe.update({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid },
        data: { int_durchgang: 1 },
      });
      await prisma.tfx_wettkaempfe.update({
        where: { int_wettkaempfeid: secondCompetition.int_wettkaempfeid },
        data: { int_durchgang: 2 },
      });

      await prisma.tfx_wettkaempfe_x_disziplinen.create({
        data: {
          int_wettkaempfeid: testCompetition.int_wettkaempfeid,
          int_disziplinenid: disciplineA.int_disziplinenid,
          int_sortierung: 1,
        }
      });
      await prisma.tfx_wettkaempfe_x_disziplinen.create({
        data: {
          int_wettkaempfeid: secondCompetition.int_wettkaempfeid,
          int_disziplinenid: disciplineB.int_disziplinenid,
          int_sortierung: 1,
        }
      });

      const response = await request(app)
        .get('/api/time-planning/matrix')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body.sessionDisciplineIds).toEqual({
        '1': [disciplineA.int_disziplinenid],
        '2': [disciplineB.int_disziplinenid],
      });
    });
  });

  describe('GET /api/time-planning/bahnen', () => {
    it('should return Bahnen (lanes) for an event', async () => {
      const response = await request(app)
        .get('/api/time-planning/bahnen')
        .query({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body).toHaveProperty('bahnen');
      expect(response.body.bahnen).toBeInstanceOf(Array);
    });

    it('should return 400 when eventId is missing', async () => {
      const response = await request(app)
        .get('/api/time-planning/bahnen')
        .expect(400);

      expect(response.body.error).toContain('Event ID');
    });
  });

  describe('PUT /api/time-planning/competition/:competitionId/bahn', () => {
    it('should update a competition Bahn', async () => {
      const response = await request(app)
        .put(`/api/time-planning/competition/${testCompetition.int_wettkaempfeid}/bahn`)
        .send({ bahn: 3 })
        .expect(200);

      expect(response.body).toHaveProperty('competition');

      // Verify the update
      const competition = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid }
      });
      expect(competition?.int_bahn).toBe(3);
    });

    it('should return 404 for non-existent competition', async () => {
      await request(app)
        .put('/api/time-planning/competition/999999/bahn')
        .send({ bahn: 1 })
        .expect(404);
    });

    it('should reject bahn < 1', async () => {
      await request(app)
        .put(`/api/time-planning/competition/${testCompetition.int_wettkaempfeid}/bahn`)
        .send({ bahn: 0 })
        .expect(500);
    });
  });

  describe('POST /api/time-planning/round', () => {
    it('should create a new round number for the event', async () => {
      const response = await request(app)
        .post('/api/time-planning/round')
        .send({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body).toHaveProperty('round');
      expect(typeof response.body.round).toBe('number');
      expect(response.body.round).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 when eventId is missing', async () => {
      const response = await request(app)
        .post('/api/time-planning/round')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Event ID');
    });

    it('should increment round number for subsequent calls', async () => {
      // Set competition to round 2
      await prisma.tfx_wettkaempfe.update({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid },
        data: { int_durchgang: 2 }
      });

      const response = await request(app)
        .post('/api/time-planning/round')
        .send({ eventId: testEvent.int_veranstaltungenid })
        .expect(200);

      expect(response.body.round).toBe(3);
    });
  });

  describe('PUT /api/time-planning/competition/:id/round', () => {
    it('should update a competition round', async () => {
      const response = await request(app)
        .put(`/api/time-planning/competition/${testCompetition.int_wettkaempfeid}/round`)
        .send({ round: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify the update
      const competition = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid }
      });
      expect(competition?.int_durchgang).toBe(5);
    });

    it('should return 400 when round is missing', async () => {
      await request(app)
        .put(`/api/time-planning/competition/${testCompetition.int_wettkaempfeid}/round`)
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/time-planning/squad-start-device', () => {
    it('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .put('/api/time-planning/squad-start-device')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });

    it('should return 404 for non-existent squad-discipline combination', async () => {
      const response = await request(app)
        .put('/api/time-planning/squad-start-device')
        .send({
          eventId: testEvent.int_veranstaltungenid,
          squadName: 'NonExistentSquad',
          round: 1,
          disciplineId: 9999
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });
});
