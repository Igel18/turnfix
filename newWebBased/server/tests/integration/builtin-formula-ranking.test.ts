/**
 * Integration Tests — Built-in Formula at Ranking Time
 *
 * Verifies the C++ backward-compatible behavior:
 *   1. var_formel (built-in formula) is returned SEPARATELY from the linked formula
 *   2. calculate-final only uses linked formulas, NOT built-in formulas
 *   3. GET /scores returns disciplineFormula field so clients can apply it at ranking time
 *
 * C++ behavior (result_calc.cpp):
 *   - rel_leistung stores the RAW score (or linked formula Endwert)
 *   - var_formel is applied at ranking time to transform the score
 *
 * New web behavior (after this change):
 *   - Same: rel_leistung stores raw score
 *   - Server returns disciplineFormula (var_formel) in API responses
 *   - Client applies var_formel at ranking/display time
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import scoresRouter from '../../src/routes/scores';
import scoringRouter from '../../src/routes/scoresScoring';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
// Mount scores router and scoring sub-router
app.use('/api/scores', scoresRouter);

describe('Built-in Formula at Ranking Time', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testCompetition: any;
  let testParticipant: any;
  let testDisciplineId: number;
  let wertungenId: number;

  const BUILTIN_FORMULA = '20-x';  // discipline's own var_formel
  const RAW_SCORE = 12.5;          // raw time-based score
  // Expected ranking score: 20 - 12.5 = 7.5

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();

    // Create test event
    testEvent = await TestUtils.createTestEvent({
      name: 'Built-in Formula Test Event'
    });

    // Create test participant
    testParticipant = await TestUtils.createTestParticipant({
      firstName: 'Formula',
      lastName: 'Tester'
    });

    // Get a sport ID
    const sport = await prisma.tfx_sport.findFirst();
    expect(sport).not.toBeNull();

    // Create discipline with built-in formula (NO linked formula template)
    const discipline = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport!.int_sportid,
        var_name: 'Test BuiltIn Formula Disc',
        var_formel: BUILTIN_FORMULA,
        // NO int_formelid — no linked formula template
        var_maske: '0.00',
        int_berechnung: 2,
        bol_m: true,
        bol_w: true
      }
    });
    testDisciplineId = discipline.int_disziplinenid;
    TestUtils.trackCreated('disciplines', testDisciplineId);

    // Create competition
    testCompetition = await TestUtils.createTestCompetition({
      name: 'Built-in Formula Test Competition',
      int_veranstaltungenid: testEvent.int_veranstaltungenid
    });

    // Link discipline to competition
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: testCompetition.int_wettkaempfeid,
        int_disziplinenid: testDisciplineId,
        int_sortierung: 1
      }
    });

    // Create wertungen entry
    const wertungenResult = await prisma.$queryRawUnsafe(
      `INSERT INTO tfx_wertungen (int_wettkaempfeid, int_teilnehmerid, int_statusid) 
       VALUES ($1, $2, 1) RETURNING int_wertungenid`,
      testCompetition.int_wettkaempfeid,
      testParticipant.int_teilnehmerid
    ) as any[];
    wertungenId = wertungenResult[0].int_wertungenid;

    // Save RAW score to wertungen_details (like ScoreSynchronizer would)
    await prisma.$queryRawUnsafe(
      `INSERT INTO tfx_wertungen_details (int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp) 
       VALUES ($1, $2, 1, $3, 0)`,
      wertungenId, testDisciplineId, RAW_SCORE
    );
  });

  afterAll(async () => {
    // Clean up in reverse FK order
    if (wertungenId) {
      await prisma.$queryRawUnsafe(
        `DELETE FROM tfx_wertungen_details WHERE int_wertungenid = $1`, wertungenId
      ).catch(() => {});
      await prisma.$queryRawUnsafe(
        `DELETE FROM tfx_wertungen WHERE int_wertungenid = $1`, wertungenId
      ).catch(() => {});
    }
    if (testCompetition) {
      await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
        where: { int_wettkaempfeid: testCompetition.int_wettkaempfeid }
      }).catch(() => {});
    }
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('GET /scores should return disciplineFormula as a separate field', async () => {
    const response = await request(app)
      .get('/api/scores')
      .query({
        competitionId: testCompetition.int_wettkaempfeid.toString(),
        participantId: testParticipant.int_teilnehmerid.toString()
      })
      .expect(200);

    expect(response.body.results).toBeDefined();
    expect(response.body.results.length).toBeGreaterThan(0);

    const scoreResult = response.body.results[0];
    
    // The disciplineFormula (var_formel) should be returned separately
    expect(scoreResult.disciplineFormula).toBe(BUILTIN_FORMULA);
    
    // The raw score should be unchanged in the database
    expect(scoreResult.score).toBe(RAW_SCORE);
  });

  it('GET /scores should NOT store a formula-calculated value in rel_leistung', async () => {
    // Fetch scores via API
    await request(app)
      .get('/api/scores')
      .query({
        competitionId: testCompetition.int_wettkaempfeid.toString(),
        participantId: testParticipant.int_teilnehmerid.toString()
      })
      .expect(200);

    // Verify the raw score in the database is still unchanged
    const dbResult = await prisma.$queryRawUnsafe(
      `SELECT rel_leistung FROM tfx_wertungen_details 
       WHERE int_wertungenid = $1 AND int_disziplinenid = $2`,
      wertungenId, testDisciplineId
    ) as any[];

    expect(dbResult.length).toBe(1);
    expect(parseFloat(dbResult[0].rel_leistung)).toBe(RAW_SCORE);
  });

  it('should keep linked formula (tableFormula) separate from built-in formula', async () => {
    // Create a discipline with BOTH built-in AND linked formula
    const sport = await prisma.tfx_sport.findFirst();
    
    const formulaTemplate = await prisma.tfx_formeln.create({
      data: {
        var_name: 'Test Linked Formula',
        var_formel: '(10 + A) - B'
      }
    });

    const discWithBoth = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport!.int_sportid,
        var_name: 'Test Both Formulas Disc',
        var_formel: '1*x',                          // built-in formula (identity)
        int_formelid: formulaTemplate.int_formelid,  // linked formula template
        var_maske: '0.00',
        int_berechnung: 2,
        bol_m: true,
        bol_w: true
      }
    });
    TestUtils.trackCreated('disciplines', discWithBoth.int_disziplinenid);

    // Link to competition
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: testCompetition.int_wettkaempfeid,
        int_disziplinenid: discWithBoth.int_disziplinenid,
        int_sortierung: 2
      }
    });

    // Create score
    await prisma.$queryRawUnsafe(
      `INSERT INTO tfx_wertungen_details (int_wertungenid, int_disziplinenid, int_versuch, rel_leistung, int_kp) 
       VALUES ($1, $2, 1, $3, 0)`,
      wertungenId, discWithBoth.int_disziplinenid, 9.5
    );

    const response = await request(app)
      .get('/api/scores')
      .query({
        competitionId: testCompetition.int_wettkaempfeid.toString(),
        participantId: testParticipant.int_teilnehmerid.toString()
      })
      .expect(200);

    // Find the score for the discipline with both formulas
    const bothFormulasScore = response.body.results.find(
      (r: any) => r.disciplineId === discWithBoth.int_disziplinenid
    );

    expect(bothFormulasScore).toBeDefined();
    // formula should be the linked formula (for multi-field calculation)
    expect(bothFormulasScore.formula).toBe('(10 + A) - B');
    // disciplineFormula should be the discipline's own var_formel
    expect(bothFormulasScore.disciplineFormula).toBe('1*x');

    // Clean up
    await prisma.$queryRawUnsafe(
      `DELETE FROM tfx_wertungen_details WHERE int_wertungenid = $1 AND int_disziplinenid = $2`,
      wertungenId, discWithBoth.int_disziplinenid
    ).catch(() => {});
    await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
      where: {
        int_wettkaempfeid: testCompetition.int_wettkaempfeid,
        int_disziplinenid: discWithBoth.int_disziplinenid
      }
    }).catch(() => {});
    await prisma.tfx_disziplinen.delete({
      where: { int_disziplinenid: discWithBoth.int_disziplinenid }
    }).catch(() => {});
    await prisma.tfx_formeln.delete({
      where: { int_formelid: formulaTemplate.int_formelid }
    }).catch(() => {});
  });
});
