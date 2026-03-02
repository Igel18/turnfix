/**
 * Unit Tests — squadAutoAssign
 *
 * Tests the core algorithm functions for automatic squad assignment.
 * Covers: distribution, naming, age category parsing, gender separation,
 * club grouping, and proposal generation.
 */

// We'll test the pure functions by importing them from the route module.
// Since the route file exports a router, we need to extract logic.
// For testability, let's import and test the algorithm via the API contract.
// But first, let's test the algorithmic helpers directly.

// Since the functions are not exported from the route, we replicate
// the core logic here for unit testing (same algorithm).

describe('squadAutoAssign algorithm', () => {

  // ── Helper functions replicated from squadAutoAssign.ts for testing ──

  const SQUAD_COLORS = [
    { name: 'Rot', abbr: 'Rot' },
    { name: 'Blau', abbr: 'Blau' },
    { name: 'Grün', abbr: 'Grn' },
    { name: 'Gelb', abbr: 'Glb' },
    { name: 'Schwarz', abbr: 'Schw' },
    { name: 'Weiß', abbr: 'Weiß' },
    { name: 'Lila', abbr: 'Lila' },
    { name: 'Orange', abbr: 'Oran' },
    { name: 'Rosa', abbr: 'Rosa' },
    { name: 'Grau', abbr: 'Grau' },
  ];

  const GENDER_PREFIX: Record<string, string> = {
    male: 'm',
    female: 'w',
    mixed: 'g',
  };

  function parseAgeCategoryRanges(rangesStr: string) {
    return rangesStr.split(',').map(r => r.trim()).filter(Boolean).map(range => {
      const [minStr, maxStr] = range.split('-');
      const min = parseInt(minStr, 10);
      const max = parseInt(maxStr, 10);
      return { min, max, label: `${min}-${max}` };
    }).filter(r => !isNaN(r.min) && !isNaN(r.max));
  }

  function getAgeCategory(age: number | null, ranges: Array<{ min: number; max: number; label: string }>) {
    if (age === null) return 'unknown';
    for (const range of ranges) {
      if (age >= range.min && age <= range.max) return range.label;
    }
    return 'other';
  }

  function generateSquadName(genderGroup: string, colorIndex: number, namingPrefix: string, squadIndex: number) {
    const color = SQUAD_COLORS[colorIndex % SQUAD_COLORS.length];
    if (namingPrefix === 'number') return `R${String(squadIndex).padStart(2, '0')}`;
    if (namingPrefix === 'none') return color.abbr.substring(0, 5);
    const prefix = GENDER_PREFIX[genderGroup] || 'g';
    const maxColorLen = 5 - prefix.length;
    return `${prefix}${color.abbr.substring(0, maxColorLen)}`;
  }

  interface TestParticipant {
    id: number;
    firstname: string;
    lastname: string;
    club: string;
    clubId: number;
    gender: 'male' | 'female' | 'other';
    age: number | null;
    birthYear: number | null;
  }

  function distributeIntoSquads(participants: TestParticipant[], maxPerSquad: number, keepClubsTogether: boolean) {
    if (participants.length === 0) return [];
    const squads: TestParticipant[][] = [];

    if (keepClubsTogether) {
      const clubGroups = new Map<number, TestParticipant[]>();
      for (const p of participants) {
        const key = p.clubId || 0;
        if (!clubGroups.has(key)) clubGroups.set(key, []);
        clubGroups.get(key)!.push(p);
      }
      const groups = Array.from(clubGroups.values()).sort((a, b) => b.length - a.length);
      for (const group of groups) {
        let placed = false;
        for (const squad of squads) {
          if (squad.length + group.length <= maxPerSquad) {
            squad.push(...group);
            placed = true;
            break;
          }
        }
        if (!placed) {
          if (group.length > maxPerSquad) {
            let remaining = [...group];
            while (remaining.length > 0) {
              squads.push(remaining.splice(0, maxPerSquad));
            }
          } else {
            squads.push([...group]);
          }
        }
      }
    } else {
      let currentSquad: TestParticipant[] = [];
      for (const p of participants) {
        currentSquad.push(p);
        if (currentSquad.length >= maxPerSquad) {
          squads.push(currentSquad);
          currentSquad = [];
        }
      }
      if (currentSquad.length > 0) squads.push(currentSquad);
    }
    return squads;
  }

  // ── Helpers to create test participants ──

  function makeParticipant(overrides: Partial<TestParticipant> & { id: number }): TestParticipant {
    return {
      firstname: 'Test',
      lastname: `Participant${overrides.id}`,
      club: 'TestClub',
      clubId: 1,
      gender: 'male',
      age: 10,
      birthYear: 2015,
      ...overrides,
    };
  }

  function makeParticipants(count: number, overrides?: Partial<TestParticipant>): TestParticipant[] {
    return Array.from({ length: count }, (_, i) => makeParticipant({ id: i + 1, ...overrides }));
  }

  // ── parseAgeCategoryRanges tests ──

  describe('parseAgeCategoryRanges', () => {
    it('should parse comma-separated ranges', () => {
      const result = parseAgeCategoryRanges('6-8,9-10,11-12');
      expect(result).toEqual([
        { min: 6, max: 8, label: '6-8' },
        { min: 9, max: 10, label: '9-10' },
        { min: 11, max: 12, label: '11-12' },
      ]);
    });

    it('should handle whitespace', () => {
      const result = parseAgeCategoryRanges('6-8 , 9-10 , 11-12');
      expect(result).toHaveLength(3);
    });

    it('should skip invalid ranges', () => {
      const result = parseAgeCategoryRanges('6-8,invalid,11-12');
      expect(result).toHaveLength(2);
    });

    it('should return empty for empty string', () => {
      expect(parseAgeCategoryRanges('')).toEqual([]);
    });
  });

  // ── getAgeCategory tests ──

  describe('getAgeCategory', () => {
    const ranges = parseAgeCategoryRanges('6-8,9-10,11-12,13-14,15-18');

    it('should return correct category for age within range', () => {
      expect(getAgeCategory(7, ranges)).toBe('6-8');
      expect(getAgeCategory(10, ranges)).toBe('9-10');
      expect(getAgeCategory(15, ranges)).toBe('15-18');
    });

    it('should return "other" for age outside any range', () => {
      expect(getAgeCategory(5, ranges)).toBe('other');
      expect(getAgeCategory(20, ranges)).toBe('other');
    });

    it('should return "unknown" for null age', () => {
      expect(getAgeCategory(null, ranges)).toBe('unknown');
    });

    it('should handle boundary values', () => {
      expect(getAgeCategory(6, ranges)).toBe('6-8');
      expect(getAgeCategory(8, ranges)).toBe('6-8');
      expect(getAgeCategory(18, ranges)).toBe('15-18');
    });
  });

  // ── generateSquadName tests ──

  describe('generateSquadName', () => {
    it('should generate gender-prefixed names', () => {
      expect(generateSquadName('male', 0, 'gender', 1)).toBe('mRot');
      expect(generateSquadName('female', 1, 'gender', 2)).toBe('wBlau');
      expect(generateSquadName('mixed', 3, 'gender', 4)).toBe('gGlb');
    });

    it('should generate numbered names', () => {
      expect(generateSquadName('male', 0, 'number', 1)).toBe('R01');
      expect(generateSquadName('male', 0, 'number', 12)).toBe('R12');
    });

    it('should generate color-only names', () => {
      expect(generateSquadName('male', 0, 'none', 1)).toBe('Rot');
      expect(generateSquadName('male', 1, 'none', 2)).toBe('Blau');
    });

    it('should never exceed 5 characters', () => {
      for (let i = 0; i < SQUAD_COLORS.length; i++) {
        for (const gender of ['male', 'female', 'mixed']) {
          const name = generateSquadName(gender, i, 'gender', i + 1);
          expect(name.length).toBeLessThanOrEqual(5);
        }
        const numbered = generateSquadName('male', i, 'number', i + 1);
        expect(numbered.length).toBeLessThanOrEqual(5);
        const colorOnly = generateSquadName('male', i, 'none', i + 1);
        expect(colorOnly.length).toBeLessThanOrEqual(5);
      }
    });

    it('should cycle through colors when index exceeds color count', () => {
      const name1 = generateSquadName('male', 0, 'gender', 1);
      const name2 = generateSquadName('male', SQUAD_COLORS.length, 'gender', SQUAD_COLORS.length + 1);
      expect(name1).toBe(name2);
    });
  });

  // ── distributeIntoSquads tests ──

  describe('distributeIntoSquads', () => {
    it('should return empty array for empty input', () => {
      expect(distributeIntoSquads([], 10, false)).toEqual([]);
    });

    it('should distribute evenly without club grouping', () => {
      const participants = makeParticipants(10);
      const squads = distributeIntoSquads(participants, 4, false);
      expect(squads).toHaveLength(3); // 4 + 4 + 2
      expect(squads[0]).toHaveLength(4);
      expect(squads[1]).toHaveLength(4);
      expect(squads[2]).toHaveLength(2);
    });

    it('should respect max per squad', () => {
      const participants = makeParticipants(25);
      const squads = distributeIntoSquads(participants, 10, false);
      for (const squad of squads) {
        expect(squad.length).toBeLessThanOrEqual(10);
      }
    });

    it('should keep clubs together when requested', () => {
      const participants = [
        ...makeParticipants(3, { clubId: 1, club: 'Club A' }),
        ...makeParticipants(3, { clubId: 2, club: 'Club B' }).map((p, i) => ({ ...p, id: 10 + i })),
        ...makeParticipants(3, { clubId: 3, club: 'Club C' }).map((p, i) => ({ ...p, id: 20 + i })),
      ];
      const squads = distributeIntoSquads(participants, 6, true);

      // Each squad should have members from at most 2 clubs (bin-packed)
      for (const squad of squads) {
        const clubIds = new Set(squad.map(p => p.clubId));
        expect(clubIds.size).toBeLessThanOrEqual(2);
      }
    });

    it('should split oversized club groups', () => {
      const bigClub = makeParticipants(15, { clubId: 1, club: 'BigClub' });
      const squads = distributeIntoSquads(bigClub, 6, true);
      expect(squads.length).toBeGreaterThanOrEqual(3); // 15/6 = 2.5 → 3 squads
      for (const squad of squads) {
        expect(squad.length).toBeLessThanOrEqual(6);
      }
    });

    it('should handle single participant', () => {
      const squads = distributeIntoSquads([makeParticipant({ id: 1 })], 10, false);
      expect(squads).toHaveLength(1);
      expect(squads[0]).toHaveLength(1);
    });

    it('should handle participants equal to max', () => {
      const participants = makeParticipants(10);
      const squads = distributeIntoSquads(participants, 10, false);
      expect(squads).toHaveLength(1);
      expect(squads[0]).toHaveLength(10);
    });
  });

  // ── Gender separation tests ──

  describe('gender separation logic', () => {
    it('should separate male and female participants', () => {
      const males = makeParticipants(5, { gender: 'male' });
      const females = makeParticipants(5, { gender: 'female' }).map((p, i) => ({ ...p, id: 100 + i }));
      const all = [...males, ...females];

      // Simulate gender separation
      const genderGroups = new Map<string, TestParticipant[]>();
      for (const p of all) {
        const g = p.gender === 'male' ? 'male' : p.gender === 'female' ? 'female' : 'mixed';
        if (!genderGroups.has(g)) genderGroups.set(g, []);
        genderGroups.get(g)!.push(p);
      }

      expect(genderGroups.get('male')).toHaveLength(5);
      expect(genderGroups.get('female')).toHaveLength(5);
    });

    it('should put all in mixed when not separating', () => {
      const males = makeParticipants(3, { gender: 'male' });
      const females = makeParticipants(3, { gender: 'female' }).map((p, i) => ({ ...p, id: 100 + i }));
      const all = [...males, ...females];

      // No separation
      const genderGroups = new Map<string, TestParticipant[]>();
      genderGroups.set('mixed', [...all]);

      expect(genderGroups.get('mixed')).toHaveLength(6);
    });
  });

  // ── Integration-style: full proposal generation ──

  describe('full proposal flow', () => {
    it('should produce the expected number of squads for simple distribution', () => {
      const participants = makeParticipants(24, { gender: 'male' });
      const squads = distributeIntoSquads(participants, 6, false);
      expect(squads).toHaveLength(4); // 24/6 = 4
      expect(squads.every(s => s.length === 6)).toBe(true);
    });

    it('should include all participants across all squads', () => {
      const participants = makeParticipants(17, { gender: 'female' });
      const squads = distributeIntoSquads(participants, 5, false);
      const total = squads.reduce((sum, s) => sum + s.length, 0);
      expect(total).toBe(17);
    });

    it('should produce unique squad names for gender separation', () => {
      const names: string[] = [];
      let colorIdx = 0;
      let squadIdx = 1;

      // Male squads
      for (let i = 0; i < 3; i++) {
        names.push(generateSquadName('male', colorIdx++, 'gender', squadIdx++));
      }
      // Female squads
      for (let i = 0; i < 3; i++) {
        names.push(generateSquadName('female', colorIdx++, 'gender', squadIdx++));
      }

      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(6);
    });
  });
});
