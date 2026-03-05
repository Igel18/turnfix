/**
 * Statistical Tests — Data integrity, cross-competition, completeness
 *
 * Depends on: Event A (setup/create-event)
 * Validates the statistical consistency of all score data.
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import { loadEventAState, apiGet, apiPost, EventAState } from '../fixtures/test-state';
import {
  WOMEN_SCORES, MEN_SCORES, EXPECTED_WOMEN, EXPECTED_MEN,
  SCORES_PER_COMPETITION, PARTICIPANTS_PER_CLUB,
  WOMEN_TOTAL_SUM, MEN_TOTAL_SUM,
} from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async ({ request }) => {
  state = loadEventAState();

  // Re-seed all expected scores to ensure data integrity.
  // Previous test failures (e.g. comma regression) may have left corrupted scores.
  const allScores = [
    { compId: state.comp1Id, pids: state.womenPids, scores: WOMEN_SCORES },
    { compId: state.comp2Id, pids: state.menPids, scores: MEN_SCORES },
  ];
  for (const { compId, pids, scores } of allScores) {
    for (let p = 0; p < pids.length; p++) {
      for (let d = 0; d < state.disciplineIds.length; d++) {
        await apiPost(request, '/scores/save-value', {
          competitionId: compId,
          participantId: pids[p],
          disciplineId: state.disciplineIds[d],
          score: scores[p][d],
        });
      }
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

async function getScores(request: APIRequestContext, competitionId: number) {
  const res = await apiGet(request, `/scores?competitionId=${competitionId}&limit=2000`);
  return res.body.results || [];
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Stats: Score Counts', () => {

  test('women competition has exactly 40 scores', async ({ request }) => {
    const scores = await getScores(request, state.comp1Id);
    expect(scores.length).toBe(SCORES_PER_COMPETITION);
  });

  test('men competition has exactly 40 scores', async ({ request }) => {
    const scores = await getScores(request, state.comp2Id);
    expect(scores.length).toBe(SCORES_PER_COMPETITION);
  });

  test('total scores across both competitions is 80', async ({ request }) => {
    const wScores = await getScores(request, state.comp1Id);
    const mScores = await getScores(request, state.comp2Id);
    expect(wScores.length + mScores.length).toBe(80);
  });
});

test.describe('Stats: No Duplicate Scores', () => {

  test('no duplicate participant+discipline pairs in women comp', async ({ request }) => {
    const scores = await getScores(request, state.comp1Id);
    const keys = scores.map((s: any) => `${s.participantId}-${s.disciplineId}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  test('no duplicate participant+discipline pairs in men comp', async ({ request }) => {
    const scores = await getScores(request, state.comp2Id);
    const keys = scores.map((s: any) => `${s.participantId}-${s.disciplineId}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});

test.describe('Stats: Cross-Competition Isolation', () => {

  test('women and men participants do not overlap', async ({ request }) => {
    const wScores = await getScores(request, state.comp1Id);
    const mScores = await getScores(request, state.comp2Id);

    const wPids = new Set(wScores.map((s: any) => s.participantId));
    const mPids = new Set(mScores.map((s: any) => s.participantId));

    for (const wPid of wPids) {
      expect(mPids.has(wPid)).toBe(false);
    }
  });

  test('each competition has exactly 10 participants with scores', async ({ request }) => {
    const wScores = await getScores(request, state.comp1Id);
    const mScores = await getScores(request, state.comp2Id);

    const wPids = new Set(wScores.map((s: any) => s.participantId));
    const mPids = new Set(mScores.map((s: any) => s.participantId));

    expect(wPids.size).toBe(10);
    expect(mPids.size).toBe(10);
  });

  test('each participant has exactly 4 discipline scores', async ({ request }) => {
    const wScores = await getScores(request, state.comp1Id);
    const mScores = await getScores(request, state.comp2Id);

    // Count scores per participant
    const wCounts = new Map<number, number>();
    for (const s of wScores) {
      wCounts.set(s.participantId, (wCounts.get(s.participantId) || 0) + 1);
    }
    for (const count of wCounts.values()) {
      expect(count).toBe(4);
    }

    const mCounts = new Map<number, number>();
    for (const s of mScores) {
      mCounts.set(s.participantId, (mCounts.get(s.participantId) || 0) + 1);
    }
    for (const count of mCounts.values()) {
      expect(count).toBe(4);
    }
  });
});

test.describe('Stats: Score Value Ranges', () => {

  test('all women scores are between 0 and 20', async ({ request }) => {
    const scores = await getScores(request, state.comp1Id);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(20);
    }
  });

  test('all men scores are between 0 and 20', async ({ request }) => {
    const scores = await getScores(request, state.comp2Id);
    for (const s of scores) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(20);
    }
  });

  test('no null or undefined scores', async ({ request }) => {
    const wScores = await getScores(request, state.comp1Id);
    const mScores = await getScores(request, state.comp2Id);

    for (const s of [...wScores, ...mScores]) {
      expect(s.score).not.toBeNull();
      expect(s.score).not.toBeUndefined();
      expect(typeof s.score).toBe('number');
    }
  });
});

test.describe('Stats: Total Sums', () => {

  test('women total sum matches expected', async ({ request }) => {
    const scores = await getScores(request, state.comp1Id);
    const total = scores.reduce((sum: number, s: any) => sum + s.score, 0);
    expect(total).toBeCloseTo(WOMEN_TOTAL_SUM, 1);
  });

  test('men total sum matches expected', async ({ request }) => {
    const scores = await getScores(request, state.comp2Id);
    const total = scores.reduce((sum: number, s: any) => sum + s.score, 0);
    expect(total).toBeCloseTo(MEN_TOTAL_SUM, 1);
  });

  test('individual discipline totals sum to participant totals', async ({ request }) => {
    const scores = await getScores(request, state.comp1Id);

    // Group by participant
    const byParticipant = new Map<number, number>();
    for (const s of scores) {
      byParticipant.set(s.participantId, (byParticipant.get(s.participantId) || 0) + s.score);
    }

    // Each participant total should match expected
    for (let i = 0; i < 10; i++) {
      const pid = state.womenPids[i];
      const actual = byParticipant.get(pid)!;
      expect(actual).toBeCloseTo(EXPECTED_WOMEN[i].total, 1);
    }
  });
});

test.describe('Stats: Club Distribution', () => {

  test('5 women per club in event', async ({ request }) => {
    const res = await apiGet(request, `/event-participants?eventId=${state.eventId}&limit=200`);
    const participants = res.body.eventParticipants || res.body.participants || [];

    const club1Count = participants.filter((p: any) =>
      (p.clubId || p.int_vereineid) === state.clubIds[0] && state.womenPids.includes(p.id || p.int_teilnehmerid)
    ).length;
    const club2Count = participants.filter((p: any) =>
      (p.clubId || p.int_vereineid) === state.clubIds[1] && state.womenPids.includes(p.id || p.int_teilnehmerid)
    ).length;

    expect(club1Count).toBe(PARTICIPANTS_PER_CLUB);
    expect(club2Count).toBe(PARTICIPANTS_PER_CLUB);
  });

  test('5 men per club in event', async ({ request }) => {
    const res = await apiGet(request, `/event-participants?eventId=${state.eventId}&limit=200`);
    const participants = res.body.eventParticipants || res.body.participants || [];

    const club1Count = participants.filter((p: any) =>
      (p.clubId || p.int_vereineid) === state.clubIds[0] && state.menPids.includes(p.id || p.int_teilnehmerid)
    ).length;
    const club2Count = participants.filter((p: any) =>
      (p.clubId || p.int_vereineid) === state.clubIds[1] && state.menPids.includes(p.id || p.int_teilnehmerid)
    ).length;

    expect(club1Count).toBe(PARTICIPANTS_PER_CLUB);
    expect(club2Count).toBe(PARTICIPANTS_PER_CLUB);
  });
});

test.describe('Stats: Discipline Coverage', () => {

  test('each discipline used in women comp', async ({ request }) => {
    const scores = await getScores(request, state.comp1Id);
    const disciplines = new Set(scores.map((s: any) => s.disciplineId));

    for (const did of state.disciplineIds) {
      expect(disciplines.has(did)).toBe(true);
    }
  });

  test('each discipline used in men comp', async ({ request }) => {
    const scores = await getScores(request, state.comp2Id);
    const disciplines = new Set(scores.map((s: any) => s.disciplineId));

    for (const did of state.disciplineIds) {
      expect(disciplines.has(did)).toBe(true);
    }
  });

  test('exactly 4 disciplines per competition', async ({ request }) => {
    const wScores = await getScores(request, state.comp1Id);
    const mScores = await getScores(request, state.comp2Id);

    const wDisc = new Set(wScores.map((s: any) => s.disciplineId));
    const mDisc = new Set(mScores.map((s: any) => s.disciplineId));

    expect(wDisc.size).toBe(4);
    expect(mDisc.size).toBe(4);
  });
});
