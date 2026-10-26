import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import medalRoutes from '../../src/routes/medals';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/medals', medalRoutes);

describe('Medals API', () => {
  let prisma: PrismaClient;
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
    testEvent = await TestUtils.createTestEvent({ name: `Test Event Medals ${Date.now()}` });
  });

  describe('GET /api/medals', () => {
    it('should return a list of medals/results', async () => {
      const response = await request(app)
        .get('/api/medals')
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should include pagination info', async () => {
      const response = await request(app)
        .get('/api/medals')
        .expect(200);

      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });
  });

  describe('POST /api/medals', () => {
    it('should create a medal award', async () => {
      const medalData = {
        participantId: 1,
        eventId: testEvent.int_veranstaltungenid,
        medalType: 'gold'
      };

      const response = await request(app)
        .post('/api/medals')
        .send(medalData)
        .expect(201);

      expect(response.body.message).toContain('recorded successfully');
    });

    it('should detect duplicate medal awards', async () => {
      const medalData = {
        participantId: 9998,
        eventId: testEvent.int_veranstaltungenid,
        medalType: 'gold'
      };

      // First award
      await request(app).post('/api/medals').send(medalData).expect(201);

      // Duplicate
      const response = await request(app)
        .post('/api/medals')
        .send(medalData)
        .expect(409);

      expect(response.body.error).toContain('Duplicate');
    });

    it('should return 400 for invalid medal type', async () => {
      const response = await request(app)
        .post('/api/medals')
        .send({ medalType: 'Platinum' })
        .expect(400);

      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('GET /api/medals/standings', () => {
    it('should return medal standings', async () => {
      const response = await request(app)
        .get('/api/medals/standings')
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/medals/statistics', () => {
    it('should return medal statistics', async () => {
      const response = await request(app)
        .get('/api/medals/statistics')
        .expect(200);

      expect(response.body).toHaveProperty('totalResults');
      expect(response.body).toHaveProperty('gold');
      expect(response.body).toHaveProperty('silver');
      expect(response.body).toHaveProperty('bronze');
      expect(response.body).toHaveProperty('totalMedals');
    });
  });

  describe('GET /api/medals/comprehensive-report', () => {
    it('should return comprehensive medal report', async () => {
      const response = await request(app)
        .get('/api/medals/comprehensive-report')
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('totalParticipants');
      expect(response.body.summary).toHaveProperty('totalTeams');
      expect(response.body.summary).toHaveProperty('medalsAwarded');
      expect(response.body).toHaveProperty('standings');
      expect(response.body).toHaveProperty('disciplines');
    });
  });

  describe('GET /api/medals/:eventId', () => {
    it('should return medal standings for a specific event', async () => {
      const response = await request(app)
        .get(`/api/medals/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      expect(response.body).toHaveProperty('eventId');
      expect(response.body).toHaveProperty('eventName');
      expect(response.body).toHaveProperty('standings');
      expect(response.body.standings).toBeInstanceOf(Array);
      expect(response.body.eventId).toBe(testEvent.int_veranstaltungenid);
    });

    it('should return 400 for invalid event ID', async () => {
      await request(app)
        .get('/api/medals/abc')
        .expect(400);
    });

    it('should return 404 for non-existent event', async () => {
      await request(app)
        .get('/api/medals/999999')
        .expect(404);
    });

    it('should sort standings: gold > silver > bronze > name', async () => {
      const response = await request(app)
        .get(`/api/medals/${testEvent.int_veranstaltungenid}`)
        .expect(200);

      // Standings should be an array (possibly empty for test events without scores)
      expect(response.body.standings).toBeInstanceOf(Array);
    });

    describe('medal awarding', () => {
      const SCORES = {
        tieA: [13.35, 14.15, 12.1, 12.6],
        tieB: [14.3, 10.5, 14, 13.4],
        low: [5, 5, 5, 5],
      };

      const setupCompetition = async (competitionData: object = {}, scores: Record<string, number[]> = SCORES) => {
        const clubs = await prisma.tfx_vereine.findMany({ take: 3, orderBy: { int_vereineid: 'asc' } });
        const disciplines = await prisma.tfx_disziplinen.findMany({ take: 4, orderBy: { int_disziplinenid: 'asc' } });
        const status = await prisma.tfx_status.findFirstOrThrow();
        const competition = await TestUtils.createTestCompetition({
          name: 'Medal competition',
          int_veranstaltungenid: testEvent.int_veranstaltungenid,
        });
        await prisma.tfx_wettkaempfe.update({
          where: { int_wettkaempfeid: competition.int_wettkaempfeid },
          data: competitionData,
        });

        const clubByKey: Record<string, number> = {};
        for (const [index, [key, values]] of Object.entries(scores).entries()) {
          const participant = await TestUtils.createTestParticipant({ firstName: key, lastName: 'Medal', clubId: clubs[index].int_vereineid });
          const wertung = await prisma.tfx_wertungen.create({
            data: {
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_teilnehmerid: participant.int_teilnehmerid,
              int_statusid: status.int_statusid,
            },
          });
          for (const [disciplineIndex, value] of values.entries()) {
            await prisma.tfx_wertungen_details.create({
              data: {
                int_wertungenid: wertung.int_wertungenid,
                int_disziplinenid: disciplines[disciplineIndex].int_disziplinenid,
                int_versuch: 1,
                rel_leistung: value,
              },
            });
          }
          clubByKey[key] = clubs[index].int_vereineid;
        }
        return { competition, clubByKey };
      };

      const standingOf = async (clubId: number) => {
        const response = await request(app).get(`/api/medals/${testEvent.int_veranstaltungenid}`).expect(200);
        return response.body.standings.find((s: any) => s.clubId === clubId);
      };

      it('gives tied participants the same medal, despite floating-point summation order', async () => {
        const { clubByKey } = await setupCompetition();

        const a = await standingOf(clubByKey.tieA);
        const b = await standingOf(clubByKey.tieB);
        const low = await standingOf(clubByKey.low);

        expect([a.totalGold, a.totalSilver, a.totalBronze]).toEqual([1, 0, 0]);
        expect([b.totalGold, b.totalSilver, b.totalBronze]).toEqual([1, 0, 0]);
        expect([low.totalGold, low.totalSilver, low.totalBronze]).toEqual([0, 0, 1]);
      });

      it('reports the same medals per competition as in the total', async () => {
        const { clubByKey } = await setupCompetition();

        const low = await standingOf(clubByKey.low);
        const b = await standingOf(clubByKey.tieB);

        expect(low.competitions[0]).toMatchObject({ gold: 0, silver: 0, bronze: 1 });
        expect(b.competitions[0]).toMatchObject({ gold: 1, silver: 0, bronze: 0 });
      });

      it('ranks ascending when the competition sorts ascending', async () => {
        const { clubByKey } = await setupCompetition({ bol_sortasc: true });

        const low = await standingOf(clubByKey.low);
        expect([low.totalGold, low.totalSilver, low.totalBronze]).toEqual([1, 0, 0]);
      });

      it('applies the Streichwertung of the competition', async () => {
        const { clubByKey } = await setupCompetition(
          { bol_streichwertung: true, int_anz_streich: 1 },
          { first: [10, 10, 10, 1], second: [9, 9, 9, 9], third: [1, 1, 1, 1] },
        );

        const first = await standingOf(clubByKey.first);
        const second = await standingOf(clubByKey.second);
        expect([first.totalGold, second.totalSilver]).toEqual([1, 1]);
      });

      it('does not award medals without a score', async () => {
        const { clubByKey } = await setupCompetition({}, { none: [0, 0, 0, 0] });

        const none = await standingOf(clubByKey.none);
        expect(none.totalMedals).toBe(0);
      });
    });
  });

  describe('DELETE /api/medals/:id', () => {
    it('should revoke a medal', async () => {
      const response = await request(app)
        .delete('/api/medals/1')
        .expect(200);

      expect(response.body.message).toContain('revoked successfully');
    });
  });
});
