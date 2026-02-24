/**
 * Shared Test Data for E2E Tests
 *
 * Contains ALL constants used across setup and test files.
 * Score values, expected rankings, participant definitions — all STATIC.
 * The setup files generate timestamped names and save actual IDs to state.
 */

export const API_BASE = 'http://localhost:3001/api';

// ═══════════════════════════════════════════════════════════════════════
// PARTICIPANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

/** First names for women participants (index 0-4 = Club 1, 5-9 = Club 2) */
export const WOMEN_FIRST_NAMES = [
  'AnnaUI', 'BertaUI', 'ClaraUI', 'DinaUI', 'EvaUI',
  'FionaUI', 'GinaUI', 'HannaUI', 'IdaUI', 'JuliaUI',
];

/** First names for men participants (index 0-4 = Club 1, 5-9 = Club 2) */
export const MEN_FIRST_NAMES = [
  'AdamUI', 'BenUI', 'CarlUI', 'DanUI', 'EmilUI',
  'FinnUI', 'GerdUI', 'HansUI', 'IgorUI', 'JanUI',
];

/** Gender codes: 1 = male, 2 = female (matches database convention) */
export const GENDER_FEMALE = 2;
export const GENDER_MALE = 1;

/** Club assignment by participant index: 0=Club1, 1=Club2 */
export const CLUB_ASSIGNMENT = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];

/** Discipline short names for Event A */
export const DISCIPLINE_SHORT_NAMES = ['DA', 'DB', 'DC', 'DD'];

// ═══════════════════════════════════════════════════════════════════════
// SCORE DATA
// ═══════════════════════════════════════════════════════════════════════

/**
 * Women's scores: 10 participants × 4 disciplines.
 * All totals are UNIQUE → unambiguous ranking.
 * Indexed by [participantIndex][disciplineIndex].
 */
export const WOMEN_SCORES = [
  // W00 AnnaUI:   9.50 + 9.00 + 8.50 + 9.00 = 36.00 → Rank 1
  [9.50, 9.00, 8.50, 9.00],
  // W01 BertaUI:  9.00 + 8.50 + 9.00 + 8.00 = 34.50 → Rank 2
  [9.00, 8.50, 9.00, 8.00],
  // W02 ClaraUI:  8.50 + 8.00 + 8.00 + 9.50 = 34.00 → Rank 3
  [8.50, 8.00, 8.00, 9.50],
  // W03 DinaUI:   8.00 + 9.50 + 7.50 + 7.00 = 32.00 → Rank 4
  [8.00, 9.50, 7.50, 7.00],
  // W04 EvaUI:    7.50 + 7.00 + 9.00 + 7.50 = 31.00 → Rank 5
  [7.50, 7.00, 9.00, 7.50],
  // W05 FionaUI:  7.00 + 7.50 + 6.50 + 8.00 = 29.00 → Rank 6
  [7.00, 7.50, 6.50, 8.00],
  // W06 GinaUI:   6.50 + 6.00 + 7.00 + 6.50 = 26.00 → Rank 7
  [6.50, 6.00, 7.00, 6.50],
  // W07 HannaUI:  6.00 + 6.50 + 5.50 + 6.00 = 24.00 → Rank 8
  [6.00, 6.50, 5.50, 6.00],
  // W08 IdaUI:    5.50 + 5.00 + 6.00 + 5.50 = 22.00 → Rank 9
  [5.50, 5.00, 6.00, 5.50],
  // W09 JuliaUI:  5.00 + 5.50 + 4.50 + 5.00 = 20.00 → Rank 10
  [5.00, 5.50, 4.50, 5.00],
];

/**
 * Men's scores: 10 participants × 4 disciplines.
 * All totals are UNIQUE → unambiguous ranking.
 */
export const MEN_SCORES = [
  // M00 AdamUI:  9.80 + 9.50 + 9.20 + 9.00 = 37.50 → Rank 1
  [9.80, 9.50, 9.20, 9.00],
  // M01 BenUI:   9.30 + 9.00 + 8.80 + 8.50 = 35.60 → Rank 2
  [9.30, 9.00, 8.80, 8.50],
  // M02 CarlUI:  8.80 + 8.50 + 8.30 + 8.00 = 33.60 → Rank 3
  [8.80, 8.50, 8.30, 8.00],
  // M03 DanUI:   8.30 + 8.00 + 7.80 + 7.50 = 31.60 → Rank 4
  [8.30, 8.00, 7.80, 7.50],
  // M04 EmilUI:  7.80 + 7.50 + 7.30 + 7.00 = 29.60 → Rank 5
  [7.80, 7.50, 7.30, 7.00],
  // M05 FinnUI:  7.30 + 7.00 + 6.80 + 6.50 = 27.60 → Rank 6
  [7.30, 7.00, 6.80, 6.50],
  // M06 GerdUI:  6.80 + 6.50 + 6.30 + 6.00 = 25.60 → Rank 7
  [6.80, 6.50, 6.30, 6.00],
  // M07 HansUI:  6.30 + 6.00 + 5.80 + 5.50 = 23.60 → Rank 8
  [6.30, 6.00, 5.80, 5.50],
  // M08 IgorUI:  5.80 + 5.50 + 5.30 + 5.00 = 21.60 → Rank 9
  [5.80, 5.50, 5.30, 5.00],
  // M09 JanUI:   5.30 + 5.00 + 4.80 + 4.50 = 19.60 → Rank 10
  [5.30, 5.00, 4.80, 4.50],
];

// ═══════════════════════════════════════════════════════════════════════
// EXPECTED RESULTS
// ═══════════════════════════════════════════════════════════════════════

/** Expected women's ranking (sorted by total descending) */
export const EXPECTED_WOMEN = [
  { name: 'AnnaUI',   total: 36.00, rank: 1 },
  { name: 'BertaUI',  total: 34.50, rank: 2 },
  { name: 'ClaraUI',  total: 34.00, rank: 3 },
  { name: 'DinaUI',   total: 32.00, rank: 4 },
  { name: 'EvaUI',    total: 31.00, rank: 5 },
  { name: 'FionaUI',  total: 29.00, rank: 6 },
  { name: 'GinaUI',   total: 26.00, rank: 7 },
  { name: 'HannaUI',  total: 24.00, rank: 8 },
  { name: 'IdaUI',    total: 22.00, rank: 9 },
  { name: 'JuliaUI',  total: 20.00, rank: 10 },
];

/** Expected men's ranking (sorted by total descending) */
export const EXPECTED_MEN = [
  { name: 'AdamUI',  total: 37.50, rank: 1 },
  { name: 'BenUI',   total: 35.60, rank: 2 },
  { name: 'CarlUI',  total: 33.60, rank: 3 },
  { name: 'DanUI',   total: 31.60, rank: 4 },
  { name: 'EmilUI',  total: 29.60, rank: 5 },
  { name: 'FinnUI',  total: 27.60, rank: 6 },
  { name: 'GerdUI',  total: 25.60, rank: 7 },
  { name: 'HansUI',  total: 23.60, rank: 8 },
  { name: 'IgorUI',  total: 21.60, rank: 9 },
  { name: 'JanUI',   total: 19.60, rank: 10 },
];

// ═══════════════════════════════════════════════════════════════════════
// COMPUTED TOTALS (for assertions)
// ═══════════════════════════════════════════════════════════════════════

/** Sum of all women's scores */
export const WOMEN_TOTAL_SUM = WOMEN_SCORES.reduce(
  (sum, scores) => sum + scores.reduce((s, v) => s + v, 0), 0
);

/** Sum of all men's scores */
export const MEN_TOTAL_SUM = MEN_SCORES.reduce(
  (sum, scores) => sum + scores.reduce((s, v) => s + v, 0), 0
);

/** Total number of score entries per competition */
export const SCORES_PER_COMPETITION = 40; // 10 participants × 4 disciplines

/** Participants per club per competition */
export const PARTICIPANTS_PER_CLUB = 5;
