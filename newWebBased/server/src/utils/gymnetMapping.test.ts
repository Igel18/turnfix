import {
  wedDisNrToTurnFixId,
  wedDisNrToName,
  turnFixIdToWedDisNr,
  getActiveMappingProfile,
  clearMappingCache,
} from './gymnetMapping';

describe('gymnetMapping - profiles', () => {
  const original = process.env.GYMNET_MAPPING_PROFILE;

  afterEach(() => {
    if (original === undefined) delete process.env.GYMNET_MAPPING_PROFILE;
    else process.env.GYMNET_MAPPING_PROFILE = original;
    clearMappingCache();
  });

  it('defaults to the preset profile', () => {
    delete process.env.GYMNET_MAPPING_PROFILE;
    expect(getActiveMappingProfile()).toBe('preset');
  });

  it('rejects unknown profiles', () => {
    process.env.GYMNET_MAPPING_PROFILE = 'nonsense';
    expect(() => getActiveMappingProfile()).toThrow(/GYMNET_MAPPING_PROFILE/);
  });

  it('maps the P-level wedDisIDs of the anonymized export per profile (IDs only)', () => {
    const ids = [1727, 1617, 493, 1728, 1729, 1730, 1731, 1732, 1733, 1734];

    delete process.env.GYMNET_MAPPING_PROFILE;
    clearMappingCache();
    expect(ids.map((wedDisId) => wedDisNrToTurnFixId(100, { wedDisId }))).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69, 70]);

    process.env.GYMNET_MAPPING_PROFILE = 'existing';
    clearMappingCache();
    expect(ids.map((wedDisId) => wedDisNrToTurnFixId(100, { wedDisId }))).toEqual([354, 345, 346, 347, 713, 349, 350, 351, 352, 355]);
  });

  it('uses the wedDisNr table when no wedDisID entry exists', () => {
    process.env.GYMNET_MAPPING_PROFILE = 'existing';
    clearMappingCache();
    expect(wedDisNrToTurnFixId(100)).toBe(317);
    expect(wedDisNrToTurnFixId(999)).toBeNull();
  });

  it('supports the reverse lookup used by the XML export', () => {
    delete process.env.GYMNET_MAPPING_PROFILE;
    clearMappingCache();
    expect(turnFixIdToWedDisNr(8)).toBe(270);
  });
});

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
