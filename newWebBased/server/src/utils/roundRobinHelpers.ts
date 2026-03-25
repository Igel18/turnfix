/**
 * Round-Robin scheduling utilities for the time-planning wizard.
 *
 * Pure functions — no Prisma / side-effects — can be unit-tested in isolation.
 *
 * Algorithm overview
 * ──────────────────
 * Given N squads and M disciplines:
 *   • Each squad is assigned a *starting discipline index* in [0, M-1].
 *   • The full rotation has M rows (rounds), so every squad visits every discipline
 *     exactly once (wrap-around via modulo).
 *   • startRound allows multiple Durchgänge to fill consecutive row-ranges in the
 *     global matrix without colliding:
 *       Durchgang 1 → rows 1 … M1
 *       Durchgang 2 → rows M1+1 … M1+M2
 */

export interface RotationCell {
  squadName: string;
  disciplineId: number;
  /** Global row index (1-based) in the combined matrix (int_runde). */
  round: number;
  /** True for the first rotation slot of this squad (bol_erstes_geraet). */
  isFirstDevice: boolean;
}

/**
 * Generate a complete round-robin rotation matrix for one Durchgang.
 *
 * @param squads           Squad names participating in this Durchgang.
 * @param disciplineIds    Ordered discipline IDs for this Durchgang (defines column order).
 * @param startAssignments Map: squadName → starting disciplineId.
 *                         Squads not listed get auto-assigned sequentially.
 * @param startRound       Row offset so Durchgänge don't overlap (default 1).
 * @returns                Flat list of cells.
 *                         Total count = squads.length × disciplineIds.length.
 */
export function generateRoundRobinMatrix(
  squads: string[],
  disciplineIds: number[],
  startAssignments: Record<string, number>,
  startRound = 1,
): RotationCell[] {
  if (squads.length === 0 || disciplineIds.length === 0) return [];

  const cells: RotationCell[] = [];
  const totalRounds = disciplineIds.length;

  squads.forEach((squadName, squadIdx) => {
    // Resolve starting index: use explicit assignment if valid, else sequential default.
    const assignedDiscId = startAssignments[squadName];
    const assignedIdx =
      assignedDiscId !== undefined ? disciplineIds.indexOf(assignedDiscId) : -1;
    const startIdx = assignedIdx >= 0 ? assignedIdx : squadIdx % totalRounds;

    for (let r = 0; r < totalRounds; r++) {
      const discIdx = (startIdx + r) % totalRounds;
      cells.push({
        squadName,
        disciplineId: disciplineIds[discIdx],
        round: startRound + r,
        isFirstDevice: r === 0,
      });
    }
  });

  return cells;
}

/**
 * Compute sequential default start assignments:
 *   squad[0] → disciplineIds[0 % M]
 *   squad[1] → disciplineIds[1 % M]
 *   …
 * Returns a map: squadName → disciplineId.
 */
export function computeDefaultStartAssignments(
  squads: string[],
  disciplineIds: number[],
): Record<string, number> {
  if (disciplineIds.length === 0) return {};
  const result: Record<string, number> = {};
  squads.forEach((name, i) => {
    result[name] = disciplineIds[i % disciplineIds.length];
  });
  return result;
}

/**
 * Returns an array of disciplineIds that are assigned to more than one squad
 * as their starting device (scheduling conflict indicator).
 */
export function getStartAssignmentConflicts(
  squads: string[],
  startAssignments: Record<string, number>,
  disciplineIds: number[],
): number[] {
  const counts: Record<number, number> = {};
  for (const squad of squads) {
    const discId = startAssignments[squad];
    if (discId !== undefined && disciplineIds.includes(discId)) {
      counts[discId] = (counts[discId] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([id]) => Number(id));
}
