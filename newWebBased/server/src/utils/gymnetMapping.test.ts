import { wedDisNrToTurnFixId, wedDisNrToName } from './gymnetMapping';

describe('gymnetMapping - wedDisID + wedDisNr resolution', () => {
  it('prefers wedDisID override for ambiguous P-level export data', () => {
    // Real XML case:
    // wedDisID=1731, wedDisNr=160, wedDisName='Sprung w. P1-P9'
    // Expected: SPRUNG_W_P (ID 67), not SPRUNG_W_KUER (ID 28)
    const id = wedDisNrToTurnFixId(160, { wedDisId: 1731, wedDisName: 'Sprung w. P1-P9' });
    const name = wedDisNrToName(160, { wedDisId: 1731, wedDisName: 'Sprung w. P1-P9' });

    expect(id).toBe(67);
    expect(name).toBe('Sprung w. P1-P9');
  });

  it('falls back to wedDisNr mapping when no wedDisID override exists', () => {
    const id = wedDisNrToTurnFixId(160);
    const name = wedDisNrToName(160);

    expect(id).toBe(28);
    expect(name).toBe('Sprung w. Kür');
  });
});
