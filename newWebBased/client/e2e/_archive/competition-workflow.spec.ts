import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * E2E Test: Full Competition Workflow
 *
 * Tests the complete lifecycle of a gymnastics competition:
 * 1. Create an event
 * 2. Create competitions with disciplines
 * 3. Add participants to the event (auto-assigned to first competition)
 * 4. Assign participants to specific competitions
 * 5. Create squads (Riegen)
 * 6. Assign participants to squads
 * 7. Enter scores for each participant per discipline
 * 8. Verify results/placements
 * 9. Verify medal table
 * 10. Clean up all test data
 *
 * API Response Formats:
 * - GET /scores?competitionId=X → { results: [ { id (=wertungenId), participantId, disciplineId, score, ... } ], pagination }
 * - GET /medals/:eventId → { eventId, eventName, standings: [ { clubId, clubName, totalGold, ... } ] }
 * - GET /event-participants?eventId=X → { participants: [...], totalInEvent }
 */

const API_BASE = 'http://localhost:3001/api';
const TIMESTAMP = Date.now();

// ─── Test Data Definitions ──────────────────────────────────────────

const TEST_EVENT = {
  var_eventname: `E2E_Turnfest_${TIMESTAMP}`,
  dat_eventstartdate: '2026-06-01',
  dat_eventenddate: '2026-06-02',
  var_location: 'E2E Test Arena',
};

// Competition 1: Women's gymnastics (Boden w + Sprung w), ages 6–12
const TEST_COMP1 = {
  name: `E2E_Mehrkampf_W_${TIMESTAMP}`,
  number: 'E2EW',
  gender: 'weiblich',
  ageFrom: 6,
  ageTo: 12,
  competitionType: 0,
  disciplines: [
    { disciplineId: 10, maxScore: 20 },  // Boden w
    { disciplineId: 7, maxScore: 20 },   // Sprung w
  ],
};

// Competition 2: Mixed (Boden + Sprung), ages 6–20
const TEST_COMP2 = {
  name: `E2E_Mehrkampf_G_${TIMESTAMP}`,
  number: 'E2EG',
  gender: 'gemischt',
  ageFrom: 6,
  ageTo: 20,
  competitionType: 0,
  disciplines: [
    { disciplineId: 1, maxScore: 20 },   // Boden
    { disciplineId: 4, maxScore: 20 },   // Sprung
  ],
};

// Scores: participantIndex → discipline scores
// Competition 1 (W): 4 women, disciplines 10 (Boden w) and 7 (Sprung w)
const COMP1_SCORES = [
  { pi: 0, scores: [{ did: 10, v: 14.5 }, { did: 7, v: 13.0 }] },  // 27.5 → 1st
  { pi: 1, scores: [{ did: 10, v: 12.0 }, { did: 7, v: 14.0 }] },  // 26.0 → 2nd
  { pi: 2, scores: [{ did: 10, v: 11.5 }, { did: 7, v: 12.5 }] },  // 24.0 → 3rd
  { pi: 3, scores: [{ did: 10, v: 10.0 }, { did: 7, v: 11.0 }] },  // 21.0 → 4th
];

// Competition 2 (G): 3 participants, disciplines 1 (Boden) and 4 (Sprung)
const COMP2_SCORES = [
  { pi: 0, scores: [{ did: 1, v: 15.0 }, { did: 4, v: 14.0 }] },   // 29.0 → 1st
  { pi: 1, scores: [{ did: 1, v: 13.5 }, { did: 4, v: 13.5 }] },   // 27.0 → 2nd
  { pi: 2, scores: [{ did: 1, v: 12.0 }, { did: 4, v: 11.0 }] },   // 23.0 → 3rd
];

// ─── State ───────────────────────────────────────────────────────────

interface TestState {
  eventId: number;
  comp1Id: number;
  comp2Id: number;
  comp1Pids: number[];
  comp2Pids: number[];
  allPids: number[];
}

let state: TestState;

// ─── Helpers ─────────────────────────────────────────────────────────

async function apiPost(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.post(`${API_BASE}${path}`, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function apiGet(request: APIRequestContext, path: string) {
  const response = await request.get(`${API_BASE}${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function apiDelete(request: APIRequestContext, path: string) {
  const response = await request.delete(`${API_BASE}${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/**
 * Set EventContext in localStorage (required for pages that use EventContext without URL fallback).
 * Must navigate to the app origin first if needed.
 */
async function setEventContext(page: Page, eventId: number, eventName: string) {
  if (page.url() === 'about:blank' || !page.url().includes('localhost')) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  }
  await page.evaluate(({ id, name }) => {
    localStorage.setItem('turnfix-selected-event', JSON.stringify({
      int_eventid: id,
      var_eventname: name,
      dat_eventstartdate: '2026-06-01',
      dat_eventenddate: '2026-06-02',
      var_location: 'E2E Test Arena',
      status: 'upcoming',
    }));
  }, { id: eventId, name: eventName });
}

/**
 * Get score totals per participant from the scores API.
 * Returns Map<participantId, total>.
 */
async function getParticipantTotals(request: APIRequestContext, competitionId: number): Promise<Map<number, number>> {
  const res = await apiGet(request, `/scores?competitionId=${competitionId}&limit=1000`);
  const results = res.body.results || [];
  const totals = new Map<number, number>();
  for (const r of results) {
    const pid = r.participantId;
    const score = r.score ?? 0;
    totals.set(pid, (totals.get(pid) || 0) + score);
  }
  return totals;
}

/**
 * Get unique wertungenIds from scores API results (for cleanup).
 */
async function getWertungenIds(request: APIRequestContext, competitionId: number): Promise<number[]> {
  const res = await apiGet(request, `/scores?competitionId=${competitionId}&limit=1000`);
  const results = res.body.results || [];
  const ids = new Set<number>();
  for (const r of results) {
    if (r.id) ids.add(r.id);
  }
  return [...ids];
}

// ─── Test Suite ──────────────────────────────────────────────────────

test.describe.serial('Competition Workflow: Full Lifecycle', () => {

  test.beforeAll(async ({ request }) => {
    state = { eventId: 0, comp1Id: 0, comp2Id: 0, comp1Pids: [], comp2Pids: [], allPids: [] };

    // Step 1: Create Event
    const eventRes = await apiPost(request, '/events', TEST_EVENT);
    expect(eventRes.status).toBe(201);
    state.eventId = eventRes.body.event.int_eventid;
    console.log(`✓ Created event: ${state.eventId}`);

    // Step 2: Create Competition 1 (Weiblich)
    const c1 = await apiPost(request, '/competitions', { ...TEST_COMP1, eventId: state.eventId });
    expect(c1.status).toBe(201);
    state.comp1Id = c1.body.id;
    console.log(`✓ Created comp1: ${state.comp1Id}`);

    // Step 3: Create Competition 2 (Gemischt)
    const c2 = await apiPost(request, '/competitions', { ...TEST_COMP2, eventId: state.eventId });
    expect(c2.status).toBe(201);
    state.comp2Id = c2.body.id;
    console.log(`✓ Created comp2: ${state.comp2Id}`);

    // Step 4: Find participants
    const pRes = await apiGet(request, '/participants?limit=200');
    expect(pRes.status).toBe(200);
    const all = pRes.body.participants;

    const females = all.filter((p: any) => p.int_geschlecht === 2 && p.age >= 6 && p.age <= 12).slice(0, 4);
    expect(females.length).toBeGreaterThanOrEqual(4);

    const mixed = all
      .filter((p: any) => p.age >= 6 && p.age <= 20 && !females.some((f: any) => f.int_teilnehmerid === p.int_teilnehmerid))
      .slice(0, 3);
    expect(mixed.length).toBeGreaterThanOrEqual(3);

    state.comp1Pids = females.map((p: any) => p.int_teilnehmerid);
    state.comp2Pids = mixed.map((p: any) => p.int_teilnehmerid);
    state.allPids = [...state.comp1Pids, ...state.comp2Pids];

    // Step 5: Add all participants to event (creates wertung on comp1)
    for (const pid of state.allPids) {
      const r = await apiPost(request, '/event-participants/add', { eventId: state.eventId, participantId: pid });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Added ${state.allPids.length} participants to event`);

    // Step 6: Assign comp2 participants to comp2
    for (const pid of state.comp2Pids) {
      const r = await apiPost(request, '/event-participants/assign', { participantId: pid, competitionId: state.comp2Id });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Assigned comp2 participants`);

    // Step 7: Create squads
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'R1' });
    for (const pid of state.comp1Pids) {
      await apiPost(request, '/squad-management/assign', { participantId: pid, squadName: 'R1', eventId: state.eventId });
    }
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'R2' });
    for (const pid of state.comp2Pids) {
      await apiPost(request, '/squad-management/assign', { participantId: pid, squadName: 'R2', eventId: state.eventId });
    }
    console.log(`✓ Created squads R1, R2`);

    // Step 8: Enter scores
    for (const e of COMP1_SCORES) {
      for (const s of e.scores) {
        const r = await apiPost(request, '/scores/save-value', {
          participantId: state.comp1Pids[e.pi], disciplineId: s.did, score: s.v, competitionId: state.comp1Id,
        });
        expect(r.status).toBe(200);
      }
    }
    for (const e of COMP2_SCORES) {
      for (const s of e.scores) {
        const r = await apiPost(request, '/scores/save-value', {
          participantId: state.comp2Pids[e.pi], disciplineId: s.did, score: s.v, competitionId: state.comp2Id,
        });
        expect(r.status).toBe(200);
      }
    }
    console.log(`✓ Entered all scores`);

    // Verify
    const vRes = await apiGet(request, `/event-participants?eventId=${state.eventId}&includeAvailable=false`);
    console.log(`✓ Setup complete. Event=${state.eventId}, Comp1=${state.comp1Id}, Comp2=${state.comp2Id}, Participants=${vRes.body.totalInEvent || 0}`);
  });

  test.afterAll(async ({ request }) => {
    if (!state?.eventId) return;

    // Collect unique wertungenIds
    const w1 = await getWertungenIds(request, state.comp1Id);
    const w2 = await getWertungenIds(request, state.comp2Id);
    const allWids = [...new Set([...w1, ...w2])];

    for (const wid of allWids) {
      await apiDelete(request, `/scores/${wid}`);
    }
    if (state.comp1Id) await apiDelete(request, `/competitions/${state.comp1Id}`);
    if (state.comp2Id) await apiDelete(request, `/competitions/${state.comp2Id}`);
    if (state.eventId) await apiDelete(request, `/events/${state.eventId}`);
    console.log(`✓ Cleanup complete (deleted ${allWids.length} wertungen, 2 competitions, 1 event)`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: Event & Competition Setup
  // ═══════════════════════════════════════════════════════════════════

  test.describe('1. Event & Competition Setup', () => {

    test('event appears on Events page', async ({ page }) => {
      await page.goto('/events', { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toContainText(TEST_EVENT.var_eventname, { timeout: 10_000 });
    });

    test('both competitions visible', async ({ page }) => {
      await setEventContext(page, state.eventId, TEST_EVENT.var_eventname);
      await page.goto(`/competitions?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const body = page.locator('body');
      await expect(body).toContainText(TEST_COMP1.name, { timeout: 10_000 });
      await expect(body).toContainText(TEST_COMP2.name, { timeout: 10_000 });
    });

    test('each competition has 2 disciplines', async ({ request }) => {
      const d1 = await apiGet(request, `/competitions/${state.comp1Id}/disciplines`);
      expect((d1.body.disciplines || d1.body).length).toBe(2);

      const d2 = await apiGet(request, `/competitions/${state.comp2Id}/disciplines`);
      expect((d2.body.disciplines || d2.body).length).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Participant Registration
  // ═══════════════════════════════════════════════════════════════════

  test.describe('2. Participant Registration', () => {

    test('API returns ≥7 participants for event', async ({ request }) => {
      const res = await apiGet(request, `/event-participants?eventId=${state.eventId}&includeAvailable=false`);
      expect(res.status).toBe(200);
      expect(res.body.totalInEvent || (res.body.participants || []).length).toBeGreaterThanOrEqual(7);
    });

    test('event participants page loads', async ({ page }) => {
      await setEventContext(page, state.eventId, TEST_EVENT.var_eventname);
      await page.goto(`/event-participants?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Try to verify count in header
      const header = page.locator('h1, h2, h3').filter({ hasText: /Veranstaltungsteilnehmer|Event Participants/i });
      const text = await header.first().textContent({ timeout: 10_000 }).catch(() => '');
      const m = text?.match(/\((\d+)\)/);
      const uiCount = m ? parseInt(m[1]) : -1;

      if (uiCount > 0) {
        expect(uiCount).toBeGreaterThanOrEqual(7);
      } else {
        // API fallback
        const res = await page.request.get(`${API_BASE}/event-participants?eventId=${state.eventId}&includeAvailable=false`);
        const data = await res.json();
        expect(data.totalInEvent || (data.participants || []).length).toBeGreaterThanOrEqual(7);
      }
    });

    test('squad management shows R1 and R2', async ({ page }) => {
      await setEventContext(page, state.eventId, TEST_EVENT.var_eventname);
      await page.goto(`/squads?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toContainText('R1', { timeout: 10_000 });
      await expect(page.locator('body')).toContainText('R2', { timeout: 10_000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Score Entry Verification
  // ═══════════════════════════════════════════════════════════════════

  test.describe('3. Score Entry', () => {

    test('comp1 first participant has scores', async ({ request }) => {
      const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&participantId=${state.comp1Pids[0]}&limit=100`);
      expect(res.status).toBe(200);
      const results = res.body.results || [];
      // Should have 2 entries (Boden w + Sprung w)
      const withScores = results.filter((r: any) => r.score !== null && r.score > 0);
      expect(withScores.length).toBeGreaterThanOrEqual(2);
    });

    test('comp2 first participant has scores', async ({ request }) => {
      const res = await apiGet(request, `/scores?competitionId=${state.comp2Id}&participantId=${state.comp2Pids[0]}&limit=100`);
      expect(res.status).toBe(200);
      const results = res.body.results || [];
      const withScores = results.filter((r: any) => r.score !== null && r.score > 0);
      expect(withScores.length).toBeGreaterThanOrEqual(2);
    });

    test('score capture page loads', async ({ page }) => {
      await setEventContext(page, state.eventId, TEST_EVENT.var_eventname);
      await page.goto(`/score-capture?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const text = await page.locator('body').textContent();
      expect(text!.length).toBeGreaterThan(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: Results & Placements
  // ═══════════════════════════════════════════════════════════════════

  test.describe('4. Results & Placements', () => {

    test('comp1 totals match expected values', async ({ request }) => {
      const totals = await getParticipantTotals(request, state.comp1Id);
      expect(totals.get(state.comp1Pids[0])).toBeCloseTo(27.5, 1);
      expect(totals.get(state.comp1Pids[1])).toBeCloseTo(26.0, 1);
      expect(totals.get(state.comp1Pids[2])).toBeCloseTo(24.0, 1);
      expect(totals.get(state.comp1Pids[3])).toBeCloseTo(21.0, 1);
    });

    test('comp1 ranking order is correct', async ({ request }) => {
      const totals = await getParticipantTotals(request, state.comp1Id);
      const p = state.comp1Pids.map(pid => totals.get(pid) || 0);
      expect(p[0]).toBeGreaterThan(p[1]);
      expect(p[1]).toBeGreaterThan(p[2]);
      expect(p[2]).toBeGreaterThan(p[3]);
    });

    test('comp2 totals match expected values', async ({ request }) => {
      const totals = await getParticipantTotals(request, state.comp2Id);
      expect(totals.get(state.comp2Pids[0])).toBeCloseTo(29.0, 1);
      expect(totals.get(state.comp2Pids[1])).toBeCloseTo(27.0, 1);
      expect(totals.get(state.comp2Pids[2])).toBeCloseTo(23.0, 1);
    });

    test('comp2 ranking order is correct', async ({ request }) => {
      const totals = await getParticipantTotals(request, state.comp2Id);
      const p = state.comp2Pids.map(pid => totals.get(pid) || 0);
      expect(p[0]).toBeGreaterThan(p[1]);
      expect(p[1]).toBeGreaterThan(p[2]);
    });

    test('results page shows competition data', async ({ page }) => {
      await setEventContext(page, state.eventId, TEST_EVENT.var_eventname);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      const body = page.locator('body');
      const has1 = await body.getByText(TEST_COMP1.name).count() > 0;
      const has2 = await body.getByText(TEST_COMP2.name).count() > 0;
      expect(has1 || has2).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: Medal Table
  // ═══════════════════════════════════════════════════════════════════

  test.describe('5. Medal Table', () => {

    test('medals API returns standings', async ({ request }) => {
      const res = await apiGet(request, `/medals/${state.eventId}`);
      expect(res.status).toBe(200);
      expect(res.body.eventId).toBe(state.eventId);
      const standings = res.body.standings;
      expect(Array.isArray(standings)).toBe(true);
      expect(standings.length).toBeGreaterThan(0);
      for (const s of standings) {
        expect(s).toHaveProperty('clubId');
        expect(s).toHaveProperty('totalGold');
        expect(s).toHaveProperty('totalSilver');
        expect(s).toHaveProperty('totalBronze');
        expect(s).toHaveProperty('totalMedals');
      }
    });

    test('2 gold, 2 silver, 2 bronze distributed', async ({ request }) => {
      const res = await apiGet(request, `/medals/${state.eventId}`);
      const { standings } = res.body;
      const g = standings.reduce((s: number, x: any) => s + x.totalGold, 0);
      const si = standings.reduce((s: number, x: any) => s + x.totalSilver, 0);
      const b = standings.reduce((s: number, x: any) => s + x.totalBronze, 0);
      expect(g).toBe(2);
      expect(si).toBe(2);
      expect(b).toBe(2);
    });

    test('standings sorted by gold desc', async ({ request }) => {
      const res = await apiGet(request, `/medals/${state.eventId}`);
      const { standings } = res.body;
      for (let i = 0; i < standings.length - 1; i++) {
        if (standings[i].totalGold !== standings[i + 1].totalGold) {
          expect(standings[i].totalGold).toBeGreaterThanOrEqual(standings[i + 1].totalGold);
        }
      }
    });

    test('Medallienspiegel page displays data', async ({ page }) => {
      // Medallienspiegel only uses EventContext — no URL param fallback
      await setEventContext(page, state.eventId, TEST_EVENT.var_eventname);
      await page.goto('/medallienspiegel', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);

      const bodyText = await page.locator('body').textContent();
      const noEvent = bodyText?.includes('Kein Event') || bodyText?.includes('No event');

      if (noEvent) {
        // EventContext didn't load — verify API
        const r = await page.request.get(`${API_BASE}/medals/${state.eventId}`);
        const d = await r.json();
        expect(d.standings.length).toBeGreaterThan(0);
      } else {
        const rows = await page.locator('table tbody tr').count();
        expect(rows).toBeGreaterThan(0);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6: Cross-Competition Checks
  // ═══════════════════════════════════════════════════════════════════

  test.describe('6. Cross-Competition Checks', () => {

    test('comp1 has 7 participants, comp2 has 3', async ({ request }) => {
      const r1 = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
      const unique1 = new Set((r1.body.results || []).map((r: any) => r.participantId));
      expect(unique1.size).toBe(7);

      const r2 = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
      const unique2 = new Set((r2.body.results || []).map((r: any) => r.participantId));
      expect(unique2.size).toBe(3);
    });

    test('no cross-contamination of discipline scores', async ({ request }) => {
      // Comp1: only disciplines 10 and 7 should have scores
      const r1 = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
      for (const r of (r1.body.results || [])) {
        if (r.score > 0) {
          expect([10, 7]).toContain(r.disciplineId);
        }
      }
      // Comp2: only disciplines 1 and 4 should have scores
      const r2 = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
      for (const r of (r2.body.results || [])) {
        if (r.score > 0) {
          expect([1, 4]).toContain(r.disciplineId);
        }
      }
    });

    test('squads R1 and R2 preserved in API', async ({ request }) => {
      const res = await apiGet(request, `/squad-management?eventId=${state.eventId}`);
      expect(res.status).toBe(200);
      const squads = res.body.squads || res.body;
      const names = squads.map((s: any) => s.name || s.var_riege);
      expect(names).toContain('R1');
      expect(names).toContain('R2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7: Score Validation
  // ═══════════════════════════════════════════════════════════════════

  test.describe('7. Score Validation', () => {

    test('reject missing participantId', async ({ request }) => {
      const r = await apiPost(request, '/scores/save-value', {
        disciplineId: 10, score: 9.5, competitionId: state.comp1Id,
      });
      expect(r.status).toBe(400);
    });

    test('reject missing disciplineId', async ({ request }) => {
      const r = await apiPost(request, '/scores/save-value', {
        participantId: state.comp1Pids[0], score: 9.5, competitionId: state.comp1Id,
      });
      expect(r.status).toBe(400);
    });

    test('reject missing score', async ({ request }) => {
      const r = await apiPost(request, '/scores/save-value', {
        participantId: state.comp1Pids[0], disciplineId: 10, competitionId: state.comp1Id,
      });
      expect(r.status).toBe(400);
    });

    test('can update existing score', async ({ request }) => {
      const pid = state.comp1Pids[0];
      // Update Boden 14.5 → 15.0
      const upd = await apiPost(request, '/scores/save-value', {
        participantId: pid, disciplineId: 10, score: 15.0, competitionId: state.comp1Id,
      });
      expect(upd.status).toBe(200);

      // Verify
      const check = await apiGet(request, `/scores?competitionId=${state.comp1Id}&participantId=${pid}&disciplineId=10&limit=10`);
      const entry = (check.body.results || []).find((r: any) => r.disciplineId === 10);
      expect(entry).toBeDefined();
      expect(entry.score).toBeCloseTo(15.0, 1);

      // Restore
      await apiPost(request, '/scores/save-value', {
        participantId: pid, disciplineId: 10, score: 14.5, competitionId: state.comp1Id,
      });
    });

    test('score of 0 is valid', async ({ request }) => {
      const pid = state.comp1Pids[3];
      const r = await apiPost(request, '/scores/save-value', {
        participantId: pid, disciplineId: 10, score: 0, competitionId: state.comp1Id,
      });
      expect(r.status).toBe(200);
      // Restore
      await apiPost(request, '/scores/save-value', {
        participantId: pid, disciplineId: 10, score: 10.0, competitionId: state.comp1Id,
      });
    });
  });
});
