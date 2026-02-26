/**
 * Integration tests for participant-level settings:
 *   - "Nimmt nicht Teil" (bol_startet_nicht) — participant excluded from competition
 *   - "Außer Konkurenz"  (bol_ak)             — participant competes but not ranked
 *
 * Covered endpoints:
 *   PUT  /api/event-participants/update-status  — set bol_startet_nicht
 *   PUT  /api/event-participants/update-details — set bol_startet_nicht via details
 *   GET  /api/competition-status               — participantCount excludes bol_startet_nicht=true
 *   GET  /api/meldematrix                      — counts all registrations regardless of flag
 *   GET  /api/meldematrix/statistics           — counts all registrations regardless of flag
 *   POST /api/scores                           — create wertung with ak flag
 *   PUT  /api/scores/:id                       — update ak flag
 *   DB check for bol_ak in tfx_wertungen       — confirms value persisted correctly
 *
 * Notes:
 *   - competition-status returns { competitions: [...], ... } (not a flat array)
 *   - scores POST stores null (not false) for boolean false flags due to `false || null` JS coercion
 *   - scores GET mapped response does not expose bol_ak; verified via DB query instead
 *   - meldematrix/statistics uses INNER JOIN on tfx_vereine →
 *     participants must use an existing club ID (seed club 9001)
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import { TEST_IDS } from '../fixtures/seed-test-data';

import eventParticipantRoutes from '../../src/routes/eventParticipants';
import competitionStatusRouter from '../../src/routes/competition-status';
import meldematrixRouter from '../../src/routes/meldematrix';
import scoresRouter from '../../src/routes/scores';

// ─── Test Apps ────────────────────────────────────────────────────────────────

const participantsApp = express();
participantsApp.use(express.json());
participantsApp.use('/api/event-participants', eventParticipantRoutes);

const competitionStatusApp = express();
competitionStatusApp.use(express.json());
competitionStatusApp.use('/api/competition-status', competitionStatusRouter);

const meldematrixApp = express();
meldematrixApp.use(express.json());
meldematrixApp.use('/api/meldematrix', meldematrixRouter);

const scoresApp = express();
scoresApp.use(express.json());
scoresApp.use('/api/scores', scoresRouter);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Participant Settings — Nimmt nicht Teil & Außer Konkurenz', () => {
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

  // ── "Nimmt nicht Teil" (bol_startet_nicht) ─────────────────────────────────

  describe('"Nimmt nicht Teil" — bol_startet_nicht', () => {
    describe('PUT /api/event-participants/update-status', () => {
      it('should set bol_startet_nicht = true for participant in event', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Test Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN Competition',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Nimmt',
          lastName: 'NichtTeil',
        });

        // Register participant in event
        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 1,
            var_riege: '',
            int_statusid: 1,
            bol_startet_nicht: false,
          },
        });

        const response = await request(participantsApp)
          .put('/api/event-participants/update-status')
          .send({
            participantId: participant.int_teilnehmerid,
            eventId: event.int_veranstaltungenid,
            startetNicht: true,
          })
          .expect(200);

        expect(response.body.startetNicht).toBe(true);
        expect(response.body.updatedRecords).toBeGreaterThanOrEqual(1);

        // Verify in DB
        const wertung = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });
        expect(wertung?.bol_startet_nicht).toBe(true);
      });

      it('should reset bol_startet_nicht = false for participant in event', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Reset Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN Reset Competition',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Reset',
          lastName: 'StartetNicht',
        });

        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 1,
            var_riege: '',
            int_statusid: 1,
            bol_startet_nicht: true,
          },
        });

        const response = await request(participantsApp)
          .put('/api/event-participants/update-status')
          .send({
            participantId: participant.int_teilnehmerid,
            eventId: event.int_veranstaltungenid,
            startetNicht: false,
          })
          .expect(200);

        expect(response.body.startetNicht).toBe(false);

        const wertung = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });
        expect(wertung?.bol_startet_nicht).toBe(false);
      });

      it('should propagate bol_startet_nicht across all wertungen of participant in event', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Multi-Comp Event' });
        const comp1 = await TestUtils.createTestCompetition({
          name: 'SN Comp 1',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });
        const comp2 = await TestUtils.createTestCompetition({
          name: 'SN Comp 2',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Multi',
          lastName: 'CompSN',
        });

        // Register participant in both competitions
        await prisma.tfx_wertungen.createMany({
          data: [
            {
              int_teilnehmerid: participant.int_teilnehmerid,
              int_wettkaempfeid: comp1.int_wettkaempfeid,
              int_startnummer: 1,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: false,
            },
            {
              int_teilnehmerid: participant.int_teilnehmerid,
              int_wettkaempfeid: comp2.int_wettkaempfeid,
              int_startnummer: 2,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: false,
            },
          ],
        });

        const response = await request(participantsApp)
          .put('/api/event-participants/update-status')
          .send({
            participantId: participant.int_teilnehmerid,
            eventId: event.int_veranstaltungenid,
            startetNicht: true,
          })
          .expect(200);

        expect(response.body.updatedRecords).toBe(2);

        const all = await prisma.tfx_wertungen.findMany({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: { in: [comp1.int_wettkaempfeid, comp2.int_wettkaempfeid] },
          },
        });
        expect(all.every(w => w.bol_startet_nicht === true)).toBe(true);
      });

      it('should return 400 when participantId is missing', async () => {
        await request(participantsApp)
          .put('/api/event-participants/update-status')
          .send({ eventId: 1, startetNicht: true })
          .expect(400);
      });

      it('should return 400 when eventId is missing', async () => {
        await request(participantsApp)
          .put('/api/event-participants/update-status')
          .send({ participantId: 1, startetNicht: true })
          .expect(400);
      });

      it('should return 400 when startetNicht is not a boolean', async () => {
        await request(participantsApp)
          .put('/api/event-participants/update-status')
          .send({ participantId: 1, eventId: 1, startetNicht: 'yes' })
          .expect(400);
      });
    });

    describe('PUT /api/event-participants/update-details — bol_startet_nicht via details', () => {
      it('should update bol_startet_nicht via update-details endpoint', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Details Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN Details Comp',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Details',
          lastName: 'SNTest',
        });

        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 1,
            var_riege: '',
            int_statusid: 1,
            bol_startet_nicht: false,
          },
        });

        await request(participantsApp)
          .put('/api/event-participants/update-details')
          .send({
            participantId: participant.int_teilnehmerid,
            eventId: event.int_veranstaltungenid,
            startet_nicht: true,
          })
          .expect(200);

        const wertung = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });
        expect(wertung?.bol_startet_nicht).toBe(true);
      });
    });

    describe('GET /api/competition-status — bol_startet_nicht effect on participantCount', () => {
      it('should exclude participants with bol_startet_nicht=true from participantCount', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Status Count Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN Status Comp',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });

        const activeParticipant = await TestUtils.createTestParticipant({
          firstName: 'Active',
          lastName: 'StartetA',
        });
        const inactiveParticipant = await TestUtils.createTestParticipant({
          firstName: 'Inactive',
          lastName: 'StartetB',
        });

        // Active participant (will participate)
        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: activeParticipant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 1,
            var_riege: '',
            int_statusid: 1,
            bol_startet_nicht: false,
          },
        });
        // Inactive participant (bol_startet_nicht = true)
        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: inactiveParticipant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 2,
            var_riege: '',
            int_statusid: 1,
            bol_startet_nicht: true,
          },
        });

        const response = await request(competitionStatusApp)
          .get('/api/competition-status')
          .query({ eventId: event.int_veranstaltungenid })
          .expect(200);

        // competition-status returns { competitions: [...], eventId, total, ... }
        const compStatus = (response.body.competitions ?? response.body).find(
          (c: any) => c.id === competition.int_wettkaempfeid
        );
        expect(compStatus).toBeDefined();
        // Only the active participant (not bol_startet_nicht=true) should be counted
        expect(compStatus.participantCount).toBe(1);
      });

      it('should count all participants when none have bol_startet_nicht=true', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN All Active Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN All Active Comp',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });

        for (let i = 0; i < 3; i++) {
          const p = await TestUtils.createTestParticipant({
            firstName: `AllActive${i}`,
            lastName: 'Test',
          });
          await prisma.tfx_wertungen.create({
            data: {
              int_teilnehmerid: p.int_teilnehmerid,
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_startnummer: i + 1,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: false,
            },
          });
        }

        const response = await request(competitionStatusApp)
          .get('/api/competition-status')
          .query({ eventId: event.int_veranstaltungenid })
          .expect(200);

        const compStatus = (response.body.competitions ?? response.body).find(
          (c: any) => c.id === competition.int_wettkaempfeid
        );
        expect(compStatus).toBeDefined();
        expect(compStatus.participantCount).toBe(3);
      });

      it('should count zero participants when all have bol_startet_nicht=true', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN None Active Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN None Active Comp',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });

        for (let i = 0; i < 2; i++) {
          const p = await TestUtils.createTestParticipant({
            firstName: `NoneActive${i}`,
            lastName: 'Test',
          });
          await prisma.tfx_wertungen.create({
            data: {
              int_teilnehmerid: p.int_teilnehmerid,
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_startnummer: i + 1,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: true, // all inactive
            },
          });
        }

        const response = await request(competitionStatusApp)
          .get('/api/competition-status')
          .query({ eventId: event.int_veranstaltungenid })
          .expect(200);

        const compStatus = (response.body.competitions ?? response.body).find(
          (c: any) => c.id === competition.int_wettkaempfeid
        );
        expect(compStatus).toBeDefined();
        expect(compStatus.participantCount).toBe(0);
      });
    });

    describe('GET /api/meldematrix — bol_startet_nicht does NOT filter matrix', () => {
      it('should include all registered participants in meldematrix regardless of bol_startet_nicht', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Matrix Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN Matrix Comp',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });

        const activeP = await TestUtils.createTestParticipant({
          firstName: 'MatrixActive',
          lastName: 'SA',
          clubId: 1,
        });
        const inactiveP = await TestUtils.createTestParticipant({
          firstName: 'MatrixInactive',
          lastName: 'SB',
          clubId: 1,
        });

        await prisma.tfx_wertungen.createMany({
          data: [
            {
              int_teilnehmerid: activeP.int_teilnehmerid,
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_startnummer: 1,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: false,
            },
            {
              int_teilnehmerid: inactiveP.int_teilnehmerid,
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_startnummer: 2,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: true, // nimmt nicht teil
            },
          ],
        });

        const response = await request(meldematrixApp)
          .get('/api/meldematrix')
          .query({ eventId: event.int_veranstaltungenid })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Both participants are registered → total should include both
        expect(response.body.data.totals.grand).toBe(2);
      });

      it('should include participant with bol_startet_nicht=true in meldematrix statistics', async () => {
        const event = await TestUtils.createTestEvent({ name: 'SN Stats Event' });
        const competition = await TestUtils.createTestCompetition({
          name: 'SN Stats Comp',
          int_veranstaltungenid: event.int_veranstaltungenid,
        });

        // Use existing seed club (9001) so INNER JOIN on tfx_vereine works
        const p1 = await TestUtils.createTestParticipant({
          firstName: 'StatsA',
          lastName: 'SN',
          clubId: TEST_IDS.vereine.tvBerlin,
        });
        const p2 = await TestUtils.createTestParticipant({
          firstName: 'StatsB',
          lastName: 'SN',
          clubId: TEST_IDS.vereine.tvBerlin,
        });

        await prisma.tfx_wertungen.createMany({
          data: [
            {
              int_teilnehmerid: p1.int_teilnehmerid,
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_startnummer: 1,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: false,
            },
            {
              int_teilnehmerid: p2.int_teilnehmerid,
              int_wettkaempfeid: competition.int_wettkaempfeid,
              int_startnummer: 2,
              var_riege: '',
              int_statusid: 1,
              bol_startet_nicht: true, // nimmt nicht teil
            },
          ],
        });

        const response = await request(meldematrixApp)
          .get('/api/meldematrix/statistics')
          .query({ eventId: event.int_veranstaltungenid })
          .expect(200);

        expect(response.body.success).toBe(true);
        // Both are registered → total_participants = 2
        expect(response.body.data.total_participants).toBe(2);
      });
    });
  });

  // ── "Außer Konkurenz" (bol_ak) ─────────────────────────────────────────────

  describe('"Außer Konkurenz" — bol_ak', () => {
    describe('POST /api/scores — create wertung with ak flag', () => {
      it('should create a score entry with ak=true ("Außer Konkurenz")', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK Score Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Ausser',
          lastName: 'Konkurrenz',
        });

        const response = await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: participant.int_teilnehmerid,
            statusId: 1,
            ak: true,
          })
          .expect(201);

        expect(response.body.ak).toBe(true);
        expect(response.body.competitionId).toBe(competition.int_wettkaempfeid);
        expect(response.body.participantId).toBe(participant.int_teilnehmerid);

        // Verify in DB
        const wertung = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });
        expect(wertung?.bol_ak).toBe(true);
      });

      it('should create a score entry with ak=false (default competitive)', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK False Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Normal',
          lastName: 'Competitor',
        });

        const response = await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: participant.int_teilnehmerid,
            statusId: 1,
            ak: false,
          })
          .expect(201);

        // The API stores `validatedData.ak || null` → false || null = null
        // The actual DB value will be null (equivalent to "not AK")
        expect(response.body.ak === null || response.body.ak === false).toBe(true);
      });

      it('should create a score entry with ak omitted (defaults to null/false)', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK Default Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Default',
          lastName: 'AKTest',
        });

        const response = await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: participant.int_teilnehmerid,
            statusId: 1,
          })
          .expect(201);

        // ak not set → should be null or false
        expect(response.body.ak === null || response.body.ak === false).toBe(true);
      });
    });

    describe('PUT /api/scores/:id — update ak flag', () => {
      it('should update ak from false to true', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK Update Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Update',
          lastName: 'AKFlag',
        });

        // Create score with ak=false
        const createResponse = await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: participant.int_teilnehmerid,
            statusId: 1,
            ak: false,
          })
          .expect(201);

        const scoreId = createResponse.body.id;
        expect(scoreId).toBeDefined();

        // Update to ak=true
        const updateResponse = await request(scoresApp)
          .put(`/api/scores/${scoreId}`)
          .send({ ak: true })
          .expect(200);

        expect(updateResponse.body.ak).toBe(true);

        // Verify in DB
        const wertung = await prisma.tfx_wertungen.findUnique({
          where: { int_wertungenid: scoreId },
        });
        expect(wertung?.bol_ak).toBe(true);
      });

      it('should update ak from true to false', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK Revert Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Revert',
          lastName: 'AKRevert',
        });

        const createResponse = await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: participant.int_teilnehmerid,
            statusId: 1,
            ak: true,
          })
          .expect(201);

        const scoreId = createResponse.body.id;

        const updateResponse = await request(scoresApp)
          .put(`/api/scores/${scoreId}`)
          .send({ ak: false })
          .expect(200);

        expect(updateResponse.body.ak).toBe(false);
      });
    });

    describe('GET /api/scores — bol_ak flag in database', () => {
      it('should persist bol_ak=true in DB when set via scores POST, verifiable by DB query', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK DB Check Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'DBCheck',
          lastName: 'AKResult',
        });

        // Create score via API with ak=true
        const createResponse = await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: participant.int_teilnehmerid,
            statusId: 1,
            ak: true,
          })
          .expect(201);

        // Verify the API confirmed ak=true in the create response
        expect(createResponse.body.ak).toBe(true);

        // Verify the api returns the participant in the scores list
        const listResponse = await request(scoresApp)
          .get('/api/scores')
          .query({ competitionId: competition.int_wettkaempfeid })
          .expect(200);

        const results: any[] = listResponse.body.results ?? listResponse.body;
        const matchingEntry = results.find(
          (r: any) => r.participantId === participant.int_teilnehmerid || r.participantid === participant.int_teilnehmerid
        );
        expect(matchingEntry).toBeDefined();

        // Verify DB persisted bol_ak=true correctly
        const dbEntry = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });
        expect(dbEntry?.bol_ak).toBe(true);
      });

      it('should distinguish between ak and non-ak participants in DB', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'AK Distinguish Comp',
        });

        const akParticipant = await TestUtils.createTestParticipant({
          firstName: 'AKPart',
          lastName: 'Distinguished',
        });
        const normalParticipant = await TestUtils.createTestParticipant({
          firstName: 'NormalPart',
          lastName: 'Distinguished',
        });

        // Create ak participant via API
        await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: akParticipant.int_teilnehmerid,
            statusId: 1,
            ak: true,
          })
          .expect(201);

        // Create normal participant via API
        await request(scoresApp)
          .post('/api/scores')
          .send({
            competitionId: competition.int_wettkaempfeid,
            participantId: normalParticipant.int_teilnehmerid,
            statusId: 1,
            // ak not set — defaults to null
          })
          .expect(201);

        // Verify scores list returns both participants
        const listResponse = await request(scoresApp)
          .get('/api/scores')
          .query({ competitionId: competition.int_wettkaempfeid })
          .expect(200);

        const results: any[] = listResponse.body.results ?? listResponse.body;
        const akEntry = results.find(
          (r: any) => r.participantId === akParticipant.int_teilnehmerid || r.participantid === akParticipant.int_teilnehmerid
        );
        const normalEntry = results.find(
          (r: any) => r.participantId === normalParticipant.int_teilnehmerid || r.participantid === normalParticipant.int_teilnehmerid
        );

        expect(akEntry).toBeDefined();
        expect(normalEntry).toBeDefined();

        // Verify DB: ak participant has bol_ak=true, normal has null (not ak)
        const akDb = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: akParticipant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });
        const normalDb = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: normalParticipant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });

        expect(akDb?.bol_ak).toBe(true);
        // null is falsy — normal participant has no AK flag
        expect(normalDb?.bol_ak === null || normalDb?.bol_ak === false).toBe(true);
      });
    });

    describe('Interaction: bol_startet_nicht + bol_ak on same participant', () => {
      it('should allow setting both bol_startet_nicht=true and bol_ak=true independently', async () => {
        const competition = await TestUtils.createTestCompetition({
          name: 'Combined Flags Comp',
        });
        const participant = await TestUtils.createTestParticipant({
          firstName: 'Combined',
          lastName: 'Flags',
        });

        await prisma.tfx_wertungen.create({
          data: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
            int_startnummer: 1,
            var_riege: '',
            int_statusid: 1,
            bol_ak: true,
            bol_startet_nicht: true,
          },
        });

        const wertung = await prisma.tfx_wertungen.findFirst({
          where: {
            int_teilnehmerid: participant.int_teilnehmerid,
            int_wettkaempfeid: competition.int_wettkaempfeid,
          },
        });

        expect(wertung?.bol_ak).toBe(true);
        expect(wertung?.bol_startet_nicht).toBe(true);
      });
    });
  });
});
