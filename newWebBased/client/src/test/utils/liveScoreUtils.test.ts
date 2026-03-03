import { describe, it, expect } from 'vitest';
import { getDisplayDisciplineName } from '../../utils/liveScoreUtils';

describe('liveScoreUtils — Discipline name display', () => {

  describe('getDisplayDisciplineName', () => {
    it('should return full name when both full and short names are available', () => {
      // CRITICAL: Users reported the abbreviation showing instead of the full name
      const result = getDisplayDisciplineName('Schwebebalken', 'SB');
      expect(result).toBe('Schwebebalken');
    });

    it('should return full name, NOT abbreviation, for all standard disciplines', () => {
      expect(getDisplayDisciplineName('Boden', 'Bo')).toBe('Boden');
      expect(getDisplayDisciplineName('Reck', 'Re')).toBe('Reck');
      expect(getDisplayDisciplineName('Barren', 'Ba')).toBe('Barren');
      expect(getDisplayDisciplineName('Sprung', 'Sp')).toBe('Sprung');
      expect(getDisplayDisciplineName('Stufenbarren', 'Stb')).toBe('Stufenbarren');
      expect(getDisplayDisciplineName('Minitrampolin', 'MT')).toBe('Minitrampolin');
    });

    it('should fall back to abbreviation when full name is empty', () => {
      expect(getDisplayDisciplineName('', 'SB')).toBe('SB');
    });

    it('should fall back to abbreviation when full name is null', () => {
      expect(getDisplayDisciplineName(null, 'SB')).toBe('SB');
    });

    it('should fall back to abbreviation when full name is undefined', () => {
      expect(getDisplayDisciplineName(undefined, 'SB')).toBe('SB');
    });

    it('should return "Unbekannt" when both names are missing', () => {
      expect(getDisplayDisciplineName(null, null)).toBe('Unbekannt');
      expect(getDisplayDisciplineName(undefined, undefined)).toBe('Unbekannt');
      expect(getDisplayDisciplineName('', '')).toBe('Unbekannt');
    });
  });
});
