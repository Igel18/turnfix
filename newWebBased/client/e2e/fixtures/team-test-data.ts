/**
 * Team Competition Test Data
 *
 * All constants for Mannschaftswettkampf (team competition) E2E tests.
 * Scores, expected team rankings, and participant definitions.
 *
 * Setup: 1 team competition (women), 3 teams × 4 members, 4 disciplines
 */

export const API_BASE = 'http://localhost:3001/api';

// ═══════════════════════════════════════════════════════════════════════
// TEAM DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

/** Club names for the 3 teams */
export const TEAM_CLUB_NAMES = ['TC TeamAlpha', 'TC TeamBeta', 'TC TeamGamma'];

/** First names for Team Alpha members (Club 1) */
export const TEAM_ALPHA_NAMES = ['AlphaAUI', 'AlphaBUI', 'AlphaCUI', 'AlphaDUI'];

/** First names for Team Beta members (Club 2) */
export const TEAM_BETA_NAMES = ['BetaAUI', 'BetaBUI', 'BetaCUI', 'BetaDUI'];

/** First names for Team Gamma members (Club 3) */
export const TEAM_GAMMA_NAMES = ['GammaAUI', 'GammaBUI', 'GammaCUI', 'GammaDUI'];

/** All 12 first names in order: Alpha(0-3), Beta(4-7), Gamma(8-11) */
export const ALL_TEAM_NAMES = [
  ...TEAM_ALPHA_NAMES,
  ...TEAM_BETA_NAMES,
  ...TEAM_GAMMA_NAMES,
];

/** Club index per participant (0=Alpha, 1=Beta, 2=Gamma) */
export const TEAM_CLUB_ASSIGNMENT = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2];

/** Gender: all female */
export const TEAM_GENDER = 2; // female

/** Members per team */
export const MEMBERS_PER_TEAM = 4;

/** Number of teams */
export const NUM_TEAMS = 3;

/** Discipline short names */
export const TEAM_DISCIPLINE_NAMES = ['TDA', 'TDB', 'TDC', 'TDD'];

// ═══════════════════════════════════════════════════════════════════════
// SCORE DATA — 12 participants × 4 disciplines = 48 scores
// ═══════════════════════════════════════════════════════════════════════

/**
 * Individual scores: 12 participants × 4 disciplines.
 * All individual totals AND all team totals are UNIQUE → unambiguous ranking.
 */
export const TEAM_SCORES: number[][] = [
  // ── Team Alpha (Club 1) ───────────────────────────────────────
  // [0] AlphaAUI: 9.50 + 9.25 + 9.00 + 9.50 = 37.25 → Individual Rank 1
  [9.50, 9.25, 9.00, 9.50],
  // [1] AlphaBUI: 9.00 + 8.75 + 9.25 + 9.00 = 36.00 → Individual Rank 3
  [9.00, 8.75, 9.25, 9.00],
  // [2] AlphaCUI: 8.50 + 8.50 + 8.75 + 8.50 = 34.25 → Individual Rank 5
  [8.50, 8.50, 8.75, 8.50],
  // [3] AlphaDUI: 8.00 + 8.00 + 8.50 + 8.00 = 32.50 → Individual Rank 7
  [8.00, 8.00, 8.50, 8.00],

  // ── Team Beta (Club 2) ────────────────────────────────────────
  // [4] BetaAUI:  9.25 + 9.00 + 8.75 + 9.25 = 36.25 → Individual Rank 2
  [9.25, 9.00, 8.75, 9.25],
  // [5] BetaBUI:  8.75 + 8.50 + 8.50 + 8.75 = 34.50 → Individual Rank 4
  [8.75, 8.50, 8.50, 8.75],
  // [6] BetaCUI:  8.25 + 8.00 + 8.25 + 8.25 = 32.75 → Individual Rank 6
  [8.25, 8.00, 8.25, 8.25],
  // [7] BetaDUI:  7.75 + 7.50 + 7.75 + 7.75 = 30.75 → Individual Rank 9
  [7.75, 7.50, 7.75, 7.75],

  // ── Team Gamma (Club 3) ───────────────────────────────────────
  // [8]  GammaAUI: 8.00 + 8.25 + 8.00 + 8.00 = 32.25 → Individual Rank 8
  [8.00, 8.25, 8.00, 8.00],
  // [9]  GammaBUI: 7.50 + 7.75 + 7.50 + 7.50 = 30.25 → Individual Rank 10
  [7.50, 7.75, 7.50, 7.50],
  // [10] GammaCUI: 7.00 + 7.25 + 7.00 + 7.00 = 28.25 → Individual Rank 11
  [7.00, 7.25, 7.00, 7.00],
  // [11] GammaDUI: 6.50 + 6.75 + 6.50 + 6.50 = 26.25 → Individual Rank 12
  [6.50, 6.75, 6.50, 6.50],
];

// ═══════════════════════════════════════════════════════════════════════
// EXPECTED RESULTS
// ═══════════════════════════════════════════════════════════════════════

/** Expected individual ranking (sorted by total descending) */
export const EXPECTED_INDIVIDUAL_RANKING = [
  { name: 'AlphaAUI', total: 37.25, rank: 1 },
  { name: 'BetaAUI',  total: 36.25, rank: 2 },
  { name: 'AlphaBUI', total: 36.00, rank: 3 },
  { name: 'BetaBUI',  total: 34.50, rank: 4 },
  { name: 'AlphaCUI', total: 34.25, rank: 5 },
  { name: 'BetaCUI',  total: 32.75, rank: 6 },
  { name: 'AlphaDUI', total: 32.50, rank: 7 },
  { name: 'GammaAUI', total: 32.25, rank: 8 },
  { name: 'BetaDUI',  total: 30.75, rank: 9 },
  { name: 'GammaBUI', total: 30.25, rank: 10 },
  { name: 'GammaCUI', total: 28.25, rank: 11 },
  { name: 'GammaDUI', total: 26.25, rank: 12 },
];

/** Expected team ranking (sum of all member scores, sorted desc) */
export const EXPECTED_TEAM_RANKING = [
  { club: 'TC TeamAlpha', total: 140.00, rank: 1 },
  { club: 'TC TeamBeta',  total: 134.25, rank: 2 },
  { club: 'TC TeamGamma', total: 117.00, rank: 3 },
];

// ═══════════════════════════════════════════════════════════════════════
// COMPUTED CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Total number of participants */
export const TOTAL_TEAM_PARTICIPANTS = ALL_TEAM_NAMES.length; // 12

/** Total number of score entries */
export const TOTAL_TEAM_SCORES = TOTAL_TEAM_PARTICIPANTS * TEAM_DISCIPLINE_NAMES.length; // 48

/** Sum of all scores (for statistical validation) */
export const TEAM_SCORES_TOTAL_SUM = TEAM_SCORES.reduce(
  (sum, scores) => sum + scores.reduce((s, v) => s + v, 0), 0
);

/** Team totals computed from score data */
export const TEAM_ALPHA_TOTAL = TEAM_SCORES.slice(0, 4).reduce(
  (sum, scores) => sum + scores.reduce((s, v) => s + v, 0), 0
);
export const TEAM_BETA_TOTAL = TEAM_SCORES.slice(4, 8).reduce(
  (sum, scores) => sum + scores.reduce((s, v) => s + v, 0), 0
);
export const TEAM_GAMMA_TOTAL = TEAM_SCORES.slice(8, 12).reduce(
  (sum, scores) => sum + scores.reduce((s, v) => s + v, 0), 0
);
