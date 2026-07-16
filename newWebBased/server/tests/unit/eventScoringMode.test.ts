jest.mock('../../src/lib/prisma', () => ({
  default: {
    $queryRawUnsafe: jest.fn(),
  },
}));

import {
  DEFAULT_EVENT_SCORING_MODE,
  normalizeImportScoringMode,
  parseEventScoringMode,
  shouldUseFormulaCalculation,
  withEventScoringMode,
} from '../../src/utils/eventScoringMode';

describe('eventScoringMode helpers', () => {
  describe('normalizeImportScoringMode', () => {
    it('returns final_only only for that exact import value', () => {
      expect(normalizeImportScoringMode('final_only')).toBe('final_only');
      expect(normalizeImportScoringMode('formula_based')).toBe('formula_based');
      expect(normalizeImportScoringMode('unknown')).toBe('formula_based');
      expect(normalizeImportScoringMode(undefined)).toBe('formula_based');
    });
  });

  describe('parseEventScoringMode', () => {
    it('parses mode token from purpose string', () => {
      expect(parseEventScoringMode('TFX_SCORING_MODE:final_only')).toBe('final_only');
      expect(parseEventScoringMode('abc; TFX_SCORING_MODE:formula_based')).toBe('formula_based');
    });

    it('falls back to default mode when token is missing', () => {
      expect(parseEventScoringMode('legacy text')).toBe(DEFAULT_EVENT_SCORING_MODE);
      expect(parseEventScoringMode(null)).toBe(DEFAULT_EVENT_SCORING_MODE);
    });
  });

  describe('withEventScoringMode', () => {
    it('appends token when no purpose exists', () => {
      expect(withEventScoringMode('', 'formula_based')).toBe('TFX_SCORING_MODE:formula_based');
    });

    it('replaces existing token but keeps other text', () => {
      const result = withEventScoringMode('Legacy note; TFX_SCORING_MODE:formula_based', 'final_only');
      expect(result).toContain('Legacy note');
      expect(result).toContain('TFX_SCORING_MODE:final_only');
      expect(result).not.toContain('TFX_SCORING_MODE:formula_based');
    });
  });

  describe('shouldUseFormulaCalculation', () => {
    it('enables formulas only in formula_based mode', () => {
      expect(shouldUseFormulaCalculation('formula_based')).toBe(true);
      expect(shouldUseFormulaCalculation('final_only')).toBe(false);
    });
  });
});
