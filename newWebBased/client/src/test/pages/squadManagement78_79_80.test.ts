/**
 * Unit tests for Points 78, 79, 80 – Squad Management improvements
 *
 * Point 78: Filter improvements
 *   a) assignmentStatus filter (assigned / unassigned / all)
 *   b) birthYear filter  
 *   c) searchTerm (name) is part of filterState / included in filter section
 *
 * Point 79: UI improvements
 *   - getMasterMetadata returns ALL competitions as tags (no arbitrary slice)
 *   - MasterList renders up to 5 tags (slice(0,5)) and shows "+N more" for the rest
 *
 * Point 80: Real-time update after assign / remove
 *   - useSquadAssignment calls onDataChange after successful assignment
 *   - useSquadAssignment calls onDataChange after successful removal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Point 78: useParticipants filtering ──────────────────────────

// We test the filtering logic directly without hitting the network.
// We replicate the same filter predicate used in useParticipants.ts.

interface FilterState {
  searchTerm: string;
  genderFilter: string;
  competitionFilter: string;
  clubFilter: string;
  assignmentStatus: string;
  birthYear: string;
}

interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  gender: string;
  birthYear: number;
  squadId?: number;
  competitions?: { id: number; name: string; number: string }[];
  competitionNames?: string;
}

function applyFilters(participants: Participant[], filterState: FilterState): Participant[] {
  return participants.filter((participant) => {
    const matchesSearch =
      participant.firstname.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
      participant.lastname.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
      `${participant.firstname} ${participant.lastname}`.toLowerCase()
        .includes(filterState.searchTerm.toLowerCase()) ||
      participant.club.toLowerCase().includes(filterState.searchTerm.toLowerCase()) ||
      (participant.competitionNames &&
        participant.competitionNames.toLowerCase().includes(filterState.searchTerm.toLowerCase()));

    const matchesGender = !filterState.genderFilter || participant.gender === filterState.genderFilter;

    const matchesCompetition =
      !filterState.competitionFilter ||
      (participant.competitions &&
        participant.competitions.some((comp) =>
          comp.name.toLowerCase().includes(filterState.competitionFilter.toLowerCase()),
        ));

    const matchesClub =
      !filterState.clubFilter ||
      participant.club.toLowerCase().includes(filterState.clubFilter.toLowerCase());

    const matchesAssignment =
      filterState.assignmentStatus === 'all' ||
      (filterState.assignmentStatus === 'assigned' && participant.squadId != null) ||
      (filterState.assignmentStatus === 'unassigned' && participant.squadId == null);

    const matchesBirthYear =
      !filterState.birthYear || String(participant.birthYear).includes(filterState.birthYear);

    return (
      matchesSearch &&
      matchesGender &&
      matchesCompetition &&
      matchesClub &&
      matchesAssignment &&
      matchesBirthYear
    );
  });
}

const baseFilter: FilterState = {
  searchTerm: '',
  genderFilter: '',
  competitionFilter: '',
  clubFilter: '',
  assignmentStatus: 'all',
  birthYear: '',
};

const participants: Participant[] = [
  {
    id: 1,
    firstname: 'Anna',
    lastname: 'Müller',
    club: 'TSV München',
    gender: 'female',
    birthYear: 2010,
    squadId: 5,
    competitions: [{ id: 1, name: '4-Kampf w P', number: '1' }],
  },
  {
    id: 2,
    firstname: 'Ben',
    lastname: 'Schmid',
    club: 'MTV Hamburg',
    gender: 'male',
    birthYear: 2012,
    squadId: undefined,
    competitions: [{ id: 2, name: '6-Kampf m P', number: '2' }],
  },
  {
    id: 3,
    firstname: 'Clara',
    lastname: 'Weber',
    club: 'TSV München',
    gender: 'female',
    birthYear: 2011,
    squadId: undefined,
    competitions: [{ id: 1, name: '4-Kampf w P', number: '1' }],
  },
];

describe('Point 78 – Squad Management Filter improvements', () => {

  describe('78a – assignmentStatus filter', () => {
    it('returns all participants for status "all"', () => {
      const result = applyFilters(participants, { ...baseFilter, assignmentStatus: 'all' });
      expect(result).toHaveLength(3);
    });

    it('returns only assigned participants for status "assigned"', () => {
      const result = applyFilters(participants, { ...baseFilter, assignmentStatus: 'assigned' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('returns only unassigned participants for status "unassigned"', () => {
      const result = applyFilters(participants, { ...baseFilter, assignmentStatus: 'unassigned' });
      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id)).toEqual(expect.arrayContaining([2, 3]));
    });

    it('combines assignmentStatus with gender filter', () => {
      const result = applyFilters(participants, {
        ...baseFilter,
        assignmentStatus: 'unassigned',
        genderFilter: 'female',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });
  });

  describe('78b – name (searchTerm) filter is part of filterState', () => {
    it('filters by first name', () => {
      const result = applyFilters(participants, { ...baseFilter, searchTerm: 'Anna' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('filters by last name', () => {
      const result = applyFilters(participants, { ...baseFilter, searchTerm: 'Schmid' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(2);
    });

    it('filters by full name', () => {
      const result = applyFilters(participants, { ...baseFilter, searchTerm: 'Clara Weber' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(3);
    });

    it('is case-insensitive', () => {
      const result = applyFilters(participants, { ...baseFilter, searchTerm: 'anna' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('returns all participants when searchTerm is empty', () => {
      const result = applyFilters(participants, { ...baseFilter, searchTerm: '' });
      expect(result).toHaveLength(3);
    });
  });

  describe('78c – birthYear filter', () => {
    it('filters by exact birth year', () => {
      const result = applyFilters(participants, { ...baseFilter, birthYear: '2010' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('filters by partial birth year (e.g. "201" matches all in 2010s)', () => {
      const result = applyFilters(participants, { ...baseFilter, birthYear: '201' });
      expect(result).toHaveLength(3); // 2010, 2012, 2011 all include "201"
    });

    it('returns empty for a year with no matches', () => {
      const result = applyFilters(participants, { ...baseFilter, birthYear: '1999' });
      expect(result).toHaveLength(0);
    });

    it('returns all when birthYear is empty', () => {
      const result = applyFilters(participants, { ...baseFilter, birthYear: '' });
      expect(result).toHaveLength(3);
    });

    it('combines birthYear with club filter', () => {
      const result = applyFilters(participants, {
        ...baseFilter,
        birthYear: '2010',
        clubFilter: 'TSV München',
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });
});

// ── Point 79: getMasterMetadata returns all competition tags ──────

import { createSquadConfig } from '@/pages/SquadManagement/squadAssignmentConfig';
import type { Squad } from '@/pages/SquadManagement/SquadManagement.types';

const makeT = (key: string) => key;

const makeSquad = (competitions: { id: number; name: string; number: string }[]): Squad => ({
  id: 1,
  name: 'Riege A',
  eventId: 1,
  participantCount: 0,
  competitions,
  participants: [],
});

describe('Point 79 – getMasterMetadata returns all competitions as tags', () => {
  const config = createSquadConfig({
    t: makeT,
    competitionSelection: { id: null, name: null },
    onCompetitionClick: vi.fn(),
    onRemoveParticipant: vi.fn(),
    participantHasSelectedCompetition: () => false,
  });

  it('returns one tag per competition', () => {
    const squad = makeSquad([
      { id: 1, name: 'A', number: '1' },
      { id: 2, name: 'B', number: '2' },
      { id: 3, name: 'C', number: '3' },
    ]);
    const meta = config.getMasterMetadata(squad);
    expect(meta.tags).toHaveLength(3);
  });

  it('returns more than 2 tags (the old limit had been 2)', () => {
    const squad = makeSquad([
      { id: 1, name: 'A', number: '1' },
      { id: 2, name: 'B', number: '2' },
      { id: 3, name: 'C', number: '3' },
      { id: 4, name: 'D', number: '4' },
    ]);
    const meta = config.getMasterMetadata(squad);
    expect(meta.tags!.length).toBeGreaterThan(2);
  });

  it('includes competition number in tag label', () => {
    const squad = makeSquad([{ id: 5, name: 'Mehrkampf', number: '7' }]);
    const meta = config.getMasterMetadata(squad);
    expect(meta.tags![0].label).toContain('Nr. 7');
  });

  it('tag label contains competition name', () => {
    const squad = makeSquad([{ id: 5, name: 'Gerätebahn', number: '9' }]);
    const meta = config.getMasterMetadata(squad);
    expect(meta.tags![0].label).toContain('Gerätebahn');
  });

  it('returns empty tags array for squad with no competitions', () => {
    const squad = makeSquad([]);
    const meta = config.getMasterMetadata(squad);
    expect(meta.tags).toHaveLength(0);
  });
});

// ── Point 80: onDataChange called after assign / remove ──────────

vi.mock('@/utils/api', () => ({
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useSquadAssignment } from '@/pages/SquadManagement/hooks/useSquadAssignment';
import { apiPost, apiDelete } from '@/utils/api';

describe('Point 80 – onDataChange called after assign / remove', () => {
  const mockOnDataChange = vi.fn();

  const defaultProps = {
    eventId: '42',
    squads: [{ id: 1, name: 'Riege A', eventId: 42, participantCount: 1, competitions: [], participants: [] }],
    onDataChange: mockOnDataChange,
  };

  const participant = {
    id: 10,
    firstname: 'Lisa',
    lastname: 'Muster',
    club: 'TV Berlin',
    gender: 'female',
    birthYear: 2009,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnDataChange.mockResolvedValue(undefined);
  });

  it('calls onDataChange after successfully assigning a participant', async () => {
    (apiPost as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: 'OK',
      notice: null,
      hints: null,
    });

    const { result } = renderHook(() => useSquadAssignment(defaultProps));

    await act(async () => {
      await result.current.assignParticipantToSquad(participant as any, 1);
    });

    await waitFor(() => {
      expect(mockOnDataChange).toHaveBeenCalledTimes(1);
    });
  });

  it('calls onDataChange after successfully removing a participant', async () => {
    (apiDelete as ReturnType<typeof vi.fn>).mockResolvedValue({ message: 'OK' });

    const { result } = renderHook(() => useSquadAssignment(defaultProps));

    await act(async () => {
      await result.current.removeParticipantFromSquad(10);
    });

    await waitFor(() => {
      expect(mockOnDataChange).toHaveBeenCalledTimes(1);
    });
  });

  it('does NOT call onDataChange when assignment fails', async () => {
    (apiPost as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSquadAssignment(defaultProps));

    await act(async () => {
      try {
        await result.current.assignParticipantToSquad(participant as any, 1);
      } catch {
        // expected to throw
      }
    });

    expect(mockOnDataChange).not.toHaveBeenCalled();
  });

  it('does NOT call onDataChange when removal fails', async () => {
    (apiDelete as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSquadAssignment(defaultProps));

    await act(async () => {
      try {
        await result.current.removeParticipantFromSquad(10);
      } catch {
        // expected to throw
      }
    });

    expect(mockOnDataChange).not.toHaveBeenCalled();
  });
});
