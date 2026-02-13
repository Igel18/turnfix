/**
 * Tests for useScoreValidation Hook
 * Covers: getScoreValidation, getStatusColor, getParticipantCompetitions,
 *         filteredParticipants, displayDisciplines
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScoreValidation } from '@/pages/ScoreCapture/hooks/useScoreValidation';
import type { Participant, Discipline, Competition, Status } from '@/types/ScoreCapture.types';

const makeDiscipline = (overrides: Partial<Discipline> = {}): Discipline => ({
  int_disziplinid: 1,
  var_name: 'Boden',
  attempts: 1,
  ...overrides,
});

const makeParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 1,
  firstname: 'Anna',
  lastname: 'Müller',
  club: 'TSV Musterstadt',
  clubId: 10,
  gender: 'weiblich',
  age: 14,
  birthYear: 2010,
  assignedCompetitions: [100],
  isInEvent: true,
  registrationDate: '2024-01-01',
  ...overrides,
});

const makeCompetition = (overrides: Partial<Competition> = {}): Competition => ({
  id: 100,
  name: 'WK Damen',
  event_id: 1,
  ...overrides,
});

const makeStatus = (overrides: Partial<Status> = {}): Status => ({
  int_statusid: 1,
  var_name: 'Offen',
  ary_colorcode: '255,255,0',
  bol_bogen: false,
  bol_karte: false,
  ...overrides,
});

const defaultProps = {
  disciplines: [makeDiscipline()],
  competitions: [makeCompetition()],
  statuses: [makeStatus()],
  participants: [makeParticipant()],
  activeSquad: '',
  activeDiscipline: '' as number | string | '',
  searchTerm: '',
};

describe('useScoreValidation', () => {
  // ─── displayDisciplines ──────────────────────────────────

  describe('displayDisciplines', () => {
    it('returns all disciplines when no active discipline is selected', () => {
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      expect(result.current.displayDisciplines).toHaveLength(1);
      expect(result.current.displayDisciplines[0].var_name).toBe('Boden');
    });

    it('filters to only the active discipline by id', () => {
      const disciplines = [
        makeDiscipline({ int_disziplinid: 1, var_name: 'Boden' }),
        makeDiscipline({ int_disziplinid: 2, var_name: 'Reck' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 2 })
      );
      expect(result.current.displayDisciplines).toHaveLength(1);
      expect(result.current.displayDisciplines[0].var_name).toBe('Reck');
    });

    it('filters to the active discipline by name', () => {
      const disciplines = [
        makeDiscipline({ int_disziplinid: 1, var_name: 'Boden' }),
        makeDiscipline({ int_disziplinid: 2, var_name: 'Reck' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 'Reck' })
      );
      expect(result.current.displayDisciplines).toHaveLength(1);
      expect(result.current.displayDisciplines[0].int_disziplinid).toBe(2);
    });

    it('returns empty array when disciplines is not an array', () => {
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines: null as any })
      );
      expect(result.current.displayDisciplines).toEqual([]);
    });
  });

  // ─── filteredParticipants ─────────────────────────────────

  describe('filteredParticipants', () => {
    it('returns all participants when no filters are active', () => {
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      expect(result.current.filteredParticipants).toHaveLength(1);
    });

    it('filters by search term matching firstname', () => {
      const participants = [
        makeParticipant({ id: 1, firstname: 'Anna', lastname: 'Müller' }),
        makeParticipant({ id: 2, firstname: 'Max', lastname: 'Schmidt' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, participants, searchTerm: 'ann' })
      );
      expect(result.current.filteredParticipants).toHaveLength(1);
      expect(result.current.filteredParticipants[0].firstname).toBe('Anna');
    });

    it('filters by search term matching lastname', () => {
      const participants = [
        makeParticipant({ id: 1, firstname: 'Anna', lastname: 'Müller' }),
        makeParticipant({ id: 2, firstname: 'Max', lastname: 'Schmidt' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, participants, searchTerm: 'schmi' })
      );
      expect(result.current.filteredParticipants).toHaveLength(1);
      expect(result.current.filteredParticipants[0].firstname).toBe('Max');
    });

    it('filters by search term matching club', () => {
      const participants = [
        makeParticipant({ id: 1, club: 'TSV Musterstadt' }),
        makeParticipant({ id: 2, club: 'SV Testdorf' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, participants, searchTerm: 'testdorf' })
      );
      expect(result.current.filteredParticipants).toHaveLength(1);
      expect(result.current.filteredParticipants[0].club).toBe('SV Testdorf');
    });

    it('filters by search term matching startNumber', () => {
      const participants = [
        makeParticipant({ id: 1, startNumber: 42 }),
        makeParticipant({ id: 2, startNumber: 99 }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, participants, searchTerm: '42' })
      );
      expect(result.current.filteredParticipants).toHaveLength(1);
      expect(result.current.filteredParticipants[0].startNumber).toBe(42);
    });

    it('filters by squad name', () => {
      const participants = [
        makeParticipant({ id: 1, squad_name: 'Riege A' }),
        makeParticipant({ id: 2, squad_name: 'Riege B' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, participants, activeSquad: 'Riege A' })
      );
      expect(result.current.filteredParticipants).toHaveLength(1);
      expect(result.current.filteredParticipants[0].squad_name).toBe('Riege A');
    });

    it('combines search term and squad filter', () => {
      const participants = [
        makeParticipant({ id: 1, firstname: 'Anna', squad_name: 'Riege A' }),
        makeParticipant({ id: 2, firstname: 'Anna', squad_name: 'Riege B' }),
        makeParticipant({ id: 3, firstname: 'Max', squad_name: 'Riege A' }),
      ];
      const { result } = renderHook(() =>
        useScoreValidation({
          ...defaultProps,
          participants,
          activeSquad: 'Riege A',
          searchTerm: 'anna',
        })
      );
      expect(result.current.filteredParticipants).toHaveLength(1);
      expect(result.current.filteredParticipants[0].id).toBe(1);
    });

    it('returns empty array when participants is not an array', () => {
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, participants: null as any })
      );
      expect(result.current.filteredParticipants).toEqual([]);
    });
  });

  // ─── getScoreValidation ──────────────────────────────────

  describe('getScoreValidation', () => {
    it('returns valid for discipline without maxScore', () => {
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      const validation = result.current.getScoreValidation(1, '8.5');
      expect(validation.isValid).toBe(true);
    });

    it('returns valid for score within maxScore', () => {
      const disciplines = [makeDiscipline({ int_disziplinid: 1, maxScore: 10 })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 1 })
      );
      const validation = result.current.getScoreValidation(1, '8.5');
      expect(validation.isValid).toBe(true);
    });

    it('returns invalid for score exceeding maxScore', () => {
      const disciplines = [makeDiscipline({ int_disziplinid: 1, maxScore: 10 })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 1 })
      );
      const validation = result.current.getScoreValidation(1, '12.5');
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('10.00');
      expect(validation.maxScore).toBe(10);
    });

    it('returns valid for empty score value', () => {
      const disciplines = [makeDiscipline({ int_disziplinid: 1, maxScore: 10 })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 1 })
      );
      const validation = result.current.getScoreValidation(1, '');
      expect(validation.isValid).toBe(true);
    });

    it('returns valid for NaN score value', () => {
      const disciplines = [makeDiscipline({ int_disziplinid: 1, maxScore: 10 })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 1 })
      );
      const validation = result.current.getScoreValidation(1, 'abc');
      expect(validation.isValid).toBe(true);
    });

    it('returns valid when discipline not found', () => {
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      const validation = result.current.getScoreValidation(999, '8.5');
      expect(validation.isValid).toBe(true);
    });

    it('returns valid when maxScore is zero', () => {
      const disciplines = [makeDiscipline({ int_disziplinid: 1, maxScore: 0 })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, disciplines, activeDiscipline: 1 })
      );
      const validation = result.current.getScoreValidation(1, '5');
      expect(validation.isValid).toBe(true);
    });
  });

  // ─── getStatusColor ───────────────────────────────────────

  describe('getStatusColor', () => {
    it('returns yellow for status with yellow color code', () => {
      const statuses = [makeStatus({ int_statusid: 1, ary_colorcode: '255,255,0' })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, statuses })
      );
      expect(result.current.getStatusColor(1)).toBe('bg-yellow-100 text-yellow-800');
    });

    it('returns red for status with red color code', () => {
      const statuses = [makeStatus({ int_statusid: 2, ary_colorcode: '255,0,0' })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, statuses })
      );
      expect(result.current.getStatusColor(2)).toBe('bg-red-100 text-red-800');
    });

    it('returns green for status with green color code', () => {
      const statuses = [makeStatus({ int_statusid: 3, ary_colorcode: '0,255,0' })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, statuses })
      );
      expect(result.current.getStatusColor(3)).toBe('bg-green-100 text-green-800');
    });

    it('returns blue for status with blue color code', () => {
      const statuses = [makeStatus({ int_statusid: 4, ary_colorcode: '0,0,255' })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, statuses })
      );
      expect(result.current.getStatusColor(4)).toBe('bg-blue-100 text-blue-800');
    });

    it('returns gray for unknown status id', () => {
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      expect(result.current.getStatusColor(999)).toBe('bg-gray-100 text-gray-800');
    });

    it('returns gray for unrecognized color code', () => {
      const statuses = [makeStatus({ int_statusid: 5, ary_colorcode: '128,128,128' })];
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, statuses })
      );
      expect(result.current.getStatusColor(5)).toBe('bg-gray-100 text-gray-800');
    });
  });

  // ─── getParticipantCompetitions ────────────────────────────

  describe('getParticipantCompetitions', () => {
    it('returns competition names for assigned competitions', () => {
      const competitions = [
        makeCompetition({ id: 100, name: 'WK Damen' }),
        makeCompetition({ id: 200, name: 'WK Herren' }),
      ];
      const participant = makeParticipant({ assignedCompetitions: [100, 200] });
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, competitions })
      );
      const names = result.current.getParticipantCompetitions(participant);
      expect(names).toEqual(['WK Damen', 'WK Herren']);
    });

    it('returns empty array when participant has no assigned competitions', () => {
      const participant = makeParticipant({ assignedCompetitions: [] });
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      expect(result.current.getParticipantCompetitions(participant)).toEqual([]);
    });

    it('returns fallback name when competition not found', () => {
      const participant = makeParticipant({ assignedCompetitions: [999] });
      const { result } = renderHook(() => useScoreValidation(defaultProps));
      const names = result.current.getParticipantCompetitions(participant);
      expect(names).toEqual(['Competition 999']);
    });

    it('uses var_name if name is missing', () => {
      const competitions = [
        makeCompetition({ id: 100, name: '', var_name: 'Wettkampf A' }),
      ];
      const participant = makeParticipant({ assignedCompetitions: [100] });
      const { result } = renderHook(() =>
        useScoreValidation({ ...defaultProps, competitions })
      );
      const names = result.current.getParticipantCompetitions(participant);
      expect(names).toEqual(['Wettkampf A']);
    });
  });
});
