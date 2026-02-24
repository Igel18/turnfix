/**
 * Integration Tests — Import Gender Validation
 * 
 * Verifies that the GymNet import correctly validates discipline gender
 * against competition gender when linking disciplines.
 * 
 * Bug: Female disciplines (e.g., Stufenbarren) could be assigned to male
 * competitions and vice versa, causing inconsistent states.
 * 
 * Fix: Gender check in linkDisciplines() skips mismatched disciplines
 * and generates a warning for the user.
 * 
 * The import uses wedDisNrToTurnFixId() from gymnetMapping which maps:
 *   wedDisNr=220 → DISCIPLINE_IDS.RINGE = 3 (male-only)
 *   wedDisNr=270 → DISCIPLINE_IDS.STUFENBARREN = 8 (female-only)
 *   wedDisNr=630 → DISCIPLINE_IDS.MINITRAMPOLIN = 11 (both genders)
 * 
 * So we must create disciplines at these exact IDs in the test DB.
 */

import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import { importGymnetData, type ImportResult } from '../../src/utils/gymnetDbImport';
import type { ExtractedData } from '../../src/utils/gymnetXmlParser';
import { DISCIPLINE_IDS } from '../../src/utils/gymnetDisciplineIds';

// Seeded bereiche IDs (from seed-test-data.ts)
const BEREICH_MALE = 9001;
const BEREICH_FEMALE = 9002;

describe('Import Gender Validation', () => {
  let prisma: PrismaClient;
  let testEventId: number;
  let createdCompetitionIds: number[] = [];
  let createdDisciplineIds: number[] = [];

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();

    // Get the sport ID from seed data
    const sport = await prisma.tfx_sport.findFirst();
    expect(sport).not.toBeNull();
    const sportId = sport!.int_sportid;

    // Create disciplines at the exact IDs that wedDisNrToTurnFixId() maps to.
    // These must exist for the import to find them by ID.
    const disciplinesToCreate = [
      { int_disziplinenid: DISCIPLINE_IDS.RINGE, var_name: 'Ringe', bol_m: true, bol_w: false },          // ID=3, male-only
      { int_disziplinenid: DISCIPLINE_IDS.STUFENBARREN, var_name: 'Stufenbarren', bol_m: false, bol_w: true }, // ID=8, female-only
      { int_disziplinenid: DISCIPLINE_IDS.MINITRAMPOLIN, var_name: 'Minitrampolin', bol_m: true, bol_w: true }, // ID=11, both
    ];

    for (const d of disciplinesToCreate) {
      // Use raw SQL to set the exact ID (Prisma .create with autoincrement might not allow it)
      await prisma.$executeRawUnsafe(`
        INSERT INTO tfx_disziplinen (int_disziplinenid, int_sportid, var_name, bol_m, bol_w)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (int_disziplinenid) DO NOTHING
      `, d.int_disziplinenid, sportId, d.var_name, d.bol_m, d.bol_w);
      createdDisciplineIds.push(d.int_disziplinenid);
    }

    // Create test event
    const testEvent = await TestUtils.createTestEvent({
      name: 'Gender Validation Test Event'
    });
    testEventId = testEvent.int_veranstaltungenid;
  });

  afterAll(async () => {
    // Cleanup competitions and linked disciplines
    for (const compId of createdCompetitionIds) {
      await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
        where: { int_wettkaempfeid: compId }
      }).catch(() => {});
      await prisma.tfx_wertungen.deleteMany({
        where: { int_wettkaempfeid: compId }
      }).catch(() => {});
      await prisma.tfx_wettkaempfe.delete({
        where: { int_wettkaempfeid: compId }
      }).catch(() => {});
    }

    // Cleanup created disciplines
    for (const discId of createdDisciplineIds) {
      await prisma.tfx_wettkaempfe_x_disziplinen.deleteMany({
        where: { int_disziplinenid: discId }
      }).catch(() => {});
      await prisma.tfx_disziplinen.delete({
        where: { int_disziplinenid: discId }
      }).catch(() => {});
    }

    await TestUtils.cleanup();
    await TestUtils.disconnect();
  });

  it('should have test disciplines available at correct IDs', async () => {
    const ringe = await prisma.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: DISCIPLINE_IDS.RINGE }
    });
    const stufenbarren = await prisma.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: DISCIPLINE_IDS.STUFENBARREN }
    });
    const minitrampolin = await prisma.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: DISCIPLINE_IDS.MINITRAMPOLIN }
    });

    expect(ringe).not.toBeNull();
    expect(ringe!.bol_m).toBe(true);
    expect(ringe!.bol_w).toBe(false);

    expect(stufenbarren).not.toBeNull();
    expect(stufenbarren!.bol_m).toBe(false);
    expect(stufenbarren!.bol_w).toBe(true);

    expect(minitrampolin).not.toBeNull();
    expect(minitrampolin!.bol_m).toBe(true);
    expect(minitrampolin!.bol_w).toBe(true);
  });

  it('should warn when female discipline (Stufenbarren) is assigned to male competition', async () => {
    // Create a male competition
    const maleComp = await prisma.tfx_wettkaempfe.create({
      data: {
        int_veranstaltungenid: testEventId,
        int_bereicheid: BEREICH_MALE,
        var_name: 'GenderTest Male Comp',
        var_nummer: 'GM001',
        yer_von: 10
      }
    });
    createdCompetitionIds.push(maleComp.int_wettkaempfeid);

    // Try to import Stufenbarren (wedDisNr=270, female-only) into a male competition
    const extractedData: ExtractedData = {
      clubs: [],
      participants: [],
      competitions: [{
        name: 'GenderTest Male Comp',
        gender: 'male',
        waNr: 'GM001',
        ageInfo: { min: 10, max: 18 }
      }],
      devices: [{
        name: 'Stufenbarren',
        code: '270',  // wedDisNr=270 → DISCIPLINE_IDS.STUFENBARREN (ID=8, female-only)
        competitionWaNr: 'GM001'
      }],
      teams: []
    };

    const result: ImportResult = await importGymnetData(extractedData, testEventId, 2026);

    // Should have a warning about gender mismatch
    const genderWarnings = result.warnings.filter(
      w => w.category === 'discipline' && w.message.includes('nur für')
    );
    expect(genderWarnings.length).toBeGreaterThan(0);
    expect(genderWarnings[0].message).toContain('weiblich');
    expect(genderWarnings[0].message).toContain('übersprungen');

    // Should NOT have linked the female discipline to the male competition
    const linkedDiscs = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: { int_wettkaempfeid: maleComp.int_wettkaempfeid }
    });
    const stufenbarrenLinked = linkedDiscs.find(l => l.int_disziplinenid === DISCIPLINE_IDS.STUFENBARREN);
    expect(stufenbarrenLinked).toBeUndefined();
  });

  it('should warn when male discipline (Ringe) is assigned to female competition', async () => {
    // Create a female competition
    const femaleComp = await prisma.tfx_wettkaempfe.create({
      data: {
        int_veranstaltungenid: testEventId,
        int_bereicheid: BEREICH_FEMALE,
        var_name: 'GenderTest Female Comp',
        var_nummer: 'GF001',
        yer_von: 10
      }
    });
    createdCompetitionIds.push(femaleComp.int_wettkaempfeid);

    // Try to import Ringe (wedDisNr=220, male-only) into a female competition
    const extractedData: ExtractedData = {
      clubs: [],
      participants: [],
      competitions: [{
        name: 'GenderTest Female Comp',
        gender: 'female',
        waNr: 'GF001',
        ageInfo: { min: 10, max: 18 }
      }],
      devices: [{
        name: 'Ringe',
        code: '220',  // wedDisNr=220 → DISCIPLINE_IDS.RINGE (ID=3, male-only)
        competitionWaNr: 'GF001'
      }],
      teams: []
    };

    const result: ImportResult = await importGymnetData(extractedData, testEventId, 2026);

    // Should have a warning about gender mismatch
    const genderWarnings = result.warnings.filter(
      w => w.category === 'discipline' && w.message.includes('nur für')
    );
    expect(genderWarnings.length).toBeGreaterThan(0);
    expect(genderWarnings[0].message).toContain('männlich');
    expect(genderWarnings[0].message).toContain('übersprungen');

    // Should NOT have linked the male discipline to the female competition
    const linkedDiscs = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: { int_wettkaempfeid: femaleComp.int_wettkaempfeid }
    });
    const ringeLinked = linkedDiscs.find(l => l.int_disziplinenid === DISCIPLINE_IDS.RINGE);
    expect(ringeLinked).toBeUndefined();
  });

  it('should allow gender-neutral discipline (Minitrampolin) for male competition', async () => {
    // Create a male competition
    const maleComp = await prisma.tfx_wettkaempfe.create({
      data: {
        int_veranstaltungenid: testEventId,
        int_bereicheid: BEREICH_MALE,
        var_name: 'GenderTest Neutral Disc Comp',
        var_nummer: 'GN001',
        yer_von: 10
      }
    });
    createdCompetitionIds.push(maleComp.int_wettkaempfeid);

    // Import Minitrampolin (wedDisNr=630, bol_m=true, bol_w=true) into male competition
    const extractedData: ExtractedData = {
      clubs: [],
      participants: [],
      competitions: [{
        name: 'GenderTest Neutral Disc Comp',
        gender: 'male',
        waNr: 'GN001',
        ageInfo: { min: 10, max: 18 }
      }],
      devices: [{
        name: 'Minitrampolin',
        code: '630',  // wedDisNr=630 → DISCIPLINE_IDS.MINITRAMPOLIN (ID=11, both genders)
        competitionWaNr: 'GN001'
      }],
      teams: []
    };

    const result: ImportResult = await importGymnetData(extractedData, testEventId, 2026);

    // Should NOT have gender mismatch warnings
    const genderWarnings = result.warnings.filter(
      w => w.category === 'discipline' && w.message.includes('nur für')
    );
    expect(genderWarnings).toHaveLength(0);

    // Should have linked the discipline successfully
    const linkedDiscs = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: { int_wettkaempfeid: maleComp.int_wettkaempfeid }
    });
    const minitrampolinLinked = linkedDiscs.find(l => l.int_disziplinenid === DISCIPLINE_IDS.MINITRAMPOLIN);
    expect(minitrampolinLinked).toBeDefined();
  });
});
