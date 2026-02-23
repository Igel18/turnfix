/**
 * Unit Tests — gymnetMapping.ts (pure functions)
 *
 * Tests for competition name parsing, level detection, and gender detection.
 * (wedDisNrToTurnFixId is already tested in wedDisNrMapping.test.ts)
 */

import {
  getExpectedDisciplineCount,
  detectLevelFromDevices,
  matchesLevel,
  detectGenderFromName,
  wedDisNrToName,
} from '../../src/utils/gymnetMapping';

describe('gymnetMapping – pure functions', () => {
  // ────────────────────────────────────────────────────────────────────────
  // getExpectedDisciplineCount
  // ────────────────────────────────────────────────────────────────────────

  describe('getExpectedDisciplineCount', () => {
    it.each([
      ['Gerätsechskampf m', 6],
      ['6-Kampf w', 6],
      ['6kampf', 6],
      ['Gerätvierkampf w', 4],
      ['4-Kampf m (15-16Jahre)', 4],
      ['4kampf', 4],
      ['Fünfkampf', 5],
      ['5-Kampf m', 5],
      ['Dreikampf m', 3],
      ['3-Kampf w', 3],
      ['3kampf', 3],
      ['2-Kampf', 2],
      ['Zweikampf', 2],
    ])('"%s" → %d', (name, expected) => {
      expect(getExpectedDisciplineCount(name)).toBe(expected);
    });

    it('should return 6 for "Mehrkampf m" (male)', () => {
      expect(getExpectedDisciplineCount('Mehrkampf m')).toBe(6);
    });

    it('should return 4 for "Mehrkampf w" (female)', () => {
      expect(getExpectedDisciplineCount('Mehrkampf w')).toBe(4);
    });

    it('should return 0 for unknown competition names', () => {
      expect(getExpectedDisciplineCount('Geräteturnen')).toBe(0);
      expect(getExpectedDisciplineCount('Unknown')).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // detectLevelFromDevices
  // ────────────────────────────────────────────────────────────────────────

  describe('detectLevelFromDevices', () => {
    it('should detect P level from device name containing "P 1"', () => {
      expect(detectLevelFromDevices([{ name: 'Par.-Barren P 1 > P 9' }])).toBe('P');
    });

    it('should detect P level from device name "P1-P9"', () => {
      expect(detectLevelFromDevices([{ name: 'Boden P1-P9' }])).toBe('P');
    });

    it('should detect P level from device name "P-Stufe"', () => {
      expect(detectLevelFromDevices([{ name: 'Boden P-Stufe' }])).toBe('P');
    });

    it('should detect Kür from device name', () => {
      expect(detectLevelFromDevices([{ name: 'Boden Kür' }])).toBe('Kür');
    });

    it('should detect LK1 from device name', () => {
      expect(detectLevelFromDevices([{ name: 'Sprung LK1' }])).toBe('LK1');
    });

    it('should detect LK2 from device name', () => {
      expect(detectLevelFromDevices([{ name: 'Barren LK 2' }])).toBe('LK2');
    });

    it('should detect LK3 from device name', () => {
      expect(detectLevelFromDevices([{ name: 'Reck LK3' }])).toBe('LK3');
    });

    // --- Code-based detection ---

    it('should detect P level from wedDisNr code ending in 9 (200-299)', () => {
      expect(detectLevelFromDevices([{ code: 209 }])).toBe('P');
      expect(detectLevelFromDevices([{ code: 219 }])).toBe('P');
      expect(detectLevelFromDevices([{ code: 299 }])).toBe('P');
    });

    it('should detect Kür from code in 100-199 range ending in 0', () => {
      expect(detectLevelFromDevices([{ code: 100 }])).toBe('Kür');
      expect(detectLevelFromDevices([{ code: 110 }])).toBe('Kür');
    });

    it('should detect LK1 from code ending in 1 (100-199 range)', () => {
      expect(detectLevelFromDevices([{ code: 101 }])).toBe('LK1');
      expect(detectLevelFromDevices([{ code: 111 }])).toBe('LK1');
    });

    it('should detect LK2 from code ending in 2', () => {
      expect(detectLevelFromDevices([{ code: 102 }])).toBe('LK2');
    });

    it('should detect LK3 from code ending in 3', () => {
      expect(detectLevelFromDevices([{ code: 103 }])).toBe('LK3');
    });

    it('should return empty string for base DTB codes (200, 210, …)', () => {
      expect(detectLevelFromDevices([{ code: 200 }])).toBe('');
      expect(detectLevelFromDevices([{ code: 210 }])).toBe('');
    });

    it('should return empty string for empty device array', () => {
      expect(detectLevelFromDevices([])).toBe('');
    });

    it('should handle string codes', () => {
      expect(detectLevelFromDevices([{ code: '209' }])).toBe('P');
      expect(detectLevelFromDevices([{ code: '101' }])).toBe('LK1');
    });

    it('should return empty string when code is NaN', () => {
      expect(detectLevelFromDevices([{ code: 'abc' }])).toBe('');
    });

    it('should prioritize name-based detection over code', () => {
      // Device has a name with Kür but code 209 (P)
      // Since name is checked first, Kür should win
      expect(detectLevelFromDevices([{ name: 'Boden Kür', code: 209 }])).toBe('Kür');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // matchesLevel
  // ────────────────────────────────────────────────────────────────────────

  describe('matchesLevel', () => {
    describe('P level', () => {
      it('should match "Boden m. P1-P9"', () => {
        expect(matchesLevel('Boden m. P1-P9', 'P')).toBe(true);
      });

      it('should match "Par.-Barren P1-P9"', () => {
        expect(matchesLevel('Par.-Barren P1-P9', 'P')).toBe(true);
      });

      it('should NOT match "Sprung" (false positive due to containing "p")', () => {
        expect(matchesLevel('Sprung', 'P')).toBe(false);
      });

      it('should NOT match "Pauschenpferd"', () => {
        expect(matchesLevel('Pauschenpferd', 'P')).toBe(false);
      });

      it('should NOT match "Par.-Barren" alone (P is part of Par.)', () => {
        expect(matchesLevel('Par.-Barren', 'P')).toBe(false);
      });

      it('should match "Boden P-Stufe"', () => {
        expect(matchesLevel('Boden P-Stufe', 'P')).toBe(true);
      });
    });

    describe('Kür level', () => {
      it('should match "Boden m. Kür"', () => {
        expect(matchesLevel('Boden m. Kür', 'Kür')).toBe(true);
      });

      it('should NOT match "Boden m. LK1"', () => {
        expect(matchesLevel('Boden m. LK1', 'Kür')).toBe(false);
      });
    });

    describe('LK levels', () => {
      it('should match LK1, LK2, LK3', () => {
        expect(matchesLevel('Sprung m. LK1', 'LK1')).toBe(true);
        expect(matchesLevel('Reck LK2', 'LK2')).toBe(true);
        expect(matchesLevel('Barren LK3', 'LK3')).toBe(true);
      });

      it('should NOT match LK1 when searching for LK2', () => {
        expect(matchesLevel('Boden m. LK1', 'LK2')).toBe(false);
      });
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // detectGenderFromName
  // ────────────────────────────────────────────────────────────────────────

  describe('detectGenderFromName', () => {
    it.each([
      ['Gerätsechskampf m (17-18Jahre)', 'male'],
      ['4-Kampf m', 'male'],
      ['Gerätvierkampf m (15-16)', 'male'],
      ['Jungen 12-13', 'male'],
      ['männlich', 'male'],
    ])('"%s" → male', (name, expected) => {
      expect(detectGenderFromName(name)).toBe(expected);
    });

    it.each([
      ['Gerätvierkampf w', 'female'],
      ['4-Kampf w (9-10Jahre)', 'female'],
      ['Mädchen C', 'female'],
      ['weiblich', 'female'],
    ])('"%s" → female', (name, expected) => {
      expect(detectGenderFromName(name)).toBe(expected);
    });

    it('should detect "Sechskampf" (no gender suffix) as male', () => {
      expect(detectGenderFromName('Sechskampf')).toBe('male');
    });

    it.each([
      'Geräteturnen',
      'Unknown Competition',
      'WK 14',
    ])('"%s" → unknown', (name) => {
      expect(detectGenderFromName(name)).toBe('unknown');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // wedDisNrToName
  // ────────────────────────────────────────────────────────────────────────

  describe('wedDisNrToName', () => {
    it('should return "Boden" for code 200', () => {
      expect(wedDisNrToName(200)).toBe('Boden');
    });

    it('should return "Sprung" for code 230', () => {
      expect(wedDisNrToName(230)).toBe('Sprung');
    });

    it('should return null for unknown code', () => {
      expect(wedDisNrToName(999)).toBeNull();
    });

    it('should accept string codes', () => {
      expect(wedDisNrToName('200')).toBe('Boden');
    });
  });
});
