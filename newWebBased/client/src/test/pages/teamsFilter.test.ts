/**
 * Teams Filter Logic Tests
 * Tests the client-side filtering of teams by club and competition
 * 
 * These tests verify the pure filtering logic without rendering React components.
 * The filtering is implemented via useMemo in Teams/index.tsx.
 */

import { describe, it, expect } from 'vitest';

// --- Types (matching Teams.types.ts) ---
interface Team {
  id: number;
  name: string;
  clubId: number;
  clubName: string;
  competitionId: number;
  competitionName: string;
  number: number;
  riege: string | null;
  startNumber: number | null;
  memberCount: number;
}

// --- Pure filtering function (extracted from useMemo logic) ---
function filterTeams(
  teams: Team[],
  filterClub: string,
  filterCompetition: string
): Team[] {
  return teams.filter(team => {
    if (filterClub && team.clubId.toString() !== filterClub) return false;
    if (filterCompetition && team.competitionId.toString() !== filterCompetition) return false;
    return true;
  });
}

// --- Helper: Extract unique clubs from teams ---
function getUniqueClubs(teams: Team[]): Array<{ id: number; name: string }> {
  const clubMap = new Map<number, string>();
  teams.forEach(team => clubMap.set(team.clubId, team.clubName));
  return Array.from(clubMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- Helper: Extract unique competitions from teams ---
function getUniqueCompetitions(teams: Team[]): Array<{ id: number; name: string }> {
  const compMap = new Map<number, string>();
  teams.forEach(team => compMap.set(team.competitionId, team.competitionName));
  return Array.from(compMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ────────────────────────────────────────────────────────────
// Test Data
// ────────────────────────────────────────────────────────────
const sampleTeams: Team[] = [
  {
    id: 1, name: 'TV Beispiel - Team 1', clubId: 10, clubName: 'TV Beispiel',
    competitionId: 100, competitionName: 'AK 7/8 weiblich', number: 1,
    riege: '1', startNumber: 101, memberCount: 6
  },
  {
    id: 2, name: 'TV Beispiel - Team 2', clubId: 10, clubName: 'TV Beispiel',
    competitionId: 100, competitionName: 'AK 7/8 weiblich', number: 2,
    riege: '1', startNumber: 102, memberCount: 6
  },
  {
    id: 3, name: 'TSV Turnstadt - Team 1', clubId: 20, clubName: 'TSV Turnstadt',
    competitionId: 100, competitionName: 'AK 7/8 weiblich', number: 1,
    riege: '2', startNumber: 201, memberCount: 5
  },
  {
    id: 4, name: 'TSV Turnstadt - Team 1', clubId: 20, clubName: 'TSV Turnstadt',
    competitionId: 200, competitionName: 'AK 9/10 männlich', number: 1,
    riege: '3', startNumber: 301, memberCount: 4
  },
  {
    id: 5, name: 'SV Sportlich - Team 1', clubId: 30, clubName: 'SV Sportlich',
    competitionId: 200, competitionName: 'AK 9/10 männlich', number: 1,
    riege: '3', startNumber: 302, memberCount: 6
  },
];

// ────────────────────────────────────────────────────────────
// Filter Tests
// ────────────────────────────────────────────────────────────
describe('Teams Filter Logic', () => {
  describe('filterTeams', () => {
    it('should return all teams when no filters are set', () => {
      const result = filterTeams(sampleTeams, '', '');
      expect(result).toHaveLength(5);
    });

    it('should filter by club', () => {
      const result = filterTeams(sampleTeams, '10', '');
      expect(result).toHaveLength(2);
      expect(result.every(t => t.clubId === 10)).toBe(true);
    });

    it('should filter by competition', () => {
      const result = filterTeams(sampleTeams, '', '100');
      expect(result).toHaveLength(3);
      expect(result.every(t => t.competitionId === 100)).toBe(true);
    });

    it('should filter by both club and competition', () => {
      const result = filterTeams(sampleTeams, '20', '100');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
      expect(result[0].clubName).toBe('TSV Turnstadt');
      expect(result[0].competitionName).toBe('AK 7/8 weiblich');
    });

    it('should return empty array when no teams match', () => {
      const result = filterTeams(sampleTeams, '30', '100');
      expect(result).toHaveLength(0);
    });

    it('should handle non-existent club ID', () => {
      const result = filterTeams(sampleTeams, '999', '');
      expect(result).toHaveLength(0);
    });

    it('should handle non-existent competition ID', () => {
      const result = filterTeams(sampleTeams, '', '999');
      expect(result).toHaveLength(0);
    });

    it('should handle empty teams array', () => {
      const result = filterTeams([], '10', '100');
      expect(result).toHaveLength(0);
    });

    it('should treat empty string filter as "all"', () => {
      const result = filterTeams(sampleTeams, '', '');
      expect(result).toEqual(sampleTeams);
    });
  });

  describe('getUniqueClubs', () => {
    it('should extract unique clubs sorted alphabetically', () => {
      const clubs = getUniqueClubs(sampleTeams);
      expect(clubs).toHaveLength(3);
      expect(clubs[0].name).toBe('SV Sportlich');
      expect(clubs[1].name).toBe('TSV Turnstadt');
      expect(clubs[2].name).toBe('TV Beispiel');
    });

    it('should deduplicate clubs (TV Beispiel has 2 teams)', () => {
      const clubs = getUniqueClubs(sampleTeams);
      const tvBeispiel = clubs.filter(c => c.name === 'TV Beispiel');
      expect(tvBeispiel).toHaveLength(1);
      expect(tvBeispiel[0].id).toBe(10);
    });

    it('should return empty array for empty teams', () => {
      const clubs = getUniqueClubs([]);
      expect(clubs).toHaveLength(0);
    });
  });

  describe('getUniqueCompetitions', () => {
    it('should extract unique competitions sorted alphabetically', () => {
      const competitions = getUniqueCompetitions(sampleTeams);
      expect(competitions).toHaveLength(2);
      expect(competitions[0].name).toBe('AK 7/8 weiblich');
      expect(competitions[1].name).toBe('AK 9/10 männlich');
    });

    it('should deduplicate competitions', () => {
      const competitions = getUniqueCompetitions(sampleTeams);
      const ak78 = competitions.filter(c => c.name === 'AK 7/8 weiblich');
      expect(ak78).toHaveLength(1);
      expect(ak78[0].id).toBe(100);
    });

    it('should return empty array for empty teams', () => {
      const competitions = getUniqueCompetitions([]);
      expect(competitions).toHaveLength(0);
    });
  });

  describe('Filter reset', () => {
    it('should return all teams after clearing filters', () => {
      // First filter
      const filtered = filterTeams(sampleTeams, '10', '100');
      expect(filtered).toHaveLength(2);

      // Then clear (simulate handleClearFilters)
      const cleared = filterTeams(sampleTeams, '', '');
      expect(cleared).toHaveLength(5);
    });
  });

  describe('Edge cases', () => {
    it('should handle teams with same club in different competitions', () => {
      // TSV Turnstadt is in both competitions
      const tsvInComp100 = filterTeams(sampleTeams, '20', '100');
      expect(tsvInComp100).toHaveLength(1);
      
      const tsvInComp200 = filterTeams(sampleTeams, '20', '200');
      expect(tsvInComp200).toHaveLength(1);
      
      const tsvAll = filterTeams(sampleTeams, '20', '');
      expect(tsvAll).toHaveLength(2);
    });

    it('should handle filtering with string comparison correctly', () => {
      // clubId is a number, but filter value is a string
      const result = filterTeams(sampleTeams, '10', '');
      expect(result).toHaveLength(2);
      
      // Ensure toString() comparison works
      const resultWithExact = filterTeams(sampleTeams, '10', '100');
      expect(resultWithExact).toHaveLength(2);
    });
  });
});
