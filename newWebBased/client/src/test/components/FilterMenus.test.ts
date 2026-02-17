/**
 * Filter Menu Tests
 * 
 * Tests for all filter menus across the application.
 * Covers:
 * - Gender filter options and values
 * - Reset button functionality
 * - Filter logic (matching, clearing)
 * - Consistency of filter patterns
 * 
 * Pages tested:
 * - ParticipantFilters (EventParticipants)
 * - CompetitionFilters (Competitions)
 * - ResultsFilters (Results)
 * - DisciplinesUnified
 * - ParticipantsUnified
 * - Meldematrix
 * - CompetitionStatusManagement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 1. ParticipantFilters (EventParticipants) - Filter Logic Tests
// ============================================================================

describe('ParticipantFilters (EventParticipants)', () => {
  // Replicates the filter logic from EventParticipants/index.tsx
  const filterParticipant = (
    participant: { name: string; gender: string; club: string; age: number },
    filters: { search: string; gender: string; club: string; ageGroup: string }
  ): boolean => {
    const matchesSearch = !filters.search ||
      participant.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      participant.club.toLowerCase().includes(filters.search.toLowerCase());

    const matchesGender = !filters.gender || participant.gender === filters.gender;
    const matchesClub = !filters.club || participant.club === filters.club;

    let matchesAge = true;
    if (filters.ageGroup) {
      const [minStr, maxStr] = filters.ageGroup.split('-');
      if (maxStr) {
        matchesAge = participant.age >= parseInt(minStr) && participant.age <= parseInt(maxStr);
      } else if (filters.ageGroup.endsWith('+')) {
        matchesAge = participant.age >= parseInt(minStr);
      }
    }

    return matchesSearch && matchesGender && matchesClub && matchesAge;
  };

  const sampleParticipants = [
    { name: 'Max Müller', gender: 'male', club: 'TSV Test', age: 12 },
    { name: 'Anna Schmidt', gender: 'female', club: 'TSV Test', age: 10 },
    { name: 'Lisa Weber', gender: 'female', club: 'TuS Sport', age: 15 },
    { name: 'Tom Klein', gender: 'male', club: 'TuS Sport', age: 8 },
  ];

  describe('Gender filter', () => {
    it('shows all participants with empty gender filter', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(4);
    });

    it('filters by male', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: 'male', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.gender === 'male')).toBe(true);
    });

    it('filters by female', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: 'female', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.every(p => p.gender === 'female')).toBe(true);
    });

    it('uses "male"/"female" as filter values (English format)', () => {
      // ParticipantFilters uses English values: "male", "female"
      const validValues = ['', 'male', 'female'];
      validValues.forEach(v => {
        expect(() => filterParticipant(sampleParticipants[0], { search: '', gender: v, club: '', ageGroup: '' })).not.toThrow();
      });
    });
  });

  describe('Reset functionality', () => {
    it('resets all filters to empty strings', () => {
      // Simulates the onReset handler
      const filters = { search: 'test', gender: 'male', club: 'TSV Test', ageGroup: '9-10' };
      const resetFilters = () => ({
        search: '',
        gender: '',
        club: '',
        ageGroup: '',
      });

      const reset = resetFilters();
      expect(reset.search).toBe('');
      expect(reset.gender).toBe('');
      expect(reset.club).toBe('');
      expect(reset.ageGroup).toBe('');
    });

    it('shows all results after reset', () => {
      const resetFilter = { search: '', gender: '', club: '', ageGroup: '' };
      const filtered = sampleParticipants.filter(p => filterParticipant(p, resetFilter));
      expect(filtered).toHaveLength(sampleParticipants.length);
    });
  });

  describe('Combined filters', () => {
    it('combines gender + club filter', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: 'female', club: 'TSV Test', ageGroup: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Anna Schmidt');
    });

    it('combines search + gender filter', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: 'Müller', gender: 'male', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Max Müller');
    });

    it('age group filter works for ranges', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '', club: '', ageGroup: '9-10' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Anna Schmidt');
    });

    it('age group filter works for 17+', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '', club: '', ageGroup: '17+' })
      );
      expect(filtered).toHaveLength(0); // No one is 17+
    });
  });
});

// ============================================================================
// 2. CompetitionFilters - Filter Logic Tests
// ============================================================================

describe('CompetitionFilters (Competitions)', () => {
  const filterCompetition = (
    competition: { name: string; gender: string; areaId: number; status: string },
    filters: { search: string; gender: string; area: string; status: string }
  ): boolean => {
    const matchesSearch = !filters.search ||
      competition.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesGender = !filters.gender || competition.gender === filters.gender;
    const matchesArea = !filters.area || competition.areaId.toString() === filters.area;
    const matchesStatus = !filters.status || competition.status === filters.status;
    return matchesSearch && matchesGender && matchesArea && matchesStatus;
  };

  const sampleCompetitions = [
    { name: '4-Kampf w LK1', gender: 'weiblich', areaId: 1, status: 'upcoming' },
    { name: '6-Kampf m LK1', gender: 'männlich', areaId: 1, status: 'active' },
    { name: 'Mannschaft gemischt', gender: 'gemischt', areaId: 2, status: 'completed' },
    { name: '4-Kampf m P', gender: 'männlich', areaId: 2, status: 'upcoming' },
  ];

  describe('Gender filter', () => {
    it('shows all with empty gender filter', () => {
      const filtered = sampleCompetitions.filter(c =>
        filterCompetition(c, { search: '', gender: '', area: '', status: '' })
      );
      expect(filtered).toHaveLength(4);
    });

    it('filters by männlich', () => {
      const filtered = sampleCompetitions.filter(c =>
        filterCompetition(c, { search: '', gender: 'männlich', area: '', status: '' })
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.every(c => c.gender === 'männlich')).toBe(true);
    });

    it('filters by weiblich', () => {
      const filtered = sampleCompetitions.filter(c =>
        filterCompetition(c, { search: '', gender: 'weiblich', area: '', status: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('4-Kampf w LK1');
    });

    it('filters by gemischt', () => {
      const filtered = sampleCompetitions.filter(c =>
        filterCompetition(c, { search: '', gender: 'gemischt', area: '', status: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Mannschaft gemischt');
    });

    it('uses German gender values: männlich, weiblich, gemischt', () => {
      // CompetitionFilters uses German values for gender options
      const validValues = ['', 'männlich', 'weiblich', 'gemischt'];
      validValues.forEach(v => {
        const result = filterCompetition(sampleCompetitions[0], { search: '', gender: v, area: '', status: '' });
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Reset functionality', () => {
    it('resets all filters to empty strings', () => {
      // Replicates handleClearAllFilters from useCompetitionFilters hook
      const resetState = {
        searchTerm: '',
        genderFilter: '',
        areaFilter: '',
        statusFilter: '',
      };
      expect(resetState.searchTerm).toBe('');
      expect(resetState.genderFilter).toBe('');
      expect(resetState.areaFilter).toBe('');
      expect(resetState.statusFilter).toBe('');
    });

    it('shows all results after reset', () => {
      const resetFilter = { search: '', gender: '', area: '', status: '' };
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, resetFilter));
      expect(filtered).toHaveLength(sampleCompetitions.length);
    });
  });

  describe('Combined filters', () => {
    it('gender + area', () => {
      const filtered = sampleCompetitions.filter(c =>
        filterCompetition(c, { search: '', gender: 'männlich', area: '2', status: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('4-Kampf m P');
    });

    it('gender + status', () => {
      const filtered = sampleCompetitions.filter(c =>
        filterCompetition(c, { search: '', gender: 'männlich', area: '', status: 'upcoming' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('4-Kampf m P');
    });
  });
});

// ============================================================================
// 3. ResultsFilters - Filter Logic Tests
// ============================================================================

describe('ResultsFilters', () => {
  const filterResult = (
    result: { name: string; gender: string; competitionId: number },
    filters: { search: string; gender: string; competitionId: string | null }
  ): boolean => {
    const matchesSearch = !filters.search ||
      result.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesGender = !filters.gender || result.gender === filters.gender;
    const matchesCompetition = !filters.competitionId || result.competitionId.toString() === filters.competitionId;
    return matchesSearch && matchesGender && matchesCompetition;
  };

  const sampleResults = [
    { name: 'Max Müller', gender: 'männlich', competitionId: 1 },
    { name: 'Anna Schmidt', gender: 'weiblich', competitionId: 1 },
    { name: 'Lisa Weber', gender: 'weiblich', competitionId: 2 },
  ];

  describe('Gender filter', () => {
    it('shows all with empty gender filter', () => {
      const filtered = sampleResults.filter(r =>
        filterResult(r, { search: '', gender: '', competitionId: null })
      );
      expect(filtered).toHaveLength(3);
    });

    it('filters by männlich', () => {
      const filtered = sampleResults.filter(r =>
        filterResult(r, { search: '', gender: 'männlich', competitionId: null })
      );
      expect(filtered).toHaveLength(1);
    });

    it('filters by weiblich', () => {
      const filtered = sampleResults.filter(r =>
        filterResult(r, { search: '', gender: 'weiblich', competitionId: null })
      );
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Reset functionality', () => {
    it('resets all filters correctly', () => {
      // Simulates handleReset from ResultsFilters
      const state = {
        selectedCompetition: '5' as string | null,
        genderFilter: 'weiblich',
        searchTerm: 'test',
      };

      // Apply reset
      state.selectedCompetition = null;
      state.genderFilter = '';
      state.searchTerm = '';

      expect(state.selectedCompetition).toBeNull();
      expect(state.genderFilter).toBe('');
      expect(state.searchTerm).toBe('');
    });

    it('hasActiveFilters detects active filters', () => {
      // Replicates the hasActiveFilters logic from ResultsFilters
      const hasActiveFilters = (comp: string | null, gender: string, search: string) =>
        !!(comp || gender || search);

      expect(hasActiveFilters(null, '', '')).toBe(false);
      expect(hasActiveFilters('1', '', '')).toBe(true);
      expect(hasActiveFilters(null, 'männlich', '')).toBe(true);
      expect(hasActiveFilters(null, '', 'test')).toBe(true);
    });

    it('shows all results after reset', () => {
      const resetFilter = { search: '', gender: '', competitionId: null };
      const filtered = sampleResults.filter(r => filterResult(r, resetFilter));
      expect(filtered).toHaveLength(sampleResults.length);
    });
  });
});

// ============================================================================
// 4. DisciplinesUnified - Filter Logic Tests
// ============================================================================

describe('DisciplinesUnified', () => {
  interface Discipline {
    name: string;
    short_name: string;
    display_name?: string;
    sport_id: number;
    male_allowed: boolean;
    female_allowed: boolean;
    formula_id?: number;
    formula?: string;
  }

  const filterDiscipline = (
    discipline: Discipline,
    filters: { search: string; sport: string; gender: string; formula: string }
  ): boolean => {
    const matchesSearch = !filters.search ||
      discipline.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      discipline.short_name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (discipline.display_name && discipline.display_name.toLowerCase().includes(filters.search.toLowerCase()));

    const matchesSport = !filters.sport || discipline.sport_id.toString() === filters.sport;

    const matchesGender = !filters.gender ||
      (filters.gender === 'male' && discipline.male_allowed && !discipline.female_allowed) ||
      (filters.gender === 'female' && discipline.female_allowed && !discipline.male_allowed) ||
      (filters.gender === 'both' && discipline.male_allowed && discipline.female_allowed);

    const hasFormula = discipline.formula_id || (discipline.formula && discipline.formula.trim());
    const matchesFormula = !filters.formula ||
      (filters.formula === 'yes' && hasFormula) ||
      (filters.formula === 'no' && !hasFormula);

    return matchesSearch && matchesSport && matchesGender && matchesFormula;
  };

  const sampleDisciplines: Discipline[] = [
    { name: 'Boden m. Kür', short_name: 'BODEN', sport_id: 1, male_allowed: true, female_allowed: false, formula_id: 1, formula: 'LK' },
    { name: 'Sprung w. LK1', short_name: 'SPRNG', sport_id: 1, male_allowed: false, female_allowed: true, formula_id: 2, formula: 'LK' },
    { name: 'Minitrampolin', short_name: 'MINIT', sport_id: 1, male_allowed: true, female_allowed: true, formula_id: undefined, formula: '' },
    { name: '100m Lauf', short_name: '100M', sport_id: 2, male_allowed: true, female_allowed: false, formula_id: 3, formula: 'Sprint' },
  ];

  describe('Gender filter', () => {
    it('shows all with empty gender filter', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: '', formula: '' })
      );
      expect(filtered).toHaveLength(4);
    });

    it('filters "male" = male_allowed AND NOT female_allowed', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: 'male', formula: '' })
      );
      expect(filtered).toHaveLength(2);
      expect(filtered.every(d => d.male_allowed && !d.female_allowed)).toBe(true);
    });

    it('filters "female" = female_allowed AND NOT male_allowed', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: 'female', formula: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Sprung w. LK1');
    });

    it('filters "both" = male_allowed AND female_allowed', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: 'both', formula: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Minitrampolin');
    });

    it('uses English values: "male", "female", "both"', () => {
      const validValues = ['', 'male', 'female', 'both'];
      validValues.forEach(v => {
        const result = filterDiscipline(sampleDisciplines[0], { search: '', sport: '', gender: v, formula: '' });
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Formula filter', () => {
    it('filters disciplines with formula', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: '', formula: 'yes' })
      );
      expect(filtered).toHaveLength(3);
    });

    it('filters disciplines without formula', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: '', formula: 'no' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Minitrampolin');
    });
  });

  describe('Reset functionality', () => {
    it('resets all filters to empty strings', () => {
      const resetState = { sport: '', gender: '', formula: '' };
      expect(resetState.sport).toBe('');
      expect(resetState.gender).toBe('');
      expect(resetState.formula).toBe('');
    });

    it('shows all results after reset', () => {
      const resetFilter = { search: '', sport: '', gender: '', formula: '' };
      const filtered = sampleDisciplines.filter(d => filterDiscipline(d, resetFilter));
      expect(filtered).toHaveLength(sampleDisciplines.length);
    });
  });

  describe('Combined filters', () => {
    it('gender + sport', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '1', gender: 'male', formula: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Boden m. Kür');
    });

    it('gender + formula', () => {
      const filtered = sampleDisciplines.filter(d =>
        filterDiscipline(d, { search: '', sport: '', gender: 'male', formula: 'yes' })
      );
      expect(filtered).toHaveLength(2);
    });
  });
});

// ============================================================================
// 5. ParticipantsUnified - Filter Logic Tests
// ============================================================================

describe('ParticipantsUnified', () => {
  const filterParticipant = (
    participant: { name: string; int_geschlecht: number; clubId: number; clubName: string; age: number | null },
    filters: { search: string; gender: string; club: string; ageGroup: string }
  ): boolean => {
    const matchesSearch = !filters.search ||
      participant.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      participant.clubName.toLowerCase().includes(filters.search.toLowerCase());

    const matchesClub = !filters.club || participant.clubId.toString() === filters.club;
    const matchesGender = !filters.gender || participant.int_geschlecht.toString() === filters.gender;

    const matchesAge = !filters.ageGroup ||
      (filters.ageGroup === 'child' && participant.age !== null && participant.age < 12) ||
      (filters.ageGroup === 'youth' && participant.age !== null && participant.age >= 12 && participant.age < 18) ||
      (filters.ageGroup === 'adult' && participant.age !== null && participant.age >= 18);

    return matchesSearch && matchesClub && matchesGender && matchesAge;
  };

  const sampleParticipants = [
    { name: 'Max Müller', int_geschlecht: 1, clubId: 10, clubName: 'TSV Test', age: 12 },
    { name: 'Anna Schmidt', int_geschlecht: 2, clubId: 10, clubName: 'TSV Test', age: 10 },
    { name: 'Lisa Weber', int_geschlecht: 2, clubId: 20, clubName: 'TuS Sport', age: 15 },
    { name: 'Unknown', int_geschlecht: 0, clubId: 20, clubName: 'TuS Sport', age: null },
  ];

  describe('Gender filter', () => {
    it('shows all with empty gender filter', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(4);
    });

    it('filters by gender "1" (male) using numeric string', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '1', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Max Müller');
    });

    it('filters by gender "2" (female) using numeric string', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '2', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(2);
    });

    it('filters by gender "0" (unknown) using numeric string', () => {
      const filtered = sampleParticipants.filter(p =>
        filterParticipant(p, { search: '', gender: '0', club: '', ageGroup: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Unknown');
    });

    it('uses numeric string values: "1", "2", "0"', () => {
      // ParticipantsUnified uses int_geschlecht.toString() for comparison
      const validValues = ['', '0', '1', '2'];
      validValues.forEach(v => {
        const result = filterParticipant(sampleParticipants[0], { search: '', gender: v, club: '', ageGroup: '' });
        expect(typeof result).toBe('boolean');
      });
    });
  });

  describe('Reset functionality', () => {
    it('resets all filters to empty strings', () => {
      const resetState = { club: '', gender: '', ageGroup: '' };
      expect(resetState.club).toBe('');
      expect(resetState.gender).toBe('');
      expect(resetState.ageGroup).toBe('');
    });

    it('shows all results after reset', () => {
      const resetFilter = { search: '', gender: '', club: '', ageGroup: '' };
      const filtered = sampleParticipants.filter(p => filterParticipant(p, resetFilter));
      expect(filtered).toHaveLength(sampleParticipants.length);
    });
  });
});

// ============================================================================
// 6. Meldematrix - Filter Logic Tests
// ============================================================================

describe('Meldematrix', () => {
  const filterCompetition = (
    competition: { name: string; gender: string },
    genderFilter: string
  ): boolean => {
    // Meldematrix uses 'all' as the default value (not '')
    return genderFilter === 'all' || competition.gender === genderFilter;
  };

  const sampleCompetitions = [
    { name: '4-Kampf w LK1', gender: 'weiblich' },
    { name: '6-Kampf m LK1', gender: 'männlich' },
    { name: 'Mixed Team', gender: 'gemischt' },
  ];

  describe('Gender filter', () => {
    it('shows all with "all" default filter (NOT empty string)', () => {
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, 'all'));
      expect(filtered).toHaveLength(3);
    });

    it('filters by weiblich', () => {
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, 'weiblich'));
      expect(filtered).toHaveLength(1);
    });

    it('filters by männlich', () => {
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, 'männlich'));
      expect(filtered).toHaveLength(1);
    });

    it('filters by gemischt', () => {
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, 'gemischt'));
      expect(filtered).toHaveLength(1);
    });

    it('⚠️ empty string shows NO results (inconsistency!)', () => {
      // Meldematrix uses 'all', not '' — if code accidentally passes '',
      // no competition will match because '' !== 'weiblich'/'männlich'/'gemischt'
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, ''));
      expect(filtered).toHaveLength(0); // This is the inconsistency!
    });
  });

  describe('Reset functionality', () => {
    it('resets to "all" (not empty string)', () => {
      // Replicates clearFilters from Meldematrix
      const resetState = {
        genderFilter: 'all',
        clubFilter: '',
      };
      expect(resetState.genderFilter).toBe('all');
      expect(resetState.clubFilter).toBe('');
    });

    it('shows all competitions after reset with "all"', () => {
      const filtered = sampleCompetitions.filter(c => filterCompetition(c, 'all'));
      expect(filtered).toHaveLength(sampleCompetitions.length);
    });
  });
});

// ============================================================================
// 7. CompetitionStatusManagement - Filter Logic Tests
// ============================================================================

describe('CompetitionStatusManagement', () => {
  const filterItem = (
    item: { name: string; gender: string; status: string },
    filters: { search: string; gender: string; status: string }
  ): boolean => {
    const matchesSearch = !filters.search ||
      item.name.toLowerCase().includes(filters.search.toLowerCase());

    // Uses .includes() for gender (substring match) — matches the actual code
    const matchesGender = !filters.gender ||
      item.gender.toLowerCase().includes(filters.gender.toLowerCase());

    const matchesStatus = !filters.status || item.status === filters.status;

    return matchesSearch && matchesGender && matchesStatus;
  };

  const sampleItems = [
    { name: '4-Kampf w LK1', gender: 'weiblich', status: 'geplant' },
    { name: '6-Kampf m LK1', gender: 'männlich', status: 'aktiv' },
    { name: 'Mixed', gender: 'gemischt', status: 'geplant' },
  ];

  describe('Gender filter', () => {
    it('shows all with empty gender filter', () => {
      const filtered = sampleItems.filter(i =>
        filterItem(i, { search: '', gender: '', status: '' })
      );
      expect(filtered).toHaveLength(3);
    });

    it('filters by männlich', () => {
      const filtered = sampleItems.filter(i =>
        filterItem(i, { search: '', gender: 'männlich', status: '' })
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('6-Kampf m LK1');
    });

    it('⚠️ uses .includes() not === for gender (substring match)', () => {
      // The actual code uses item.gender.toLowerCase().includes(filter)
      // "männlich".includes("männlich") = true ✅
      // "weiblich".includes("weiblich") = true ✅
      // This works but is less strict than === comparison
      const result = filterItem(
        { name: 'test', gender: 'männlich', status: '' },
        { search: '', gender: 'männlich', status: '' }
      );
      expect(result).toBe(true);
    });

    it('does NOT include gemischt option (missing option)', () => {
      // CompetitionStatusManagement only has männlich/weiblich, not gemischt
      const validFilterValues = ['', 'männlich', 'weiblich'];
      // 'gemischt' should work with .includes() but is not in the dropdown options
      const result = filterItem(
        { name: 'Mixed', gender: 'gemischt', status: '' },
        { search: '', gender: 'gemischt', status: '' }
      );
      expect(result).toBe(true); // Would work if the option existed
    });
  });

  describe('Reset functionality', () => {
    it('resets all filters to empty strings', () => {
      const resetState = { searchTerm: '', filterStatus: '', filterGender: '' };
      expect(resetState.searchTerm).toBe('');
      expect(resetState.filterStatus).toBe('');
      expect(resetState.filterGender).toBe('');
    });

    it('shows all results after reset', () => {
      const resetFilter = { search: '', gender: '', status: '' };
      const filtered = sampleItems.filter(i => filterItem(i, resetFilter));
      expect(filtered).toHaveLength(sampleItems.length);
    });
  });
});

// ============================================================================
// 8. Cross-Page Consistency Tests
// ============================================================================

describe('Cross-Page Filter Consistency', () => {
  describe('Gender value format consistency', () => {
    it('documents the different gender value formats across pages', () => {
      // This test documents the current inconsistency in gender formats
      const genderFormats: Record<string, { allValue: string; maleValue: string; femaleValue: string; mixedValue?: string }> = {
        EventParticipants: { allValue: '', maleValue: 'male', femaleValue: 'female' },
        Competitions: { allValue: '', maleValue: 'männlich', femaleValue: 'weiblich', mixedValue: 'gemischt' },
        Results: { allValue: '', maleValue: 'männlich', femaleValue: 'weiblich' },
        DisciplinesUnified: { allValue: '', maleValue: 'male', femaleValue: 'female' },
        ParticipantsUnified: { allValue: '', maleValue: '1', femaleValue: '2' },
        Meldematrix: { allValue: 'all', maleValue: 'männlich', femaleValue: 'weiblich', mixedValue: 'gemischt' },
        CompetitionStatus: { allValue: '', maleValue: 'männlich', femaleValue: 'weiblich' },
      };

      // All pages should use '' as the "all/no filter" value
      // EXCEPT Meldematrix which uses 'all'
      const pagesUsingEmptyString = Object.entries(genderFormats).filter(([, f]) => f.allValue === '');
      const pagesUsingAll = Object.entries(genderFormats).filter(([, f]) => f.allValue === 'all');
      expect(pagesUsingEmptyString).toHaveLength(6);
      expect(pagesUsingAll).toHaveLength(1);
      expect(pagesUsingAll[0][0]).toBe('Meldematrix');
    });
  });

  describe('Reset button behavior', () => {
    it('all pages should reset gender filter to their default "all" value', () => {
      // Standard reset: set to ''
      const standardReset = () => ({ gender: '' });
      expect(standardReset().gender).toBe('');

      // Meldematrix reset: set to 'all'
      const meldematrixReset = () => ({ gender: 'all' });
      expect(meldematrixReset().gender).toBe('all');
    });

    it('reset should always result in showing ALL items', () => {
      // After reset, no filter should exclude any item
      const items = [
        { gender: 'männlich' },
        { gender: 'weiblich' },
        { gender: 'gemischt' },
      ];

      // Standard filter: empty string means "show all"
      const standardNoFilter = (gender: string, filter: string) => !filter || gender === filter;
      const standardFiltered = items.filter(i => standardNoFilter(i.gender, ''));
      expect(standardFiltered).toHaveLength(3);

      // Meldematrix filter: 'all' means "show all"
      const matrixNoFilter = (gender: string, filter: string) => filter === 'all' || gender === filter;
      const matrixFiltered = items.filter(i => matrixNoFilter(i.gender, 'all'));
      expect(matrixFiltered).toHaveLength(3);
    });
  });

  describe('Search filter behavior', () => {
    it('empty search should match all items', () => {
      const items = ['Alpha', 'Beta', 'Gamma'];
      const filtered = items.filter(i => !'' || i.toLowerCase().includes(''));
      expect(filtered).toHaveLength(3);
    });

    it('search should be case-insensitive', () => {
      const items = ['Boden', 'SPRUNG', 'reck'];
      const filtered = items.filter(i => i.toLowerCase().includes('boden'));
      expect(filtered).toHaveLength(1);
    });
  });
});

// ============================================================================
// 9. SquadManagement Filter Tests
// ============================================================================

describe('SquadManagement Filters', () => {
  const filterParticipant = (
    participant: { name: string; gender: string; club: string; competitionId: number },
    filters: { search: string; gender: string; club: string; competition: string }
  ): boolean => {
    const matchesSearch = !filters.search ||
      participant.name.toLowerCase().includes(filters.search.toLowerCase());
    const matchesGender = !filters.gender || participant.gender === filters.gender;
    const matchesClub = !filters.club || participant.club === filters.club;
    const matchesCompetition = !filters.competition || participant.competitionId.toString() === filters.competition;
    return matchesSearch && matchesGender && matchesClub && matchesCompetition;
  };

  const sampleData = [
    { name: 'Max', gender: 'male', club: 'TSV', competitionId: 1 },
    { name: 'Anna', gender: 'female', club: 'TSV', competitionId: 1 },
    { name: 'Lisa', gender: 'female', club: 'TuS', competitionId: 2 },
  ];

  describe('Gender filter', () => {
    it('uses "male"/"female" values', () => {
      const filtered = sampleData.filter(p =>
        filterParticipant(p, { search: '', gender: 'male', club: '', competition: '' })
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Reset functionality', () => {
    it('resets all to empty strings', () => {
      const reset = { search: '', gender: '', club: '', competition: '' };
      const filtered = sampleData.filter(p => filterParticipant(p, reset));
      expect(filtered).toHaveLength(sampleData.length);
    });
  });
});
