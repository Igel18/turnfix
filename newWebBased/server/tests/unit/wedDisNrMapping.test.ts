/**
 * Tests for GymNet wedDisNr → TurnFix discipline ID mapping.
 * 
 * The wedDisNr numbering system encodes apparatus + competition level:
 * - Tens digit = apparatus (10=Boden m, 11=Pferd, ..., 19=Boden w)
 * - Ones digit = level (0=Kür, 1=LK1, 2=LK2, 3=LK3)
 * - P-Übung codes: 209, 219, ..., 299
 * - Special: 630=Minitrampolin, 915=Gerätebahn A, 916=Gerätebahn B
 */

import { wedDisNrToTurnFixId } from '../../src/utils/gymnetMapping';

describe('wedDisNrToTurnFixId', () => {
  describe('Men\'s apparatus codes (100-159)', () => {
    // Boden m. (TurnFix ID: 74)
    test.each([100, 101, 102, 103])('wedDisNr %i → Boden (74)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(74);
    });

    // Pauschenpferd (TurnFix ID: 31) 
    test.each([110, 111, 112, 113])('wedDisNr %i → Pauschenpferd (31)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(31);
    });

    // Ringe (TurnFix ID: 50)
    test.each([120, 121, 122, 123])('wedDisNr %i → Ringe (50)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(50);
    });

    // Sprung m. (TurnFix ID: 71)
    test.each([130, 131, 132, 133])('wedDisNr %i → Sprung m. (71)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(71);
    });

    // Barren (TurnFix ID: 72)
    test.each([140, 141, 142, 143])('wedDisNr %i → Barren (72)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(72);
    });

    // Reck (TurnFix ID: 46)
    test.each([150, 151, 152, 153])('wedDisNr %i → Reck (46)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(46);
    });
  });

  describe('Women\'s apparatus codes (160-199)', () => {
    // Sprung w. (TurnFix ID: 71)
    test.each([160, 161, 162, 163])('wedDisNr %i → Sprung w. (71)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(71);
    });

    // Stufenbarren (TurnFix ID: 68)
    test.each([170, 171, 172, 173])('wedDisNr %i → Stufenbarren (68)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(68);
    });

    // Schwebebalken (TurnFix ID: 73)
    test.each([180, 181, 182, 183])('wedDisNr %i → Schwebebalken (73)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(73);
    });

    // Boden w. (TurnFix ID: 74)
    test.each([190, 191, 192, 193])('wedDisNr %i → Boden w. (74)', (nr) => {
      expect(wedDisNrToTurnFixId(nr)).toBe(74);
    });
  });

  describe('P-Übung codes (x09 → 200-series)', () => {
    test('wedDisNr 209 → Boden m. (74)', () => {
      expect(wedDisNrToTurnFixId(209)).toBe(74);
    });
    test('wedDisNr 219 → Pauschenpferd (31)', () => {
      expect(wedDisNrToTurnFixId(219)).toBe(31);
    });
    test('wedDisNr 229 → Ringe (50)', () => {
      expect(wedDisNrToTurnFixId(229)).toBe(50);
    });
    test('wedDisNr 239 → Sprung m. (71)', () => {
      expect(wedDisNrToTurnFixId(239)).toBe(71);
    });
    test('wedDisNr 249 → Barren (72)', () => {
      expect(wedDisNrToTurnFixId(249)).toBe(72);
    });
    test('wedDisNr 259 → Reck (46)', () => {
      expect(wedDisNrToTurnFixId(259)).toBe(46);
    });
    test('wedDisNr 269 → Sprung w. (71)', () => {
      expect(wedDisNrToTurnFixId(269)).toBe(71);
    });
    test('wedDisNr 279 → Stufenbarren (68)', () => {
      expect(wedDisNrToTurnFixId(279)).toBe(68);
    });
    test('wedDisNr 289 → Schwebebalken (73)', () => {
      expect(wedDisNrToTurnFixId(289)).toBe(73);
    });
    test('wedDisNr 299 → Boden w. (74)', () => {
      expect(wedDisNrToTurnFixId(299)).toBe(74);
    });
  });

  describe('Base DTB codes (backward compatibility)', () => {
    test('wedDisNr 200 → Boden (74)', () => {
      expect(wedDisNrToTurnFixId(200)).toBe(74);
    });
    test('wedDisNr 210 → Pferd (31)', () => {
      expect(wedDisNrToTurnFixId(210)).toBe(31);
    });
    test('wedDisNr 220 → Ringe (50)', () => {
      expect(wedDisNrToTurnFixId(220)).toBe(50);
    });
    test('wedDisNr 230 → Sprung (71)', () => {
      expect(wedDisNrToTurnFixId(230)).toBe(71);
    });
    test('wedDisNr 240 → Barren (72)', () => {
      expect(wedDisNrToTurnFixId(240)).toBe(72);
    });
    test('wedDisNr 250 → Reck (46)', () => {
      expect(wedDisNrToTurnFixId(250)).toBe(46);
    });
    test('wedDisNr 260 → Sprung w. (71)', () => {
      expect(wedDisNrToTurnFixId(260)).toBe(71);
    });
    test('wedDisNr 270 → Stufenbarren (68)', () => {
      expect(wedDisNrToTurnFixId(270)).toBe(68);
    });
    test('wedDisNr 280 → Schwebebalken (73)', () => {
      expect(wedDisNrToTurnFixId(280)).toBe(73);
    });
    test('wedDisNr 290 → Boden (74)', () => {
      expect(wedDisNrToTurnFixId(290)).toBe(74);
    });
  });

  describe('Special apparatus codes', () => {
    test('wedDisNr 630 → Minitrampolin (77)', () => {
      expect(wedDisNrToTurnFixId(630)).toBe(77);
    });
    test('wedDisNr 915 → Gerätebahn A (75)', () => {
      expect(wedDisNrToTurnFixId(915)).toBe(75);
    });
    test('wedDisNr 916 → Gerätebahn B (76)', () => {
      expect(wedDisNrToTurnFixId(916)).toBe(76);
    });
  });

  describe('String input handling', () => {
    test('accepts string "161" → Sprung w. (71)', () => {
      expect(wedDisNrToTurnFixId('161')).toBe(71);
    });
    test('accepts string "171" → Stufenbarren (68)', () => {
      expect(wedDisNrToTurnFixId('171')).toBe(68);
    });
    test('accepts string "630" → Minitrampolin (77)', () => {
      expect(wedDisNrToTurnFixId('630')).toBe(77);
    });
  });

  describe('Invalid/unknown codes', () => {
    test('returns null for invalid string', () => {
      expect(wedDisNrToTurnFixId('abc')).toBeNull();
    });
    test('returns null for 0', () => {
      expect(wedDisNrToTurnFixId(0)).toBeNull();
    });
    test('returns null for unknown code 999', () => {
      expect(wedDisNrToTurnFixId(999)).toBeNull();
    });
    test('returns null for negative number', () => {
      expect(wedDisNrToTurnFixId(-1)).toBeNull();
    });
    test('returns null for code 50 (out of range)', () => {
      expect(wedDisNrToTurnFixId(50)).toBeNull();
    });
  });

  describe('Real-world XML fixture values (gymnet-mannschaft-geraete.xml)', () => {
    // These are the exact wedDisNr values from the test fixture:
    // WK 14 - LK 1 w: Sprung w. LK1(161), Stu.-Barren LK1(171), Sch.-Balken LK1(181), Boden w. LK1(191)
    test('161 (Sprung w. LK1) → 71 (Sprung)', () => {
      expect(wedDisNrToTurnFixId(161)).toBe(71);
    });
    test('171 (Stu.-Barren LK1) → 68 (Stufenbarren)', () => {
      expect(wedDisNrToTurnFixId(171)).toBe(68);
    });
    test('181 (Sch.-Balken LK1) → 73 (Schwebebalken)', () => {
      expect(wedDisNrToTurnFixId(181)).toBe(73);
    });
    test('191 (Boden w. LK1) → 74 (Boden)', () => {
      expect(wedDisNrToTurnFixId(191)).toBe(74);
    });
  });
});
