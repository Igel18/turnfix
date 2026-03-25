/**
 * Unit tests — roundRobinHelpers.ts
 *
 * Tests for the pure round-robin scheduling functions used by the Time Planning Wizard.
 */

import {
  generateRoundRobinMatrix,
  computeDefaultStartAssignments,
  getStartAssignmentConflicts,
  type RotationCell,
} from '../../src/utils/roundRobinHelpers';

// ── generateRoundRobinMatrix ──────────────────────────────────────────────────

describe('generateRoundRobinMatrix', () => {
  it('returns empty array for zero squads', () => {
    expect(generateRoundRobinMatrix([], [1, 2, 3], {}, 1)).toEqual([]);
  });

  it('returns empty array for zero disciplines', () => {
    expect(generateRoundRobinMatrix(['A', 'B'], [], {}, 1)).toEqual([]);
  });

  it('3 squads × 3 disciplines with sequential default starts', () => {
    const squads = ['R01', 'R02', 'R03'];
    const disciplines = [10, 20, 30];
    const startAssignments = { R01: 10, R02: 20, R03: 30 };

    const cells = generateRoundRobinMatrix(squads, disciplines, startAssignments, 1);

    expect(cells).toHaveLength(9); // 3 × 3

    // Round 1: each squad at their starting discipline (all have isFirstDevice=true)
    expectCell(cells, 'R01', 10, 1, true);
    expectCell(cells, 'R02', 20, 1, true);
    expectCell(cells, 'R03', 30, 1, true);

    // Round 2: each squad advances +1
    expectCell(cells, 'R01', 20, 2, false);
    expectCell(cells, 'R02', 30, 2, false);
    expectCell(cells, 'R03', 10, 2, false);

    // Round 3: each squad advances +1 again (wrap-around)
    expectCell(cells, 'R01', 30, 3, false);
    expectCell(cells, 'R02', 10, 3, false);
    expectCell(cells, 'R03', 20, 3, false);
  });

  it('3 squads × 4 disciplines — all squads visit all disciplines', () => {
    const squads = ['A', 'B', 'C'];
    const disciplines = [1, 2, 3, 4];
    const startAssignments = { A: 1, B: 2, C: 3 };

    const cells = generateRoundRobinMatrix(squads, disciplines, startAssignments, 1);

    expect(cells).toHaveLength(12); // 3 × 4

    // Round 1 (all squads at first rotation slot → isFirstDevice=true)
    expectCell(cells, 'A', 1, 1, true);
    expectCell(cells, 'B', 2, 1, true);
    expectCell(cells, 'C', 3, 1, true);

    // Round 4 (wrap-around): A@4, B@1, C@2
    expectCell(cells, 'A', 4, 4, false);
    expectCell(cells, 'B', 1, 4, false);
    expectCell(cells, 'C', 2, 4, false);
  });

  it('4 squads × 3 disciplines — totalRounds = 3', () => {
    const squads = ['A', 'B', 'C', 'D'];
    const disciplines = [10, 20, 30];
    const startAssignments = { A: 10, B: 20, C: 30, D: 10 };

    const cells = generateRoundRobinMatrix(squads, disciplines, startAssignments, 1);

    expect(cells).toHaveLength(12); // 4 × 3 rounds
    expect(Math.max(...cells.map(c => c.round))).toBe(3);
  });

  it('respects startRound offset for multi-Durchgang scenarios', () => {
    const squads = ['X', 'Y'];
    const disciplines = [5, 6];
    const starts = { X: 5, Y: 6 };

    const cells = generateRoundRobinMatrix(squads, disciplines, starts, 5);

    expect(cells.every(c => c.round >= 5)).toBe(true);
    expectCell(cells, 'X', 5, 5, true);
    expectCell(cells, 'Y', 6, 5, true);   // Y also starts at round 5 — isFirstDevice=true
    expectCell(cells, 'X', 6, 6, false);
    expectCell(cells, 'Y', 5, 6, false);
  });

  it('auto-assigns missing squads sequentially', () => {
    const squads = ['P', 'Q'];
    const disciplines = [100, 200];
    // No start assignments provided → default sequential assignment
    const cells = generateRoundRobinMatrix(squads, disciplines, {}, 1);

    expect(cells).toHaveLength(4);
    // P defaults to disciplines[0]=100, Q defaults to disciplines[1]=200 (both at first slot)
    expectCell(cells, 'P', 100, 1, true);
    expectCell(cells, 'Q', 200, 1, true);
  });

  it('isFirstDevice is true only for round = startRound per squad', () => {
    const squads = ['S1', 'S2', 'S3'];
    const disciplines = [1, 2, 3];
    const cells = generateRoundRobinMatrix(squads, disciplines, {}, 1);

    const firstDeviceCells = cells.filter(c => c.isFirstDevice);
    expect(firstDeviceCells).toHaveLength(squads.length);

    // Each squad has exactly one isFirstDevice cell
    for (const squad of squads) {
      const squadFirst = firstDeviceCells.filter(c => c.squadName === squad);
      expect(squadFirst).toHaveLength(1);
      expect(squadFirst[0].round).toBe(1); // startRound = 1
    }
  });
});

// ── computeDefaultStartAssignments ──────────────────────────────────────────

describe('computeDefaultStartAssignments', () => {
  it('distributes squads sequentially across disciplines', () => {
    const result = computeDefaultStartAssignments(['A', 'B', 'C'], [10, 20, 30]);
    expect(result).toEqual({ A: 10, B: 20, C: 30 });
  });

  it('wraps around when there are more squads than disciplines', () => {
    const result = computeDefaultStartAssignments(['A', 'B', 'C', 'D'], [10, 20]);
    expect(result).toEqual({ A: 10, B: 20, C: 10, D: 20 });
  });

  it('returns empty object for empty disciplines', () => {
    expect(computeDefaultStartAssignments(['A', 'B'], [])).toEqual({});
  });

  it('returns empty object for empty squads', () => {
    expect(computeDefaultStartAssignments([], [10, 20])).toEqual({});
  });
});

// ── getStartAssignmentConflicts ──────────────────────────────────────────────

describe('getStartAssignmentConflicts', () => {
  it('returns empty array when no conflicts', () => {
    const squads = ['A', 'B', 'C'];
    const assignments = { A: 10, B: 20, C: 30 };
    const disciplines = [10, 20, 30];
    expect(getStartAssignmentConflicts(squads, assignments, disciplines)).toEqual([]);
  });

  it('detects a single conflict (two squads same start)', () => {
    const squads = ['A', 'B', 'C'];
    const assignments = { A: 10, B: 10, C: 30 };
    const disciplines = [10, 20, 30];
    const conflicts = getStartAssignmentConflicts(squads, assignments, disciplines);
    expect(conflicts).toContain(10);
    expect(conflicts).toHaveLength(1);
  });

  it('detects multiple conflicts', () => {
    const squads = ['A', 'B', 'C', 'D'];
    const assignments = { A: 10, B: 10, C: 20, D: 20 };
    const disciplines = [10, 20, 30];
    const conflicts = getStartAssignmentConflicts(squads, assignments, disciplines);
    expect(conflicts).toHaveLength(2);
    expect(conflicts).toContain(10);
    expect(conflicts).toContain(20);
  });

  it('ignores assignments to disciplines not in the list', () => {
    const squads = ['A', 'B'];
    const assignments = { A: 99, B: 99 }; // 99 not in disciplines
    const disciplines = [10, 20];
    expect(getStartAssignmentConflicts(squads, assignments, disciplines)).toEqual([]);
  });
});

// ── helper ──────────────────────────────────────────────────────────────────

function expectCell(
  cells: RotationCell[],
  squadName: string,
  disciplineId: number,
  round: number,
  isFirstDevice: boolean,
) {
  const match = cells.find(
    c =>
      c.squadName === squadName &&
      c.disciplineId === disciplineId &&
      c.round === round,
  );
  expect(match).toBeDefined();
  expect(match!.isFirstDevice).toBe(isFirstDevice);
}
