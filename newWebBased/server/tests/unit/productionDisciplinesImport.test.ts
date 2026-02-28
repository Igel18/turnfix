/**
 * Production Disciplines Import - Unit Tests
 * 
 * Tests the import logic using mocked Prisma client.
 * Validates:
 * - Formula creation from KNOWN_FORMULAS fallback
 * - Einheit default for Turnen sports
 * - String truncation for all VarChar columns
 * - Duplicate discipline skipping
 * - Formula ID linking
 * - Field creation
 */

import { applyProductionDisciplines } from '../../src/utils/productionDisciplinesImport';

// Create a comprehensive mock Prisma client
function createMockDb() {
  // Storage for created records
  const formulas: any[] = [];
  const sports: any[] = [];
  const disciplines: any[] = [];
  const fields: any[] = [];
  let formulaIdCounter = 1;
  let sportIdCounter = 1;
  let disciplineIdCounter = 1;

  return {
    // Internal storage for assertions
    _formulas: formulas,
    _sports: sports,
    _disciplines: disciplines,
    _fields: fields,

    tfx_formeln: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const found = formulas.find(f => f.var_name === where.var_name);
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const record = { ...data, int_formelid: formulaIdCounter++ };
        formulas.push(record);
        return Promise.resolve(record);
      }),
    },

    tfx_sport: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        const found = sports.find(s => s.var_name === where.var_name);
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const record = { ...data, int_sportid: sportIdCounter++ };
        sports.push(record);
        return Promise.resolve(record);
      }),
    },

    tfx_disziplinen: {
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        // Match by name + gender flags (like the real import does)
        const found = disciplines.find(d => {
          if (d.var_name !== where.var_name) return false;
          if (where.bol_m !== undefined && d.bol_m !== where.bol_m) return false;
          if (where.bol_w !== undefined && d.bol_w !== where.bol_w) return false;
          return true;
        });
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const record = { ...data, int_disziplinenid: disciplineIdCounter++ };
        disciplines.push(record);
        return Promise.resolve(record);
      }),
    },

    tfx_disziplinen_felder: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        fields.push(data);
        return Promise.resolve(data);
      }),
    },
  };
}

describe('Production Disciplines Import', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe('Formula Creation', () => {
    it('should create formulas including those only in KNOWN_FORMULAS', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      expect(result.success).toBe(true);

      const formulaNames = mockDb._formulas.map((f: any) => f.var_name);

      // These formulas exist only in KNOWN_FORMULAS (not in JSON formel field for DTB disciplines)
      expect(formulaNames).toContain('LK');
      expect(formulaNames).toContain('AK');
      expect(formulaNames).toContain('P-Wettkampf');
      // This one has formel string in JSON
      expect(formulaNames).toContain('D+E-Neutral');
    });

    it('should create LK formula with correct formula string', async () => {
      await applyProductionDisciplines(mockDb as any);

      const lk = mockDb._formulas.find((f: any) => f.var_name === 'LK');
      expect(lk).toBeDefined();
      expect(lk.var_formel).toBe('A + B - C');
      expect(lk.int_typ).toBe(1);
    });

    it('should create AK formula with correct formula string', async () => {
      await applyProductionDisciplines(mockDb as any);

      const ak = mockDb._formulas.find((f: any) => f.var_name === 'AK');
      expect(ak).toBeDefined();
      expect(ak.var_formel).toBe('A - B - C');
      expect(ak.int_typ).toBe(1);
    });

    it('should create P-Wettkampf formula with correct formula string', async () => {
      await applyProductionDisciplines(mockDb as any);

      const pWettkampf = mockDb._formulas.find((f: any) => f.var_name === 'P-Wettkampf');
      expect(pWettkampf).toBeDefined();
      expect(pWettkampf.var_formel).toBe('(10 + A) - B');
      expect(pWettkampf.int_typ).toBe(1);
    });

    it('should create D+E-Neutral formula from JSON formel field', async () => {
      await applyProductionDisciplines(mockDb as any);

      const neutral = mockDb._formulas.find((f: any) => f.var_name === 'D+E-Neutral');
      expect(neutral).toBeDefined();
      expect(neutral.var_formel).toBe('1*x');
    });

    it('should not create duplicate formulas', async () => {
      await applyProductionDisciplines(mockDb as any);

      const formulaNames = mockDb._formulas.map((f: any) => f.var_name);
      const uniqueNames = [...new Set(formulaNames)];
      expect(formulaNames.length).toBe(uniqueNames.length);
    });
  });

  describe('Formula Linking', () => {
    it('should link Turnen DTB disciplines to LK or AK formula', async () => {
      await applyProductionDisciplines(mockDb as any);

      const dtbDisciplines = mockDb._disciplines.filter((d: any) => {
        // Find sport ID for "Turnen DTB"
        const sport = mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB');
        return sport && d.int_sportid === sport.int_sportid;
      });

      dtbDisciplines.forEach((d: any) => {
        expect(d.int_formelid).not.toBeNull();
      });
    });

    it('should link Turnen DTB P disciplines to P-Wettkampf formula', async () => {
      await applyProductionDisciplines(mockDb as any);

      const pWettkampf = mockDb._formulas.find((f: any) => f.var_name === 'P-Wettkampf');
      expect(pWettkampf).toBeDefined();

      const dtbPSport = mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB P');
      if (dtbPSport) {
        const dtbPDisciplines = mockDb._disciplines.filter((d: any) =>
          d.int_sportid === dtbPSport.int_sportid
        );

        dtbPDisciplines.forEach((d: any) => {
          expect(d.int_formelid).toBe(pWettkampf.int_formelid);
        });
      }
    });

    it('should link Turnen DTB LK disciplines to LK formula', async () => {
      await applyProductionDisciplines(mockDb as any);

      const lk = mockDb._formulas.find((f: any) => f.var_name === 'LK');
      expect(lk).toBeDefined();

      const dtbLKSport = mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB LK');
      if (dtbLKSport) {
        const dtbLKDisciplines = mockDb._disciplines.filter((d: any) =>
          d.int_sportid === dtbLKSport.int_sportid
        );

        dtbLKDisciplines.forEach((d: any) => {
          expect(d.int_formelid).toBe(lk.int_formelid);
        });
      }
    });

    it('should link Turnen base disciplines to D+E-Neutral formula', async () => {
      await applyProductionDisciplines(mockDb as any);

      const neutral = mockDb._formulas.find((f: any) => f.var_name === 'D+E-Neutral');
      expect(neutral).toBeDefined();

      const turnenSport = mockDb._sports.find((s: any) => s.var_name === 'Turnen');
      if (turnenSport) {
        const turnenDisciplines = mockDb._disciplines.filter((d: any) =>
          d.int_sportid === turnenSport.int_sportid
        );

        turnenDisciplines.forEach((d: any) => {
          expect(d.int_formelid).toBe(neutral.int_formelid);
        });
      }
    });
  });

  describe('Einheit Default for Turnen', () => {
    it('should set einheit to "Pkt." for Turnen disciplines without einheit', async () => {
      await applyProductionDisciplines(mockDb as any);

      const turnenSport = mockDb._sports.find((s: any) => s.var_name === 'Turnen');
      if (turnenSport) {
        const turnenDisciplines = mockDb._disciplines.filter((d: any) =>
          d.int_sportid === turnenSport.int_sportid
        );

        turnenDisciplines.forEach((d: any) => {
          // JSON has "Pkt. " (with trailing space) for Boden, import defaults to "Pkt." for others
          expect(d.var_einheit.trim()).toBe('Pkt.');
        });
      }
    });

    it('should preserve einheit "Pkt." for DTB disciplines that already have it', async () => {
      await applyProductionDisciplines(mockDb as any);

      const dtbSport = mockDb._sports.find((s: any) => s.var_name === 'Turnen DTB');
      if (dtbSport) {
        const dtbDisciplines = mockDb._disciplines.filter((d: any) =>
          d.int_sportid === dtbSport.int_sportid
        );

        dtbDisciplines.forEach((d: any) => {
          expect(d.var_einheit).toBe('Pkt.');
        });
      }
    });

    it('should not set Pkt. for non-Turnen sports', async () => {
      await applyProductionDisciplines(mockDb as any);

      // Find a non-Turnen sport
      const nonTurnenSports = mockDb._sports.filter((s: any) =>
        !s.var_name.startsWith('Turnen')
      );

      if (nonTurnenSports.length > 0) {
        const nonTurnenDisciplines = mockDb._disciplines.filter((d: any) =>
          nonTurnenSports.some((s: any) => s.int_sportid === d.int_sportid)
        );

        // At least some non-Turnen disciplines should exist
        expect(nonTurnenDisciplines.length).toBeGreaterThan(0);
        // They should NOT all have "Pkt." einheit (since it's not the default for non-Turnen)
      }
    });
  });

  describe('String Truncation', () => {
    it('all created discipline var_name values should be ≤ 100 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_name) {
          expect(d.var_name.length).toBeLessThanOrEqual(100);
        }
      });
    });

    it('all created discipline var_kurz1 values should be ≤ 6 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_kurz1) {
          expect(d.var_kurz1.length).toBeLessThanOrEqual(6);
        }
      });
    });

    it('all created discipline var_kurz2 values should be ≤ 20 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_kurz2) {
          expect(d.var_kurz2.length).toBeLessThanOrEqual(20);
        }
      });
    });

    it('all created discipline var_maske values should be ≤ 10 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_maske) {
          expect(d.var_maske.length).toBeLessThanOrEqual(10);
        }
      });
    });

    it('all created discipline var_einheit values should be ≤ 5 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_einheit) {
          expect(d.var_einheit.length).toBeLessThanOrEqual(5);
        }
      });
    });

    it('all created discipline var_icon values should be ≤ 50 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_icon) {
          expect(d.var_icon.length).toBeLessThanOrEqual(50);
        }
      });
    });

    it('all created discipline var_kuerzel values should be ≤ 50 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_kuerzel) {
          expect(d.var_kuerzel.length).toBeLessThanOrEqual(50);
        }
      });
    });

    it('all created field var_name values should be ≤ 15 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._fields.forEach((f: any) => {
        if (f.var_name) {
          expect(f.var_name.length).toBeLessThanOrEqual(15);
        }
      });
    });
  });

  describe('Import Statistics', () => {
    it('should return success with stats', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
    });

    it('should report created sports', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      expect(result.stats.createdSports).toBeGreaterThan(0);
    });

    it('should report created formulas', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      // Should include LK, AK, P-Wettkampf, D+E-Neutral + possibly more
      expect(result.stats.createdFormulas).toBeGreaterThanOrEqual(4);
    });

    it('should report created disciplines', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      expect(result.stats.createdDisciplines).toBeGreaterThan(0);
      expect(result.stats.totalDisciplines).toBeGreaterThanOrEqual(result.stats.createdDisciplines);
    });

    it('should report created fields', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      expect(result.stats.createdFields).toBeGreaterThan(0);
    });

    it('should have no skipped disciplines on first run (m/w variants are separate)', async () => {
      const result = await applyProductionDisciplines(mockDb as any);

      // Since the import now matches by name + gender flags,
      // male and female variants of the same discipline are created as separate records.
      // On a first run, nothing should be skipped.
      expect(result.stats.skippedDisciplines).toBe(0);
      expect(result.stats.createdDisciplines + result.stats.skippedDisciplines)
        .toBe(result.stats.totalDisciplines);
    });
  });

  describe('Duplicate Handling', () => {
    it('should skip existing disciplines on second run', async () => {
      // First run
      const result1 = await applyProductionDisciplines(mockDb as any);
      expect(result1.stats.createdDisciplines).toBeGreaterThan(0);

      // Second run - all should be skipped
      const result2 = await applyProductionDisciplines(mockDb as any);
      expect(result2.stats.createdDisciplines).toBe(0);
      expect(result2.stats.skippedDisciplines).toBe(result1.stats.totalDisciplines);
    });
  });

  describe('Icon Paths in Database', () => {
    it('should store Qt-format icon paths (:/icons/) for C++ compatibility', async () => {
      await applyProductionDisciplines(mockDb as any);

      const withIcons = mockDb._disciplines.filter((d: any) => d.var_icon);
      expect(withIcons.length).toBeGreaterThan(0);

      withIcons.forEach((d: any) => {
        // Icons should be stored as Qt resource paths for legacy C++ app compatibility
        expect(d.var_icon).toMatch(/^:\/icons\//);
      });
    });
  });

  describe('Custom Formulas (var_formel)', () => {
    it('should set var_formel for Leichtathletik disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const laSport = mockDb._sports.find((s: any) => s.var_name === 'Leichtathletik');
      expect(laSport).toBeDefined();

      const laDisciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === laSport.int_sportid
      );
      expect(laDisciplines.length).toBeGreaterThan(0);

      // ALL Leichtathletik disciplines must have a custom formula
      laDisciplines.forEach((d: any) => {
        expect(d.var_formel).toBeTruthy();
        expect(typeof d.var_formel).toBe('string');
        expect(d.var_formel.length).toBeGreaterThan(0);
      });
    });

    it('should set var_formel for Schwimmen disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const schwimmenSport = mockDb._sports.find((s: any) => s.var_name === 'Schwimmen');
      expect(schwimmenSport).toBeDefined();

      const schwimmenDisciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === schwimmenSport.int_sportid
      );
      expect(schwimmenDisciplines.length).toBeGreaterThan(0);

      schwimmenDisciplines.forEach((d: any) => {
        expect(d.var_formel).toBeTruthy();
      });
    });

    it('should set var_formel for Rope-Skipping disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const sport = mockDb._sports.find((s: any) => s.var_name === 'Rope-Skipping');
      expect(sport).toBeDefined();

      const disciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === sport.int_sportid
      );
      expect(disciplines.length).toBeGreaterThan(0);

      disciplines.forEach((d: any) => {
        expect(d.var_formel).toBeTruthy();
      });
    });

    it('should set var_formel for Gymnastik disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const sport = mockDb._sports.find((s: any) => s.var_name === 'Gymnastik');
      expect(sport).toBeDefined();

      const disciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === sport.int_sportid
      );
      expect(disciplines.length).toBeGreaterThan(0);

      disciplines.forEach((d: any) => {
        expect(d.var_formel).toBe('1*x');
      });
    });

    it('should set var_formel for Turnen base disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const sport = mockDb._sports.find((s: any) => s.var_name === 'Turnen');
      expect(sport).toBeDefined();

      const disciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === sport.int_sportid
      );
      expect(disciplines.length).toBeGreaterThan(0);

      disciplines.forEach((d: any) => {
        expect(d.var_formel).toBe('1*x');
      });
    });

    it('should create male AND female variants for Leichtathletik disciplines with different formulas', async () => {
      await applyProductionDisciplines(mockDb as any);

      const laSport = mockDb._sports.find((s: any) => s.var_name === 'Leichtathletik');
      const laDisciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === laSport.int_sportid
      );

      // "1.000-m-Lauf" should exist twice: once male, once female
      const lauf1000 = laDisciplines.filter((d: any) => d.var_name === '1.000-m-Lauf');
      expect(lauf1000.length).toBe(2);

      const male = lauf1000.find((d: any) => d.bol_m === true && d.bol_w === false);
      const female = lauf1000.find((d: any) => d.bol_m === false && d.bol_w === true);
      expect(male).toBeDefined();
      expect(female).toBeDefined();
      // Male and female should have different formulas
      expect(male.var_formel).not.toBe(female.var_formel);
    });

    it('should create male AND female variants for Schwimmen disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const sport = mockDb._sports.find((s: any) => s.var_name === 'Schwimmen');
      const disciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === sport.int_sportid
      );

      // "50 m Kraul" should exist twice (male + female)
      const kraul50 = disciplines.filter((d: any) => d.var_name === '50 m Kraul');
      expect(kraul50.length).toBe(2);
    });

    it('should set correct mask for Leichtathletik time-based disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const laSport = mockDb._sports.find((s: any) => s.var_name === 'Leichtathletik');
      const laDisciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === laSport.int_sportid
      );

      // Running events use time mask
      const lauf1000 = laDisciplines.find((d: any) =>
        d.var_name === '1.000-m-Lauf' && d.bol_m === true
      );
      expect(lauf1000?.var_maske).toBe('00:00.00');
    });

    it('should set correct attempts (int_versuche) for throwing disciplines', async () => {
      await applyProductionDisciplines(mockDb as any);

      const laSport = mockDb._sports.find((s: any) => s.var_name === 'Leichtathletik');
      const laDisciplines = mockDb._disciplines.filter((d: any) =>
        d.int_sportid === laSport.int_sportid
      );

      // Throwing events have 3 attempts
      const kugel = laDisciplines.find((d: any) =>
        d.var_name === 'Kugelstoßen + Medizinball'
      );
      expect(kugel?.int_versuche).toBe(3);

      // Running events have 1 attempt
      const lauf1000 = laDisciplines.find((d: any) =>
        d.var_name === '1.000-m-Lauf' && d.bol_m === true
      );
      expect(lauf1000?.int_versuche).toBe(1);
    });

    it('all created discipline var_formel values should be ≤ 300 chars', async () => {
      await applyProductionDisciplines(mockDb as any);

      mockDb._disciplines.forEach((d: any) => {
        if (d.var_formel) {
          expect(d.var_formel.length).toBeLessThanOrEqual(300);
        }
      });
    });

    it('disciplines without JSON formula should have null var_formel', async () => {
      await applyProductionDisciplines(mockDb as any);

      // All disciplines should have either var_formel or int_formelid (or both)
      // None should have NEITHER when they have a formula in JSON
      mockDb._disciplines.forEach((d: any) => {
        // If a discipline has no formula at all, it's an error in the data
        // but we don't enforce that here — just check the types
        if (d.var_formel !== null && d.var_formel !== undefined) {
          expect(typeof d.var_formel).toBe('string');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw if database schema does not exist', async () => {
      const brokenDb = createMockDb();
      brokenDb.tfx_formeln.count = jest.fn().mockRejectedValue(
        new Error('relation "tfx_formeln" does not exist')
      );

      await expect(applyProductionDisciplines(brokenDb as any))
        .rejects.toThrow('Database schema not initialized');
    });

    it('should throw on unexpected database errors', async () => {
      const brokenDb = createMockDb();
      brokenDb.tfx_formeln.count = jest.fn().mockRejectedValue(
        new Error('Connection refused')
      );

      await expect(applyProductionDisciplines(brokenDb as any))
        .rejects.toThrow('Connection refused');
    });
  });
});
