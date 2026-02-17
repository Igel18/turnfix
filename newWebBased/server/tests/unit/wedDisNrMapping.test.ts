/**
 * Tests for GymNet wedDisNr → TurnFix discipline ID mapping.
 * 
 * Uses FIXED discipline IDs from gymnetDisciplineIds.ts.
 * Each wedDisNr code maps to a SPECIFIC discipline (including level).
 * 
 * The wedDisNr numbering system encodes apparatus + competition level:
 * - Tens digit = apparatus (10=Boden m, 11=Pferd, ..., 19=Boden w)
 * - Ones digit = level (0=Kür, 1=LK1, 2=LK2, 3=LK3)
 * - P-Übung codes: 209, 219, ..., 299
 * - Special: 630=Minitrampolin, 915=Gerätebahn A, 916=Gerätebahn B
 */

import { wedDisNrToTurnFixId, wedDisNrToName, DISCIPLINE_IDS } from '../../src/utils/gymnetMapping';

const D = DISCIPLINE_IDS;

describe('wedDisNrToTurnFixId', () => {
  describe('Men\'s Kür codes (x0, tens 10-15)', () => {
    test('100 → Boden m. Kür', () => expect(wedDisNrToTurnFixId(100)).toBe(D.BODEN_M_KUER));
    test('110 → P.-Pferd Kür', () => expect(wedDisNrToTurnFixId(110)).toBe(D.P_PFERD_KUER));
    test('120 → Ringe m.', () => expect(wedDisNrToTurnFixId(120)).toBe(D.RINGE_M));
    test('130 → Sprung m. Kür', () => expect(wedDisNrToTurnFixId(130)).toBe(D.SPRUNG_M_KUER));
    test('140 → Par.-Barren Kür', () => expect(wedDisNrToTurnFixId(140)).toBe(D.PAR_BARREN_KUER));
    test('150 → Reck m. Kür', () => expect(wedDisNrToTurnFixId(150)).toBe(D.RECK_M_KUER));
  });

  describe('Men\'s LK1 codes (x1, tens 10-15)', () => {
    test('101 → Boden m. LK1', () => expect(wedDisNrToTurnFixId(101)).toBe(D.BODEN_M_LK1));
    test('111 → P.-Pferd LK1', () => expect(wedDisNrToTurnFixId(111)).toBe(D.P_PFERD_LK1));
    test('121 → Ringe LK1', () => expect(wedDisNrToTurnFixId(121)).toBe(D.RINGE_LK1));
    test('131 → Sprung m. LK1', () => expect(wedDisNrToTurnFixId(131)).toBe(D.SPRUNG_M_LK1));
    test('141 → Par.-Barren LK1', () => expect(wedDisNrToTurnFixId(141)).toBe(D.PAR_BARREN_LK1));
    test('151 → Reck m. LK1', () => expect(wedDisNrToTurnFixId(151)).toBe(D.RECK_M_LK1));
  });

  describe('Men\'s LK2 codes (x2, tens 10-15)', () => {
    test('102 → Boden m. LK2', () => expect(wedDisNrToTurnFixId(102)).toBe(D.BODEN_M_LK2));
    test('112 → P.-Pferd LK2', () => expect(wedDisNrToTurnFixId(112)).toBe(D.P_PFERD_LK2));
    test('122 → Ringe LK2', () => expect(wedDisNrToTurnFixId(122)).toBe(D.RINGE_LK2));
    test('132 → Sprung m. LK2', () => expect(wedDisNrToTurnFixId(132)).toBe(D.SPRUNG_M_LK2));
    test('142 → Par.-Barren LK2', () => expect(wedDisNrToTurnFixId(142)).toBe(D.PAR_BARREN_LK2));
    test('152 → Reck m. LK2', () => expect(wedDisNrToTurnFixId(152)).toBe(D.RECK_M_LK2));
  });

  describe('Men\'s LK3 codes (x3, tens 10-15)', () => {
    test('103 → Boden m. LK3', () => expect(wedDisNrToTurnFixId(103)).toBe(D.BODEN_M_LK3));
    test('113 → P.-Pferd LK3', () => expect(wedDisNrToTurnFixId(113)).toBe(D.P_PFERD_LK3));
    test('123 → Ringe LK3', () => expect(wedDisNrToTurnFixId(123)).toBe(D.RINGE_LK3));
    test('133 → Sprung m. LK3', () => expect(wedDisNrToTurnFixId(133)).toBe(D.SPRUNG_M_LK3));
    test('143 → Par.-Barren LK3', () => expect(wedDisNrToTurnFixId(143)).toBe(D.PAR_BARREN_LK3));
    test('153 → Reck m. LK3', () => expect(wedDisNrToTurnFixId(153)).toBe(D.RECK_M_LK3));
  });

  describe('Women\'s Kür codes (x0, tens 16-19)', () => {
    test('160 → Sprung w. Kür', () => expect(wedDisNrToTurnFixId(160)).toBe(D.SPRUNG_W_KUER));
    test('170 → Stufenbarren (base = Kür)', () => expect(wedDisNrToTurnFixId(170)).toBe(D.STUFENBARREN));
    test('180 → Schwebebalken (base = Kür)', () => expect(wedDisNrToTurnFixId(180)).toBe(D.SCHWEBEBALKEN));
    test('190 → Boden w. Kür', () => expect(wedDisNrToTurnFixId(190)).toBe(D.BODEN_W_KUER));
  });

  describe('Women\'s LK1 codes (x1, tens 16-19)', () => {
    test('161 → Sprung w. LK1', () => expect(wedDisNrToTurnFixId(161)).toBe(D.SPRUNG_W_LK1));
    test('171 → Stufenbarren LK1', () => expect(wedDisNrToTurnFixId(171)).toBe(D.STUFENBARREN_LK1));
    test('181 → Schwebebalken LK1', () => expect(wedDisNrToTurnFixId(181)).toBe(D.SCHWEBEBALKEN_LK1));
    test('191 → Boden w. LK1', () => expect(wedDisNrToTurnFixId(191)).toBe(D.BODEN_W_LK1));
  });

  describe('Women\'s LK2 codes (x2, tens 16-19)', () => {
    test('162 → Sprung w. LK2', () => expect(wedDisNrToTurnFixId(162)).toBe(D.SPRUNG_W_LK2));
    test('172 → Stufenbarren LK2', () => expect(wedDisNrToTurnFixId(172)).toBe(D.STUFENBARREN_LK2));
    test('182 → Schwebebalken LK2', () => expect(wedDisNrToTurnFixId(182)).toBe(D.SCHWEBEBALKEN_LK2));
    test('192 → Boden w. LK2', () => expect(wedDisNrToTurnFixId(192)).toBe(D.BODEN_W_LK2));
  });

  describe('Women\'s LK3 codes (x3, tens 16-19)', () => {
    test('163 → Sprung w. LK3', () => expect(wedDisNrToTurnFixId(163)).toBe(D.SPRUNG_W_LK3));
    test('173 → Stufenbarren LK3', () => expect(wedDisNrToTurnFixId(173)).toBe(D.STUFENBARREN_LK3));
    test('183 → Schwebebalken LK3', () => expect(wedDisNrToTurnFixId(183)).toBe(D.SCHWEBEBALKEN_LK3));
    test('193 → Boden w. LK3', () => expect(wedDisNrToTurnFixId(193)).toBe(D.BODEN_W_LK3));
  });

  describe('P-Übung codes (x09 → P1-P9 devices)', () => {
    // Male
    test('209 → Boden m. P1-P9', () => expect(wedDisNrToTurnFixId(209)).toBe(D.BODEN_M_P));
    test('219 → Pauschenpferd P1-P9', () => expect(wedDisNrToTurnFixId(219)).toBe(D.PAUSCHENPFERD_P));
    test('229 → Ringe P1-P9', () => expect(wedDisNrToTurnFixId(229)).toBe(D.RINGE_P));
    test('239 → Sprung m. P1-P9', () => expect(wedDisNrToTurnFixId(239)).toBe(D.SPRUNG_M_P));
    test('249 → Par.-Barren P1-P9', () => expect(wedDisNrToTurnFixId(249)).toBe(D.PAR_BARREN_P));
    test('259 → Reck m. P1-P9', () => expect(wedDisNrToTurnFixId(259)).toBe(D.RECK_M_P));
    // Female
    test('269 → Sprung w. P1-P9', () => expect(wedDisNrToTurnFixId(269)).toBe(D.SPRUNG_W_P));
    test('279 → Reck/StuBa. P1-P9', () => expect(wedDisNrToTurnFixId(279)).toBe(D.RECK_STUBA_P));
    test('289 → Schwebebalken P1-P9', () => expect(wedDisNrToTurnFixId(289)).toBe(D.SCHWEBEBALKEN_P));
    test('299 → Boden w. P1-P9', () => expect(wedDisNrToTurnFixId(299)).toBe(D.BODEN_W_P));
  });

  describe('Base DTB codes (200-290, backward compatibility)', () => {
    test('200 → Boden (generic)', () => expect(wedDisNrToTurnFixId(200)).toBe(D.BODEN));
    test('210 → Pauschenpferd', () => expect(wedDisNrToTurnFixId(210)).toBe(D.PAUSCHENPFERD));
    test('220 → Ringe', () => expect(wedDisNrToTurnFixId(220)).toBe(D.RINGE));
    test('230 → Sprung (generic)', () => expect(wedDisNrToTurnFixId(230)).toBe(D.SPRUNG));
    test('240 → Barren', () => expect(wedDisNrToTurnFixId(240)).toBe(D.BARREN));
    test('250 → Reck', () => expect(wedDisNrToTurnFixId(250)).toBe(D.RECK));
    test('260 → Sprung w', () => expect(wedDisNrToTurnFixId(260)).toBe(D.SPRUNG_W));
    test('270 → Stufenbarren', () => expect(wedDisNrToTurnFixId(270)).toBe(D.STUFENBARREN));
    test('280 → Schwebebalken', () => expect(wedDisNrToTurnFixId(280)).toBe(D.SCHWEBEBALKEN));
    test('290 → Boden w', () => expect(wedDisNrToTurnFixId(290)).toBe(D.BODEN_W));
  });

  describe('Special apparatus codes', () => {
    test('630 → Minitrampolin', () => expect(wedDisNrToTurnFixId(630)).toBe(D.MINITRAMPOLIN));
    test('915 → Gerätebahn A', () => expect(wedDisNrToTurnFixId(915)).toBe(D.GERAETEBAHN_A));
    test('916 → Gerätebahn B', () => expect(wedDisNrToTurnFixId(916)).toBe(D.GERAETEBAHN_B));
  });

  describe('String input handling', () => {
    test('accepts string "161" → Sprung w. LK1', () => expect(wedDisNrToTurnFixId('161')).toBe(D.SPRUNG_W_LK1));
    test('accepts string "171" → Stufenbarren LK1', () => expect(wedDisNrToTurnFixId('171')).toBe(D.STUFENBARREN_LK1));
    test('accepts string "630" → Minitrampolin', () => expect(wedDisNrToTurnFixId('630')).toBe(D.MINITRAMPOLIN));
  });

  describe('Invalid/unknown codes', () => {
    test('returns null for invalid string', () => expect(wedDisNrToTurnFixId('abc')).toBeNull());
    test('returns null for 0', () => expect(wedDisNrToTurnFixId(0)).toBeNull());
    test('returns null for unknown code 999', () => expect(wedDisNrToTurnFixId(999)).toBeNull());
    test('returns null for negative number', () => expect(wedDisNrToTurnFixId(-1)).toBeNull());
    test('returns null for code 50 (out of range)', () => expect(wedDisNrToTurnFixId(50)).toBeNull());
    test('returns null for code 104 (no level 4)', () => expect(wedDisNrToTurnFixId(104)).toBeNull());
    test('returns null for code 155 (no level 5)', () => expect(wedDisNrToTurnFixId(155)).toBeNull());
  });

  describe('Real-world XML fixture values (gymnet-mannschaft-geraete.xml)', () => {
    // WK 14 - LK 1 w: Sprung w. LK1(161), Stu.-Barren LK1(171), Sch.-Balken LK1(181), Boden w. LK1(191)
    test('161 (Sprung w. LK1) → ID 37', () => expect(wedDisNrToTurnFixId(161)).toBe(D.SPRUNG_W_LK1));
    test('171 (Stu.-Barren LK1) → ID 38', () => expect(wedDisNrToTurnFixId(171)).toBe(D.STUFENBARREN_LK1));
    test('181 (Sch.-Balken LK1) → ID 39', () => expect(wedDisNrToTurnFixId(181)).toBe(D.SCHWEBEBALKEN_LK1));
    test('191 (Boden w. LK1) → ID 40', () => expect(wedDisNrToTurnFixId(191)).toBe(D.BODEN_W_LK1));

    // Verify these are the CORRECT level-specific IDs (not base apparatus)
    test('LK1 IDs differ from Kür IDs', () => {
      expect(wedDisNrToTurnFixId(161)).not.toBe(wedDisNrToTurnFixId(160)); // LK1 ≠ Kür
      expect(wedDisNrToTurnFixId(171)).not.toBe(wedDisNrToTurnFixId(172)); // LK1 ≠ LK2
    });
  });

  describe('Level differentiation (same apparatus, different levels → different IDs)', () => {
    test('Boden m: Kür ≠ LK1 ≠ LK2 ≠ LK3', () => {
      const ids = [100, 101, 102, 103].map(nr => wedDisNrToTurnFixId(nr));
      // All 4 should be different IDs
      expect(new Set(ids).size).toBe(4);
    });

    test('Sprung w: Kür ≠ LK1 ≠ LK2 ≠ LK3', () => {
      const ids = [160, 161, 162, 163].map(nr => wedDisNrToTurnFixId(nr));
      expect(new Set(ids).size).toBe(4);
    });

    test('Stufenbarren: Kür(base) ≠ LK1 ≠ LK2 ≠ LK3', () => {
      const ids = [170, 171, 172, 173].map(nr => wedDisNrToTurnFixId(nr));
      expect(new Set(ids).size).toBe(4);
    });
  });

  describe('Fixed ID values match gymnetDisciplineIds.ts', () => {
    test('base apparatus IDs are 1-13', () => {
      expect(D.BODEN).toBe(1);
      expect(D.GERAETEBAHN_B).toBe(13);
    });
    test('LK1 male IDs are 31-36', () => {
      expect(D.BODEN_M_LK1).toBe(31);
      expect(D.RECK_M_LK1).toBe(36);
    });
    test('LK1 female IDs are 37-40', () => {
      expect(D.SPRUNG_W_LK1).toBe(37);
      expect(D.BODEN_W_LK1).toBe(40);
    });
    test('P-Übung IDs are 61-70', () => {
      expect(D.BODEN_M_P).toBe(61);
      expect(D.BODEN_W_P).toBe(70);
    });
  });
});

describe('wedDisNrToName', () => {
  test('returns discipline name for valid code', () => {
    expect(wedDisNrToName(161)).toBe('Sprung w. LK1');
    expect(wedDisNrToName(171)).toBe('Stufenbarren LK1');
    expect(wedDisNrToName(100)).toBe('Boden m. Kür');
    expect(wedDisNrToName(630)).toBe('Minitrampolin');
  });

  test('returns null for invalid code', () => {
    expect(wedDisNrToName(999)).toBeNull();
    expect(wedDisNrToName('abc')).toBeNull();
  });
});
