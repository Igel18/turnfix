import { PrismaClient } from '@prisma/client';
import { TestUtils } from '../utils/testUtils';
import { importGymnetData, type ImportResult } from '../../src/utils/gymnetDbImport';
import type { ExtractedData } from '../../src/utils/gymnetXmlParser';
import { DISCIPLINE_IDS } from '../../src/utils/gymnetDisciplineIds';

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
});