import { isActiveStarter } from '../../src/utils/participantFilters';

describe('isActiveStarter', () => {
  it('returns false for bol_startet_nicht=true', () => {
    expect(isActiveStarter({ bol_startet_nicht: true })).toBe(false);
  });

  it('returns true for bol_startet_nicht=false', () => {
    expect(isActiveStarter({ bol_startet_nicht: false })).toBe(true);
  });

  it('returns true when bol_startet_nicht is undefined or null', () => {
    expect(isActiveStarter({})).toBe(true);
    expect(isActiveStarter({ bol_startet_nicht: null })).toBe(true);
  });
});
