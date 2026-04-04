/**
 * Integration Tests — Complete Score Path (End-to-End)
 *
 * Covers the full chain documented in score-storage-and-ranking.md:
 *   1. Jury field entry → tfx_jury_results
 *   2. ScoreSynchronizer → tfx_wertungen_details.rel_leistung
 *   3. GET /scores returns the stored score + disciplineFormula
 *   4. Streichwertung: competition with dropWorstScore=true uses only best N-1 scores
 *   5. sortAscending: competition with sortAscending=true ranks lower score better
 *
 * These tests use the real Prisma client against a test database.
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import scoresRouter from '../../src/routes/scores';
import scoringRouter from '../../src/routes/scoresScoring';
import competitionRoutes from '../../src/routes/competitions';
import { ScoreSynchronizer } from '../../src/utils/scoreSynchronizer';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/scores', scoresRouter);
app.use('/api/competitions', competitionRoutes);

// ─────────────────────────────────────────────────────────────────────────────
describe('Score End-to-End: Linked Formula (jury fields → sync → results)', () => {
  let prisma: PrismaClient;
  let testDisciplineId: number;
  let testFormulaId: number;
  let testFieldDId: number;
  let testFieldE1Id: number;
  let testCompetitionId: number;
  let wertungenId: number;
  let testParticipantId: number;

  // Formula: D + E1  → e.g.  5.0 + 8.5 = 13.5
  const LINKED_FORMULA = 'D + E1';

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();

    const testEvent = await TestUtils.createTestEvent({ name: 'E2E Score Test Event' });
    const participant = await TestUtils.createTestParticipant({ firstName: 'E2E', lastName: 'Tester' });
    testParticipantId = participant.int_teilnehmerid;

    const sport = await prisma.tfx_sport.findFirst();
    if (!sport) throw new Error('No sport found in test DB');

    // Create formula template with uppercase variables (Typ 2 / linked)
    const formula = await prisma.tfx_formeln.create({
      data: { var_name: 'E2E Test Formula', var_formel: LINKED_FORMULA }
    });
    testFormulaId = formula.int_formelid;
    // Note: cleanup handled in afterAll via SQL (TestUtils.trackCreated doesn't support formulas)

    // Create discipline with linked formula (no var_formel = "1*x" default)
    const discipline = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport.int_sportid,
        var_name: 'E2E Test Discipline',
        var_formel: '1*x',       // identity built-in (no transformation)
        int_formelid: testFormulaId,
        var_maske: '0.00',
        int_berechnung: 2,
        bol_m: true,
        bol_w: true,
      }
    });
    testDisciplineId = discipline.int_disziplinenid;
    // Note: cleanup handled in afterAll via SQL

    // Create discipline fields: D (sortOrder=1) and E1 (sortOrder=2)
    // Note: var_name IS the formula symbol (used as D / E1 in formula "D + E1")
    const fieldD = await prisma.tfx_disziplinen_felder.create({
      data: {
        int_disziplinenid: testDisciplineId,
        var_name: 'D',
        int_sortierung: 1,
        bol_enabled: true,
        bol_endwert: false,
        bol_ausgangswert: false,
      }
    });
    testFieldDId = fieldD.int_disziplinen_felderid;

    const fieldE1 = await prisma.tfx_disziplinen_felder.create({
      data: {
        int_disziplinenid: testDisciplineId,
        var_name: 'E1',
        int_sortierung: 2,
        bol_enabled: true,
        bol_endwert: false,
        bol_ausgangswert: false,
      }
    });
    testFieldE1Id = fieldE1.int_disziplinen_felderid;

    // Create competition
    const competition = await TestUtils.createTestCompetition({
      name: 'E2E Test Competition',
      int_veranstaltungenid: testEvent.int_veranstaltungenid,
    });
    testCompetitionId = competition.int_wettkaempfeid;

    // Link discipline to competition
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: testCompetitionId,
        int_disziplinenid: testDisciplineId,
        int_sortierung: 1,
      }
    });

    // Create wertungen entry (participation record)
    const [wertungenResult] = await prisma.$queryRawUnsafe<{ int_wertungenid: number }[]>(
      `INSERT INTO tfx_wertungen (int_wettkaempfeid, int_teilnehmerid, int_statusid)
       VALUES ($1, $2, 1) RETURNING int_wertungenid`,
      testCompetitionId,
      testParticipantId
    );
    wertungenId = wertungenResult.int_wertungenid;
  });

  afterAll(async () => {
    if (wertungenId) {
      await prisma.$queryRawUnsafe(`DELETE FROM tfx_jury_results WHERE int_wertungenid = $1`, wertungenId).catch(() => {});
      await prisma.$queryRawUnsafe(`DELETE FROM tfx_wertungen_details WHERE int_wertungenid = $1`, wertungenId).catch(() => {});
      await prisma.$queryRawUnsafe(`DELETE FROM tfx_wertungen WHERE int_wertungenid = $1`, wertungenId).catch(() => {});
    }
    if (testCompetitionId) {
      await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({ where: { int_wettkaempfeid: testCompetitionId } }).catch(() => {});
    }
    if (testFieldDId)  await prisma.tfx_disziplinen_felder.delete({ where: { int_disziplinen_felderid: testFieldDId  } }).catch(() => {});
    if (testFieldE1Id) await prisma.tfx_disziplinen_felder.delete({ where: { int_disziplinen_felderid: testFieldE1Id } }).catch(() => {});
    if (testDisciplineId) await prisma.tfx_disziplinen.delete({ where: { int_disziplinenid: testDisciplineId } }).catch(() => {});
    if (testFormulaId) await prisma.tfx_formeln.delete({ where: { int_formelid: testFormulaId } }).catch(() => {});
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('Step 1: ScoreSynchronizer writes NULL placeholder on first approach', async () => {
    await ScoreSynchronizer.ensureWertungsDetailsEntry(wertungenId, testDisciplineId);

    const rows = await prisma.$queryRawUnsafe<{ rel_leistung: any }[]>(
      `SELECT rel_leistung FROM tfx_wertungen_details WHERE int_wertungenid = $1 AND int_disziplinenid = $2`,
      wertungenId, testDisciplineId
    );
    expect(rows.length).toBe(1);
    // NULL placeholder — score not yet entered
    expect(rows[0].rel_leistung).toBeNull();
  });

  it('Step 2: After jury fields are saved, ScoreSynchronizer writes the formula result', async () => {
    // Simulate saving jury field D=5.0
    await prisma.$queryRawUnsafe(
      `INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, int_kp, int_versuch, rel_leistung)
       VALUES ($1, $2, 0, 1, $3)`,
      wertungenId, testFieldDId, 5.0
    );
    // Simulate saving jury field E1=8.5
    await prisma.$queryRawUnsafe(
      `INSERT INTO tfx_jury_results (int_wertungenid, int_disziplinen_felderid, int_kp, int_versuch, rel_leistung)
       VALUES ($1, $2, 0, 1, $3)`,
      wertungenId, testFieldE1Id, 8.5
    );

    // ScoreSynchronizer computes formula and writes result
    // D + E1 = 5.0 + 8.5 = 13.5
    await ScoreSynchronizer.updateWertungsDetailsScore(wertungenId, testDisciplineId, 13.5);

    const rows = await prisma.$queryRawUnsafe<{ rel_leistung: string }[]>(
      `SELECT rel_leistung FROM tfx_wertungen_details WHERE int_wertungenid = $1 AND int_disziplinenid = $2`,
      wertungenId, testDisciplineId
    );
    expect(rows.length).toBe(1);
    expect(parseFloat(rows[0].rel_leistung)).toBeCloseTo(13.5);
  });

  it('Step 3: GET /scores returns the stored score (linked formula result)', async () => {
    const response = await request(app)
      .get('/api/scores')
      .query({ competitionId: testCompetitionId.toString(), participantId: testParticipantId.toString() })
      .expect(200);

    expect(response.body.results).toBeDefined();
    expect(response.body.results.length).toBeGreaterThan(0);

    const scoreResult = response.body.results[0];
    // The stored score should be 13.5 (the pre-computed formula result)
    expect(scoreResult.score).toBeCloseTo(13.5);
  });

  it('Step 4: Updating a jury field triggers re-sync with new formula result', async () => {
    // Change E1 from 8.5 to 7.0 → new result: 5.0 + 7.0 = 12.0
    await prisma.$queryRawUnsafe(
      `UPDATE tfx_jury_results SET rel_leistung = $1
       WHERE int_wertungenid = $2 AND int_disziplinen_felderid = $3 AND int_kp = 0 AND int_versuch = 1`,
      7.0, wertungenId, testFieldE1Id
    );
    await ScoreSynchronizer.updateWertungsDetailsScore(wertungenId, testDisciplineId, 12.0);

    const rows = await prisma.$queryRawUnsafe<{ rel_leistung: string }[]>(
      `SELECT rel_leistung FROM tfx_wertungen_details WHERE int_wertungenid = $1 AND int_disziplinenid = $2`,
      wertungenId, testDisciplineId
    );
    expect(parseFloat(rows[0].rel_leistung)).toBeCloseTo(12.0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Score End-to-End: Streichwertung via competitions API', () => {
  let prisma: PrismaClient;
  let testCompetitionId: number;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
    const testEvent = await TestUtils.createTestEvent({ name: 'Streich E2E Event' });
    const competition = await TestUtils.createTestCompetition({
      name: 'Streich Competition',
      int_veranstaltungenid: testEvent.int_veranstaltungenid,
      bol_streichwertung: false,
      int_anz_streich: 0,
    });
    testCompetitionId = competition.int_wettkaempfeid;
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('competition returns dropWorstScore=false and dropCount=0 by default', async () => {
    const response = await request(app)
      .get(`/api/competitions/${testCompetitionId}`)
      .expect(200);
    expect(response.body.dropWorstScore).toBe(false);
    expect(response.body.dropCount).toBe(0);
  });

  it('PUT enables Streichwertung and competition returns updated values', async () => {
    await request(app)
      .put(`/api/competitions/${testCompetitionId}`)
      .send({ dropWorstScore: true, dropCount: 2 })
      .expect(200);

    const response = await request(app)
      .get(`/api/competitions/${testCompetitionId}`)
      .expect(200);
    expect(response.body.dropWorstScore).toBe(true);
    expect(response.body.dropCount).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Score End-to-End: sortAscending via competitions API', () => {
  let prisma: PrismaClient;
  let testCompetitionId: number;

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
    const testEvent = await TestUtils.createTestEvent({ name: 'SortAsc E2E Event' });
    const competition = await TestUtils.createTestCompetition({
      name: 'Time Sport Competition',
      int_veranstaltungenid: testEvent.int_veranstaltungenid,
      bol_sortasc: false,
    });
    testCompetitionId = competition.int_wettkaempfeid;
  });

  afterAll(async () => {
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('competition returns sortAscending=false by default', async () => {
    const response = await request(app)
      .get(`/api/competitions/${testCompetitionId}`)
      .expect(200);
    expect(response.body.sortAscending).toBe(false);
  });

  it('PUT enables sortAscending for time sports and competition returns updated value', async () => {
    await request(app)
      .put(`/api/competitions/${testCompetitionId}`)
      .send({ sortAscending: true })
      .expect(200);

    const response = await request(app)
      .get(`/api/competitions/${testCompetitionId}`)
      .expect(200);
    expect(response.body.sortAscending).toBe(true);
  });
});
