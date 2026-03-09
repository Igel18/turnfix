import { describe, expect, it } from 'vitest';
import { resolveScoringInputMode } from '../scoringInputMode';

describe('resolveScoringInputMode', () => {
  it('returns simple when no formula is configured', () => {
    expect(resolveScoringInputMode({ formula: '', formulaId: null })).toBe('simple');
  });

  it('returns builtInFormula for variable formula like 1*x', () => {
    expect(resolveScoringInputMode({ formula: '1*x', formulaId: null })).toBe('builtInFormula');
  });

  it('returns linkedFormula for letter formula', () => {
    expect(resolveScoringInputMode({ formula: 'A-B', formulaId: null })).toBe('linkedFormula');
  });

  it('prioritizes linked formula when formulaId exists even if formula content is variable-based', () => {
    expect(resolveScoringInputMode({ formula: '1*x', formulaId: 12 })).toBe('linkedFormula');
  });

  it('returns linkedFormula when only formulaId is present', () => {
    expect(resolveScoringInputMode({ formula: '', formulaId: 5 })).toBe('linkedFormula');
  });
});
