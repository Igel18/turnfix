/**
 * Standard competition ranking (1224 / Olympic ranking):
 * Participants with equal scores receive the same rank.
 * The next rank skips by the number of tied participants.
 *
 * Example: scores [100, 95, 95, 90]  →  ranks [1, 2, 2, 4]
 */
export function assignRanks<T extends { totalScore: number }>(
  sortedDesc: T[]
): (T & { rank: number })[] {
  let currentRank = 1;
  return sortedDesc.map((item, i) => {
    if (i > 0 && item.totalScore < sortedDesc[i - 1].totalScore) {
      currentRank = i + 1;
    }
    return { ...item, rank: currentRank };
  });
}
