/**
 * TDD Tests for Competition Status — Discipline Percentage Calculation
 *
 * Issue #92 / #97: The Wettkampf-Status page shows 0% for all disciplines
 * because the server's `disciplines_detail` used squad-discipline entries
 * from tfx_riegen_x_disziplinen as "totalSquads", but those are only
 * populated after "Generate combinations" is clicked, and they don't
 * represent actual participant counts.
 *
 * Fix: Compute per-discipline completion from participant scores:
 *   - totalParticipants = number of participants in the competition
 *   - completedParticipants = distinct participants with a score entry
 *     (tfx_wertungen_details row) for this discipline in this competition
 *   - percentage = completedParticipants / totalParticipants * 100
 *
 * These tests cover the pure helper functions extracted from the route.
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateDisciplinePercentage,
  buildDisciplineDetails,
} from '../../src/utils/competitionStatusUtils';

describe('calculateDisciplinePercentage', () => {
  it('returns 0 when totalParticipants is 0', () => {
    expect(calculateDisciplinePercentage(0, 0)).toBe(0);
  });

  it('returns 0 when no participants have completed the discipline', () => {
    expect(calculateDisciplinePercentage(10, 0)).toBe(0);
  });

  it('returns 100 when all participants have completed the discipline', () => {
    expect(calculateDisciplinePercentage(10, 10)).toBe(100);
  });

  it('returns 50 when half participants completed', () => {
    expect(calculateDisciplinePercentage(10, 5)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    // 1/3 ≈ 33.33 → 33
    expect(calculateDisciplinePercentage(3, 1)).toBe(33);
    // 2/3 ≈ 66.67 → 67
    expect(calculateDisciplinePercentage(3, 2)).toBe(67);
  });

  it('caps at 100 when completed > total (data anomaly)', () => {
    expect(calculateDisciplinePercentage(5, 6)).toBe(100);
  });

  it('handles single participant completed', () => {
    expect(calculateDisciplinePercentage(1, 1)).toBe(100);
  });

  it('handles single participant not completed', () => {
    expect(calculateDisciplinePercentage(1, 0)).toBe(0);
  });
});

describe('buildDisciplineDetails', () => {
  const mockDisciplines = [
    { int_disziplinenid: 1, var_name: 'Boden', var_kurz1: 'BO' },
    { int_disziplinenid: 2, var_name: 'Sprung', var_kurz1: 'SP' },
  ];

  it('returns details for each discipline', () => {
    // 10 participants total, Boden: 5 completed, Sprung: 0 completed
    const completedByDiscipline = new Map<number, number>([[1, 5], [2, 0]]);
    const totalParticipants = 10;

    const result = buildDisciplineDetails(
      mockDisciplines as any[],
      completedByDiscipline,
      totalParticipants
    );

    expect(result).toHaveLength(2);

    const boden = result.find(d => d.disciplineId === 1);
    expect(boden).toBeDefined();
    expect(boden!.disciplineName).toBe('Boden');
    expect(boden!.disciplineShort).toBe('BO');
    expect(boden!.totalParticipants).toBe(10);
    expect(boden!.completedParticipants).toBe(5);
    expect(boden!.percentage).toBe(50);

    const sprung = result.find(d => d.disciplineId === 2);
    expect(sprung).toBeDefined();
    expect(sprung!.totalParticipants).toBe(10);
    expect(sprung!.completedParticipants).toBe(0);
    expect(sprung!.percentage).toBe(0);
  });

  it('handles discipline not in completedByDiscipline map (defaults to 0)', () => {
    const completedByDiscipline = new Map<number, number>(); // empty
    const result = buildDisciplineDetails(
      mockDisciplines as any[],
      completedByDiscipline,
      5
    );

    expect(result).toHaveLength(2);
    result.forEach(d => {
      expect(d.completedParticipants).toBe(0);
      expect(d.percentage).toBe(0);
      expect(d.totalParticipants).toBe(5);
    });
  });

  it('returns 100% when all participants completed every discipline', () => {
    const completedByDiscipline = new Map<number, number>([[1, 8], [2, 8]]);
    const result = buildDisciplineDetails(
      mockDisciplines as any[],
      completedByDiscipline,
      8
    );

    result.forEach(d => {
      expect(d.percentage).toBe(100);
    });
  });

  it('returns empty array when no disciplines', () => {
    const result = buildDisciplineDetails([], new Map(), 10);
    expect(result).toHaveLength(0);
  });

  it('returns 0% for all disciplines when no participants', () => {
    const completedByDiscipline = new Map<number, number>([[1, 0], [2, 0]]);
    const result = buildDisciplineDetails(
      mockDisciplines as any[],
      completedByDiscipline,
      0
    );

    result.forEach(d => {
      expect(d.percentage).toBe(0);
      expect(d.totalParticipants).toBe(0);
    });
  });
});
