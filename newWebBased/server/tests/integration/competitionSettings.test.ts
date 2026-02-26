/**
 * Integration tests for competition-level settings:
 *   - "Qualifizierende"          (int_qualifikation / qualifiers)
 *   - "Streichwertungen"         (bol_streichwertung + int_anz_streich / dropWorstScore + dropCount)
 *   - "Gerätepunkte verwenden"   (bol_gerpkt / useApparatusPoints)
 *
 * Covered endpoints:
 *   POST /api/competitions       — create competition with settings
 *   GET  /api/competitions/:id   — retrieve competition and verify persisted settings
 *   PUT  /api/competitions/:id   — update competition settings
 *   GET  /api/competitions       — list competitions includes settings
 *
 * Also verifies that setting information is correctly returned from the API
 * and does not affect other competitions or events unintentionally.
 *
 * NOTE: Uses seed discipline IDs 9001–9004 (Boden, Sprung, Reck, Barren).
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import { TEST_IDS } from '../fixtures/seed-test-data';

import competitionsRouter from '../../src/routes/competitions';

// ─── Test App ─────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use('/api/competitions', competitionsRouter);

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Minimal valid competition payload for POST */
function buildCompetitionPayload(
  eventId: number,
  overrides: Record<string, any> = {}
): Record<string, any> {
  return {
    name: overrides.name ?? 'Settings Test Competition',
    gender: overrides.gender ?? 'männlich',
    ageFrom: overrides.ageFrom ?? 16,
    ageTo: overrides.ageTo ?? 30,
    eventId,
    disciplines: overrides.disciplines ?? [
      { disciplineId: TEST_IDS.disziplinen.boden, maxScore: 10 },
      { disciplineId: TEST_IDS.disziplinen.sprung, maxScore: 10 },
    ],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Competition Settings — Qualifizierende, Streichwertungen, Gerätepunkte', () => {
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

  // ── "Qualifizierende" (qualifiers / int_qualifikation) ─────────────────────

  describe('"Qualifizierende" — qualifiers (int_qualifikation)', () => {
    it('should create competition with qualifiers > 0 and persist the value', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Qualifier Event' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Qualifier Competition',
          qualifiers: 5,
        }))
        .expect(201);

      expect(response.body.qualifiers).toBe(5);
      const compId = response.body.id;

      // Verify via GET
      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.qualifiers).toBe(5);

      // Verify in DB
      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.int_qualifikation).toBe(5);

      TestUtils.trackCreated('competitions', compId);
    });

    it('should default qualifiers to 0 when not specified', async () => {
      const event = await TestUtils.createTestEvent({ name: 'No Qualifier Event' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'No Qualifier Competition',
        }))
        .expect(201);

      expect(response.body.qualifiers).toBe(0);
      TestUtils.trackCreated('competitions', response.body.id);
    });

    it('should update qualifiers via PUT /api/competitions/:id', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Update Qualifier Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Pre-Update Qualifier',
          qualifiers: 2,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      // Update qualifiers to 8
      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({ qualifiers: 8 })
        .expect(200);

      // Verify change
      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.qualifiers).toBe(8);

      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.int_qualifikation).toBe(8);
    });

    it('should update qualifiers to 0 (disable qualifying round)', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Disable Qualifier Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Disable Qualifier Competition',
          qualifiers: 10,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({ qualifiers: 0 })
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.qualifiers).toBe(0);
    });

    it('should include qualifiers in GET / (list) response', async () => {
      const event = await TestUtils.createTestEvent({ name: 'List Qualifier Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'List Qualifier Comp',
          qualifiers: 3,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      const listResponse = await request(app)
        .get('/api/competitions')
        .query({ eventId: event.int_veranstaltungenid })
        .expect(200);

      const found = listResponse.body.find((c: any) => c.id === compId);
      expect(found).toBeDefined();
      expect(found.qualifiers).toBe(3);
    });
  });

  // ── "Streichwertungen" (dropWorstScore + dropCount) ───────────────────────

  describe('"Streichwertungen" — dropWorstScore (bol_streichwertung) + dropCount (int_anz_streich)', () => {
    it('should create competition with dropWorstScore=true and persist', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Streich Event 1' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Streich Competition',
          dropWorstScore: true,
          dropCount: 1,
        }))
        .expect(201);

      expect(response.body.dropWorstScore).toBe(true);
      expect(response.body.dropCount).toBe(1);

      const compId = response.body.id;
      TestUtils.trackCreated('competitions', compId);

      // Verify via GET /:id
      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.dropWorstScore).toBe(true);
      expect(getResponse.body.dropCount).toBe(1);

      // Verify in DB
      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.bol_streichwertung).toBe(true);
      expect(db?.int_anz_streich).toBe(1);
    });

    it('should create competition with dropCount=2 (drop 2 worst scores)', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Streich Event 2' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Drop 2 Competition',
          dropWorstScore: true,
          dropCount: 2,
        }))
        .expect(201);

      const compId = response.body.id;
      TestUtils.trackCreated('competitions', compId);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.dropWorstScore).toBe(true);
      expect(getResponse.body.dropCount).toBe(2);
    });

    it('should default dropWorstScore=false and dropCount=0 when not specified', async () => {
      const event = await TestUtils.createTestEvent({ name: 'No Streich Event' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'No Streich Competition',
        }))
        .expect(201);

      expect(response.body.dropWorstScore).toBe(false);
      expect(response.body.dropCount).toBe(0);
      TestUtils.trackCreated('competitions', response.body.id);
    });

    it('should enable Streichwertungen via PUT /api/competitions/:id', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Enable Streich Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Enable Streich Comp',
          dropWorstScore: false,
          dropCount: 0,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      // Enable Streichwertungen with dropCount=3
      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({ dropWorstScore: true, dropCount: 3 })
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.dropWorstScore).toBe(true);
      expect(getResponse.body.dropCount).toBe(3);

      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.bol_streichwertung).toBe(true);
      expect(db?.int_anz_streich).toBe(3);
    });

    it('should disable Streichwertungen via PUT /api/competitions/:id', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Disable Streich Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Disable Streich Comp',
          dropWorstScore: true,
          dropCount: 2,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({ dropWorstScore: false, dropCount: 0 })
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.dropWorstScore).toBe(false);
      expect(getResponse.body.dropCount).toBe(0);
    });

    it('should include dropWorstScore and dropCount in GET / (list) response', async () => {
      const event = await TestUtils.createTestEvent({ name: 'List Streich Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'List Streich Comp',
          dropWorstScore: true,
          dropCount: 1,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      const listResponse = await request(app)
        .get('/api/competitions')
        .query({ eventId: event.int_veranstaltungenid })
        .expect(200);

      const found = listResponse.body.find((c: any) => c.id === compId);
      expect(found).toBeDefined();
      expect(found.dropWorstScore).toBe(true);
      expect(found.dropCount).toBe(1);
    });
  });

  // ── "Gerätepunkte verwenden" (useApparatusPoints / bol_gerpkt) ─────────────

  describe('"Gerätepunkte verwenden" — useApparatusPoints (bol_gerpkt)', () => {
    it('should create competition with useApparatusPoints=true and persist', async () => {
      const event = await TestUtils.createTestEvent({ name: 'GerPkt Event 1' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'GerPkt Competition',
          useApparatusPoints: true,
        }))
        .expect(201);

      expect(response.body.useApparatusPoints).toBe(true);

      const compId = response.body.id;
      TestUtils.trackCreated('competitions', compId);

      // Verify via GET /:id
      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.useApparatusPoints).toBe(true);

      // Verify in DB
      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.bol_gerpkt).toBe(true);
    });

    it('should default useApparatusPoints=false when not specified', async () => {
      const event = await TestUtils.createTestEvent({ name: 'No GerPkt Event' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'No GerPkt Competition',
        }))
        .expect(201);

      expect(response.body.useApparatusPoints).toBe(false);
      TestUtils.trackCreated('competitions', response.body.id);
    });

    it('should enable useApparatusPoints via PUT /api/competitions/:id', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Enable GerPkt Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Enable GerPkt Comp',
          useApparatusPoints: false,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({ useApparatusPoints: true })
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.useApparatusPoints).toBe(true);

      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.bol_gerpkt).toBe(true);
    });

    it('should disable useApparatusPoints via PUT /api/competitions/:id', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Disable GerPkt Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Disable GerPkt Comp',
          useApparatusPoints: true,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({ useApparatusPoints: false })
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.useApparatusPoints).toBe(false);
    });

    it('should include useApparatusPoints in GET / (list) response', async () => {
      const event = await TestUtils.createTestEvent({ name: 'List GerPkt Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'List GerPkt Comp',
          useApparatusPoints: true,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      const listResponse = await request(app)
        .get('/api/competitions')
        .query({ eventId: event.int_veranstaltungenid })
        .expect(200);

      const found = listResponse.body.find((c: any) => c.id === compId);
      expect(found).toBeDefined();
      expect(found.useApparatusPoints).toBe(true);
    });
  });

  // ── Combined settings ──────────────────────────────────────────────────────

  describe('Combined competition settings', () => {
    it('should create competition with all three settings enabled simultaneously', async () => {
      const event = await TestUtils.createTestEvent({ name: 'All Settings Event' });

      const response = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'All Settings Competition',
          qualifiers: 4,
          dropWorstScore: true,
          dropCount: 1,
          useApparatusPoints: true,
        }))
        .expect(201);

      expect(response.body.qualifiers).toBe(4);
      expect(response.body.dropWorstScore).toBe(true);
      expect(response.body.dropCount).toBe(1);
      expect(response.body.useApparatusPoints).toBe(true);

      const compId = response.body.id;
      TestUtils.trackCreated('competitions', compId);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.qualifiers).toBe(4);
      expect(getResponse.body.dropWorstScore).toBe(true);
      expect(getResponse.body.dropCount).toBe(1);
      expect(getResponse.body.useApparatusPoints).toBe(true);

      // Verify in DB
      const db = await prisma.tfx_wettkaempfe.findUnique({
        where: { int_wettkaempfeid: compId },
      });
      expect(db?.int_qualifikation).toBe(4);
      expect(db?.bol_streichwertung).toBe(true);
      expect(db?.int_anz_streich).toBe(1);
      expect(db?.bol_gerpkt).toBe(true);
    });

    it('should update all three settings in a single PUT request', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Multi Update Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Multi Update Comp',
          qualifiers: 0,
          dropWorstScore: false,
          dropCount: 0,
          useApparatusPoints: false,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      // Update all settings at once
      await request(app)
        .put(`/api/competitions/${compId}`)
        .send({
          qualifiers: 6,
          dropWorstScore: true,
          dropCount: 2,
          useApparatusPoints: true,
        })
        .expect(200);

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      expect(getResponse.body.qualifiers).toBe(6);
      expect(getResponse.body.dropWorstScore).toBe(true);
      expect(getResponse.body.dropCount).toBe(2);
      expect(getResponse.body.useApparatusPoints).toBe(true);
    });

    it('should not affect settings of other competitions in same event', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Isolation Event' });

      // Competition with settings
      const resA = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Comp A With Settings',
          qualifiers: 5,
          dropWorstScore: true,
          dropCount: 1,
          useApparatusPoints: true,
        }))
        .expect(201);
      TestUtils.trackCreated('competitions', resA.body.id);

      // Competition without settings
      const resB = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Comp B No Settings',
          gender: 'weiblich',
        }))
        .expect(201);
      TestUtils.trackCreated('competitions', resB.body.id);

      // Verify Comp B has default settings unaffected by Comp A
      const getB = await request(app)
        .get(`/api/competitions/${resB.body.id}`)
        .expect(200);

      expect(getB.body.qualifiers).toBe(0);
      expect(getB.body.dropWorstScore).toBe(false);
      expect(getB.body.dropCount).toBe(0);
      expect(getB.body.useApparatusPoints).toBe(false);
    });
  });

  // ── Settings persisted between participants ────────────────────────────────

  describe('Settings persist correctly with registered participants', () => {
    it('participantCount is not affected by competition settings', async () => {
      const event = await TestUtils.createTestEvent({ name: 'Count + Settings Event' });

      const createRes = await request(app)
        .post('/api/competitions')
        .send(buildCompetitionPayload(event.int_veranstaltungenid, {
          name: 'Count + Settings Comp',
          qualifiers: 3,
          dropWorstScore: true,
          dropCount: 1,
          useApparatusPoints: true,
        }))
        .expect(201);

      const compId = createRes.body.id;
      TestUtils.trackCreated('competitions', compId);

      // Register 2 participants directly in DB
      for (let i = 0; i < 2; i++) {
        const p = await TestUtils.createTestParticipant({
          firstName: `CountSettings${i}`,
          lastName: 'Test',
        });
        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: p.int_teilnehmerid,
            int_wettkaempfeid: compId,
            int_startnummer: i + 1,
            var_riege: '',
            int_statusid: 1,
          },
        });
      }

      const getResponse = await request(app)
        .get(`/api/competitions/${compId}`)
        .expect(200);

      // Settings should remain unchanged
      expect(getResponse.body.qualifiers).toBe(3);
      expect(getResponse.body.dropWorstScore).toBe(true);
      expect(getResponse.body.dropCount).toBe(1);
      expect(getResponse.body.useApparatusPoints).toBe(true);
      // participantCount should reflect the registered participants
      expect(getResponse.body.participantCount).toBe(2);
    });
  });
});
