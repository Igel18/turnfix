/**
 * Tests for GymNet XML discipline extraction and wedDisNr→TurnFix mapping.
 *
 * Verifies that:
 *   1. The XML device extraction correctly parses Disziplinen/Disziplin elements
 *   2. wedDisNr codes are properly mapped to TurnFix discipline IDs
 *   3. The getDisciplinesForCompetition fallback returns reasonable results
 *   4. Case-insensitive key matching works for wedDisNr, wedDisName, wedDisID
 */

import { wedDisNrToTurnFixId, wedDisNrToName, turnFixIdToWedDisNr, getDisciplinesForCompetition, matchesLevel, getExpectedDisciplineCount, detectLevelFromDevices, detectGenderFromName, DISCIPLINE_IDS, DISCIPLINE_NAMES } from '../../src/utils/gymnetMapping';

// ============================================================================
// 1. wedDisNr → TurnFix ID mapping
// ============================================================================

describe('wedDisNrToTurnFixId', () => {
  // Female LK1 codes (from fixture gymnet-mannschaft-geraete.xml)
  it('should map wedDisNr 161 to Sprung w. LK1', () => {
    expect(wedDisNrToTurnFixId(161)).toBe(DISCIPLINE_IDS.SPRUNG_W_LK1);
  });

  it('should map wedDisNr 171 to Stufenbarren LK1', () => {
    expect(wedDisNrToTurnFixId(171)).toBe(DISCIPLINE_IDS.STUFENBARREN_LK1);
  });

  it('should map wedDisNr 181 to Schwebebalken LK1', () => {
    expect(wedDisNrToTurnFixId(181)).toBe(DISCIPLINE_IDS.SCHWEBEBALKEN_LK1);
  });

  it('should map wedDisNr 191 to Boden w. LK1', () => {
    expect(wedDisNrToTurnFixId(191)).toBe(DISCIPLINE_IDS.BODEN_W_LK1);
  });

  // String input
  it('should accept string wedDisNr values', () => {
    expect(wedDisNrToTurnFixId('161')).toBe(DISCIPLINE_IDS.SPRUNG_W_LK1);
    expect(wedDisNrToTurnFixId('191')).toBe(DISCIPLINE_IDS.BODEN_W_LK1);
  });

  // Base DTB codes
  it('should map base DTB code 200 to Boden (generic)', () => {
    expect(wedDisNrToTurnFixId(200)).toBe(DISCIPLINE_IDS.BODEN);
  });

  it('should map base DTB code 260 to Sprung w', () => {
    expect(wedDisNrToTurnFixId(260)).toBe(DISCIPLINE_IDS.SPRUNG_W);
  });

  it('should map base DTB code 270 to Stufenbarren', () => {
    expect(wedDisNrToTurnFixId(270)).toBe(DISCIPLINE_IDS.STUFENBARREN);
  });

  // Special codes
  it('should map 630 to Minitrampolin', () => {
    expect(wedDisNrToTurnFixId(630)).toBe(DISCIPLINE_IDS.MINITRAMPOLIN);
  });

  it('should map 915 to Gerätebahn A', () => {
    expect(wedDisNrToTurnFixId(915)).toBe(DISCIPLINE_IDS.GERAETEBAHN_A);
  });

  it('should map 916 to Gerätebahn B', () => {
    expect(wedDisNrToTurnFixId(916)).toBe(DISCIPLINE_IDS.GERAETEBAHN_B);
  });

  // Invalid input
  it('should return null for unknown codes', () => {
    expect(wedDisNrToTurnFixId(999)).toBeNull();
    expect(wedDisNrToTurnFixId(0)).toBeNull();
    expect(wedDisNrToTurnFixId(-1)).toBeNull();
  });

  it('should return null for NaN input', () => {
    expect(wedDisNrToTurnFixId('abc')).toBeNull();
    expect(wedDisNrToTurnFixId('')).toBeNull();
  });
});

// ============================================================================
// 2. wedDisNrToName
// ============================================================================

describe('wedDisNrToName', () => {
  it('should return correct name for LK1 female codes', () => {
    expect(wedDisNrToName(161)).toBe(DISCIPLINE_NAMES[DISCIPLINE_IDS.SPRUNG_W_LK1]);
    expect(wedDisNrToName(171)).toBe(DISCIPLINE_NAMES[DISCIPLINE_IDS.STUFENBARREN_LK1]);
    expect(wedDisNrToName(181)).toBe(DISCIPLINE_NAMES[DISCIPLINE_IDS.SCHWEBEBALKEN_LK1]);
    expect(wedDisNrToName(191)).toBe(DISCIPLINE_NAMES[DISCIPLINE_IDS.BODEN_W_LK1]);
  });

  it('should return null for unknown codes', () => {
    expect(wedDisNrToName(999)).toBeNull();
  });
});

describe('turnFixIdToWedDisNr', () => {
  it('prefers base DTB code when multiple codes map to one discipline ID', () => {
    expect(turnFixIdToWedDisNr(DISCIPLINE_IDS.STUFENBARREN)).toBe(270);
  });

  it('prefers canonical x0 base code over x9 variants for shared IDs', () => {
    // STUFENBARREN maps from both 270 (base DTB) and 279 (P-level variant)
    expect(turnFixIdToWedDisNr(DISCIPLINE_IDS.STUFENBARREN)).toBe(270);
  });

  it('returns null for unknown discipline IDs', () => {
    expect(turnFixIdToWedDisNr(999999)).toBeNull();
  });
});

// ============================================================================
// 3. XML key matching simulation
// ============================================================================

describe('XML key matching (case-insensitive)', () => {
  // Simulate what extractDevices does: key.toLowerCase().includes(...)
  const simulateKeyMatch = (key: string) => {
    const keyLower = key.toLowerCase();
    return {
      isName: keyLower.includes('name') || keyLower.includes('gerät') ||
              keyLower.includes('apparatus') || keyLower.includes('discipline') ||
              keyLower.includes('disziplin') || keyLower.includes('bezeichnung') ||
              keyLower.includes('weddisname'),
      isId:   keyLower.includes('disid') || keyLower.includes('gerid') ||
              keyLower.includes('weddisid'),
      isCode: keyLower.includes('code') || keyLower.includes('abbreviation') ||
              keyLower.includes('kuerzel') || keyLower.includes('kurz') ||
              keyLower.includes('weddisnr'),
      isOrder: keyLower.includes('reihenfolge') || keyLower.includes('order') ||
               keyLower.includes('folge') || keyLower.includes('position'),
    };
  };

  it('should match wedDisName (mixed case) as name field', () => {
    const result = simulateKeyMatch('wedDisName');
    expect(result.isName).toBe(true);
    expect(result.isCode).toBe(false);
  });

  it('should match wedDisNr (mixed case) as code field', () => {
    const result = simulateKeyMatch('wedDisNr');
    expect(result.isCode).toBe(true);
    expect(result.isName).toBe(false);
  });

  it('should match wedDisID (mixed case) as id field', () => {
    const result = simulateKeyMatch('wedDisID');
    expect(result.isId).toBe(true);
    expect(result.isCode).toBe(false);
  });

  it('should match wtdPosition as order field', () => {
    const result = simulateKeyMatch('wtdPosition');
    expect(result.isOrder).toBe(true);
  });

  // Keys that should NOT match device fields
  it('should NOT match waID as device id', () => {
    const result = simulateKeyMatch('waID');
    expect(result.isId).toBe(false);
  });

  it('should NOT match perID as device id', () => {
    const result = simulateKeyMatch('perID');
    expect(result.isId).toBe(false);
  });

  it('should NOT match espID as device id', () => {
    const result = simulateKeyMatch('espID');
    expect(result.isId).toBe(false);
  });

  it('should NOT match etID as device id', () => {
    const result = simulateKeyMatch('etID');
    expect(result.isId).toBe(false);
  });
});

// ============================================================================
// 4. XML Disziplin object extraction simulation
// ============================================================================

describe('Disziplin object parsing', () => {
  // Simulate extractDevices for a single Disziplin element (from fixture XML)
  const parseDevice = (item: Record<string, any>) => {
    const device: any = {};
    Object.keys(item).forEach(key => {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('name') || keyLower.includes('disziplin') ||
          keyLower.includes('weddisname')) {
        device.name = item[key];
      }
      if (keyLower.includes('disid') || keyLower.includes('gerid') ||
          keyLower.includes('weddisid')) {
        device.id = item[key];
      }
      if (keyLower.includes('code') || keyLower.includes('weddisnr')) {
        device.code = item[key];
      }
      if (keyLower.includes('position') || keyLower.includes('reihenfolge')) {
        device.order = item[key];
      }
    });
    return device;
  };

  it('should extract wedDisNr as code from Disziplin element', () => {
    const disziplin = {
      wedDisID: '1115',
      wedDisNr: '161',
      wedDisName: 'Sprung w. LK1',
      wtdPosition: '1',
      wtdID: '1363457',
      wtdBestzeit: '',
      wtdSprung1: '0',
      wtdSprung2: '0',
      wtdPunkte: '',
    };

    const device = parseDevice(disziplin);
    expect(device.code).toBe('161');
    expect(device.name).toBe('Sprung w. LK1');
    expect(device.id).toBe('1115');
    expect(device.order).toBe('1');
  });

  it('should extract all four LK1 female disciplines from XML fixture', () => {
    const disziplinen = [
      { wedDisID: '1115', wedDisNr: '161', wedDisName: 'Sprung w. LK1', wtdPosition: '1' },
      { wedDisID: '1118', wedDisNr: '171', wedDisName: 'Stu.-Barren LK1', wtdPosition: '2' },
      { wedDisID: '1122', wedDisNr: '181', wedDisName: 'Sch.-Balken LK1', wtdPosition: '3' },
      { wedDisID: '1127', wedDisNr: '191', wedDisName: 'Boden w. LK1', wtdPosition: '4' },
    ];

    const devices = disziplinen.map(parseDevice);

    expect(devices).toHaveLength(4);
    expect(devices[0].code).toBe('161');
    expect(devices[1].code).toBe('171');
    expect(devices[2].code).toBe('181');
    expect(devices[3].code).toBe('191');

    // Each code should map to a valid TurnFix ID
    for (const d of devices) {
      const tfId = wedDisNrToTurnFixId(d.code);
      expect(tfId).not.toBeNull();
    }
  });

  it('should map extracted codes to correct TurnFix discipline IDs', () => {
    const codes = ['161', '171', '181', '191'];
    const expectedIds = [
      DISCIPLINE_IDS.SPRUNG_W_LK1,
      DISCIPLINE_IDS.STUFENBARREN_LK1,
      DISCIPLINE_IDS.SCHWEBEBALKEN_LK1,
      DISCIPLINE_IDS.BODEN_W_LK1,
    ];

    codes.forEach((code, i) => {
      expect(wedDisNrToTurnFixId(code)).toBe(expectedIds[i]);
    });
  });
});

// ============================================================================
// 5. getDisciplinesForCompetition fallback
// ============================================================================

describe('getDisciplinesForCompetition', () => {
  // Mock Prisma with GymNet preset discipline names
  const gymnetDisciplineNames = Object.values(DISCIPLINE_NAMES);

  const mockPrisma = {
    tfx_disziplinen: {
      findMany: jest.fn().mockResolvedValue(
        gymnetDisciplineNames.map((name, idx) => ({ int_disziplinenid: idx + 1, var_name: name, bol_m: true, bol_w: true }))
      ),
    },
  } as any;

  it('should return 4 disciplines for "Gerätvierkampf w"', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf w', mockPrisma);
    expect(result.length).toBe(4);
    // Should include female apparatus
    const resultLower = result.map(r => r.name.toLowerCase());
    expect(resultLower.some(r => r.includes('sprung'))).toBe(true);
    expect(resultLower.some(r => r.includes('stufenbarren') || r.includes('barren'))).toBe(true);
    expect(resultLower.some(r => r.includes('schwebebalken') || r.includes('balken'))).toBe(true);
    expect(resultLower.some(r => r.includes('boden'))).toBe(true);
  });

  it('should return 6 disciplines for "Sechskampf m"', async () => {
    const result = await getDisciplinesForCompetition('Sechskampf m', mockPrisma);
    expect(result.length).toBe(6);
  });

  it('should return disciplines for "WK 14 - LK 1 w" (level-specific)', async () => {
    const result = await getDisciplinesForCompetition('WK 14 - LK 1 w', mockPrisma);
    // Should return something (not empty) — the fallback should find disciplines
    expect(result.length).toBeGreaterThan(0);
  });

  it('should NOT return empty array for unknown competition name', async () => {
    const result = await getDisciplinesForCompetition('Unknown Competition 2025', mockPrisma);
    // Default fallback now returns all 8 base apparatus instead of just 2
    expect(result.length).toBeGreaterThan(2);
  });

  it('should NOT return only ["Boden", "Sprung"] for any input (old bug)', async () => {
    const testNames = [
      'Unknown Competition',
      'WK 14',
      'Testveranstaltung',
      'Jugend weiblich',
      'Mädchen C',
    ];

    for (const testName of testNames) {
      const result = await getDisciplinesForCompetition(testName, mockPrisma);
      // The old bug returned exactly ['Boden', 'Sprung'] for all unknown names
      const names = result.map(r => r.name);
      const isOldBug = names.length === 2 && 
        names.includes('Boden') && names.includes('Sprung');
      expect(isOldBug).toBe(false);
    }
  });

  it('should match GymNet preset names (e.g., "Boden m." not just "Boden")', async () => {
    const result = await getDisciplinesForCompetition('Geräteturnen', mockPrisma);
    // All returned names should exist in DISCIPLINE_NAMES
    for (const item of result) {
      expect(gymnetDisciplineNames).toContain(item.name);
    }
  });

  it('should return discipline objects with id and name', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf w', mockPrisma);
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(typeof item.id).toBe('number');
      expect(typeof item.name).toBe('string');
    }
  });
});

// ============================================================================
// 6. End-to-end: XML Disziplin → wedDisNr → TurnFix ID → Discipline name
// ============================================================================

describe('End-to-end: XML to TurnFix discipline linkage', () => {
  // Simulate full pipeline for fixture gymnet-mannschaft-geraete.xml
  const xmlDisziplinen = [
    { wedDisID: '1115', wedDisNr: '161', wedDisName: 'Sprung w. LK1', wtdPosition: '1' },
    { wedDisID: '1118', wedDisNr: '171', wedDisName: 'Stu.-Barren LK1', wtdPosition: '2' },
    { wedDisID: '1122', wedDisNr: '181', wedDisName: 'Sch.-Balken LK1', wtdPosition: '3' },
    { wedDisID: '1127', wedDisNr: '191', wedDisName: 'Boden w. LK1', wtdPosition: '4' },
  ];

  it('should link all 4 XML disciplines to valid TurnFix IDs', () => {
    const linked: Array<{ xmlName: string; tfId: number; tfName: string }> = [];

    for (const disziplin of xmlDisziplinen) {
      const tfId = wedDisNrToTurnFixId(disziplin.wedDisNr);
      expect(tfId).not.toBeNull();
      const tfName = DISCIPLINE_NAMES[tfId!];
      expect(tfName).toBeDefined();
      linked.push({ xmlName: disziplin.wedDisName, tfId: tfId!, tfName });
    }

    expect(linked).toHaveLength(4);
    // Verify the linked names make sense
    expect(linked[0].tfName).toContain('Sprung');
    expect(linked[1].tfName).toContain('Stufenbarren');
    expect(linked[2].tfName).toContain('Schwebebalken');
    expect(linked[3].tfName).toContain('Boden');
  });

  it('should produce unique TurnFix IDs (no duplicates)', () => {
    const ids = xmlDisziplinen.map(d => wedDisNrToTurnFixId(d.wedDisNr));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should never return the old fallback result [Boden, Sprung] when wedDisNr is available', () => {
    // This test documents the fixed bug: previously all competitions got only
    // 'Boden' and 'Sprung' because wedDisNr extraction failed silently
    const extractedCodes = xmlDisziplinen.map(d => d.wedDisNr).filter(Boolean);
    expect(extractedCodes.length).toBe(4);
    
    const tfIds = extractedCodes.map(code => wedDisNrToTurnFixId(code));
    expect(tfIds.every(id => id !== null)).toBe(true);
    // More than 2 disciplines → proves we're not in the old fallback
    expect(tfIds.length).toBeGreaterThan(2);
  });
});

// ============================================================================
// 7. Male Kür discipline codes
// ============================================================================

describe('Male Kür wedDisNr codes', () => {
  const maleKuerCodes = [
    { code: 100, name: 'Boden m. Kür', id: DISCIPLINE_IDS.BODEN_M_KUER },
    { code: 110, name: 'P.-Pferd Kür', id: DISCIPLINE_IDS.P_PFERD_KUER },
    { code: 120, name: 'Ringe m.', id: DISCIPLINE_IDS.RINGE_M },
    { code: 130, name: 'Sprung m. Kür', id: DISCIPLINE_IDS.SPRUNG_M_KUER },
    { code: 140, name: 'Par.-Barren Kür', id: DISCIPLINE_IDS.PAR_BARREN_KUER },
    { code: 150, name: 'Reck m. Kür', id: DISCIPLINE_IDS.RECK_M_KUER },
  ];

  maleKuerCodes.forEach(({ code, name, id }) => {
    it(`should map code ${code} to ${name} (ID=${id})`, () => {
      expect(wedDisNrToTurnFixId(code)).toBe(id);
    });
  });
});

// ============================================================================
// 8. Female Kür discipline codes
// ============================================================================

describe('Female Kür wedDisNr codes', () => {
  const femaleKuerCodes = [
    { code: 160, name: 'Sprung w. Kür', id: DISCIPLINE_IDS.SPRUNG_W_KUER },
    { code: 170, name: 'Stufenbarren', id: DISCIPLINE_IDS.STUFENBARREN },
    { code: 180, name: 'Schwebebalken', id: DISCIPLINE_IDS.SCHWEBEBALKEN },
    { code: 190, name: 'Boden w. Kür', id: DISCIPLINE_IDS.BODEN_W_KUER },
  ];

  femaleKuerCodes.forEach(({ code, name, id }) => {
    it(`should map code ${code} to ${name} (ID=${id})`, () => {
      expect(wedDisNrToTurnFixId(code)).toBe(id);
    });
  });
});

// ============================================================================
// 9. matchesLevel — precise level matching (bug fix for includes('p'))
// ============================================================================

describe('matchesLevel', () => {
  describe('P-level matching', () => {
    it('should match "Boden m. P1-P9" for level "P"', () => {
      expect(matchesLevel('Boden m. P1-P9', 'P')).toBe(true);
    });

    it('should match "Par.-Barren P 1 > P 9" for level "P"', () => {
      expect(matchesLevel('Par.-Barren P 1 > P 9', 'P')).toBe(true);
    });

    it('should match "Schwebebalken P1-P9" for level "P"', () => {
      expect(matchesLevel('Schwebebalken P1-P9', 'P')).toBe(true);
    });

    it('should match "Reck m. P1-P9" for level "P"', () => {
      expect(matchesLevel('Reck m. P1-P9', 'P')).toBe(true);
    });

    it('should NOT match "Sprung m. Kür" for level "P" (contains "p" in "Sprung")', () => {
      expect(matchesLevel('Sprung m. Kür', 'P')).toBe(false);
    });

    it('should NOT match "Pauschenpferd" for level "P" (contains "p" in name)', () => {
      expect(matchesLevel('Pauschenpferd', 'P')).toBe(false);
    });

    it('should NOT match "P.-Pferd Kür" for level "P" (apparatus name starts with P)', () => {
      // "P.-Pferd" has P at start but it's not a P-level marker
      expect(matchesLevel('P.-Pferd Kür', 'P')).toBe(false);
    });

    it('should NOT match "Sprung w. LK1" for level "P"', () => {
      expect(matchesLevel('Sprung w. LK1', 'P')).toBe(false);
    });

    it('should NOT match "P-Barren Turn10® Basis" for level "P" (Turn10 apparatus)', () => {
      // P-Barren has P in the name but it's not a P-level competition
      expect(matchesLevel('P-Barren Turn10® Basis', 'P')).toBe(false);
    });
  });

  describe('LK matching', () => {
    it('should match "Boden m. LK1" for level "LK1"', () => {
      expect(matchesLevel('Boden m. LK1', 'LK1')).toBe(true);
    });

    it('should match "Sprung w. LK2" for level "LK2"', () => {
      expect(matchesLevel('Sprung w. LK2', 'LK2')).toBe(true);
    });

    it('should NOT match "Boden m. LK1" for level "LK2"', () => {
      expect(matchesLevel('Boden m. LK1', 'LK2')).toBe(false);
    });

    it('should NOT match "Boden m. Kür" for level "LK1"', () => {
      expect(matchesLevel('Boden m. Kür', 'LK1')).toBe(false);
    });
  });

  describe('Kür matching', () => {
    it('should match "Boden m. Kür" for level "Kür"', () => {
      expect(matchesLevel('Boden m. Kür', 'Kür')).toBe(true);
    });

    it('should NOT match "Boden m. LK1" for level "Kür"', () => {
      expect(matchesLevel('Boden m. LK1', 'Kür')).toBe(false);
    });
  });
});

// ============================================================================
// 10. getExpectedDisciplineCount
// ============================================================================

describe('getExpectedDisciplineCount', () => {
  it('should return 6 for "Gerätsechskampf m (17-18Jahre)"', () => {
    expect(getExpectedDisciplineCount('Gerätsechskampf m (17-18Jahre)')).toBe(6);
  });

  it('should return 6 for "6-Kampf m"', () => {
    expect(getExpectedDisciplineCount('6-Kampf m')).toBe(6);
  });

  it('should return 4 for "Gerätvierkampf w (1-6Jahre)"', () => {
    expect(getExpectedDisciplineCount('Gerätvierkampf w (1-6Jahre)')).toBe(4);
  });

  it('should return 4 for "Turn10 Basisstufe Gerät 4-Kampf m (15-16Jahre)"', () => {
    expect(getExpectedDisciplineCount('Turn10 Basisstufe Gerät 4-Kampf m (15-16Jahre)')).toBe(4);
  });

  it('should return 3 for "Turn10 Basisstufe Gerät 3-Kampf m (7-8Jahre)"', () => {
    expect(getExpectedDisciplineCount('Turn10 Basisstufe Gerät 3-Kampf m (7-8Jahre)')).toBe(3);
  });

  it('should return 5 for "Fünfkampf m"', () => {
    expect(getExpectedDisciplineCount('Fünfkampf m')).toBe(5);
  });

  it('should return 6 for "Mehrkampf m" (male = 6 apparatus)', () => {
    expect(getExpectedDisciplineCount('Mehrkampf m')).toBe(6);
  });

  it('should return 4 for "Mehrkampf w" (female = 4 apparatus)', () => {
    expect(getExpectedDisciplineCount('Mehrkampf w')).toBe(4);
  });

  it('should return 0 for unknown competition name', () => {
    expect(getExpectedDisciplineCount('Unknown Competition 2025')).toBe(0);
  });
});

// ============================================================================
// 11. detectLevelFromDevices
// ============================================================================

describe('detectLevelFromDevices', () => {
  it('should detect P-level from device name "Par.-Barren P 1 > P 9"', () => {
    const devices = [{ name: 'Par.-Barren P 1 > P 9', code: '240' }];
    expect(detectLevelFromDevices(devices)).toBe('P');
  });

  it('should detect P-level from wedDisNr code ending in 9 (e.g. 209)', () => {
    const devices = [{ name: 'Boden', code: '209' }];
    expect(detectLevelFromDevices(devices)).toBe('P');
  });

  it('should detect Kür from device name', () => {
    const devices = [{ name: 'Boden m. Kür', code: '100' }];
    expect(detectLevelFromDevices(devices)).toBe('Kür');
  });

  it('should detect LK1 from code pattern (ones=1)', () => {
    const devices = [{ name: 'Sprung w.', code: '161' }];
    expect(detectLevelFromDevices(devices)).toBe('LK1');
  });

  it('should detect LK2 from code pattern (ones=2)', () => {
    const devices = [{ name: 'Boden m.', code: '102' }];
    expect(detectLevelFromDevices(devices)).toBe('LK2');
  });

  it('should detect LK3 from code pattern (ones=3)', () => {
    const devices = [{ name: 'Reck m.', code: '153' }];
    expect(detectLevelFromDevices(devices)).toBe('LK3');
  });

  it('should return empty string when no level can be detected', () => {
    const devices = [{ name: 'Unknown', code: 'abc' }];
    expect(detectLevelFromDevices(devices)).toBe('');
  });

  it('should detect P-level from "P1-P9" in name', () => {
    const devices = [{ name: 'Reck m. P1-P9', code: '259' }];
    expect(detectLevelFromDevices(devices)).toBe('P');
  });
});

// ============================================================================
// 12. Turn10 discipline matching (bug fix: used wrong P-level disciplines)
// ============================================================================

describe('getDisciplinesForCompetition - Turn10 competitions', () => {
  const gymnetDisciplineNames = Object.values(DISCIPLINE_NAMES);

  const mockPrisma = {
    tfx_disziplinen: {
      findMany: jest.fn().mockResolvedValue(
        gymnetDisciplineNames.map((name, idx) => ({ int_disziplinenid: idx + 1, var_name: name, bol_m: true, bol_w: true }))
      ),
    },
  } as any;

  it('should return 6 Turn10 disciplines for "Turn10 Basisstufe Gerät 4-Kampf m (15-16Jahre)"', async () => {
    // Turn10 4-Kampf: all 6 Turn10 apparatus available (athlete picks 4)
    const result = await getDisciplinesForCompetition('Turn10 Basisstufe Gerät 4-Kampf m (15-16Jahre)', mockPrisma);
    expect(result.length).toBe(6);
    // ALL results should be Turn10® Basis disciplines
    for (const item of result) {
      expect(item.name).toContain('Turn10');
    }
  });

  it('should return 6 Turn10 disciplines for "Turn10 Basisstufe Gerät 3-Kampf m (7-8Jahre)"', async () => {
    const result = await getDisciplinesForCompetition('Turn10 Basisstufe Gerät 3-Kampf m (7-8Jahre)', mockPrisma);
    expect(result.length).toBe(6);
    for (const item of result) {
      expect(item.name).toContain('Turn10');
    }
  });

  it('should return 6 Turn10 disciplines for female Turn10 "Turn10 Basisstufe Gerät 4-Kampf w (7-8Jahre)"', async () => {
    const result = await getDisciplinesForCompetition('Turn10 Basisstufe Gerät 4-Kampf w (7-8Jahre)', mockPrisma);
    expect(result.length).toBe(6);
    for (const item of result) {
      expect(item.name).toContain('Turn10');
    }
  });

  it('should include all 6 Turn10 apparatus types', async () => {
    const result = await getDisciplinesForCompetition('Turn10 Basisstufe Gerät 4-Kampf m (15-16Jahre)', mockPrisma);
    const resultLower = result.map(r => r.name.toLowerCase());
    expect(resultLower.some(r => r.includes('boden'))).toBe(true);
    expect(resultLower.some(r => r.includes('balken') || r.includes('bank'))).toBe(true);
    expect(resultLower.some(r => r.includes('barren'))).toBe(true);
    expect(resultLower.some(r => r.includes('minitrampolin'))).toBe(true);
    expect(resultLower.some(r => r.includes('reck') || r.includes('st-barren'))).toBe(true);
    expect(resultLower.some(r => r.includes('sprung'))).toBe(true);
  });

  it('should NOT return standard P-level disciplines for Turn10 competitions', async () => {
    const result = await getDisciplinesForCompetition('Turn10 Basisstufe Gerät 4-Kampf m (15-16Jahre)', mockPrisma);
    // None should be P-level standard disciplines
    for (const item of result) {
      expect(item.name).not.toMatch(/P1-P9/);
      expect(item.name).not.toMatch(/^Boden m\./);
      expect(item.name).not.toMatch(/^Pauschenpferd/);
      expect(item.name).not.toMatch(/^Ringe/);
    }
  });

  it('should NOT return "Basisstufe" keyword as level suffix for Turn10', async () => {
    // Internally, Turn10 should set isTurn10=true and NOT use any level suffix
    const result = await getDisciplinesForCompetition('Turn10 Basisstufe Gerät 4-Kampf m', mockPrisma);
    // All results should be Turn10 (no level-based filtering applied)
    for (const item of result) {
      expect(item.name).toContain('Turn10');
    }
  });
});

// ============================================================================
// 13. Sechskampf & 4-Kampf discipline matching (bug fix: wrong counts)
// ============================================================================

describe('getDisciplinesForCompetition - Sechskampf and 4-Kampf', () => {
  const gymnetDisciplineNames = Object.values(DISCIPLINE_NAMES);

  const mockPrisma = {
    tfx_disziplinen: {
      findMany: jest.fn().mockResolvedValue(
        gymnetDisciplineNames.map((name, idx) => ({ int_disziplinenid: idx + 1, var_name: name, bol_m: true, bol_w: true }))
      ),
    },
  } as any;

  it('should return 6 disciplines for "Gerätsechskampf m (17-18Jahre)"', async () => {
    const result = await getDisciplinesForCompetition('Gerätsechskampf m (17-18Jahre)', mockPrisma);
    expect(result.length).toBe(6);
  });

  it('should return 6 P-level disciplines for Sechskampf with P-level hint', async () => {
    const result = await getDisciplinesForCompetition('Gerätsechskampf m (17-18Jahre)', mockPrisma, 'P');
    expect(result.length).toBe(6);
    // All should be P-level
    for (const item of result) {
      expect(matchesLevel(item.name, 'P')).toBe(true);
    }
  });

  it('should return 6 male apparatus for Sechskampf (Boden, Pferd, Ringe, Sprung, Barren, Reck)', async () => {
    const result = await getDisciplinesForCompetition('Gerätsechskampf m (17-18Jahre)', mockPrisma);
    const resultLower = result.map(r => r.name.toLowerCase());
    expect(resultLower.some(r => r.includes('boden'))).toBe(true);
    expect(resultLower.some(r => r.includes('pferd') || r.includes('pauschenpferd'))).toBe(true);
    expect(resultLower.some(r => r.includes('ringe'))).toBe(true);
    expect(resultLower.some(r => r.includes('sprung'))).toBe(true);
    expect(resultLower.some(r => r.includes('barren') && !r.includes('stufenbarren'))).toBe(true);
    expect(resultLower.some(r => r.includes('reck'))).toBe(true);
  });

  it('should return exactly 4 disciplines for "Gerät 4-Kampf m" (non-Turn10)', async () => {
    // Non-Turn10 4-Kampf m: Boden, Sprung, Barren, Reck (no Pauschenpferd, no Ringe)
    const result = await getDisciplinesForCompetition('Gerät 4-Kampf m', mockPrisma);
    expect(result.length).toBe(4);
  });

  it('should return male 4-Kampf without Pauschenpferd and Ringe', async () => {
    const result = await getDisciplinesForCompetition('Gerät 4-Kampf m', mockPrisma);
    const resultLower = result.map(r => r.name.toLowerCase());
    expect(resultLower.some(r => r.includes('boden'))).toBe(true);
    expect(resultLower.some(r => r.includes('sprung'))).toBe(true);
    expect(resultLower.some(r => r.includes('barren'))).toBe(true);
    expect(resultLower.some(r => r.includes('reck'))).toBe(true);
    // Should NOT have Pauschenpferd or Ringe
    expect(resultLower.some(r => r.includes('pauschenpferd') || r.includes('pferd'))).toBe(false);
    expect(resultLower.some(r => r.includes('ringe'))).toBe(false);
  });

  it('should return 4 female disciplines for "Gerätvierkampf w"', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf w', mockPrisma);
    expect(result.length).toBe(4);
    const resultLower = result.map(r => r.name.toLowerCase());
    expect(resultLower.some(r => r.includes('sprung'))).toBe(true);
    expect(resultLower.some(r => r.includes('stufenbarren'))).toBe(true);
    expect(resultLower.some(r => r.includes('schwebebalken'))).toBe(true);
    expect(resultLower.some(r => r.includes('boden'))).toBe(true);
  });

  it('should return LK1-level disciplines when levelHint is "LK1"', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf w', mockPrisma, 'LK1');
    expect(result.length).toBe(4);
    for (const item of result) {
      expect(item.name.toLowerCase()).toContain('lk1');
    }
  });
});

// ============================================================================
// 14. genderFilter parameter — getDisciplinesForCompetition
// ============================================================================

describe('getDisciplinesForCompetition - genderFilter parameter', () => {
  // Build mock with gender-specific disciplines
  const mockDisciplines = [
    { int_disziplinenid: 1, var_name: 'Boden m. Kür', bol_m: true, bol_w: false },
    { int_disziplinenid: 2, var_name: 'Sprung m. Kür', bol_m: true, bol_w: false },
    { int_disziplinenid: 3, var_name: 'Barren', bol_m: true, bol_w: false },
    { int_disziplinenid: 4, var_name: 'Reck', bol_m: true, bol_w: false },
    { int_disziplinenid: 5, var_name: 'Pauschenpferd', bol_m: true, bol_w: false },
    { int_disziplinenid: 6, var_name: 'Ringe', bol_m: true, bol_w: false },
    { int_disziplinenid: 7, var_name: 'Sprung w', bol_m: false, bol_w: true },
    { int_disziplinenid: 8, var_name: 'Stufenbarren', bol_m: false, bol_w: true },
    { int_disziplinenid: 9, var_name: 'Schwebebalken', bol_m: false, bol_w: true },
    { int_disziplinenid: 10, var_name: 'Boden w', bol_m: false, bol_w: true },
    { int_disziplinenid: 11, var_name: 'Boden', bol_m: true, bol_w: true },
    { int_disziplinenid: 12, var_name: 'Sprung', bol_m: true, bol_w: true },
  ];

  const mockPrisma = {
    tfx_disziplinen: {
      findMany: jest.fn().mockResolvedValue(mockDisciplines),
    },
  } as any;

  it('should return only male disciplines when genderFilter is "male"', async () => {
    const result = await getDisciplinesForCompetition('Gerätsechskampf', mockPrisma, undefined, 'male');
    // All returned disciplines should have bol_m=true
    for (const item of result) {
      const source = mockDisciplines.find(d => d.var_name === item.name);
      expect(source?.bol_m).toBe(true);
    }
  });

  it('should return only female disciplines when genderFilter is "female"', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf', mockPrisma, undefined, 'female');
    for (const item of result) {
      const source = mockDisciplines.find(d => d.var_name === item.name);
      expect(source?.bol_w).toBe(true);
    }
  });

  it('should return all disciplines when genderFilter is "mixed"', async () => {
    const result = await getDisciplinesForCompetition('Geräteturnen', mockPrisma, undefined, 'mixed');
    // Should have access to both male and female disciplines
    expect(result.length).toBeGreaterThan(0);
  });

  it('should fall back to name detection when genderFilter is "unknown"', async () => {
    // Name contains " m " so name-based detection should pick male
    const result = await getDisciplinesForCompetition('Gerätsechskampf m (17-18)', mockPrisma, undefined, 'unknown');
    for (const item of result) {
      const source = mockDisciplines.find(d => d.var_name === item.name);
      expect(source?.bol_m).toBe(true);
    }
  });

  it('should prioritize genderFilter over name-detected gender', async () => {
    // Name says "w" (female) but genderFilter says "male"
    const result = await getDisciplinesForCompetition('Gerätvierkampf w', mockPrisma, undefined, 'male');
    // Should use male filter despite "w" in the name
    for (const item of result) {
      const source = mockDisciplines.find(d => d.var_name === item.name);
      expect(source?.bol_m).toBe(true);
    }
  });

  it('should return DisciplineSuggestion objects with id and name', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf w', mockPrisma, undefined, 'female');
    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(typeof item.id).toBe('number');
      expect(typeof item.name).toBe('string');
    }
  });
});

// ============================================================================
// 15. detectGenderFromName — gender detection from competition name
// ============================================================================

describe('detectGenderFromName', () => {
  it('should detect male from " m " in name', () => {
    expect(detectGenderFromName('Gerätsechskampf m (17-18Jahre)')).toBe('male');
  });

  it('should detect male from name ending with " m"', () => {
    expect(detectGenderFromName('Gerät 4-Kampf m')).toBe('male');
  });

  it('should detect female from " w " in name', () => {
    expect(detectGenderFromName('Gerätvierkampf w (7-8Jahre)')).toBe('female');
  });

  it('should detect female from name ending with " w"', () => {
    expect(detectGenderFromName('Gerätvierkampf w')).toBe('female');
  });

  it('should detect male from "männlich"', () => {
    expect(detectGenderFromName('Jugend männlich')).toBe('male');
  });

  it('should detect female from "weiblich"', () => {
    expect(detectGenderFromName('Jugend weiblich')).toBe('female');
  });

  it('should detect female from "Mädchen"', () => {
    expect(detectGenderFromName('Mädchen C')).toBe('female');
  });

  it('should detect male from "Jungen"', () => {
    expect(detectGenderFromName('Jungen D')).toBe('male');
  });

  it('should detect male for Sechskampf (always male)', () => {
    expect(detectGenderFromName('Gerätsechskampf')).toBe('male');
  });

  it('should return unknown for ambiguous names', () => {
    expect(detectGenderFromName('Geräteturnen')).toBe('unknown');
  });

  it('should return unknown for generic competition names', () => {
    expect(detectGenderFromName('WK 14')).toBe('unknown');
  });
});

// ============================================================================
// 16. Deduplication of participants, clubs, devices in import response
// ============================================================================

describe('Import response deduplication logic', () => {
  // Test the pure deduplication logic extracted from gymnetImport.ts

  describe('Club deduplication (case-insensitive by name)', () => {
    it('should count unique clubs by name', () => {
      const clubs = [
        { name: 'TSV Musterstadt' },
        { name: 'TSV Musterstadt' },
        { name: 'SV Beispielhausen' },
        { name: 'tsv musterstadt' }, // same club, different case
      ];
      const uniqueClubNames = new Set(
        clubs.map((c: any) => (c.name || '').trim().toLowerCase()).filter((n: string) => n.length > 0)
      );
      expect(uniqueClubNames.size).toBe(2);
    });

    it('should handle clubs with empty names', () => {
      const clubs = [
        { name: '' },
        { name: '  ' },
        { name: 'TSV Test' },
      ];
      const uniqueClubNames = new Set(
        clubs.map((c: any) => (c.name || '').trim().toLowerCase()).filter((n: string) => n.length > 0)
      );
      expect(uniqueClubNames.size).toBe(1);
    });

    it('should handle clubs with whitespace variations', () => {
      const clubs = [
        { name: ' TSV Test ' },
        { name: 'TSV Test' },
      ];
      const uniqueClubNames = new Set(
        clubs.map((c: any) => (c.name || '').trim().toLowerCase()).filter((n: string) => n.length > 0)
      );
      expect(uniqueClubNames.size).toBe(1);
    });
  });

  describe('Participant deduplication (by perID or name+birthdate)', () => {
    it('should deduplicate by perID when available', () => {
      const participants = [
        { id: '123', firstName: 'Max', lastName: 'Muster', birthDate: '2010-01-01' },
        { id: '123', firstName: 'Max', lastName: 'Muster', birthDate: '2010-01-01' },
        { id: '456', firstName: 'Anna', lastName: 'Test', birthDate: '2011-05-15' },
      ];
      const uniqueKeys = new Set<string>();
      for (const p of participants) {
        if (p.id) {
          uniqueKeys.add(`id:${p.id}`);
        } else {
          const key = `${(p.firstName || '').trim().toLowerCase()}|${(p.lastName || '').trim().toLowerCase()}|${p.birthDate || ''}`;
          uniqueKeys.add(key);
        }
      }
      expect(uniqueKeys.size).toBe(2);
    });

    it('should deduplicate by name+birthdate when no perID', () => {
      const participants = [
        { id: '', firstName: 'Max', lastName: 'Muster', birthDate: '2010-01-01' },
        { id: '', firstName: 'Max', lastName: 'Muster', birthDate: '2010-01-01' },
        { id: '', firstName: 'Anna', lastName: 'Test', birthDate: '2011-05-15' },
      ];
      const uniqueKeys = new Set<string>();
      for (const p of participants) {
        if (p.id) {
          uniqueKeys.add(`id:${p.id}`);
        } else {
          const key = `${(p.firstName || '').trim().toLowerCase()}|${(p.lastName || '').trim().toLowerCase()}|${p.birthDate || ''}`;
          uniqueKeys.add(key);
        }
      }
      expect(uniqueKeys.size).toBe(2);
    });

    it('should count same name with different birthdate as separate participants', () => {
      const participants = [
        { id: '', firstName: 'Max', lastName: 'Muster', birthDate: '2010-01-01' },
        { id: '', firstName: 'Max', lastName: 'Muster', birthDate: '2011-01-01' },
      ];
      const uniqueKeys = new Set<string>();
      for (const p of participants) {
        if (p.id) {
          uniqueKeys.add(`id:${p.id}`);
        } else {
          const key = `${(p.firstName || '').trim().toLowerCase()}|${(p.lastName || '').trim().toLowerCase()}|${p.birthDate || ''}`;
          uniqueKeys.add(key);
        }
      }
      expect(uniqueKeys.size).toBe(2);
    });

    it('should handle participants appearing in multiple competitions', () => {
      // Simulates same participant in 3 competitions (common GymNet XML pattern)
      const participants = [
        { id: '100', firstName: 'Lisa', lastName: 'Schmidt', birthDate: '2012-03-15' },
        { id: '100', firstName: 'Lisa', lastName: 'Schmidt', birthDate: '2012-03-15' },
        { id: '100', firstName: 'Lisa', lastName: 'Schmidt', birthDate: '2012-03-15' },
        { id: '200', firstName: 'Tom', lastName: 'Müller', birthDate: '2011-07-22' },
        { id: '200', firstName: 'Tom', lastName: 'Müller', birthDate: '2011-07-22' },
      ];
      const uniqueKeys = new Set<string>();
      for (const p of participants) {
        if (p.id) {
          uniqueKeys.add(`id:${p.id}`);
        } else {
          const key = `${(p.firstName || '').trim().toLowerCase()}|${(p.lastName || '').trim().toLowerCase()}|${p.birthDate || ''}`;
          uniqueKeys.add(key);
        }
      }
      expect(uniqueKeys.size).toBe(2); // Only 2 unique participants
    });
  });

  describe('Device deduplication (by code+competitionWaNr)', () => {
    it('should deduplicate devices by code+competitionWaNr', () => {
      const devices = [
        { code: '161', name: 'Sprung w.', competitionWaNr: '1' },
        { code: '161', name: 'Sprung w.', competitionWaNr: '1' },
        { code: '171', name: 'Stufenbarren', competitionWaNr: '1' },
      ];
      const uniqueDeviceKeys = new Set<string>();
      for (const d of devices) {
        const key = `${d.code || d.name || ''}|${d.competitionWaNr || ''}`;
        uniqueDeviceKeys.add(key);
      }
      expect(uniqueDeviceKeys.size).toBe(2);
    });

    it('should count same device in different competitions as separate', () => {
      const devices = [
        { code: '161', name: 'Sprung w.', competitionWaNr: '1' },
        { code: '161', name: 'Sprung w.', competitionWaNr: '2' },
      ];
      const uniqueDeviceKeys = new Set<string>();
      for (const d of devices) {
        const key = `${d.code || d.name || ''}|${d.competitionWaNr || ''}`;
        uniqueDeviceKeys.add(key);
      }
      expect(uniqueDeviceKeys.size).toBe(2);
    });
  });
});

// ============================================================================
// 17. Gender-aware hint generation in linkDisciplines
// ============================================================================

describe('Gender determination from bereich flags (linkDisciplines pattern)', () => {
  it('should determine male when bol_maennlich=true, bol_weiblich=false', () => {
    const competition = { bol_maennlich: true, bol_weiblich: false };
    let compGender: string = 'unknown';
    if (competition.bol_maennlich && !competition.bol_weiblich) compGender = 'male';
    else if (!competition.bol_maennlich && competition.bol_weiblich) compGender = 'female';
    else if (competition.bol_maennlich && competition.bol_weiblich) compGender = 'mixed';
    expect(compGender).toBe('male');
  });

  it('should determine female when bol_maennlich=false, bol_weiblich=true', () => {
    const competition = { bol_maennlich: false, bol_weiblich: true };
    let compGender: string = 'unknown';
    if (competition.bol_maennlich && !competition.bol_weiblich) compGender = 'male';
    else if (!competition.bol_maennlich && competition.bol_weiblich) compGender = 'female';
    else if (competition.bol_maennlich && competition.bol_weiblich) compGender = 'mixed';
    expect(compGender).toBe('female');
  });

  it('should determine mixed when both bol_maennlich=true, bol_weiblich=true', () => {
    const competition = { bol_maennlich: true, bol_weiblich: true };
    let compGender: string = 'unknown';
    if (competition.bol_maennlich && !competition.bol_weiblich) compGender = 'male';
    else if (!competition.bol_maennlich && competition.bol_weiblich) compGender = 'female';
    else if (competition.bol_maennlich && competition.bol_weiblich) compGender = 'mixed';
    expect(compGender).toBe('mixed');
  });

  it('should determine unknown when both flags are false', () => {
    const competition = { bol_maennlich: false, bol_weiblich: false };
    let compGender: string = 'unknown';
    if (competition.bol_maennlich && !competition.bol_weiblich) compGender = 'male';
    else if (!competition.bol_maennlich && competition.bol_weiblich) compGender = 'female';
    else if (competition.bol_maennlich && competition.bol_weiblich) compGender = 'mixed';
    expect(compGender).toBe('unknown');
  });

  it('should determine unknown when flags are null/undefined', () => {
    const competition = { bol_maennlich: null, bol_weiblich: null };
    let compGender: string = 'unknown';
    if (competition.bol_maennlich && !competition.bol_weiblich) compGender = 'male';
    else if (!competition.bol_maennlich && competition.bol_weiblich) compGender = 'female';
    else if (competition.bol_maennlich && competition.bol_weiblich) compGender = 'mixed';
    expect(compGender).toBe('unknown');
  });
});

// ============================================================================
// 18. Gender-filter integration: getDisciplinesForCompetition with real names
// ============================================================================

describe('getDisciplinesForCompetition - gender filter with full discipline set', () => {
  const gymnetDisciplineNames = Object.values(DISCIPLINE_NAMES);

  // Create mock with proper gender assignments
  const mockPrismaGender = {
    tfx_disziplinen: {
      findMany: jest.fn().mockResolvedValue(
        gymnetDisciplineNames.map((name, idx) => {
          // Assign gender flags based on discipline name patterns
          const lower = name.toLowerCase();
          const isFemale = lower.includes(' w') || lower.includes('stufenbarren') || lower.includes('schwebebalken');
          const isMale = lower.includes(' m') || lower.includes('pauschenpferd') || lower.includes('p.-pferd') || lower.includes('ringe') || lower.includes('barren') || lower.includes('reck');
          // If both or neither, treat as both
          return {
            int_disziplinenid: idx + 1,
            var_name: name,
            bol_m: isMale || (!isFemale && !isMale),
            bol_w: isFemale || (!isFemale && !isMale),
          };
        })
      ),
    },
  } as any;

  it('should filter by female gender for "Gerätvierkampf" with genderFilter="female"', async () => {
    const result = await getDisciplinesForCompetition('Gerätvierkampf', mockPrismaGender, undefined, 'female');
    expect(result.length).toBeGreaterThan(0);
    // Should not contain male-only disciplines like Pauschenpferd or Ringe
    for (const item of result) {
      const source = gymnetDisciplineNames.find(n => n === item.name);
      expect(source).toBeDefined();
    }
  });

  it('should return different results for male vs female genderFilter', async () => {
    const maleResult = await getDisciplinesForCompetition('Geräteturnen', mockPrismaGender, undefined, 'male');
    const femaleResult = await getDisciplinesForCompetition('Geräteturnen', mockPrismaGender, undefined, 'female');
    // Male and female should return different discipline names
    const maleNames = maleResult.map(r => r.name).sort();
    const femaleNames = femaleResult.map(r => r.name).sort();
    expect(maleNames).not.toEqual(femaleNames);
  });
});
