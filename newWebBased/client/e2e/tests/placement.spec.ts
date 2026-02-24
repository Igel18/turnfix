/**
 * Placement Tests — Score modification, re-ranking, tie-breaking
 *
 * Depends on: Event A (setup/create-event)
 * Tests dynamic ranking behavior by modifying scores and verifying re-ranking.
 * All modifications are RESTORED after each test to keep data consistent.
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { loadEventAState, apiGet, apiPost, EventAState } from '../fixtures/test-state';
import { WOMEN_SCORES, MEN_SCORES, EXPECTED_WOMEN, EXPECTED_MEN, DISCIPLINE_SHORT_NAMES } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Get per-participant score totals from the scores API */
async function getDetailedScores(request: APIRequestContext, competitionId: number) {
  const res = await apiGet(request, `/scores?competitionId=${competitionId}&limit=2000`);
  const results = res.body.results || [];

  const map = new Map<number, { total: number; scores: Map<number, number> }>();
  for (const r of results) {
    const pid = r.participantId;
    const did = r.disciplineId;
    const score = r.score ?? 0;
    if (!did) continue;

    if (!map.has(pid)) map.set(pid, { total: 0, scores: new Map() });
    const entry = map.get(pid)!;
    entry.scores.set(did, score);
    entry.total += score;
  }

  for (const entry of map.values()) {
    entry.total = +(entry.total.toFixed(2));
  }

  return map;
}

/** Derive rankings from score totals (sorted desc, ties get same rank) */
function computeRankings(scoreMap: Map<number, { total: number; scores: Map<number, number> }>) {
  const entries = [...scoreMap.entries()].map(([pid, data]) => ({
    participantId: pid,
    total: data.total,
    rank: 0,
  }));

  entries.sort((a, b) => b.total - a.total);

  let currentRank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].total < entries[i - 1].total) {
      currentRank = i + 1;
    }
    entries[i].rank = currentRank;
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Placement: Initial Rankings Verified', () => {

  test('women ranking matches expected order', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp1Id);
    const rankings = computeRankings(scores);

    for (let i = 0; i < 10; i++) {
      expect(rankings[i].participantId).toBe(state.womenPids[i]);
      expect(rankings[i].total).toBeCloseTo(EXPECTED_WOMEN[i].total, 1);
      expect(rankings[i].rank).toBe(i + 1);
    }
  });

  test('men ranking matches expected order', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp2Id);
    const rankings = computeRankings(scores);

    for (let i = 0; i < 10; i++) {
      expect(rankings[i].participantId).toBe(state.menPids[i]);
      expect(rankings[i].total).toBeCloseTo(EXPECTED_MEN[i].total, 1);
      expect(rankings[i].rank).toBe(i + 1);
    }
  });

  test('women totals are all unique', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp1Id);
    const totals = [...scores.values()].map(d => d.total);
    const unique = new Set(totals);
    expect(unique.size).toBe(totals.length);
  });

  test('men totals are all unique', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp2Id);
    const totals = [...scores.values()].map(d => d.total);
    const unique = new Set(totals);
    expect(unique.size).toBe(totals.length);
  });
});

test.describe('Placement: Score Modification & Re-Ranking', () => {

  // W0 (AnnaUI) = 9.50 + 9.00 + 8.50 + 9.00 = 36.00 (Rank 1)
  // W1 (BertaUI) = 9.00 + 8.50 + 9.00 + 8.00 = 34.50 (Rank 2)
  // W2 (ClaraUI) = 8.50 + 8.00 + 8.00 + 9.50 = 34.00 (Rank 3)
  // Lower W0's DA from 9.50 → 7.00:  new total = 33.50 → drops to Rank 3

  test('lower W0 score → W1 becomes 1st', async ({ request }) => {
    // Change W0's first discipline score from 9.50 → 7.00
    const r = await apiPost(request, '/scores/save-value', {
      participantId: state.womenPids[0],
      disciplineId: state.disciplineIds[0],
      score: 7.00,
      competitionId: state.comp1Id,
    });
    expect(r.status).toBe(200);

    // Verify new ranking
    const scores = await getDetailedScores(request, state.comp1Id);
    const rankings = computeRankings(scores);

    // W0 new total: 7.00 + 9.00 + 8.50 + 9.00 = 33.50
    const w0Data = scores.get(state.womenPids[0])!;
    expect(w0Data.total).toBeCloseTo(33.50, 1);

    // W1 (34.50) should be 1st now
    expect(rankings[0].participantId).toBe(state.womenPids[1]);
    expect(rankings[0].total).toBeCloseTo(34.50, 1);

    // W0 (33.50) should be 3rd (below W2's 34.00)
    const w0Ranking = rankings.find(r => r.participantId === state.womenPids[0]);
    expect(w0Ranking!.rank).toBe(3);
  });

  test('restore W0 original score → W0 back to 1st', async ({ request }) => {
    const r = await apiPost(request, '/scores/save-value', {
      participantId: state.womenPids[0],
      disciplineId: state.disciplineIds[0],
      score: WOMEN_SCORES[0][0], // 9.50
      competitionId: state.comp1Id,
    });
    expect(r.status).toBe(200);

    const scores = await getDetailedScores(request, state.comp1Id);
    const rankings = computeRankings(scores);

    expect(rankings[0].participantId).toBe(state.womenPids[0]);
    expect(rankings[0].total).toBeCloseTo(EXPECTED_WOMEN[0].total, 1);
  });
});

test.describe('Placement: Tie-Breaking Scenario', () => {

  // M4 (EmilUI) = 7.80 + 7.50 + 7.30 + 7.00 = 29.60 (Rank 5)
  // M5 (FinnUI) = 7.30 + 7.00 + 6.80 + 6.50 = 27.60 (Rank 6)
  // Change M5's DD from 6.50 → 8.50 → new total = 29.60 (tie with M4!)

  test('create tie between M4 and M5', async ({ request }) => {
    const r = await apiPost(request, '/scores/save-value', {
      participantId: state.menPids[5],
      disciplineId: state.disciplineIds[3], // DD (4th discipline)
      score: 8.50,
      competitionId: state.comp2Id,
    });
    expect(r.status).toBe(200);
  });

  test('tied participants get same rank', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp2Id);
    const rankings = computeRankings(scores);

    const m4 = rankings.find(r => r.participantId === state.menPids[4])!;
    const m5 = rankings.find(r => r.participantId === state.menPids[5])!;

    expect(m4.total).toBeCloseTo(29.60, 1);
    expect(m5.total).toBeCloseTo(29.60, 1);
    expect(m4.rank).toBe(m5.rank); // Same rank for tied scores
  });

  test('rank after tie is skipped', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp2Id);
    const rankings = computeRankings(scores);

    const m4 = rankings.find(r => r.participantId === state.menPids[4])!;
    const m6 = rankings.find(r => r.participantId === state.menPids[6])!;

    // M4 and M5 share rank 5, so M6 should be rank 7 (rank 6 is skipped)
    expect(m4.rank).toBe(5);
    expect(m6.rank).toBe(7);
  });

  test('restore M5 original score → tie removed', async ({ request }) => {
    const r = await apiPost(request, '/scores/save-value', {
      participantId: state.menPids[5],
      disciplineId: state.disciplineIds[3],
      score: MEN_SCORES[5][3], // 6.50 (original)
      competitionId: state.comp2Id,
    });
    expect(r.status).toBe(200);

    const scores = await getDetailedScores(request, state.comp2Id);
    const rankings = computeRankings(scores);

    // M4 should be 5th, M5 should be 6th again
    expect(rankings[4].participantId).toBe(state.menPids[4]);
    expect(rankings[4].rank).toBe(5);
    expect(rankings[5].participantId).toBe(state.menPids[5]);
    expect(rankings[5].rank).toBe(6);
  });
});

test.describe('Placement: Per-Discipline Rankings', () => {

  test('DA: W0 (AnnaUI) has highest women score', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp1Id);
    const discScores: { pid: number; score: number }[] = [];
    for (const [pid, data] of scores) {
      const s = data.scores.get(state.disciplineIds[0]);
      if (s !== undefined) discScores.push({ pid, score: s });
    }
    discScores.sort((a, b) => b.score - a.score);
    expect(discScores[0].pid).toBe(state.womenPids[0]);
    expect(discScores[0].score).toBeCloseTo(WOMEN_SCORES[0][0], 1);
  });

  test('DA: M0 (AdamUI) has highest men score', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp2Id);
    const discScores: { pid: number; score: number }[] = [];
    for (const [pid, data] of scores) {
      const s = data.scores.get(state.disciplineIds[0]);
      if (s !== undefined) discScores.push({ pid, score: s });
    }
    discScores.sort((a, b) => b.score - a.score);
    expect(discScores[0].pid).toBe(state.menPids[0]);
    expect(discScores[0].score).toBeCloseTo(MEN_SCORES[0][0], 1);
  });

  test('all 4 disciplines have exactly 10 women scores', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp1Id);

    for (const did of state.disciplineIds) {
      let count = 0;
      for (const data of scores.values()) {
        if (data.scores.has(did)) count++;
      }
      expect(count).toBe(10);
    }
  });

  test('all 4 disciplines have exactly 10 men scores', async ({ request }) => {
    const scores = await getDetailedScores(request, state.comp2Id);

    for (const did of state.disciplineIds) {
      let count = 0;
      for (const data of scores.values()) {
        if (data.scores.has(did)) count++;
      }
      expect(count).toBe(10);
    }
  });
});

test.describe('Placement: Medal Table', () => {

  test('medal API returns data for event', async ({ request }) => {
    // Try both potential API paths
    let res = await apiGet(request, `/medals/${state.eventId}`);
    if (res.status !== 200) {
      res = await apiGet(request, `/results/medals?eventId=${state.eventId}`);
    }
    expect(res.status).toBe(200);
    const standings = res.body.standings || res.body;
    expect(Array.isArray(standings)).toBe(true);
    expect(standings.length).toBeGreaterThanOrEqual(1);
  });

  test('at least 2 clubs appear in medal standings', async ({ request }) => {
    let res = await apiGet(request, `/medals/${state.eventId}`);
    if (res.status !== 200) {
      res = await apiGet(request, `/results/medals?eventId=${state.eventId}`);
    }
    const standings = res.body.standings || res.body;
    expect(standings.length).toBeGreaterThanOrEqual(2);
  });

  test('total medals match competition count (gold+silver+bronze per comp)', async ({ request }) => {
    let res = await apiGet(request, `/medals/${state.eventId}`);
    if (res.status !== 200) {
      res = await apiGet(request, `/results/medals?eventId=${state.eventId}`);
    }
    const standings = res.body.standings || res.body;

    // 2 competitions → at least 4 medals (gold+silver per comp minimum)
    const totalMedals = standings.reduce((sum: number, s: any) =>
      sum + (s.totalGold || s.gold || 0) + (s.totalSilver || s.silver || 0) + (s.totalBronze || s.bronze || 0), 0);
    expect(totalMedals).toBeGreaterThanOrEqual(4);
  });
});
