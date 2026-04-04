/**
 * Standard competition ranking (1224 / Olympic ranking):
 * Participants with equal scores receive the same rank.
 * The next rank skips by the number of tied participants.
 *
 * Example: scores [100, 95, 95, 90]  →  ranks [1, 2, 2, 4]
 *
 * IMPORTANT: The input array must already be sorted in the correct direction
 * (descending for normal sports, ascending for time sports) before calling this.
 * The function compares adjacent scores assuming the first item is "best".
 */
export function assignRanks<T extends { totalScore: number }>(
  sorted: T[]
): (T & { rank: number })[] {
  let currentRank = 1;
  return sorted.map((item, i) => {
    if (i > 0 && item.totalScore !== sorted[i - 1].totalScore) {
      currentRank = i + 1;
    }
    return { ...item, rank: currentRank };
  });
}

/**
 * Computes the effective total score for a participant, applying Streichwertung
 * (drop-worst) if configured for the competition.
 *
 * Mirrors C++ result_calc.cpp: when bol_streichwertung=true, the int_anz_streich
 * lowest discipline scores are subtracted from the sum before ranking.
 *
 * @param disciplineScores  Map of discipline → score (after built-in formula applied)
 * @param dropWorstScore    Whether Streichwertung is enabled (bol_streichwertung)
 * @param dropCount         Number of lowest scores to drop (int_anz_streich)
 */
export function computeTotalScore(
  disciplineScores: Record<string, number>,
  dropWorstScore: boolean = false,
  dropCount: number = 0
): number {
  const values = Object.values(disciplineScores);
  if (!dropWorstScore || dropCount <= 0 || dropCount >= values.length) {
    return values.reduce((sum, v) => sum + v, 0);
  }
  // Sort ascending, drop the <dropCount> lowest
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.slice(dropCount).reduce((sum, v) => sum + v, 0);
}

/**
 * Sorts participants for ranking and assigns ranks.
 *
 * - Normal sports: higher totalScore = better rank (sortAscending = false)
 * - Time sports:   lower totalScore = better rank  (sortAscending = true)
 *
 * Mirrors C++ result_calc.cpp: ORDER BY + bol_sortasc flag.
 */
export function sortAndRank<T extends { totalScore: number }>(
  participants: T[],
  sortAscending: boolean = false
): (T & { rank: number })[] {
  const sorted = [...participants].sort((a, b) =>
    sortAscending ? a.totalScore - b.totalScore : b.totalScore - a.totalScore
  );
  return assignRanks(sorted);
}
