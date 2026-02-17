/**
 * GymNet Preset Import - Unit Tests
 * 
 * Tests the GymNet preset logic using a mocked Prisma client.
 * Verifies:
 * 1. All 78 disciplines are created with correct FIXED IDs
 * 2. Discipline names match the expected names from DISCIPLINE_NAMES
 * 3. All formulas are created
 * 4. Fields are created for all disciplines that have a deviceFieldMap entry
 * 5. The preset works correctly on an empty database
 * 6. wedDisNr mapping resolves to the correct discipline ID+name after preset
 */

import { applyGymNetPreset } from '../../src/utils/gymnetPreset';
import { DISCIPLINE_IDS, DISCIPLINE_NAMES, MAX_PRESET_DISCIPLINE_ID } from '../../src/utils/gymnetDisciplineIds';
import { wedDisNrToTurnFixId } from '../../src/utils/gymnetMapping';

// ============================================================================
// Mock Prisma client that simulates an empty database
// ============================================================================

function createMockDb() {
  const formulas: any[] = [];
  const sports: any[] = [];
  const disciplines: any[] = [];
  const fields: any[] = [];
  let formulaIdCounter = 1;
  let sportIdCounter = 1;
  // Disciplines use FIXED IDs from the preset, not auto-increment

  return {
    _formulas: formulas,
    _sports: sports,
    _disciplines: disciplines,
    _fields: fields,

    tfx_formeln: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const found = formulas.find(f => f.var_name === where.var_name);
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const record = { ...data, int_formelid: formulaIdCounter++ };
        formulas.push(record);
        return Promise.resolve(record);
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = formulas.findIndex(f => f.int_formelid === where.int_formelid);
        if (idx >= 0) {
          formulas[idx] = { ...formulas[idx], ...data };
          return Promise.resolve(formulas[idx]);
        }
        return Promise.resolve(null);
      }),
    },

    tfx_sport: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const found = sports.find(s => s.var_name === where.var_name);
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const record = { ...data, int_sportid: sportIdCounter++ };
        sports.push(record);
        return Promise.resolve(record);
      }),
    },

    tfx_disziplinen: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        // Support both name-based and ID-based lookup
        if (where.var_name) {
          const found = disciplines.find(d => d.var_name === where.var_name);
          return Promise.resolve(found || null);
        }
        if (where.int_disziplinenid !== undefined) {
          const found = disciplines.find(d => d.int_disziplinenid === where.int_disziplinenid);
          return Promise.resolve(found || null);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const record = { ...data };
        disciplines.push(record);
        return Promise.resolve(record);
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = disciplines.findIndex(d => d.int_disziplinenid === where.int_disziplinenid);
        if (idx >= 0) {
          disciplines[idx] = { ...disciplines[idx], ...data };
          return Promise.resolve(disciplines[idx]);
        }
        return Promise.resolve(null);
      }),
    },

    tfx_disziplinen_felder: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const found = fields.find(
          f => f.int_disziplinenid === where.int_disziplinenid && f.var_name === where.var_name
        );
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        fields.push(data);
        return Promise.resolve(data);
      }),
    },

    // Raw queries for sequence reset
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ max: 0 }]),
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('GymNet Preset Import', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let result: any;

  beforeAll(async () => {
    mockDb = createMockDb();
    result = await applyGymNetPreset(mockDb as any);
  });

  // ---------- Basic success ----------

  describe('Basic execution', () => {
    it('should return success', () => {
      expect(result.success).toBe(true);
    });

    it('should report created disciplines > 0', () => {
      expect(result.createdDevices).toBeGreaterThan(0);
    });

    it('should report created formulas > 0', () => {
      expect(result.createdFormulas).toBeGreaterThan(0);
    });

    it('should report created fields > 0', () => {
      expect(result.createdFields).toBeGreaterThan(0);
    });
  });

  // ---------- All 78 disciplines created ----------

  describe('Discipline creation completeness', () => {
    it('should create exactly 76 disciplines (IDs 29+30 intentionally unused)', () => {
      const expectedCount = Object.keys(DISCIPLINE_IDS).length;
      expect(expectedCount).toBe(76); // IDs 29 and 30 are intentionally not assigned
      expect(mockDb._disciplines.length).toBe(expectedCount);
    });

    it('should have created all disciplines with correct count in result', () => {
      expect(result.createdDevices).toBe(76);
    });

    it('should not have IDs 29 or 30 (intentionally unused)', () => {
      const ids = mockDb._disciplines.map((d: any) => d.int_disziplinenid);
      expect(ids).not.toContain(29);
      expect(ids).not.toContain(30);
    });
  });

  // ---------- Each discipline has the correct fixed ID ----------

  describe('Discipline IDs match DISCIPLINE_IDS', () => {
    const allEntries = Object.entries(DISCIPLINE_IDS);

    it.each(allEntries)(
      '%s should be created with ID %d',
      (key, expectedId) => {
        const disc = mockDb._disciplines.find((d: any) => d.int_disziplinenid === expectedId);
        expect(disc).toBeDefined();
        // Verify this is the discipline we expect by checking it was created with the right ID
        expect(disc.int_disziplinenid).toBe(expectedId);
      }
    );
  });

  // ---------- Discipline names match DISCIPLINE_NAMES ----------

  describe('Discipline names match DISCIPLINE_NAMES', () => {
    const allNameEntries = Object.entries(DISCIPLINE_NAMES);

    it.each(allNameEntries)(
      'ID %d should have name "%s"',
      (idStr, expectedName) => {
        const id = Number(idStr);
        const disc = mockDb._disciplines.find((d: any) => d.int_disziplinenid === id);
        expect(disc).toBeDefined();
        expect(disc.var_name).toBe(expectedName);
      }
    );
  });

  // ---------- Specific critical disciplines ----------

  describe('Critical base apparatus disciplines (IDs 1-13)', () => {
    const baseCases: [string, number, string][] = [
      ['BODEN', DISCIPLINE_IDS.BODEN, 'Boden'],
      ['PAUSCHENPFERD', DISCIPLINE_IDS.PAUSCHENPFERD, 'Pauschenpferd'],
      ['RINGE', DISCIPLINE_IDS.RINGE, 'Ringe'],
      ['SPRUNG', DISCIPLINE_IDS.SPRUNG, 'Sprung'],
      ['BARREN', DISCIPLINE_IDS.BARREN, 'Barren'],
      ['RECK', DISCIPLINE_IDS.RECK, 'Reck'],
      ['SPRUNG_W', DISCIPLINE_IDS.SPRUNG_W, 'Sprung w'],
      ['STUFENBARREN', DISCIPLINE_IDS.STUFENBARREN, 'Stufenbarren'],
      ['SCHWEBEBALKEN', DISCIPLINE_IDS.SCHWEBEBALKEN, 'Schwebebalken'],
      ['BODEN_W', DISCIPLINE_IDS.BODEN_W, 'Boden w'],
      ['MINITRAMPOLIN', DISCIPLINE_IDS.MINITRAMPOLIN, 'Minitrampolin'],
      ['GERAETEBAHN_A', DISCIPLINE_IDS.GERAETEBAHN_A, 'Gerätebahn A'],
      ['GERAETEBAHN_B', DISCIPLINE_IDS.GERAETEBAHN_B, 'Gerätebahn B'],
    ];

    it.each(baseCases)(
      '%s → ID=%d, name="%s"',
      (key, expectedId, expectedName) => {
        const disc = mockDb._disciplines.find((d: any) => d.int_disziplinenid === expectedId);
        expect(disc).toBeDefined();
        expect(disc.var_name).toBe(expectedName);
      }
    );
  });

  // ---------- No duplicate IDs ----------

  describe('No duplicate discipline IDs', () => {
    it('should have no duplicate int_disziplinenid values', () => {
      const ids = mockDb._disciplines.map((d: any) => d.int_disziplinenid);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ---------- No duplicate names ----------

  describe('No duplicate discipline names', () => {
    it('should have no duplicate var_name values', () => {
      const names = mockDb._disciplines.map((d: any) => d.var_name);
      const uniqueNames = new Set(names);
      // If there are duplicates, show them for debugging
      if (uniqueNames.size !== names.length) {
        const counts: Record<string, number> = {};
        names.forEach((n: string) => { counts[n] = (counts[n] || 0) + 1; });
        const duplicates = Object.entries(counts).filter(([_, c]) => c > 1);
        console.error('Duplicate discipline names:', duplicates);
      }
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  // ---------- Formulas ----------

  describe('Formulas', () => {
    it('should create LK formula', () => {
      const lk = mockDb._formulas.find((f: any) => f.var_name === 'LK');
      expect(lk).toBeDefined();
      expect(lk.var_formel).toBe('A + B - C');
    });

    it('should create AK formula', () => {
      const ak = mockDb._formulas.find((f: any) => f.var_name === 'AK');
      expect(ak).toBeDefined();
      expect(ak.var_formel).toBe('A - B - C');
    });

    it('should create P-Wettkampf formula', () => {
      const pw = mockDb._formulas.find((f: any) => f.var_name === 'P-Wettkampf');
      expect(pw).toBeDefined();
    });
  });

  // ---------- Sports ----------

  describe('Sports', () => {
    it('should create Turnen DTB sport', () => {
      expect(mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB')).toBeDefined();
    });

    it('should create Turnen DTB LK sport', () => {
      expect(mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB LK')).toBeDefined();
    });

    it('should create Turnen DTB P sport', () => {
      expect(mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB P')).toBeDefined();
    });

    it('should create Turnen DTB Turn10 sport', () => {
      expect(mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB Turn10')).toBeDefined();
    });
  });

  // ---------- Sequence reset ----------
  // NOTE: jest.config.js has clearMocks: true, which clears mock.calls before
  // each test. We capture calls during beforeAll and verify from the snapshot.

  describe('Sequence reset', () => {
    // Capture mock call data during beforeAll since clearMocks wipes it before each test
    let queryRawCalls: any[];
    let executeRawCalls: any[];

    beforeAll(() => {
      // Re-run to capture the calls (mockDb is already populated, so disciplines
      // will be found by name and skipped – but sequence reset still runs)
      const freshDb = createMockDb();
      // Copy existing disciplines so the preset skips creation
      (freshDb as any)._disciplines = [...mockDb._disciplines];
      (freshDb as any)._formulas = [...mockDb._formulas];
      (freshDb as any)._sports = [...mockDb._sports];
      (freshDb as any)._fields = [...mockDb._fields];

      return applyGymNetPreset(freshDb as any).then(() => {
        queryRawCalls = (freshDb.$queryRawUnsafe as jest.Mock).mock.calls;
        executeRawCalls = (freshDb.$executeRawUnsafe as jest.Mock).mock.calls;
      });
    });

    it('should query current max ID', () => {
      expect(queryRawCalls.length).toBeGreaterThan(0);
      expect(queryRawCalls[0][0]).toContain('SELECT MAX');
    });

    it('should set sequence to at least MAX_PRESET_DISCIPLINE_ID', () => {
      expect(executeRawCalls.length).toBeGreaterThan(0);
      expect(executeRawCalls[0][0]).toContain('setval');
      // Second arg should be at least MAX_PRESET_DISCIPLINE_ID (78)
      expect(executeRawCalls[0][1]).toBeGreaterThanOrEqual(MAX_PRESET_DISCIPLINE_ID);
    });
  });
});

// ============================================================================
// wedDisNr → discipline resolution (end-to-end consistency)
// ============================================================================

describe('wedDisNr mapping consistency with GymNet preset', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeAll(async () => {
    mockDb = createMockDb();
    await applyGymNetPreset(mockDb as any);
  });

  /**
   * For every wedDisNr code, verify that:
   * 1. wedDisNrToTurnFixId returns a non-null ID
   * 2. That ID exists in the mock DB (was created by the preset)
   * 3. The discipline name in the DB matches DISCIPLINE_NAMES
   */
  const wedDisNrCases: [number, string, string][] = [
    // Base DTB codes (200-290) → base apparatus
    [200, 'BODEN', 'Boden'],
    [210, 'PAUSCHENPFERD', 'Pauschenpferd'],
    [220, 'RINGE', 'Ringe'],
    [230, 'SPRUNG', 'Sprung'],
    [240, 'BARREN', 'Barren'],
    [250, 'RECK', 'Reck'],
    [260, 'SPRUNG_W', 'Sprung w'],
    [270, 'STUFENBARREN', 'Stufenbarren'],
    [280, 'SCHWEBEBALKEN', 'Schwebebalken'],
    [290, 'BODEN_W', 'Boden w'],
    [630, 'MINITRAMPOLIN', 'Minitrampolin'],
    [915, 'GERAETEBAHN_A', 'Gerätebahn A'],
    [916, 'GERAETEBAHN_B', 'Gerätebahn B'],

    // Male Kür
    [100, 'BODEN_M_KUER', 'Boden m. Kür'],
    [110, 'P_PFERD_KUER', 'P.-Pferd Kür'],
    [120, 'RINGE_M', 'Ringe m.'],
    [130, 'SPRUNG_M_KUER', 'Sprung m. Kür'],
    [140, 'PAR_BARREN_KUER', 'Par.-Barren Kür'],
    [150, 'RECK_M_KUER', 'Reck m. Kür'],

    // Female Kür
    [160, 'SPRUNG_W_KUER', 'Sprung w. Kür'],
    [170, 'STUFENBARREN', 'Stufenbarren'],
    [180, 'SCHWEBEBALKEN', 'Schwebebalken'],
    [190, 'BODEN_W_KUER', 'Boden w. Kür'],

    // Male LK1
    [101, 'BODEN_M_LK1', 'Boden m. LK1'],
    [111, 'P_PFERD_LK1', 'P.-Pferd LK1'],
    [121, 'RINGE_LK1', 'Ringe LK1'],
    [131, 'SPRUNG_M_LK1', 'Sprung m. LK1'],
    [141, 'PAR_BARREN_LK1', 'Par.-Barren LK1'],
    [151, 'RECK_M_LK1', 'Reck m. LK1'],

    // Female LK1
    [161, 'SPRUNG_W_LK1', 'Sprung w. LK1'],
    [171, 'STUFENBARREN_LK1', 'Stufenbarren LK1'],
    [181, 'SCHWEBEBALKEN_LK1', 'Schwebebalken LK1'],
    [191, 'BODEN_W_LK1', 'Boden w. LK1'],

    // Male LK2
    [102, 'BODEN_M_LK2', 'Boden m. LK2'],
    [112, 'P_PFERD_LK2', 'P.-Pferd LK2'],
    [122, 'RINGE_LK2', 'Ringe LK2'],
    [132, 'SPRUNG_M_LK2', 'Sprung m. LK2'],
    [142, 'PAR_BARREN_LK2', 'Par.-Barren LK2'],
    [152, 'RECK_M_LK2', 'Reck m. LK2'],

    // Female LK2
    [162, 'SPRUNG_W_LK2', 'Sprung w. LK2'],
    [172, 'STUFENBARREN_LK2', 'Stufenbarren LK2'],
    [182, 'SCHWEBEBALKEN_LK2', 'Schwebebalken LK2'],
    [192, 'BODEN_W_LK2', 'Boden w. LK2'],

    // Male LK3
    [103, 'BODEN_M_LK3', 'Boden m. LK3'],
    [113, 'P_PFERD_LK3', 'P.-Pferd LK3'],
    [123, 'RINGE_LK3', 'Ringe LK3'],
    [133, 'SPRUNG_M_LK3', 'Sprung m. LK3'],
    [143, 'PAR_BARREN_LK3', 'Par.-Barren LK3'],
    [153, 'RECK_M_LK3', 'Reck m. LK3'],

    // Female LK3
    [163, 'SPRUNG_W_LK3', 'Sprung w. LK3'],
    [173, 'STUFENBARREN_LK3', 'Stufenbarren LK3'],
    [183, 'SCHWEBEBALKEN_LK3', 'Schwebebalken LK3'],
    [193, 'BODEN_W_LK3', 'Boden w. LK3'],

    // P-Übung male
    [209, 'BODEN_M_P', 'Boden m. P1-P9'],
    [219, 'PAUSCHENPFERD_P', 'Pauschenpferd P1-P9'],
    [229, 'RINGE_P', 'Ringe P1-P9'],
    [239, 'SPRUNG_M_P', 'Sprung m. P1-P9'],
    [249, 'PAR_BARREN_P', 'Par.-Barren P1-P9'],
    [259, 'RECK_M_P', 'Reck m. P1-P9'],

    // P-Übung female
    [269, 'SPRUNG_W_P', 'Sprung w. P1-P9'],
    [279, 'RECK_STUBA_P', 'Reck/StuBa. P1-P9'],
    [289, 'SCHWEBEBALKEN_P', 'Schwebebalken P1-P9'],
    [299, 'BODEN_W_P', 'Boden w. P1-P9'],
  ];

  it.each(wedDisNrCases)(
    'wedDisNr %d (%s) → resolves to discipline "%s" in DB',
    (wedDisNr, _key, expectedName) => {
      const turnfixId = wedDisNrToTurnFixId(wedDisNr);
      expect(turnfixId).not.toBeNull();

      // The discipline with this ID must exist in the mock DB
      const disc = mockDb._disciplines.find((d: any) => d.int_disziplinenid === turnfixId);
      expect(disc).toBeDefined();
      expect(disc.var_name).toBe(expectedName);
    }
  );
});

// ============================================================================
// DISCIPLINE_IDS ↔ geraete array consistency
// ============================================================================

describe('DISCIPLINE_IDS completeness', () => {
  it('every DISCIPLINE_ID value should be unique', () => {
    const values = Object.values(DISCIPLINE_IDS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it('MAX_PRESET_DISCIPLINE_ID should equal the highest DISCIPLINE_IDS value', () => {
    const maxId = Math.max(...Object.values(DISCIPLINE_IDS));
    expect(MAX_PRESET_DISCIPLINE_ID).toBe(maxId);
  });

  it('DISCIPLINE_NAMES should have an entry for every DISCIPLINE_ID', () => {
    for (const [key, id] of Object.entries(DISCIPLINE_IDS)) {
      expect(DISCIPLINE_NAMES[id]).toBeDefined();
    }
  });
});
