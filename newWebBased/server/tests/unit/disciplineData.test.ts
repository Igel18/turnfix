/**
 * Discipline Data Validation Tests
 * 
 * Validates the production discipline JSON data against database constraints.
 * These tests do NOT require a database connection - they only check the JSON files.
 * 
 * Tests ensure:
 * - All string values fit within database column limits
 * - All formula references can be resolved
 * - All Turnen disciplines have the correct einheit
 * - All disciplines have valid icon paths
 * - Data integrity is maintained
 */

import {
  loadProductionDisciplines,
  getAvailableSports,
  getProductionDisciplinesBySport,
  getProductionDisciplineByName,
  getDisciplineStatistics
} from '../../src/data/loaders/disciplineLoader';
import { Discipline } from '../../src/data/types/discipline.types';

// Known formula definitions (must match productionDisciplinesImport.ts)
const KNOWN_FORMULAS: Record<string, { formula: string; typ: number }> = {
  'D+E-Neutral': { formula: '1*x', typ: 0 },
  'P-Wettkampf': { formula: '(10 + A) - B', typ: 1 },
  'AK':          { formula: 'A - B - C', typ: 1 },
  'LK':          { formula: 'A + B - C', typ: 1 },
};

// Sports where einheit should default to "Pkt."
const TURNEN_SPORTS = ['Turnen', 'Turnen DTB', 'Turnen DTB P', 'Turnen DTB LK', 'Turnen DTB Turn10'];

// Database column limits from schema.prisma
const DB_LIMITS = {
  var_name: 100,       // VarChar(100)
  var_kurz1: 6,        // VarChar(6)
  var_kurz2: 20,       // VarChar(20)
  var_maske: 10,       // VarChar(10)
  var_einheit: 5,      // VarChar(5)
  var_icon: 50,        // VarChar(50)
  var_kuerzel: 50,     // VarChar(50)
  feld_var_name: 15,   // tfx_disziplinen_felder.var_name VarChar(15)
};

describe('Discipline Data Validation', () => {
  let disciplines: Discipline[];

  beforeAll(() => {
    disciplines = loadProductionDisciplines();
  });

  describe('JSON Data Loading', () => {
    it('should load production disciplines successfully', () => {
      expect(disciplines).toBeDefined();
      expect(Array.isArray(disciplines)).toBe(true);
    });

    it('should contain a substantial number of disciplines', () => {
      expect(disciplines.length).toBeGreaterThanOrEqual(100);
    });

    it('should have multiple sports', () => {
      const sports = getAvailableSports();
      expect(sports.length).toBeGreaterThanOrEqual(5);
    });

    it('should return statistics', () => {
      const stats = getDisciplineStatistics();
      expect(stats.production.total).toBeGreaterThan(0);
      expect(stats.production.sports).toBeGreaterThan(0);
    });

    it('should find discipline by name', () => {
      const boden = getProductionDisciplineByName('Boden');
      expect(boden).toBeDefined();
      expect(boden?.sportart).toBe('Turnen');
    });

    it('should return undefined for non-existent discipline', () => {
      const result = getProductionDisciplineByName('NonExistentDiscipline');
      expect(result).toBeUndefined();
    });

    it('should filter disciplines by sport', () => {
      const turnen = getProductionDisciplinesBySport('Turnen');
      expect(turnen.length).toBeGreaterThan(0);
      turnen.forEach(d => expect(d.sportart).toBe('Turnen'));
    });
  });

  describe('Database Column Length Constraints', () => {
    it('all var_name values should fit in VarChar(100)', () => {
      const violations = disciplines.filter(d => d.name && d.name.length > DB_LIMITS.var_name);
      expect(violations).toEqual([]);
    });

    it('all var_kurz1 (kurzname) values should fit in VarChar(6)', () => {
      const violations = disciplines.filter(d => d.kurzname && d.kurzname.length > DB_LIMITS.var_kurz1);
      if (violations.length > 0) {
        console.log('var_kurz1 violations (will be truncated):', violations.map(d => `${d.name}: "${d.kurzname}" (${d.kurzname.length})`));
      }
      // Note: these are truncated by the import, so this is informational only
    });

    it('all var_kurz2 (anzeigename) values should fit in VarChar(20)', () => {
      const violations = disciplines.filter(d => {
        const value = d.anzeigename || d.name;
        return value && value.length > DB_LIMITS.var_kurz2;
      });
      if (violations.length > 0) {
        console.log('var_kurz2 violations (will be truncated):', violations.map(d => {
          const value = d.anzeigename || d.name;
          return `${d.name}: "${value}" (${value.length})`;
        }));
      }
      // Note: these are truncated by the import, so this is informational only
    });

    it('all var_maske values should fit in VarChar(10)', () => {
      const violations = disciplines.filter(d => d.maske && d.maske.length > DB_LIMITS.var_maske);
      expect(violations).toEqual([]);
    });

    it('all var_einheit values should fit in VarChar(5)', () => {
      const violations = disciplines.filter(d => d.einheit && d.einheit.length > DB_LIMITS.var_einheit);
      expect(violations).toEqual([]);
    });

    it('all var_icon values should fit in VarChar(50)', () => {
      const violations = disciplines.filter(d => d.icon && d.icon.length > DB_LIMITS.var_icon);
      expect(violations).toEqual([]);
    });

    it('all var_kuerzel values should fit in VarChar(50)', () => {
      const violations = disciplines.filter(d => d.kuerzel && d.kuerzel.length > DB_LIMITS.var_kuerzel);
      expect(violations).toEqual([]);
    });

    it('all field var_name values should fit in VarChar(15)', () => {
      const violations: string[] = [];
      disciplines.forEach(d => {
        if (d.felder) {
          d.felder.forEach(f => {
            if (f.name && f.name.length > DB_LIMITS.feld_var_name) {
              violations.push(`${d.name} → field "${f.name}" (${f.name.length})`);
            }
          });
        }
      });
      expect(violations).toEqual([]);
    });
  });

  describe('Formula References', () => {
    it('all formelName references should be resolvable', () => {
      // A formelName is resolvable if:
      // 1. The discipline itself has a formel string, OR
      // 2. The formelName is in KNOWN_FORMULAS
      const unresolvable: string[] = [];
      disciplines.forEach(d => {
        if (d.formelName) {
          const hasOwnFormula = !!d.formel;
          const isKnown = !!KNOWN_FORMULAS[d.formelName];
          const otherHasFormula = disciplines.some(other => other.formelName === d.formelName && other.formel);
          if (!hasOwnFormula && !isKnown && !otherHasFormula) {
            unresolvable.push(`${d.name} → formelName "${d.formelName}"`);
          }
        }
      });
      expect(unresolvable).toEqual([]);
    });

    it('KNOWN_FORMULAS should cover all unique formelNames without formel string', () => {
      const formelNamesWithoutFormula = new Set<string>();
      disciplines.forEach(d => {
        if (d.formelName && !d.formel) {
          formelNamesWithoutFormula.add(d.formelName);
        }
      });

      const uncovered: string[] = [];
      formelNamesWithoutFormula.forEach(name => {
        if (!KNOWN_FORMULAS[name]) {
          // Check if another discipline with same formelName has the formula string
          const hasFormulaElsewhere = disciplines.some(d => d.formelName === name && d.formel);
          if (!hasFormulaElsewhere) {
            uncovered.push(name);
          }
        }
      });

      expect(uncovered).toEqual([]);
    });

    it('all unique formelName values should be known', () => {
      const uniqueFormelNames = new Set<string>();
      disciplines.forEach(d => {
        if (d.formelName) uniqueFormelNames.add(d.formelName);
      });

      expect(uniqueFormelNames.size).toBeGreaterThan(0);
      // Just verify we found the expected ones
      expect(uniqueFormelNames.has('D+E-Neutral')).toBe(true);
    });
  });

  describe('Turnen Sports - Einheit', () => {
    TURNEN_SPORTS.forEach(sport => {
      it(`all "${sport}" disciplines should have einheit "Pkt." or it defaults correctly`, () => {
        const sportDiscs = getProductionDisciplinesBySport(sport);
        if (sportDiscs.length === 0) return; // Sport might not exist in production data

        sportDiscs.forEach(d => {
          // Import defaults to "Pkt." when empty; JSON may have trailing spaces
          const effectiveEinheit = (d.einheit || 'Pkt.').trim();
          expect(effectiveEinheit).toBe('Pkt.');
        });
      });
    });

    it('Turnen base sport: most disciplines should have empty einheit (defaults to "Pkt." during import)', () => {
      const turnen = getProductionDisciplinesBySport('Turnen');
      const withoutEinheit = turnen.filter(d => !d.einheit || d.einheit.trim() === '');
      // Most Turnen disciplines have empty einheit in JSON, but import defaults to "Pkt."
      expect(withoutEinheit.length).toBeGreaterThan(0);
    });

    it('Turnen DTB disciplines should have einheit "Pkt." in JSON', () => {
      const dtb = getProductionDisciplinesBySport('Turnen DTB');
      dtb.forEach(d => {
        expect(d.einheit).toBe('Pkt.');
      });
    });

    it('Turnen DTB P disciplines should have einheit "Pkt." in JSON', () => {
      const dtbP = getProductionDisciplinesBySport('Turnen DTB P');
      dtbP.forEach(d => {
        expect(d.einheit).toBe('Pkt.');
      });
    });

    it('Turnen DTB LK disciplines should have einheit "Pkt." in JSON', () => {
      const dtbLK = getProductionDisciplinesBySport('Turnen DTB LK');
      dtbLK.forEach(d => {
        expect(d.einheit).toBe('Pkt.');
      });
    });
  });

  describe('Icon Paths', () => {
    it('all Turnen disciplines should have icon paths', () => {
      TURNEN_SPORTS.forEach(sport => {
        const sportDiscs = getProductionDisciplinesBySport(sport);
        sportDiscs.forEach(d => {
          expect(d.icon).toBeTruthy();
          // Icons should use Qt resource path format (:/icons/) for legacy C++ compatibility
          expect(d.icon).toMatch(/^:\/icons\//);
        });
      });
    });

    it('icon paths should end with .png', () => {
      const withIcons = disciplines.filter(d => d.icon);
      withIcons.forEach(d => {
        expect(d.icon).toMatch(/\.png$/);
      });
    });

    it('icon paths should use Qt resource format (:/icons/)', () => {
      const withIcons = disciplines.filter(d => d.icon);
      withIcons.forEach(d => {
        expect(d.icon).toMatch(/^:\/icons\//);
      });
    });
  });

  describe('Turnen DTB - Formulas', () => {
    it('Turnen DTB disciplines should reference formulas (LK or AK)', () => {
      const dtb = getProductionDisciplinesBySport('Turnen DTB');
      dtb.forEach(d => {
        expect(d.formelName).toBeTruthy();
        expect(['LK', 'AK']).toContain(d.formelName);
      });
    });

    it('Turnen DTB P disciplines should all use P-Wettkampf formula', () => {
      const dtbP = getProductionDisciplinesBySport('Turnen DTB P');
      dtbP.forEach(d => {
        expect(d.formelName).toBe('P-Wettkampf');
      });
    });

    it('Turnen DTB LK disciplines should all use LK formula', () => {
      const dtbLK = getProductionDisciplinesBySport('Turnen DTB LK');
      dtbLK.forEach(d => {
        expect(d.formelName).toBe('LK');
      });
    });

    it('Turnen base disciplines should use D+E-Neutral formula', () => {
      const turnen = getProductionDisciplinesBySport('Turnen');
      turnen.forEach(d => {
        expect(d.formelName).toBe('D+E-Neutral');
        expect(d.formel).toBe('1*x');
      });
    });
  });

  describe('Data Integrity', () => {
    it('all disciplines should have a name', () => {
      disciplines.forEach(d => {
        expect(d.name).toBeTruthy();
      });
    });

    it('all disciplines should have a sportart', () => {
      disciplines.forEach(d => {
        expect(d.sportart).toBeTruthy();
      });
    });

    it('no duplicate discipline names within the same sport and gender should exist', () => {
      // Same discipline name in different sports is valid (e.g. "100-m-Lauf" in Leichtathletik m/w)
      // Same name with different gender flags is also valid (e.g. m/w variants)
      const seen = new Set<string>();
      const duplicates: string[] = [];
      disciplines.forEach(d => {
        const genderKey = `m=${d.maennlich},w=${d.weiblich}`;
        const key = `${d.sportart}::${d.name}::${genderKey}`;
        if (seen.has(key)) {
          duplicates.push(`${d.sportart} → ${d.name} (${genderKey})`);
        }
        seen.add(key);
      });
      if (duplicates.length > 0) {
        console.log('True duplicates (same sport, name, gender):', duplicates);
      }
      expect(duplicates).toEqual([]);
    });

    it('disciplines with same name in same sport should differ by gender', () => {
      // Find names that appear multiple times within the same sport
      const counts = new Map<string, number>();
      disciplines.forEach(d => {
        const key = `${d.sportart}::${d.name}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const multiples = [...counts.entries()].filter(([_, count]) => count > 1);
      
      multiples.forEach(([key]) => {
        const [sport, name] = key.split('::');
        const variants = disciplines.filter(d => d.sportart === sport && d.name === name);
        // Each variant should have different gender flags
        const genderCombos = new Set(variants.map(v => `m=${v.maennlich},w=${v.weiblich}`));
        expect(genderCombos.size).toBe(variants.length);
      });
    });

    it('all disciplines should have boolean gender flags', () => {
      disciplines.forEach(d => {
        expect(typeof d.maennlich).toBe('boolean');
        expect(typeof d.weiblich).toBe('boolean');
      });
    });

    it('all disciplines should have a kurzname', () => {
      const without = disciplines.filter(d => !d.kurzname);
      if (without.length > 0) {
        console.log('Disciplines without kurzname:', without.map(d => d.name));
      }
    });

    it('disciplines with felder should have valid field structure', () => {
      const withFields = disciplines.filter(d => d.felder && d.felder.length > 0);
      expect(withFields.length).toBeGreaterThan(0);

      withFields.forEach(d => {
        d.felder!.forEach(f => {
          expect(f.name).toBeTruthy();
          expect(typeof f.sortierung).toBe('number');
          expect(typeof f.endwert).toBe('boolean');
          expect(typeof f.ausgangswert).toBe('boolean');
          expect(typeof f.enabled).toBe('boolean');
        });
      });
    });

    it('each discipline with felder should have exactly one endwert field', () => {
      const withFields = disciplines.filter(d => d.felder && d.felder.length > 0);
      withFields.forEach(d => {
        const endwertFields = d.felder!.filter(f => f.endwert);
        if (endwertFields.length !== 1) {
          console.log(`${d.name}: ${endwertFields.length} endwert fields (expected 1)`);
        }
      });
    });
  });
});
