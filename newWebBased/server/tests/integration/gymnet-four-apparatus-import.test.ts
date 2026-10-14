import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import { importGymnetData, type ImportResult } from '../../src/utils/gymnetDbImport';
import type { ExtractedData } from '../../src/utils/gymnetXmlParser';
import { DISCIPLINE_IDS } from '../../src/utils/gymnetDisciplineIds';
import { clearMappingCache } from '../../src/utils/gymnetMapping';

describe('GymNet four-apparatus import', () => {
  let prisma: PrismaClient;
  let testEventId: number;
  let createdCompetitionIds: number[] = [];
  let createdDisciplineIds: number[] = [];

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();

    const sport = await prisma.tfx_sport.findFirst();
    expect(sport).not.toBeNull();
    const sportId = sport!.int_sportid;

    const disciplinesToCreate = [
      { int_disziplinenid: DISCIPLINE_IDS.BODEN_M_P, var_name: 'Boden m. P1-P9', bol_m: true, bol_w: false },
      { int_disziplinenid: DISCIPLINE_IDS.SPRUNG_M_P, var_name: 'Sprung m. P1-P9', bol_m: true, bol_w: false },
      { int_disziplinenid: DISCIPLINE_IDS.PAR_BARREN_P, var_name: 'Par.-Barren m. P1-P9', bol_m: true, bol_w: false },
      { int_disziplinenid: DISCIPLINE_IDS.RECK_M_P, var_name: 'Reck m. P1-P9', bol_m: true, bol_w: false },
    ];

    for (const d of disciplinesToCreate) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO tfx_disziplinen (int_disziplinenid, int_sportid, var_name, bol_m, bol_w)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (int_disziplinenid) DO UPDATE
        SET var_name = EXCLUDED.var_name,
            bol_m = EXCLUDED.bol_m,
            bol_w = EXCLUDED.bol_w,
            int_sportid = EXCLUDED.int_sportid
      `, d.int_disziplinenid, sportId, d.var_name, d.bol_m, d.bol_w);
      createdDisciplineIds.push(d.int_disziplinenid);
    }

    const testEvent = await TestUtils.createTestEvent({
      name: 'GymNet 4-Apparatus Import Test Event'
    });
    testEventId = testEvent.int_veranstaltungenid;
  });

  afterAll(async () => {
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

  it('links exactly four unique disciplines for Gerätvierkampf m (9-10Jahre)', async () => {
    const competitionName = 'Gerätvierkampf m (9-10Jahre)';
    const competitionWaNr = '0103';

    const extractedData: ExtractedData = {
      clubs: [],
      participants: [],
      competitions: [{
        name: competitionName,
        gender: 'männlich',
        waNr: competitionWaNr,
        ageInfo: { min: 9, max: 10 },
        teamInfo: { min: 1, max: 1 }
      }],
      devices: [
        { name: 'Boden m. P1-P9', code: '100', id: '1727', competitionWaNr },
        { name: 'Sprung m. P1-P9', code: '130', id: '1728', competitionWaNr },
        { name: 'Par.-Barren m. P1-P9', code: '140', id: '1729', competitionWaNr },
        { name: 'Reck m. P1-P9', code: '150', id: '1730', competitionWaNr },
        // Duplicates as they appear per participant/team block in the XML
        { name: 'Boden m. P1-P9', code: '100', id: '1727', competitionWaNr },
        { name: 'Sprung m. P1-P9', code: '130', id: '1728', competitionWaNr },
        { name: 'Par.-Barren m. P1-P9', code: '140', id: '1729', competitionWaNr },
        { name: 'Reck m. P1-P9', code: '150', id: '1730', competitionWaNr },
      ],
      teams: []
    };

    const result: ImportResult = await importGymnetData(extractedData, testEventId, 2026);

    const competition = await prisma.tfx_wettkaempfe.findFirst({
      where: {
        int_veranstaltungenid: testEventId,
        var_name: competitionName
      }
    });

    expect(competition).not.toBeNull();
    createdCompetitionIds.push(competition!.int_wettkaempfeid);

    const linkedDiscs = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: { int_wettkaempfeid: competition!.int_wettkaempfeid },
      orderBy: { int_sortierung: 'asc' }
    });

    expect(result.warnings.filter(w => w.category === 'discipline' && w.type === 'warning')).toHaveLength(0);
    expect(linkedDiscs).toHaveLength(4);
    expect(linkedDiscs.map(d => d.int_disziplinenid)).toEqual([
      DISCIPLINE_IDS.BODEN_M_P,
      DISCIPLINE_IDS.SPRUNG_M_P,
      DISCIPLINE_IDS.PAR_BARREN_P,
      DISCIPLINE_IDS.RECK_M_P,
    ]);
  });

  async function importMaleCompetition(name: string, waNr: string, devices: Array<{ name: string; code: string; id: string }>) {
    const extractedData: ExtractedData = {
      clubs: [],
      participants: [],
      competitions: [{ name, gender: 'männlich', waNr, ageInfo: { min: 9, max: 10 }, teamInfo: { min: 1, max: 1 } }],
      devices: devices.map((d) => ({ ...d, competitionWaNr: waNr })),
      teams: []
    };
    const result: ImportResult = await importGymnetData(extractedData, testEventId, 2026);
    const competition = await prisma.tfx_wettkaempfe.findFirst({
      where: { int_veranstaltungenid: testEventId, var_name: name }
    });
    expect(competition).not.toBeNull();
    createdCompetitionIds.push(competition!.int_wettkaempfeid);
    const linked = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: { int_wettkaempfeid: competition!.int_wettkaempfeid },
      orderBy: { int_sortierung: 'asc' }
    });
    return { result, linkedIds: linked.map((l) => l.int_disziplinenid) };
  }

  describe('profile "existing" (grown database, ID-only mapping)', () => {
    const originalProfile = process.env.GYMNET_MAPPING_PROFILE;
    // IDs from gymnet-mapping.existing.json for the P1-P9 set of the anonymized fixture
    const existingIds: Array<[number, string, boolean]> = [
      [354, 'Boden m. P1-P9', true], [345, 'Pauschenpferd P1-P9', true], [346, 'Ringe P1-P9', true],
      [347, 'Sprung m. P1-P9', true], [713, 'Par.-Barren P1-P9', true], [349, 'Reck m. P1-P9', true],
      [350, 'Sprung w. P1-P9', false], [351, 'Reck/StuBa. P1-P9', false], [352, 'Schwebebalken P1-P9', false],
      [355, 'Boden w. P1-P9', false],
    ];

    beforeAll(async () => {
      const sportId = (await prisma.tfx_sport.findFirst())!.int_sportid;
      for (const [id, name, male] of existingIds) {
        // Only rows inserted here are cleaned up, so rows of parallel test files stay untouched.
        const inserted = await prisma.$executeRawUnsafe(
          `INSERT INTO tfx_disziplinen (int_disziplinenid, int_sportid, var_name, bol_m, bol_w) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (int_disziplinenid) DO NOTHING`,
          id, sportId, name, male, !male
        );
        if (inserted > 0) createdDisciplineIds.push(id);
      }
      process.env.GYMNET_MAPPING_PROFILE = 'existing';
      clearMappingCache();
    });

    afterAll(() => {
      if (originalProfile === undefined) delete process.env.GYMNET_MAPPING_PROFILE;
      else process.env.GYMNET_MAPPING_PROFILE = originalProfile;
      clearMappingCache();
    });

    it('imports the anonymized GymNet P-level export onto the IDs of the existing profile', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const { parseXmlAsync, extractAllData } = await import('../../src/utils/gymnetXmlParser');

      const xml = fs.readFileSync(path.join(__dirname, '../fixtures/gymnet-p-level-anonymized.xml'), 'utf-8');
      const parsed = await parseXmlAsync(xml, { explicitArray: false, ignoreAttrs: false, mergeAttrs: true });
      await importGymnetData(extractAllData(parsed), testEventId, 2026);

      const linkedFor = async (name: string) => {
        const comp = await prisma.tfx_wettkaempfe.findFirst({ where: { int_veranstaltungenid: testEventId, var_name: name } });
        expect(comp).not.toBeNull();
        createdCompetitionIds.push(comp!.int_wettkaempfeid);
        const links = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({ where: { int_wettkaempfeid: comp!.int_wettkaempfeid } });
        return links.map((l) => l.int_disziplinenid).sort((a, b) => a - b);
      };

      expect(await linkedFor('Gerätsechskampf m (7-8Jahre) Fixture')).toEqual([345, 346, 347, 349, 354, 713]);
      expect(await linkedFor('Gerätvierkampf w (7-8Jahre) Fixture')).toEqual([350, 351, 352, 355]);
    });

    it('does not link anything and warns when the GymNet code has no mapping entry', async () => {
      const { result, linkedIds } = await importMaleCompetition('Gerätzweikampf m (Unmapped)', '0198', [
        { name: 'Unbekanntes Gerät', code: '999', id: '9998' },
      ]);

      expect(linkedIds).toEqual([]);
      expect(result.warnings.some((w) => w.category === 'discipline' && w.message.includes('konnte nicht zugeordnet werden'))).toBe(true);
    });
  });
});