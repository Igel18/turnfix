import { test, expect, Page, APIRequestContext } from '@playwright/test';

/**
 * E2E Test: Self-Contained Full UI Workflow
 *
 * This test is FULLY SELF-CONTAINED — it creates all data from scratch,
 * enters scores through the Score Capture UI, and verifies placements
 * through the Results UI.
 *
 * Works even on an empty database (schema must exist via Prisma migrations).
 *
 * Data flow:
 * 1. beforeAll: Create infrastructure via API
 *    (sport, venue, region, 2 clubs, 20 participants, 4 disciplines, event, 2 competitions, squads)
 * 2. Tests: Enter 80 scores through Score Capture UI
 * 3. Tests: Verify placements through Results UI
 * 4. afterAll: Clean up all data
 *
 * Disciplines use simple "1*x" formula → single input field, no complex calculation.
 */

const API_BASE = 'http://localhost:3001/api';
const TS = Date.now();

// ═══════════════════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════

const SPORT_NAME = `E2E_Turnen_${TS}`;
const VENUE = { var_name: `E2E_Halle_${TS}`, var_ort: 'Teststadt' };
const REGION_NAME = `E2E_Gau_${TS}`;
const CLUB1_NAME = `TC Alpha ${TS}`;
const CLUB2_NAME = `TC Beta ${TS}`;
const EVENT_NAME = `E2E_UIFlow_${TS}`;

// 4 disciplines with simple "1*x" formula (no complex calculation)
const DISCIPLINE_DEFS = [
  { name: `E2E_DiscA_${TS}`, shortName: 'DA' },
  { name: `E2E_DiscB_${TS}`, shortName: 'DB' },
  { name: `E2E_DiscC_${TS}`, shortName: 'DC' },
  { name: `E2E_DiscD_${TS}`, shortName: 'DD' },
];

// 20 participants (10 women from 2 clubs, 10 men from 2 clubs)
const PARTICIPANT_DEFS = {
  women: [
    // 5 from Club 1 (Alpha)
    { first: 'AnnaUI', last: `Test${TS}`, gender: 2, clubIdx: 0 },
    { first: 'BertaUI', last: `Test${TS}`, gender: 2, clubIdx: 0 },
    { first: 'ClaraUI', last: `Test${TS}`, gender: 2, clubIdx: 0 },
    { first: 'DinaUI', last: `Test${TS}`, gender: 2, clubIdx: 0 },
    { first: 'EvaUI', last: `Test${TS}`, gender: 2, clubIdx: 0 },
    // 5 from Club 2 (Beta)
    { first: 'FionaUI', last: `Test${TS}`, gender: 2, clubIdx: 1 },
    { first: 'GinaUI', last: `Test${TS}`, gender: 2, clubIdx: 1 },
    { first: 'HannaUI', last: `Test${TS}`, gender: 2, clubIdx: 1 },
    { first: 'IdaUI', last: `Test${TS}`, gender: 2, clubIdx: 1 },
    { first: 'JuliaUI', last: `Test${TS}`, gender: 2, clubIdx: 1 },
  ],
  men: [
    // 5 from Club 1 (Alpha)
    { first: 'AdamUI', last: `Test${TS}`, gender: 1, clubIdx: 0 },
    { first: 'BenUI', last: `Test${TS}`, gender: 1, clubIdx: 0 },
    { first: 'CarlUI', last: `Test${TS}`, gender: 1, clubIdx: 0 },
    { first: 'DanUI', last: `Test${TS}`, gender: 1, clubIdx: 0 },
    { first: 'EmilUI', last: `Test${TS}`, gender: 1, clubIdx: 0 },
    // 5 from Club 2 (Beta)
    { first: 'FinnUI', last: `Test${TS}`, gender: 1, clubIdx: 1 },
    { first: 'GerdUI', last: `Test${TS}`, gender: 1, clubIdx: 1 },
    { first: 'HansUI', last: `Test${TS}`, gender: 1, clubIdx: 1 },
    { first: 'IgorUI', last: `Test${TS}`, gender: 1, clubIdx: 1 },
    { first: 'JanUI', last: `Test${TS}`, gender: 1, clubIdx: 1 },
  ],
};

// ─── Score Data ──────────────────────────────────────────────────────
// All totals are unique → unambiguous ranking.
// Scores indexed by participant index, with values for each discipline (0-3).

const WOMEN_SCORES = [
  // W00: 9.50 + 9.00 + 8.50 + 9.00 = 36.00 → Rank 1
  [9.50, 9.00, 8.50, 9.00],
  // W01: 9.00 + 8.50 + 9.00 + 8.00 = 34.50 → Rank 2
  [9.00, 8.50, 9.00, 8.00],
  // W02: 8.50 + 8.00 + 8.00 + 9.50 = 34.00 → Rank 3
  [8.50, 8.00, 8.00, 9.50],
  // W03: 8.00 + 9.50 + 7.50 + 7.00 = 32.00 → Rank 4
  [8.00, 9.50, 7.50, 7.00],
  // W04: 7.50 + 7.00 + 9.00 + 7.50 = 31.00 → Rank 5
  [7.50, 7.00, 9.00, 7.50],
  // W05: 7.00 + 7.50 + 6.50 + 8.00 = 29.00 → Rank 6
  [7.00, 7.50, 6.50, 8.00],
  // W06: 6.50 + 6.00 + 7.00 + 6.50 = 26.00 → Rank 7
  [6.50, 6.00, 7.00, 6.50],
  // W07: 6.00 + 6.50 + 5.50 + 6.00 = 24.00 → Rank 8
  [6.00, 6.50, 5.50, 6.00],
  // W08: 5.50 + 5.00 + 6.00 + 5.50 = 22.00 → Rank 9
  [5.50, 5.00, 6.00, 5.50],
  // W09: 5.00 + 5.50 + 4.50 + 5.00 = 20.00 → Rank 10
  [5.00, 5.50, 4.50, 5.00],
];

const MEN_SCORES = [
  // M00: 9.80 + 9.50 + 9.20 + 9.00 = 37.50 → Rank 1
  [9.80, 9.50, 9.20, 9.00],
  // M01: 9.30 + 9.00 + 8.80 + 8.50 = 35.60 → Rank 2
  [9.30, 9.00, 8.80, 8.50],
  // M02: 8.80 + 8.50 + 8.30 + 8.00 = 33.60 → Rank 3
  [8.80, 8.50, 8.30, 8.00],
  // M03: 8.30 + 8.00 + 7.80 + 7.50 = 31.60 → Rank 4
  [8.30, 8.00, 7.80, 7.50],
  // M04: 7.80 + 7.50 + 7.30 + 7.00 = 29.60 → Rank 5
  [7.80, 7.50, 7.30, 7.00],
  // M05: 7.30 + 7.00 + 6.80 + 6.50 = 27.60 → Rank 6
  [7.30, 7.00, 6.80, 6.50],
  // M06: 6.80 + 6.50 + 6.30 + 6.00 = 25.60 → Rank 7
  [6.80, 6.50, 6.30, 6.00],
  // M07: 6.30 + 6.00 + 5.80 + 5.50 = 23.60 → Rank 8
  [6.30, 6.00, 5.80, 5.50],
  // M08: 5.80 + 5.50 + 5.30 + 5.00 = 21.60 → Rank 9
  [5.80, 5.50, 5.30, 5.00],
  // M09: 5.30 + 5.00 + 4.80 + 4.50 = 19.60 → Rank 10
  [5.30, 5.00, 4.80, 4.50],
];

// Expected rankings (name prefix → expected total → expected rank)
const EXPECTED_WOMEN = [
  { name: 'AnnaUI', total: 36.00, rank: 1 },
  { name: 'BertaUI', total: 34.50, rank: 2 },
  { name: 'ClaraUI', total: 34.00, rank: 3 },
  { name: 'DinaUI', total: 32.00, rank: 4 },
  { name: 'EvaUI', total: 31.00, rank: 5 },
  { name: 'FionaUI', total: 29.00, rank: 6 },
  { name: 'GinaUI', total: 26.00, rank: 7 },
  { name: 'HannaUI', total: 24.00, rank: 8 },
  { name: 'IdaUI', total: 22.00, rank: 9 },
  { name: 'JuliaUI', total: 20.00, rank: 10 },
];

const EXPECTED_MEN = [
  { name: 'AdamUI', total: 37.50, rank: 1 },
  { name: 'BenUI', total: 35.60, rank: 2 },
  { name: 'CarlUI', total: 33.60, rank: 3 },
  { name: 'DanUI', total: 31.60, rank: 4 },
  { name: 'EmilUI', total: 29.60, rank: 5 },
  { name: 'FinnUI', total: 27.60, rank: 6 },
  { name: 'GerdUI', total: 25.60, rank: 7 },
  { name: 'HansUI', total: 23.60, rank: 8 },
  { name: 'IgorUI', total: 21.60, rank: 9 },
  { name: 'JanUI', total: 19.60, rank: 10 },
];

// ═══════════════════════════════════════════════════════════════════════
// TEST STATE
// ═══════════════════════════════════════════════════════════════════════

interface TestState {
  countryId: number;
  federationId: number;
  sportId: number;
  venueId: number;
  regionId: number;
  clubIds: number[];           // [club1Id, club2Id]
  womenPids: number[];         // 10 women participant IDs (master int_teilnehmerid)
  menPids: number[];           // 10 men participant IDs
  disciplineIds: number[];     // 4 discipline IDs in order [A, B, C, D]
  eventId: number;
  comp1Id: number;             // Women's competition
  comp2Id: number;             // Men's competition
}

let state: TestState;

// ═══════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════

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
 * Set EventContext in localStorage so event-aware pages work.
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
      var_location: `E2E Halle`,
      status: 'upcoming',
    }));
  }, { id: eventId, name: eventName });
}

/**
 * Get all wertungenIds for a competition (for cleanup).
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

/**
 * Enter a single score value in the Score Capture UI.
 * Uses data-participant and data-discipline attributes for reliable targeting.
 */
async function enterScore(
  page: Page,
  participantId: number,
  disciplineId: number,
  value: number
) {
  const selector = `input[data-participant="${participantId}"][data-discipline="${disciplineId}"]`;
  const input = page.locator(selector);

  // Wait for input to be ready
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.scrollIntoViewIfNeeded();

  // Clear and type value
  await input.click();
  await input.fill(value.toFixed(2));

  // Trigger save by pressing Tab (more reliable than blur)
  await page.keyboard.press('Tab');

  // Allow async save to complete
  await page.waitForTimeout(300);
}

// ═══════════════════════════════════════════════════════════════════════
// TEST SUITE
// ═══════════════════════════════════════════════════════════════════════

test.describe.serial('Full UI Workflow: Self-Contained Competition', () => {

  // ─── SETUP: Create all test data via API ──────────────────────────
  test.beforeAll(async ({ request }) => {
    state = {
      countryId: 0, federationId: 0,
      sportId: 0, venueId: 0, regionId: 0,
      clubIds: [], womenPids: [], menPids: [],
      disciplineIds: [], eventId: 0, comp1Id: 0, comp2Id: 0,
    };

    // 1. Create Sport
    const sportRes = await apiPost(request, '/sports', { var_name: SPORT_NAME });
    expect(sportRes.status).toBe(201);
    state.sportId = sportRes.body.int_sportid;
    console.log(`✓ Sport: ${state.sportId}`);

    // 2. Create Venue
    const venueRes = await apiPost(request, '/venues', VENUE);
    expect(venueRes.status).toBe(201);
    state.venueId = sportRes.body.int_wettkampforteid || venueRes.body.int_wettkampforteid;
    console.log(`✓ Venue: ${state.venueId}`);

    // 3. Create Country (needed for federation FK)
    const countryRes = await apiPost(request, '/countries', {
      var_name: `E2E_Land_${TS}`,
      var_kuerzel: 'E2EL',
    });
    expect(countryRes.status).toBe(201);
    state.countryId = countryRes.body.int_laenderid;
    console.log(`✓ Country: ${state.countryId}`);

    // 4. Create Federation (Verband) — needed for region FK
    const fedRes = await apiPost(request, '/associations/data/verbaende', {
      var_name: `E2E_Verband_${TS}`,
      var_kuerzel: 'EV',
      int_laenderid: state.countryId,
    });
    expect(fedRes.status).toBe(201);
    state.federationId = fedRes.body.int_verbaendeid;
    console.log(`✓ Federation: ${state.federationId}`);

    // 5. Create Region (Gau) — needs federation FK
    const regionRes = await apiPost(request, '/associations', {
      var_name: REGION_NAME,
      int_verbaendeid: state.federationId,
    });
    expect(regionRes.status).toBe(201);
    state.regionId = regionRes.body.int_gaueid;
    console.log(`✓ Region: ${state.regionId}`);

    // 4. Create 2 Clubs
    for (const clubName of [CLUB1_NAME, CLUB2_NAME]) {
      const clubRes = await apiPost(request, '/clubs', {
        var_name: clubName,
        int_gaueid: state.regionId,
      });
      expect(clubRes.status).toBe(201);
      state.clubIds.push(clubRes.body.int_vereineid);
    }
    console.log(`✓ Clubs: ${state.clubIds.join(', ')}`);

    // 5. Create 20 Participants (10 women + 10 men)
    const allParticipants = [...PARTICIPANT_DEFS.women, ...PARTICIPANT_DEFS.men];
    for (const p of allParticipants) {
      const res = await apiPost(request, '/participants', {
        var_vorname: p.first,
        var_nachname: p.last,
        int_geschlecht: p.gender,
        int_vereineid: state.clubIds[p.clubIdx],
        dat_geburtstag: '2015-06-15',
      });
      expect(res.status).toBe(201);
      const pid = res.body.participant?.int_teilnehmerid || res.body.int_teilnehmerid;
      expect(pid).toBeTruthy();
      if (p.gender === 2) {
        state.womenPids.push(pid);
      } else {
        state.menPids.push(pid);
      }
    }
    expect(state.womenPids.length).toBe(10);
    expect(state.menPids.length).toBe(10);
    console.log(`✓ Participants: ${state.womenPids.length} women, ${state.menPids.length} men`);

    // 6. Create 4 Disciplines with formula "1*x" (simple single-input)
    for (const d of DISCIPLINE_DEFS) {
      const res = await apiPost(request, '/disciplines', {
        name: d.name,
        shortName: d.shortName,
        formula: '1*x',
        calculationType: 2,         // 2 decimal places
        sportId: state.sportId,
        maleAllowed: true,
        femaleAllowed: true,
        shouldCalculate: false,      // Direct input, no formula calculation
        attempts: 1,
      });
      expect(res.status).toBe(201);
      const did = res.body.id || res.body.discipline?.int_disziplinenid || res.body.int_disziplinenid;
      expect(did).toBeTruthy();
      state.disciplineIds.push(did);
    }
    expect(state.disciplineIds.length).toBe(4);
    console.log(`✓ Disciplines: ${state.disciplineIds.join(', ')}`);

    // 7. Create Event
    const eventRes = await apiPost(request, '/events', {
      var_eventname: EVENT_NAME,
      dat_eventstartdate: '2026-06-01',
      dat_eventenddate: '2026-06-02',
      var_location: VENUE.var_name,
    });
    expect(eventRes.status).toBe(201);
    state.eventId = eventRes.body.event?.int_eventid || eventRes.body.int_eventid;
    console.log(`✓ Event: ${state.eventId}`);

    // 8. Create Competition 1 (Women)
    const c1 = await apiPost(request, '/competitions', {
      name: `E2E_Frauen_${TS}`,
      number: 'EW',
      gender: 'weiblich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 0,
      eventId: state.eventId,
      disciplines: state.disciplineIds.map(id => ({ disciplineId: id, maxScore: 20 })),
    });
    expect(c1.status).toBe(201);
    state.comp1Id = c1.body.id;
    console.log(`✓ Competition 1 (Women): ${state.comp1Id}`);

    // 9. Create Competition 2 (Men)
    const c2 = await apiPost(request, '/competitions', {
      name: `E2E_Maenner_${TS}`,
      number: 'EM',
      gender: 'männlich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 0,
      eventId: state.eventId,
      disciplines: state.disciplineIds.map(id => ({ disciplineId: id, maxScore: 20 })),
    });
    expect(c2.status).toBe(201);
    state.comp2Id = c2.body.id;
    console.log(`✓ Competition 2 (Men): ${state.comp2Id}`);

    // 10. Add women to event (auto-assigns to comp1, the first competition)
    for (const pid of state.womenPids) {
      const r = await apiPost(request, '/event-participants/add', {
        eventId: state.eventId,
        participantId: pid,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Added ${state.womenPids.length} women to event (auto-assigned to comp1)`);

    // 11. Add men to event (auto-assigns to comp1 — we'll fix this)
    for (const pid of state.menPids) {
      const r = await apiPost(request, '/event-participants/add', {
        eventId: state.eventId,
        participantId: pid,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Added ${state.menPids.length} men to event (auto-assigned to comp1)`);

    // 12. Assign men to comp2
    for (const pid of state.menPids) {
      const r = await apiPost(request, '/event-participants/assign', {
        participantId: pid,
        competitionId: state.comp2Id,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Assigned men to comp2`);

    // 13. Unassign men from comp1 (they were auto-assigned there)
    for (const pid of state.menPids) {
      await apiDelete(request, `/event-participants/unassign?participantId=${pid}&competitionId=${state.comp1Id}`);
    }
    console.log(`✓ Unassigned men from comp1`);

    // 14. Create squads and assign participants
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'RW' });
    for (const pid of state.womenPids) {
      await apiPost(request, '/squad-management/assign', {
        participantId: pid, squadName: 'RW', eventId: state.eventId,
      });
    }
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'RM' });
    for (const pid of state.menPids) {
      await apiPost(request, '/squad-management/assign', {
        participantId: pid, squadName: 'RM', eventId: state.eventId,
      });
    }
    console.log(`✓ Created squads RW (10 women), RM (10 men)`);

    console.log(`\n✅ SETUP COMPLETE`);
    console.log(`   Event: ${state.eventId} (${EVENT_NAME})`);
    console.log(`   Comp1 (Women): ${state.comp1Id}`);
    console.log(`   Comp2 (Men): ${state.comp2Id}`);
    console.log(`   Disciplines: ${state.disciplineIds.join(', ')}`);
    console.log(`   Women PIDs: ${state.womenPids.join(', ')}`);
    console.log(`   Men PIDs: ${state.menPids.join(', ')}`);
  });

  // ─── CLEANUP: Remove all test data ────────────────────────────────
  test.afterAll(async ({ request }) => {
    if (!state?.eventId) return;
    console.log(`\n🧹 Cleaning up test data...`);

    // 1. Delete wertungen (scores + registrations)
    const w1 = await getWertungenIds(request, state.comp1Id);
    const w2 = await getWertungenIds(request, state.comp2Id);
    const allWids = [...new Set([...w1, ...w2])];
    for (const wid of allWids) {
      await apiDelete(request, `/scores/${wid}`);
    }

    // Also clean up any wertungen without scores (registrations)
    for (const pid of [...state.womenPids, ...state.menPids]) {
      await apiDelete(request, `/event-participants/unassign?participantId=${pid}&competitionId=${state.comp1Id}`);
      await apiDelete(request, `/event-participants/unassign?participantId=${pid}&competitionId=${state.comp2Id}`);
    }

    // 2. Delete competitions
    if (state.comp1Id) await apiDelete(request, `/competitions/${state.comp1Id}`);
    if (state.comp2Id) await apiDelete(request, `/competitions/${state.comp2Id}`);

    // 3. Delete event
    if (state.eventId) await apiDelete(request, `/events/${state.eventId}`);

    // 4. Delete participants
    for (const pid of [...state.womenPids, ...state.menPids]) {
      await apiDelete(request, `/participants/${pid}`);
    }

    // 5. Delete disciplines
    for (const did of state.disciplineIds) {
      await apiDelete(request, `/disciplines/${did}`);
    }

    // 6. Delete clubs
    for (const cid of state.clubIds) {
      await apiDelete(request, `/clubs/${cid}`);
    }

    // 7. Delete region
    if (state.regionId) await apiDelete(request, `/regions/${state.regionId}`);

    // 8. Delete federation (Verband)
    if (state.federationId) await apiDelete(request, `/associations/data/verbaende/${state.federationId}`);

    // 9. Delete country
    if (state.countryId) await apiDelete(request, `/countries/${state.countryId}`);

    // 10. Delete venue
    if (state.venueId) await apiDelete(request, `/venues/${state.venueId}`);

    // 11. Delete sport
    if (state.sportId) await apiDelete(request, `/sports/${state.sportId}`);

    console.log(`✓ Cleanup complete`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: Setup Verification
  // ═══════════════════════════════════════════════════════════════════

  test.describe('1. Setup Verification', () => {

    test('1.1 event appears on Events page', async ({ page }) => {
      await page.goto('/events', { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toContainText(EVENT_NAME, { timeout: 15_000 });
    });

    test('1.2 both competitions visible', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/competitions?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const body = page.locator('body');
      await expect(body).toContainText(`E2E_Frauen_${TS}`, { timeout: 10_000 });
      await expect(body).toContainText(`E2E_Maenner_${TS}`, { timeout: 10_000 });
    });

    test('1.3 each competition has 4 disciplines', async ({ request }) => {
      const d1 = await apiGet(request, `/competitions/${state.comp1Id}/disciplines`);
      const list1 = d1.body.disciplines || d1.body;
      expect(list1.length).toBe(4);

      const d2 = await apiGet(request, `/competitions/${state.comp2Id}/disciplines`);
      const list2 = d2.body.disciplines || d2.body;
      expect(list2.length).toBe(4);
    });

    test('1.4 20 participants registered', async ({ request }) => {
      const res = await apiGet(request, `/event-participants?eventId=${state.eventId}&includeAvailable=false&limit=100`);
      expect(res.status).toBe(200);
      const count = res.body.totalInEvent || (res.body.participants || []).length;
      expect(count).toBeGreaterThanOrEqual(20);
    });

    test('1.5 squads RW and RM exist', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/squads?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await expect(page.locator('body')).toContainText('RW', { timeout: 10_000 });
      await expect(page.locator('body')).toContainText('RM', { timeout: 10_000 });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Score Entry via UI (Women)
  // ═══════════════════════════════════════════════════════════════════

  test.describe('2. Score Entry — Women (UI)', () => {

    test('2.1 navigate to score capture and select squad RW', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/score-capture?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Select squad RW from dropdown
      const squadSelect = page.locator('select').first();
      await squadSelect.waitFor({ state: 'visible', timeout: 10_000 });
      await squadSelect.selectOption({ value: 'RW' });
      await page.waitForTimeout(1500);

      // Verify table shows participants
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });

      // Verify we see at least some E2E participants
      await expect(page.locator('body')).toContainText('AnnaUI', { timeout: 5_000 });
    });

    test('2.2 enter all 40 women scores', async ({ page }) => {
      test.setTimeout(120_000); // 2 min timeout for 40 score entries

      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(
        `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(1000);

      // Select squad RW
      const squadSelect = page.locator('select').first();
      await squadSelect.selectOption({ value: 'RW' });
      await page.waitForTimeout(2000);

      // Uncheck "Jury-Wertungen anzeigen" to get simple score inputs
      const juryCheckbox = page.locator('#showJuryScores');
      if (await juryCheckbox.isChecked()) {
        await juryCheckbox.uncheck();
        await page.waitForTimeout(500);
      }

      // Wait for score inputs to appear
      await page.locator('input[data-participant]').first().waitFor({ state: 'visible', timeout: 15_000 });

      // Enter scores for each woman
      let scoreCount = 0;
      for (let wi = 0; wi < state.womenPids.length; wi++) {
        const pid = state.womenPids[wi];
        const scores = WOMEN_SCORES[wi];

        for (let di = 0; di < state.disciplineIds.length; di++) {
          const did = state.disciplineIds[di];
          await enterScore(page, pid, did, scores[di]);
          scoreCount++;
        }
      }

      expect(scoreCount).toBe(40);
      console.log(`✓ Entered ${scoreCount} women's scores via UI`);

      // Click outside all inputs to ensure the last score save completes
      await page.locator('h1, h2, h3, thead').first().click();

      // Wait for all saves to complete
      await page.waitForTimeout(3000);
    });

    test('2.3 verify women scores saved correctly via API', async ({ request }) => {
      // Retry a few times to allow in-flight saves to complete
      let results: any[] = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
        expect(res.status).toBe(200);
        results = res.body.results || [];
        if (results.length >= 40) break;
        await new Promise(r => setTimeout(r, 1000));
      }

      // Should have 40 score entries (10 participants × 4 disciplines)
      expect(results.length).toBeGreaterThanOrEqual(40);

      // Verify first participant's total
      const annaScores = results.filter((r: any) => r.participantId === state.womenPids[0]);
      const annaTotal = annaScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
      expect(annaTotal).toBeCloseTo(36.00, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Score Entry via UI (Men)
  // ═══════════════════════════════════════════════════════════════════

  test.describe('3. Score Entry — Men (UI)', () => {

    test('3.1 enter all 40 men scores', async ({ page }) => {
      test.setTimeout(120_000);

      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(
        `/score-capture?eventId=${state.eventId}&competitionId=${state.comp2Id}`,
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(1000);

      // Select squad RM
      const squadSelect = page.locator('select').first();
      await squadSelect.selectOption({ value: 'RM' });
      await page.waitForTimeout(2000);

      // Uncheck "Jury-Wertungen anzeigen" to get simple score inputs
      const juryCheckbox = page.locator('#showJuryScores');
      if (await juryCheckbox.isChecked()) {
        await juryCheckbox.uncheck();
        await page.waitForTimeout(500);
      }

      // Wait for score inputs
      await page.locator('input[data-participant]').first().waitFor({ state: 'visible', timeout: 15_000 });

      // Enter scores for each man
      let scoreCount = 0;
      for (let mi = 0; mi < state.menPids.length; mi++) {
        const pid = state.menPids[mi];
        const scores = MEN_SCORES[mi];

        for (let di = 0; di < state.disciplineIds.length; di++) {
          const did = state.disciplineIds[di];
          await enterScore(page, pid, did, scores[di]);
          scoreCount++;
        }
      }

      // Click outside all inputs to ensure the last score save completes
      await page.locator('h1, h2, h3, thead').first().click();

      expect(scoreCount).toBe(40);
      console.log(`✓ Entered ${scoreCount} men's scores via UI`);
      await page.waitForTimeout(3000);
    });

    test('3.2 verify men scores saved correctly via API', async ({ request }) => {
      // Retry a few times to allow in-flight saves to complete
      let results: any[] = [];
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
        expect(res.status).toBe(200);
        results = res.body.results || [];
        if (results.length >= 40) break;
        await new Promise(r => setTimeout(r, 1000));
      }

      expect(results.length).toBeGreaterThanOrEqual(40);

      // Verify first men participant's total
      const adamScores = results.filter((r: any) => r.participantId === state.menPids[0]);
      const adamTotal = adamScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
      expect(adamTotal).toBeCloseTo(37.50, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: Results Verification — Women (UI)
  // The results page shows ALL competitions in grouped view (no dropdown)
  // Each competition has: h3 heading → table with rankings
  // ═══════════════════════════════════════════════════════════════════

  test.describe('4. Results — Women (UI)', () => {

    test('4.1 navigate to results and verify women competition section', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Verify women's competition heading is shown
      const womenHeading = page.locator(`h3:has-text("E2E_Frauen_${TS}")`);
      await expect(womenHeading).toBeVisible({ timeout: 10_000 });

      // Verify the table within the women's section has rows
      const womenSection = womenHeading.locator('xpath=../..');
      const womenTable = womenSection.locator('table');
      await expect(womenTable).toBeVisible({ timeout: 5_000 });
      const rows = womenTable.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBe(10);
    });

    test('4.2 verify women ranking — top 3 placements', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const womenSection = page.locator(`h3:has-text("E2E_Frauen_${TS}")`).locator('xpath=../..');
      const rows = womenSection.locator('table tbody tr');

      // Check top 3 names and totals
      for (const expected of EXPECTED_WOMEN.slice(0, 3)) {
        const row = rows.filter({ hasText: expected.name });
        await expect(row).toBeVisible({ timeout: 5_000 });

        // Find the total cell — contains the total value and "Total" text
        const rowText = await row.textContent() || '';
        expect(rowText).toContain(expected.total.toFixed(2));
      }
    });

    test('4.3 verify women ranking — all 10 placements', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const womenSection = page.locator(`h3:has-text("E2E_Frauen_${TS}")`).locator('xpath=../..');
      const rows = womenSection.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBe(10);

      // Verify each participant appears with correct total
      for (const expected of EXPECTED_WOMEN) {
        const row = rows.filter({ hasText: expected.name });
        await expect(row).toBeVisible({ timeout: 5_000 });
        const rowText = await row.textContent() || '';
        expect(rowText).toContain(expected.total.toFixed(2));
      }

      // Verify ranking order by checking the sequence of names in rows
      for (let i = 0; i < EXPECTED_WOMEN.length; i++) {
        const rowText = await rows.nth(i).textContent() || '';
        expect(rowText).toContain(EXPECTED_WOMEN[i].name);
      }
    });

    test('4.4 verify women medals (gold, silver, bronze)', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const womenSection = page.locator(`h3:has-text("E2E_Frauen_${TS}")`).locator('xpath=../..');
      const rows = womenSection.locator('table tbody tr');

      // Row 0: gold medal 🥇
      const rank1Text = await rows.nth(0).locator('td').first().textContent() || '';
      expect(rank1Text.trim()).toMatch(/🥇|1/);

      // Row 1: silver medal 🥈
      const rank2Text = await rows.nth(1).locator('td').first().textContent() || '';
      expect(rank2Text.trim()).toMatch(/🥈|2/);

      // Row 2: bronze medal 🥉
      const rank3Text = await rows.nth(2).locator('td').first().textContent() || '';
      expect(rank3Text.trim()).toMatch(/🥉|3/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: Results Verification — Men (UI)
  // ═══════════════════════════════════════════════════════════════════

  test.describe('5. Results — Men (UI)', () => {

    test('5.1 verify men ranking — all 10 placements', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const menSection = page.locator(`h3:has-text("E2E_Maenner_${TS}")`).locator('xpath=../..');
      const rows = menSection.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBe(10);

      // Verify each participant and total
      for (const expected of EXPECTED_MEN) {
        const row = rows.filter({ hasText: expected.name });
        await expect(row).toBeVisible({ timeout: 5_000 });
        const rowText = await row.textContent() || '';
        expect(rowText).toContain(expected.total.toFixed(2));
      }

      // Verify ranking order
      for (let i = 0; i < EXPECTED_MEN.length; i++) {
        const rowText = await rows.nth(i).textContent() || '';
        expect(rowText).toContain(EXPECTED_MEN[i].name);
      }
    });

    test('5.2 verify men medals', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const menSection = page.locator(`h3:has-text("E2E_Maenner_${TS}")`).locator('xpath=../..');
      const rows = menSection.locator('table tbody tr');

      // Gold: AdamUI
      const rank1Text = await rows.nth(0).textContent() || '';
      expect(rank1Text).toContain('AdamUI');

      // Silver: BenUI
      const rank2Text = await rows.nth(1).textContent() || '';
      expect(rank2Text).toContain('BenUI');

      // Bronze: CarlUI
      const rank3Text = await rows.nth(2).textContent() || '';
      expect(rank3Text).toContain('CarlUI');
    });

    test('5.3 verify last place men', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const menSection = page.locator(`h3:has-text("E2E_Maenner_${TS}")`).locator('xpath=../..');
      const rows = menSection.locator('table tbody tr');

      // Last place: JanUI with 19.60
      const lastRowText = await rows.nth(9).textContent() || '';
      expect(lastRowText).toContain('JanUI');
      expect(lastRowText).toContain('19.60');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6: Grouped Results View (UI)
  // ═══════════════════════════════════════════════════════════════════

  test.describe('6. Grouped Results View (UI)', () => {

    test('6.1 grouped view shows both competitions', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Verify both competition names appear
      const body = page.locator('body');
      await expect(body).toContainText(`E2E_Frauen_${TS}`, { timeout: 5_000 });
      await expect(body).toContainText(`E2E_Maenner_${TS}`, { timeout: 5_000 });
    });

    test('6.2 grouped view shows correct participant counts', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Each competition section should have a table with 10 rows
      const tables = page.locator('table');
      const tableCount = await tables.count();
      expect(tableCount).toBeGreaterThanOrEqual(2);

      // Both tables should have 10 rows each
      for (let t = 0; t < 2; t++) {
        const rows = tables.nth(t).locator('tbody tr');
        const rowCount = await rows.count();
        expect(rowCount).toBe(10);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7: Cross-Competition Verification
  // ═══════════════════════════════════════════════════════════════════

  test.describe('7. Cross-Competition Verification', () => {

    test('7.1 women comp has only women participants', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const womenSection = page.locator(`h3:has-text("E2E_Frauen_${TS}")`).locator('xpath=../..');
      const rows = womenSection.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBe(10);

      // All names should be women's names
      const womenNames = EXPECTED_WOMEN.map(w => w.name);
      for (let i = 0; i < rowCount; i++) {
        const rowText = await rows.nth(i).textContent() || '';
        expect(womenNames.some(wn => rowText.includes(wn))).toBeTruthy();
      }
    });

    test('7.2 men comp has only men participants', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const menSection = page.locator(`h3:has-text("E2E_Maenner_${TS}")`).locator('xpath=../..');
      const rows = menSection.locator('table tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBe(10);

      const menNames = EXPECTED_MEN.map(m => m.name);
      for (let i = 0; i < rowCount; i++) {
        const rowText = await rows.nth(i).textContent() || '';
        expect(menNames.some(mn => rowText.includes(mn))).toBeTruthy();
      }
    });

    test('7.3 both clubs represented in results', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const body = page.locator('body');
      await expect(body).toContainText(CLUB1_NAME, { timeout: 5_000 });
      await expect(body).toContainText(CLUB2_NAME, { timeout: 5_000 });
    });

    test('7.4 highest total is men gold (37.50)', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const menSection = page.locator(`h3:has-text("E2E_Maenner_${TS}")`).locator('xpath=../..');
      const firstRow = menSection.locator('table tbody tr').first();
      const firstRowText = await firstRow.textContent() || '';
      expect(firstRowText).toContain('37.50');
    });

    test('7.5 lowest total is men rank 10 (19.60)', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const menSection = page.locator(`h3:has-text("E2E_Maenner_${TS}")`).locator('xpath=../..');
      const rows = menSection.locator('table tbody tr');
      const lastRowText = await rows.nth(9).textContent() || '';
      expect(lastRowText).toContain('19.60');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 8: Score Capture UI Validation
  // ═══════════════════════════════════════════════════════════════════

  test.describe('8. Score Capture UI Validation', () => {

    test('8.1 score capture shows previously entered values', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(
        `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(1000);

      // Select squad RW
      const squadSelect = page.locator('select').first();
      await squadSelect.selectOption({ value: 'RW' });
      await page.waitForTimeout(2000);

      // Uncheck "Jury-Wertungen anzeigen" to get simple score inputs
      const juryCheckbox = page.locator('#showJuryScores');
      if (await juryCheckbox.isChecked()) {
        await juryCheckbox.uncheck();
        await page.waitForTimeout(500);
      }

      // Verify AnnaUI's first discipline score is filled
      const annaInput = page.locator(
        `input[data-participant="${state.womenPids[0]}"][data-discipline="${state.disciplineIds[0]}"]`
      );
      await expect(annaInput).toBeVisible({ timeout: 5_000 });

      const value = await annaInput.inputValue();
      expect(parseFloat(value)).toBeCloseTo(9.50, 1);
    });

    test('8.2 discipline column headers visible', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(
        `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(1000);

      const squadSelect = page.locator('select').first();
      await squadSelect.selectOption({ value: 'RW' });
      await page.waitForTimeout(2000);

      // Verify discipline headers are visible
      const headers = page.locator('thead th');
      const headerText = await headers.allTextContents();
      const joined = headerText.join(' ');

      // At least some discipline names should be visible
      const hasDiscHeaders = DISCIPLINE_DEFS.some(d =>
        joined.includes(d.shortName) || joined.includes(d.name)
      );
      expect(hasDiscHeaders).toBeTruthy();
    });

    test('8.3 all 10 women visible in score table', async ({ page }) => {
      await setEventContext(page, state.eventId, EVENT_NAME);
      await page.goto(
        `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
        { waitUntil: 'networkidle' }
      );
      await page.waitForTimeout(1000);

      const squadSelect = page.locator('select').first();
      await squadSelect.selectOption({ value: 'RW' });
      await page.waitForTimeout(2000);

      for (const w of EXPECTED_WOMEN) {
        await expect(page.locator('body')).toContainText(w.name, { timeout: 3_000 });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 9: Statistical Validation
  // ═══════════════════════════════════════════════════════════════════

  test.describe('9. Statistical Validation', () => {

    test('9.1 women score totals sum correctly', async ({ request }) => {
      const expectedWomenTotalSum = EXPECTED_WOMEN.reduce((sum, w) => sum + w.total, 0);
      // 36.00 + 34.50 + 34.00 + 32.00 + 31.00 + 29.00 + 26.00 + 24.00 + 22.00 + 20.00 = 288.50

      const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
      const results = res.body.results || [];
      const actualTotal = results.reduce((sum: number, r: any) => sum + (r.score || 0), 0);

      expect(actualTotal).toBeCloseTo(expectedWomenTotalSum, 1);
    });

    test('9.2 men score totals sum correctly', async ({ request }) => {
      const expectedMenTotalSum = EXPECTED_MEN.reduce((sum, m) => sum + m.total, 0);
      // 37.50 + 35.60 + 33.60 + 31.60 + 29.60 + 27.60 + 25.60 + 23.60 + 21.60 + 19.60 = 285.90

      const res = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
      const results = res.body.results || [];
      const actualTotal = results.reduce((sum: number, r: any) => sum + (r.score || 0), 0);

      expect(actualTotal).toBeCloseTo(expectedMenTotalSum, 1);
    });

    test('9.3 no duplicate scores', async ({ request }) => {
      for (const compId of [state.comp1Id, state.comp2Id]) {
        const res = await apiGet(request, `/scores?competitionId=${compId}&limit=1000`);
        const results = res.body.results || [];

        // Check no duplicate participantId+disciplineId combos
        const keys = results.map((r: any) => `${r.participantId}-${r.disciplineId}`);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      }
    });

    test('9.4 each competition has exactly 40 score entries', async ({ request }) => {
      const res1 = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
      expect((res1.body.results || []).length).toBe(40);

      const res2 = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
      expect((res2.body.results || []).length).toBe(40);
    });

    test('9.5 club distribution: 5 per club per competition', async ({ request }) => {
      // Women: 5 from Alpha (pids 0-4), 5 from Beta (pids 5-9)
      const res1 = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
      const womenResults = res1.body.results || [];
      const alphaPids = new Set(state.womenPids.slice(0, 5));
      const betaPids = new Set(state.womenPids.slice(5, 10));

      const alphaScores = womenResults.filter((r: any) => alphaPids.has(r.participantId));
      const betaScores = womenResults.filter((r: any) => betaPids.has(r.participantId));

      // 5 participants × 4 disciplines = 20 scores per club
      expect(alphaScores.length).toBe(20);
      expect(betaScores.length).toBe(20);
    });
  });
});
