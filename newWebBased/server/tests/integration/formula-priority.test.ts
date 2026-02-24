/**
 * Integration Tests — Formula Priority (template vs discipline formula)
 * 
 * Verifies that when a discipline has both:
 *   - its OWN var_formel (e.g. "1*x")
 *   - a referenced formula template via int_formelid (e.g. "LK - A + B - C")
 * 
 * The GET /:id/disciplines endpoint returns the TEMPLATE formula (from tfx_formeln),
 * NOT the discipline's own formula.
 * 
 * This matches the old C++ behavior:
 *   SELECT tfx_formeln.var_formel FROM tfx_disziplinen LEFT JOIN tfx_formeln USING (int_formelid)
 * 
 * Bug: COALESCE(d.var_formel, f.var_formel) returned "1*x" instead of "LK - A + B - C"
 * Fix: COALESCE(f.var_formel, d.var_formel) — template takes priority
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import competitionRoutes from '../../src/routes/competitions';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/competitions', competitionRoutes);

describe('Formula Priority: Template vs Discipline Formula', () => {
  let prisma: PrismaClient;
  let testEvent: any;
  let testFormulaId: number;
  let testDisciplineId: number;
  let testCompetitionId: number;

  const TEMPLATE_FORMULA = 'LK - A + B - C';
  const DISCIPLINE_OWN_FORMULA = '1*x';

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();

    // Create a test event
    testEvent = await TestUtils.createTestEvent({
      name: 'Formula Priority Test Event'
    });
  });

  afterAll(async () => {
    // Clean up in reverse FK order
    if (testCompetitionId) {
      await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
        where: { int_wettkaempfeid: testCompetitionId }
      }).catch(() => {});
      await prisma.tfx_wettkaempfe.delete({
        where: { int_wettkaempfeid: testCompetitionId }
      }).catch(() => {});
    }
    if (testDisciplineId) {
      await prisma.tfx_disziplinen.delete({
        where: { int_disziplinenid: testDisciplineId }
      }).catch(() => {});
    }
    if (testFormulaId) {
      await prisma.tfx_formeln.delete({
        where: { int_formelid: testFormulaId }
      }).catch(() => {});
    }
    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('should create test formula template', async () => {
    const formula = await prisma.tfx_formeln.create({
      data: {
        var_name: 'Test Formula Template',
        var_formel: TEMPLATE_FORMULA
      }
    });
    testFormulaId = formula.int_formelid;
    expect(testFormulaId).toBeDefined();
  });

  it('should create discipline WITH own formula AND formula template reference', async () => {
    // Get a sport ID to use
    const sport = await prisma.tfx_sport.findFirst();
    expect(sport).not.toBeNull();

    const discipline = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport!.int_sportid,
        var_name: 'Test Formula Priority Disc',
        var_formel: DISCIPLINE_OWN_FORMULA,      // Discipline's own formula
        int_formelid: testFormulaId,              // Reference to formula template
        var_maske: '0.00',
        int_berechnung: 2,
        bol_m: true,
        bol_w: true
      }
    });
    testDisciplineId = discipline.int_disziplinenid;
    expect(testDisciplineId).toBeDefined();

    // Verify both formulas are stored
    const check = await prisma.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: testDisciplineId },
      include: { tfx_formeln: true }
    });
    expect(check?.var_formel).toBe(DISCIPLINE_OWN_FORMULA);
    expect(check?.int_formelid).toBe(testFormulaId);
    expect(check?.tfx_formeln?.var_formel).toBe(TEMPLATE_FORMULA);
  });

  it('should create competition and link the discipline', async () => {
    // Find a bereich
    const bereich = await prisma.tfx_bereiche.findFirst({
      where: { bol_maennlich: true }
    });
    expect(bereich).not.toBeNull();

    const competition = await prisma.tfx_wettkaempfe.create({
      data: {
        int_veranstaltungenid: testEvent.int_veranstaltungenid,
        int_bereicheid: bereich!.int_bereicheid,
        var_name: 'Test Formula Priority Competition',
        yer_von: 10
      }
    });
    testCompetitionId = competition.int_wettkaempfeid;

    // Link discipline to competition
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: testCompetitionId,
        int_disziplinenid: testDisciplineId,
        int_sortierung: 1
      }
    });
  });

  it('GET /:id/disciplines should return TEMPLATE formula, not discipline own formula', async () => {
    const response = await request(app)
      .get(`/api/competitions/${testCompetitionId}/disciplines`)
      .expect(200);

    expect(response.body.disciplines).toBeDefined();
    expect(response.body.disciplines).toHaveLength(1);

    const disc = response.body.disciplines[0];
    expect(disc.var_name).toBe('Test Formula Priority Disc');
    expect(disc.int_formelid).toBe(testFormulaId);

    // CRITICAL: var_formel should be the TEMPLATE formula, NOT "1*x"
    expect(disc.var_formel).toBe(TEMPLATE_FORMULA);
    expect(disc.var_formel).not.toBe(DISCIPLINE_OWN_FORMULA);
  });

  it('should fall back to discipline formula when no template is assigned', async () => {
    // Create a discipline WITHOUT a formula template
    const sport = await prisma.tfx_sport.findFirst();
    const discNoTemplate = await prisma.tfx_disziplinen.create({
      data: {
        int_sportid: sport!.int_sportid,
        var_name: 'Test No Template Disc',
        var_formel: '2*x',   // Only own formula, no template
        var_maske: '0.00',
        int_berechnung: 2,
        bol_m: true,
        bol_w: true
      }
    });

    // Link to competition
    await prisma.tfx_wettkaempfe_x_disziplinen.create({
      data: {
        int_wettkaempfeid: testCompetitionId,
        int_disziplinenid: discNoTemplate.int_disziplinenid,
        int_sortierung: 2
      }
    });

    const response = await request(app)
      .get(`/api/competitions/${testCompetitionId}/disciplines`)
      .expect(200);

    const disc = response.body.disciplines.find(
      (d: any) => d.var_name === 'Test No Template Disc'
    );
    expect(disc).toBeDefined();
    expect(disc.var_formel).toBe('2*x');
    expect(disc.int_formelid).toBeNull();

    // Clean up
    await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
      where: {
        int_wettkaempfeid: testCompetitionId,
        int_disziplinenid: discNoTemplate.int_disziplinenid
      }
    });
    await prisma.tfx_disziplinen.delete({
      where: { int_disziplinenid: discNoTemplate.int_disziplinenid }
    });
  });
});
