/**
 * Ranking Utilities (Shared)
 *
 * SINGLE SOURCE OF TRUTH for all competition ranking computations.
 * Used by client, server, and jury-portal.
 * Do NOT duplicate this logic. All three projects import from @turnfix/shared.
 *
 * Mirrors the C++ result_calc.cpp ranking logic:
 *   - bol_sortasc controls sort direction (false = highest-score-first)
 *   - bol_streichwertung + int_anz_streich control Streichwertung (drop-worst)
 *   - Olympic / 1224 ranking: equal scores share a rank, next rank skips
 */

// ---------------------------------------------------------------------------
// assignRanks
// ---------------------------------------------------------------------------

const RANK_TIE_TOLERANCE = 1e-9;

/**
 * Assigns 1224 (Olympic / standard competition) ranks to a pre-sorted array.
 *
 * Participants with equal `totalScore` receive the same rank.
 * The next rank is the overall position, skipping the tied slots.
 *
 * Example: scores [100, 95, 95, 90] → ranks [1, 2, 2, 4]
 *
 * IMPORTANT: The input array MUST already be sorted in the correct direction
 * (descending for normal sports, ascending for time sports) before calling.
 * The function compares adjacent scores assuming the first item is "best".
 *
 * @param sorted  Pre-sorted participants (does not mutate)
 * @returns       New array with `rank` added to each element
 */
export function assignRanks<T extends { totalScore: number }>(
  sorted: T[]
): (T & { rank: number })[] {
  let currentRank = 1;
  return sorted.map((item, i) => {
    if (i > 0 && Math.abs(item.totalScore - sorted[i - 1].totalScore) > RANK_TIE_TOLERANCE) {
      currentRank = i + 1;
    }
    return { ...item, rank: currentRank };
  });
}

// ---------------------------------------------------------------------------
// computeTotalScore
// ---------------------------------------------------------------------------

/**
 * Computes the effective total score for one participant, applying Streichwertung
 * (drop-worst disciplines) if configured for the competition.
 *
 * Mirrors C++ result_calc.cpp:
 *   When `bol_streichwertung = true`, the `int_anz_streich` lowest discipline
 *   scores are excluded from the sum before ranking.
 *
 * Safety guard: if `dropCount >= number of disciplines`, the full sum is returned
 * (we never drop everything — that would erase all scores).
 *
 * @param disciplineScores  Map of discipline → score (after any formula applied)
 * @param dropWorstScore    Whether Streichwertung is enabled  (bol_streichwertung)
 * @param dropCount         Number of lowest scores to drop    (int_anz_streich)
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
  // Sort ascending, remove the <dropCount> lowest values, sum the rest
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.slice(dropCount).reduce((sum, v) => sum + v, 0);
}

// ---------------------------------------------------------------------------
// sortAndRank
// ---------------------------------------------------------------------------

/**
 * Sorts participants into ranking order and assigns Olympic ranks.
 *
 * - Normal sports (sortAscending = false): higher totalScore = better rank
 * - Time sports   (sortAscending = true):  lower  totalScore = better rank
 *
 * Mirrors C++ result_calc.cpp: ORDER BY + `bol_sortasc` flag.
 * Does NOT mutate the input array.
 *
 * @param participants   Participants to rank
 * @param sortAscending  Whether lower scores rank higher (e.g. time sports)
 * @returns              New sorted array with `rank` added to each element
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

// ---------------------------------------------------------------------------
// rankCompetition
// ---------------------------------------------------------------------------

export interface CompetitionRankingOptions {
  sortAscending?: boolean;
  dropWorstScore?: boolean;
  dropCount?: number;
}

export interface CompetitionRankingEntry<K> {
  key: K;
  scores: Array<number | null | undefined>;
  /** Out of competition / absent: gets a total but no rank */
  excluded?: boolean;
  /** Precomputed total, used instead of summing `scores` */
  totalScore?: number | null;
}

export interface CompetitionRankingResult {
  totalScore: number | null;
  /** 0 = not ranked */
  rank: number;
}

/**
 * Single entry point for totals and placements of one competition.
 * Every export and view must use this instead of summing and ranking itself.
 */
export function rankCompetition<K>(
  entries: CompetitionRankingEntry<K>[],
  { sortAscending = false, dropWorstScore = false, dropCount = 0 }: CompetitionRankingOptions = {}
): Map<K, CompetitionRankingResult> {
  const withTotals = entries.map(entry => {
    const values = entry.scores.filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));
    const totalScore = entry.totalScore ?? (values.length === 0
      ? null
      : computeTotalScore(Object.fromEntries(values.map((v, i) => [String(i), v])), dropWorstScore, dropCount));
    return { key: entry.key, totalScore, excluded: entry.excluded === true };
  });

  const results = new Map<K, CompetitionRankingResult>(
    withTotals.map(e => [e.key, { totalScore: e.totalScore, rank: 0 }])
  );

  const rankable = withTotals
    .filter(e => e.totalScore !== null && !e.excluded)
    .map(e => ({ key: e.key, totalScore: e.totalScore as number }));

  sortAndRank(rankable, sortAscending).forEach(e => {
    results.set(e.key, { totalScore: e.totalScore, rank: e.rank });
  });

  return results;
}
