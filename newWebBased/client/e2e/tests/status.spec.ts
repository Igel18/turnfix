/**
 * Status E2E Tests: Squad Status & Competition Status
 *
 * Tests the status workflow integration at three stages:
 *   1. Before scoring    → overallStatus = 'not_started'
 *   2. After partial scores → overallStatus = 'in_progress'
 *   3. After all scores     → overallStatus = 'completed'
 *
 * Uses Event A (from setup) to verify the "completed" baseline,
 * plus a self-contained mini-event to test the full progression.
 *
 * Related pages:
 *   /competition-status?eventId=X  — aggregated competition progress
 *   /squad-status?eventId=X        — per-squad × discipline status matrix
 */

import { test, expect } from '@playwright/test';
import { API_BASE } from '../fixtures/test-data';
import {
  loadEventAState,
  apiPost,
  apiGet,
  apiDelete,
  setEventContext,
  getWertungenIds,
  EventAState,
} from '../fixtures/test-state';

// ─── Mini-Event State (created within these tests) ────────────────
interface MiniEventState {
  eventId: number;
  eventName: string;
  competitionId: number;
  participantIds: number[];
  disciplineIds: number[];
  squadName: string;
}

let stateA: EventAState;
let miniEvent: MiniEventState;
const TS = Date.now();

test.describe.serial('Status Workflow: Squad & Competition Status', () => {

  test.beforeAll(() => {
    stateA = loadEventAState();
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 1 — Event A: Verify "completed" state (all 80 scores entered)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('1.1  API — Event A competition-status shows completed', async ({ request }) => {
    const res = await apiGet(request, `/competition-status?eventId=${stateA.eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.competitions).toBeDefined();
    expect(res.body.competitions.length).toBeGreaterThanOrEqual(2);

    for (const comp of res.body.competitions) {
      expect(comp.overallStatus).toBe('completed');
      expect(comp.totalSquadDisciplines).toBeGreaterThan(0);
      expect(comp.completedSquadDisciplines).toBe(comp.totalSquadDisciplines);
      expect(comp.participantCount).toBeGreaterThan(0);
    }
    console.log('✓ Event A: Both competitions show "completed"');
  });

  test('1.2  API — Generate squad-discipline combos for Event A', async ({ request }) => {
    const res = await apiPost(request, '/squad-disciplines/generate', {
      eventId: stateA.eventId,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
    console.log(`✓ Squad-discipline combos: ${res.body.created} created, ${res.body.existing} existing`);
  });

  test('1.3  API — Event A squad-disciplines have status', async ({ request }) => {
    const res = await apiGet(request, `/squad-disciplines?eventId=${stateA.eventId}`);
    expect(res.status).toBe(200);

    const sds = res.body.squadDisciplines;
    expect(sds).toBeDefined();
    expect(sds.length).toBeGreaterThan(0);

    for (const sd of sds) {
      expect(sd.squadName).toBeTruthy();
      expect(sd.disciplineId).toBeTruthy();
      expect(sd.status).toBeDefined();
      expect(sd.status.id).toBeGreaterThan(0);
      expect(sd.status.name).toBeTruthy();
    }
    console.log(`✓ Event A: ${sds.length} squad-discipline combos with status`);
  });

  test('1.4  UI — Competition Status page shows completed for Event A', async ({ page }) => {
    await setEventContext(page, stateA.eventId, stateA.eventName);
    await page.goto(`/competition-status?eventId=${stateA.eventId}`);
    await page.waitForLoadState('networkidle');

    // Competitions visible
    await expect(page.getByText(stateA.comp1Name)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(stateA.comp2Name)).toBeVisible();

    // 100 % progress visible (matrix cell or progress bar)
    const fullProgress = page.locator('.text-lg').filter({ hasText: '100%' });
    await expect(fullProgress.first()).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Competition Status shows completed for Event A');
  });

  test('1.5  UI — Squad Status page displays for Event A', async ({ page }) => {
    await setEventContext(page, stateA.eventId, stateA.eventName);
    await page.goto(`/squad-status?eventId=${stateA.eventId}`);
    await page.waitForLoadState('networkidle');

    // Squad names visible in table cells
    await expect(page.getByRole('cell', { name: 'RW', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('cell', { name: 'RM', exact: true })).toBeVisible();

    // Matrix / table / grid rendered
    await expect(
      page.locator('table, [class*="grid"], [class*="matrix"]').first()
    ).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Squad Status page loaded for Event A');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 2 — Mini Event: Create & verify "not_started"
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('2.1  Create mini event (2 participants × 2 disciplines, no scores)', async ({ request }) => {
    // ── 2 disciplines ──
    const discIds: number[] = [];
    for (let i = 0; i < 2; i++) {
      const res = await apiPost(request, '/disciplines', {
        name: `E2E_Status_D${i + 1}_${TS}`,
        shortName: `S${i + 1}`,
        formula: '1*x',
        calculationType: 2,
        sportId: stateA.sportId,
        maleAllowed: true,
        femaleAllowed: true,
        shouldCalculate: false,
        attempts: 1,
      });
      expect(res.status).toBe(201);
      discIds.push(
        res.body.id ?? res.body.discipline?.int_disziplinenid ?? res.body.int_disziplinenid
      );
    }

    // ── Event ──
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
    const eventName = `E2E_StatusTest_${TS}`;
    const eventRes = await apiPost(request, '/events', {
      var_eventname: eventName,
      dat_eventstartdate: today,
      dat_eventenddate: tomorrow,
      var_location: `E2E_StatusHalle_${TS}`,
    });
    expect(eventRes.status).toBe(201);
    const eventId = eventRes.body.event?.int_eventid ?? eventRes.body.int_eventid;

    // ── 1 competition with 2 disciplines ──
    const compRes = await apiPost(request, '/competitions', {
      name: `E2E_StatusComp_${TS}`,
      number: 'SC',
      gender: 'weiblich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 0,
      eventId,
      disciplines: discIds.map(id => ({ disciplineId: id, maxScore: 20 })),
    });
    expect(compRes.status).toBe(201);
    const competitionId = compRes.body.id;

    // ── 2 participants ──
    const pids: number[] = [];
    for (let i = 0; i < 2; i++) {
      const pRes = await apiPost(request, '/participants', {
        var_vorname: `StatusP${i + 1}`,
        var_nachname: `E2E_${TS}`,
        int_geschlecht: 2, // female
        int_vereineid: stateA.clubIds[0],
        dat_geburtstag: '2015-06-15',
      });
      expect(pRes.status).toBe(201);
      const pid = pRes.body.participant?.int_teilnehmerid ?? pRes.body.int_teilnehmerid;
      pids.push(pid);

      // Add to event
      const addRes = await apiPost(request, '/event-participants/add', {
        eventId,
        participantId: pid,
      });
      expect(addRes.status).toBe(201);
    }

    // ── 1 squad ──
    await apiPost(request, '/squad-management/create', { eventId, name: 'SR' });
    for (const pid of pids) {
      await apiPost(request, '/squad-management/assign', {
        participantId: pid,
        squadName: 'SR',
        eventId,
      });
    }

    // ── Generate squad-discipline combos ──
    const genRes = await apiPost(request, '/squad-disciplines/generate', { eventId });
    expect(genRes.status).toBe(200);

    miniEvent = {
      eventId,
      eventName,
      competitionId,
      participantIds: pids,
      disciplineIds: discIds,
      squadName: 'SR',
    };

    console.log(`✓ Mini event created: id=${eventId}, 2 participants × 2 disciplines = 4 scores needed`);
  });

  test('2.2  API — Mini event competition-status is "not_started"', async ({ request }) => {
    const res = await apiGet(request, `/competition-status?eventId=${miniEvent.eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.competitions.length).toBe(1);

    const comp = res.body.competitions[0];
    expect(comp.overallStatus).toBe('not_started');
    expect(comp.participantCount).toBe(2);
    expect(comp.totalSquadDisciplines).toBe(4); // 2 participants × 2 disciplines
    expect(comp.completedSquadDisciplines).toBe(0);

    console.log(`✓ Mini event: "not_started" (0/${comp.totalSquadDisciplines})`);
  });

  test('2.3  API — Mini event squad-disciplines have default status', async ({ request }) => {
    const res = await apiGet(request, `/squad-disciplines?eventId=${miniEvent.eventId}`);
    expect(res.status).toBe(200);

    const sds = res.body.squadDisciplines;
    expect(sds.length).toBe(2); // 1 squad × 2 disciplines

    for (const sd of sds) {
      expect(sd.squadName).toBe('SR');
      expect(sd.status).toBeDefined();
      expect(sd.status.name).toBeTruthy();
    }
    console.log(`✓ Mini event: ${sds.length} squad-discipline combos with default status`);
  });

  test('2.4  UI — Competition Status page shows "not_started" for mini event', async ({ page }) => {
    await setEventContext(page, miniEvent.eventId, miniEvent.eventName);
    await page.goto(`/competition-status?eventId=${miniEvent.eventId}`);
    await page.waitForLoadState('networkidle');

    // Competition name or number visible
    await expect(
      page.getByText(/StatusComp|SC/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // 0 % progress expected in the matrix cell
    const zeroProgress = page.locator('.text-lg').filter({ hasText: '0%' });
    await expect(zeroProgress.first()).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Competition Status shows 0 % (not_started) for mini event');
  });

  test('2.5  UI — Squad Status page shows default status for mini event', async ({ page }) => {
    await setEventContext(page, miniEvent.eventId, miniEvent.eventName);
    await page.goto(`/squad-status?eventId=${miniEvent.eventId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('cell', { name: 'SR', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('table, [class*="grid"], [class*="matrix"]').first()
    ).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Squad Status page loaded for mini event');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 3 — Enter partial scores → "in_progress"
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('3.1  Enter 2 of 4 scores (participant 1 only)', async ({ request }) => {
    // Scores for participant 1 in both disciplines
    for (let di = 0; di < miniEvent.disciplineIds.length; di++) {
      const res = await apiPost(request, '/scores/save-value', {
        competitionId: miniEvent.competitionId,
        participantId: miniEvent.participantIds[0],
        disciplineId: miniEvent.disciplineIds[di],
        score: 12.5 + di,
      });
      expect(res.status).toBeLessThan(300);
    }
    console.log('✓ Entered 2 / 4 scores (participant 1 × 2 disciplines)');
  });

  test('3.2  API — Mini event competition-status is "in_progress"', async ({ request }) => {
    const res = await apiGet(request, `/competition-status?eventId=${miniEvent.eventId}`);
    expect(res.status).toBe(200);

    const comp = res.body.competitions[0];
    expect(comp.overallStatus).toBe('in_progress');
    expect(comp.completedSquadDisciplines).toBe(2);  // 1 participant × 2 disciplines
    expect(comp.totalSquadDisciplines).toBe(4);

    console.log(`✓ Mini event: "in_progress" (${comp.completedSquadDisciplines}/${comp.totalSquadDisciplines})`);
  });

  test('3.3  UI — Competition Status page shows partial progress', async ({ page }) => {
    await setEventContext(page, miniEvent.eventId, miniEvent.eventName);
    await page.goto(`/competition-status?eventId=${miniEvent.eventId}`);
    await page.waitForLoadState('networkidle');

    // 50 % progress expected (2 of 4 completed)
    const halfProgress = page.locator('.text-lg').filter({ hasText: '50%' });
    await expect(halfProgress.first()).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Competition Status shows 50 % (in_progress) for mini event');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 4 — Enter remaining scores → "completed"
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('4.1  Enter remaining 2 scores (participant 2)', async ({ request }) => {
    for (let di = 0; di < miniEvent.disciplineIds.length; di++) {
      const res = await apiPost(request, '/scores/save-value', {
        competitionId: miniEvent.competitionId,
        participantId: miniEvent.participantIds[1],
        disciplineId: miniEvent.disciplineIds[di],
        score: 14.0 + di,
      });
      expect(res.status).toBeLessThan(300);
    }
    console.log('✓ Entered 4 / 4 scores (all participants × all disciplines)');
  });

  test('4.2  API — Mini event competition-status is "completed"', async ({ request }) => {
    const res = await apiGet(request, `/competition-status?eventId=${miniEvent.eventId}`);
    expect(res.status).toBe(200);

    const comp = res.body.competitions[0];
    expect(comp.overallStatus).toBe('completed');
    expect(comp.completedSquadDisciplines).toBe(comp.totalSquadDisciplines);
    expect(comp.totalSquadDisciplines).toBe(4);

    console.log(`✓ Mini event: "completed" (${comp.completedSquadDisciplines}/${comp.totalSquadDisciplines})`);
  });

  test('4.3  UI — Competition Status page shows 100 % progress', async ({ page }) => {
    await setEventContext(page, miniEvent.eventId, miniEvent.eventName);
    await page.goto(`/competition-status?eventId=${miniEvent.eventId}`);
    await page.waitForLoadState('networkidle');

    const fullProgress = page.locator('.text-lg').filter({ hasText: '100%' });
    await expect(fullProgress.first()).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Competition Status shows 100 % (completed) for mini event');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PHASE 5 — Squad-discipline status management
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('5.1  API — Update squad-discipline status via PUT', async ({ request }) => {
    // Fetch available statuses
    const statusRes = await apiGet(request, '/statuses');
    expect(statusRes.status).toBe(200);
    const statuses = statusRes.body.statuses ?? statusRes.body;
    expect(statuses.length).toBeGreaterThan(1);

    // Pick a non-default status (first one with id > 1)
    const targetStatus = statuses.find(
      (s: any) => s.int_statusid > 1 && s.var_name !== 'kein Status'
    );
    if (!targetStatus) {
      console.log('⏭️  Only one status available — skipping status update test');
      return;
    }

    // PUT update
    const putRes = await request.put(
      `${API_BASE}/squad-disciplines/${miniEvent.squadName}/${miniEvent.disciplineIds[0]}/status?eventId=${miniEvent.eventId}`,
      {
        data: { statusId: targetStatus.int_statusid },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    expect(putRes.status()).toBe(200);

    // Verify via GET
    const verifyRes = await apiGet(request, `/squad-disciplines?eventId=${miniEvent.eventId}`);
    const updated = verifyRes.body.squadDisciplines.find(
      (sd: any) => sd.disciplineId === miniEvent.disciplineIds[0]
    );
    expect(updated).toBeDefined();
    expect(updated.statusId).toBe(targetStatus.int_statusid);
    expect(updated.status.name).toBe(targetStatus.var_name);

    console.log(`✓ Squad-discipline status updated to "${targetStatus.var_name}"`);
  });

  test('5.2  UI — Squad Status page reflects updated status', async ({ page }) => {
    await setEventContext(page, miniEvent.eventId, miniEvent.eventName);
    await page.goto(`/squad-status?eventId=${miniEvent.eventId}`);
    await page.waitForLoadState('networkidle');

    // Squad name visible in table cell
    await expect(page.getByRole('cell', { name: 'SR', exact: true })).toBeVisible({ timeout: 10_000 });

    // Data rendered (table / matrix)
    await expect(
      page.locator('table, [class*="grid"], [class*="matrix"]').first()
    ).toBeVisible({ timeout: 10_000 });

    // At least one status badge with text should be visible
    // (the updated status name from phase 5.1)
    const badges = page.locator(
      'span.inline-block, span.inline-flex'
    ).filter({ hasText: /.+/ });
    await expect(badges.first()).toBeVisible({ timeout: 10_000 });

    console.log('✓ UI: Squad Status page reflects updated status');
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLEANUP — Delete mini event data
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  test('Cleanup: Delete mini event data', async ({ request }) => {
    if (!miniEvent) {
      console.log('⏭️  No mini event to clean up');
      return;
    }

    // 1) Delete scores
    try {
      const wids = await getWertungenIds(request, miniEvent.competitionId);
      for (const wid of wids) {
        await apiDelete(request, `/scores/${wid}`);
      }
      console.log(`  ✓ Deleted ${wids.length} scores`);
    } catch (e) {
      console.log(`  ⚠ Score cleanup: ${e}`);
    }

    // 2) Delete competition
    await apiDelete(request, `/competitions/${miniEvent.competitionId}`);
    console.log('  ✓ Deleted competition');

    // 3) Delete event
    await apiDelete(request, `/events/${miniEvent.eventId}`);
    console.log('  ✓ Deleted event');

    // 4) Delete participants
    for (const pid of miniEvent.participantIds) {
      await apiDelete(request, `/participants/${pid}`);
    }
    console.log(`  ✓ Deleted ${miniEvent.participantIds.length} participants`);

    // 5) Delete disciplines
    for (const did of miniEvent.disciplineIds) {
      await apiDelete(request, `/disciplines/${did}`);
    }
    console.log(`  ✓ Deleted ${miniEvent.disciplineIds.length} disciplines`);

    console.log('✓ Mini event cleaned up');
  });
});
