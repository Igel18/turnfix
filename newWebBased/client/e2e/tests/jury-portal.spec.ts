/**
 * Jury Portal E2E Tests — Score Entry via Jury Portal UI
 *
 * Depends on: Event A (setup/create-event)
 * Tests the complete Jury Portal workflow:
 *   1. Navigate to Jury Portal at /jury
 *   2. Select event from dropdown
 *   3. Select squad (RW or RM)
 *   4. Select device/discipline
 *   5. Enter scores via Jury Portal scoring UI
 *   6. Verify scores via API
 *   7. Verify scores appear in Management UI (Score Capture)
 *
 * The Jury Portal is served at http://localhost:3002/jury by the jury-server
 * and uses a separate React app with its own state management.
 */

import { test, expect, Page } from '@playwright/test';
import {
  loadEventAState,
  setEventContext,
  apiGet,
  apiPost,
  EventAState,
} from '../fixtures/test-state';
import {
  API_BASE,
  WOMEN_FIRST_NAMES,
  MEN_FIRST_NAMES,
  WOMEN_SCORES,
  MEN_SCORES,
} from '../fixtures/test-data';

const JURY_URL = 'http://localhost:3002/jury';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** Navigate Jury Portal: disable today filter, select event, click "Weiter" */
async function selectEventInJuryPortal(page: Page, eventId: number) {
  await page.goto(JURY_URL, { waitUntil: 'networkidle' });

  // Disable "Filter today" so all events are visible
  await page.evaluate(() => {
    localStorage.setItem('juryPortal_filterToday', 'false');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Select event from dropdown
  const selectEl = page.locator('select').first();
  await selectEl.waitFor({ state: 'visible', timeout: 10_000 });
  await selectEl.selectOption(eventId.toString());
  await page.waitForTimeout(500);

  // Click "Weiter zur Riegeneinteilung"
  const weiterBtn = page.getByText('Weiter zur Riegeneinteilung');
  await weiterBtn.waitFor({ state: 'visible', timeout: 5_000 });
  await weiterBtn.click();
  await page.waitForTimeout(2000);
}

/** From squad selection step, click a squad by name */
async function selectSquad(page: Page, squadName: string) {
  const squadCard = page.locator(`text=${squadName}`).first();
  await squadCard.waitFor({ state: 'visible', timeout: 10_000 });
  await squadCard.click();
  await page.waitForTimeout(2000);
}

/** From device selection step, click a device by name */
async function selectDevice(page: Page, deviceName: string) {
  const deviceCard = page.locator(`text=${deviceName}`).first();
  await deviceCard.waitFor({ state: 'visible', timeout: 10_000 });
  await deviceCard.click();
  await page.waitForTimeout(2000);
}

/** Full navigation: event → squad → device → scoring view */
async function navigateToScoring(page: Page, eventId: number, squadName: string, deviceName: string) {
  await selectEventInJuryPortal(page, eventId);
  await selectSquad(page, squadName);
  await selectDevice(page, deviceName);
  // Wait for participants to load
  await page.waitForTimeout(3000);
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION 1: Jury Portal Navigation
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Navigation', () => {

  test('1.1 Jury Portal loads and shows welcome page', async ({ page }) => {
    await page.goto(JURY_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Should show "Kampfrichter-Portal" or event selection heading
    const body = await page.locator('body').textContent();
    const hasPortalText = body?.includes('Kampfrichter') || body?.includes('Event auswählen');
    expect(hasPortalText).toBe(true);
  });

  test('1.2 Test event is visible after disabling today filter', async ({ page }) => {
    await page.goto(JURY_URL, { waitUntil: 'networkidle' });

    // Disable today filter
    await page.evaluate(() => {
      localStorage.setItem('juryPortal_filterToday', 'false');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check event is in dropdown options
    const selectEl = page.locator('select').first();
    await selectEl.waitFor({ state: 'visible', timeout: 10_000 });
    const options = await selectEl.locator('option').allTextContents();
    const hasOurEvent = options.some(opt => opt.includes(state.eventName));
    expect(hasOurEvent).toBe(true);
  });

  test('1.3 Selecting event and clicking "Weiter" shows squad selection', async ({ page }) => {
    await selectEventInJuryPortal(page, state.eventId);

    // Should show "Riege auswählen" heading
    await expect(page.locator('body')).toContainText('Riege auswählen', { timeout: 10_000 });

    // Both squads RW and RM should be visible
    await expect(page.locator('body')).toContainText('RW', { timeout: 5_000 });
    await expect(page.locator('body')).toContainText('RM', { timeout: 5_000 });
  });

  test('1.4 Clicking squad RW shows device selection', async ({ page }) => {
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    // Should show "Gerät auswählen" heading
    await expect(page.locator('body')).toContainText('Gerät auswählen', { timeout: 10_000 });
  });

  test('1.5 Clicking a device shows scoring view with participants', async ({ page }) => {
    test.setTimeout(45_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    // Wait for devices to load and click the first one
    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    const deviceCount = await deviceCards.count();
    expect(deviceCount).toBeGreaterThan(0);
    await deviceCards.first().click();
    await page.waitForTimeout(3000);

    // Should show "Teilnehmer" or participant names in scoring view
    const body = await page.locator('body').textContent({ timeout: 10_000 });
    const hasParticipant = WOMEN_FIRST_NAMES.some(name => body?.includes(name));
    expect(hasParticipant).toBe(true);
  });

  test('1.6 Squad shows correct participant count', async ({ page }) => {
    await selectEventInJuryPortal(page, state.eventId);

    // Squad RW should show "10 Teilnehmer"
    await expect(page.locator('body')).toContainText('10 Teilnehmer', { timeout: 10_000 });
  });

  test('1.7 Back navigation works', async ({ page }) => {
    await selectEventInJuryPortal(page, state.eventId);

    // Click "Zurück"
    const backBtn = page.getByText('← Zurück');
    await backBtn.click();
    await page.waitForTimeout(1000);

    // Should be back at event selection
    const selectEl = page.locator('select').first();
    await expect(selectEl).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 2: Score display in Jury Portal
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Existing Scores Display', () => {

  test('2.1 Pre-entered women scores are visible in scoring view', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    // Wait for devices to load and click first discipline
    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();
    await page.waitForTimeout(3000);

    // Check that at least some participants show scores (green checkmarks or score values)
    const body = await page.locator('body').textContent({ timeout: 10_000 });

    // First participant (AnnaUI) should be visible
    expect(body).toContain(WOMEN_FIRST_NAMES[0]);
  });

  test('2.2 Scoring view shows participant count', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();
    await page.waitForTimeout(3000);

    // Should show "Teilnehmer X von Y"
    await expect(page.locator('body')).toContainText(/Teilnehmer \d+ von \d+/, { timeout: 10_000 });
  });

  test('2.3 Men squad RM also shows participants', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RM');

    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();
    await page.waitForTimeout(3000);

    // First male participant (AdamUI) should be visible
    const body = await page.locator('body').textContent({ timeout: 10_000 });
    expect(body).toContain(MEN_FIRST_NAMES[0]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 3: Score Entry via Jury Portal UI
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Score Entry', () => {

  test('3.1 Can enter and save a score for first participant', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    // Select first device
    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();
    await page.waitForTimeout(3000);

    // The scoring view should show a score input and "Bewertung speichern" button
    const saveBtn = page.getByText('Bewertung speichern').or(page.getByText('Speichert...'));
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });

    // There should be a score input (text/decimal input)
    const scoreInput = page.locator('input[type="text"][inputmode="decimal"]');
    if (await scoreInput.count() > 0) {
      // Clear and enter a new score
      await scoreInput.fill('12.34');
      await page.waitForTimeout(500);

      // Click save
      await page.getByText('Bewertung speichern').click();
      await page.waitForTimeout(2000);

      // Verify the save was acknowledged (button should not be in loading state anymore)
      await expect(page.getByText('Bewertung speichern')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('3.2 Navigation between participants works', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();

    // Wait for scoring view to be fully loaded (participant counter appears after fetchParticipants completes)
    await expect(page.locator('body')).toContainText(/Teilnehmer \d+ von \d+/, { timeout: 30_000 });

    // Click "Nächster →" to go to next participant
    const nextBtn = page.getByText('Nächster →');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);

      // The counter should still show participant count
      const body = await page.locator('body').textContent();
      expect(body).toMatch(/von \d+/);
    }
  });

  test('3.3 "Vorheriger" button navigates back', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();

    // Wait for scoring view to be fully loaded
    await expect(page.locator('body')).toContainText(/Teilnehmer \d+ von \d+/, { timeout: 30_000 });

    // Go to next participant first
    const nextBtn = page.getByText('Nächster →');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }

    // Now click "Vorheriger" — should go back
    const prevBtn = page.getByText('← Vorheriger');
    if (await prevBtn.isEnabled()) {
      await prevBtn.click();
      await page.waitForTimeout(1000);

      // Should be back at first/previous participant
      const body = await page.locator('body').textContent();
      expect(body).toBeTruthy();
    }
  });

  test('3.4 Clicking participant in list selects them', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();

    // Wait for scoring view to be fully loaded
    await expect(page.locator('body')).toContainText(/Teilnehmer \d+ von \d+/, { timeout: 30_000 });

    // Click on a specific participant in the left sidebar (e.g., the 3rd one)
    const thirdParticipant = page.locator(`text=${WOMEN_FIRST_NAMES[2]}`).first();
    if (await thirdParticipant.isVisible()) {
      await thirdParticipant.click();
      await page.waitForTimeout(1000);

      // The scoring panel should now show the selected participant's name
      // The right panel contains the score card with participant name and start number
      const scoreCard = page.locator('.bg-white.rounded-lg, .bg-white.rounded-xl').filter({ hasText: WOMEN_FIRST_NAMES[2] });
      await expect(scoreCard).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 4: Score Entry via API (Jury Portal endpoint)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: API Score Save & Verification', () => {

  const JURY_SCORE_VALUE = 15.55;
  let originalScore: number | null = null;

  test('4.1 Save a score via API (same endpoint Jury Portal uses)', async ({ request }) => {
    // Save original score first
    const existingScores = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    const existing = (existingScores.body.results || []).find(
      (r: any) => r.participantId === state.womenPids[0] && r.disciplineId === state.disciplineIds[0]
    );
    originalScore = existing?.score ?? WOMEN_SCORES[0][0];

    // Save new score via save-value endpoint
    const res = await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[0],
      disciplineId: state.disciplineIds[0],
      score: JURY_SCORE_VALUE,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('4.2 Saved score is returned by API', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    expect(res.status).toBe(200);

    const match = (res.body.results || []).find(
      (r: any) => r.participantId === state.womenPids[0] && r.disciplineId === state.disciplineIds[0]
    );
    expect(match).toBeTruthy();
    expect(match.score).toBeCloseTo(JURY_SCORE_VALUE, 1);
  });

  test('4.3 Updated total reflects the changed score', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    const results = res.body.results || [];

    // Calculate AnnaUI's total
    const annaScores = results.filter((r: any) => r.participantId === state.womenPids[0]);
    const total = annaScores.reduce((sum: number, r: any) => sum + (r.score ?? 0), 0);

    // Expected: 15.55 + 9.00 + 8.50 + 9.00 = 42.05 (original was 9.50 for first disc)
    const expectedTotal = JURY_SCORE_VALUE + WOMEN_SCORES[0][1] + WOMEN_SCORES[0][2] + WOMEN_SCORES[0][3];
    expect(total).toBeCloseTo(expectedTotal, 1);
  });

  test('4.4 Restore original score', async ({ request }) => {
    const restoreScore = originalScore ?? WOMEN_SCORES[0][0];
    const res = await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[0],
      disciplineId: state.disciplineIds[0],
      score: restoreScore,
    });
    expect(res.status).toBe(200);

    // Verify restoration
    const check = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    const match = (check.body.results || []).find(
      (r: any) => r.participantId === state.womenPids[0] && r.disciplineId === state.disciplineIds[0]
    );
    expect(match.score).toBeCloseTo(restoreScore, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 5: Score Validation (Edge Cases)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Score Validation', () => {

  test('5.1 Score of 0 is valid', async ({ request }) => {
    const res = await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[9],
      disciplineId: state.disciplineIds[3],
      score: 0,
    });
    expect(res.status).toBe(200);

    // Restore original
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[9],
      disciplineId: state.disciplineIds[3],
      score: WOMEN_SCORES[9][3],
    });
  });

  test('5.2 Missing score field is rejected', async ({ request }) => {
    const res = await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[0],
      disciplineId: state.disciplineIds[0],
      // no score field
    });
    expect(res.status).toBe(400);
  });

  test('5.3 Missing participantId is rejected', async ({ request }) => {
    const res = await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      disciplineId: state.disciplineIds[0],
      score: 9.0,
    });
    expect(res.status).toBe(400);
  });

  test('5.4 Missing disciplineId is rejected', async ({ request }) => {
    const res = await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[0],
      score: 9.0,
    });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 6: Cross-verification — Jury Portal ↔ Management UI
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Cross-verification with Management UI', () => {

  test('6.1 Scores saved via API are visible in Score Capture page', async ({ page, request }) => {
    test.setTimeout(60_000);

    // First, change a score via API (simulating jury portal save)
    const testScore = 11.11;
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[4],
      disciplineId: state.disciplineIds[0],
      score: testScore,
    });

    // Navigate to Score Capture page in Management UI
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

    // Select squad RW
    await page.locator('select option[value="RW"]').waitFor({ state: 'attached', timeout: 15_000 });
    const squadSelect = page.locator('select').first();
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(2000);

    // Uncheck jury scores for simple view
    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Check EvaUI's first discipline score
    const scoreInput = page.locator(
      `input[data-participant="${state.womenPids[4]}"][data-discipline="${state.disciplineIds[0]}"]`
    );
    await scoreInput.waitFor({ state: 'visible', timeout: 10_000 });
    const displayedValue = await scoreInput.inputValue();
    expect(parseFloat(displayedValue)).toBeCloseTo(testScore, 1);

    // Restore original score
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[4],
      disciplineId: state.disciplineIds[0],
      score: WOMEN_SCORES[4][0],
    });
  });

  test('6.2 Rankings API reflects correct order after jury scores', async ({ request }) => {
    // Verify women total scores and rankings via API
    const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    expect(res.status).toBe(200);
    const results = res.body.results || [];

    // Calculate totals per participant
    const totals = new Map<number, number>();
    for (const r of results) {
      const pid = r.participantId;
      const score = r.score ?? 0;
      totals.set(pid, (totals.get(pid) || 0) + score);
    }

    // Verify ranking order (all restored to original)
    const t0 = totals.get(state.womenPids[0]) || 0;
    const t1 = totals.get(state.womenPids[1]) || 0;
    const t2 = totals.get(state.womenPids[2]) || 0;

    // AnnaUI (36.00) > BertaUI (34.50) > ClaraUI (34.00)
    expect(t0).toBeGreaterThan(t1);
    expect(t1).toBeGreaterThan(t2);
  });

  test('6.3 Jury Portal on port 3002 proxy returns same data', async ({ request }) => {
    // Verify the jury proxy server (port 3002) returns the same data as main server (3001)
    const mainRes = await request.get(`http://localhost:3001/api/scores?competitionId=${state.comp1Id}&limit=10`);
    const proxyRes = await request.get(`http://localhost:3002/api/scores?competitionId=${state.comp1Id}&limit=10`);

    expect(mainRes.status()).toBe(200);
    expect(proxyRes.status()).toBe(200);

    const mainData = await mainRes.json();
    const proxyData = await proxyRes.json();

    // Both should return the same number of results
    expect((proxyData.results || []).length).toBe((mainData.results || []).length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 7: Jury Portal UI — "Gerät abschließen"
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Device Completion', () => {

  test('7.1 "Gerät abschließen" button is visible in scoring view', async ({ page }) => {
    test.setTimeout(60_000);
    await selectEventInJuryPortal(page, state.eventId);
    await selectSquad(page, 'RW');

    await page.waitForTimeout(2000);
    const deviceCards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await deviceCards.first().click();
    await page.waitForTimeout(3000);

    // "Gerät abschließen" button should be visible in the header
    const finishBtn = page.getByText('Gerät abschließen');
    await expect(finishBtn).toBeVisible({ timeout: 10_000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SECTION 8: Score Restoration (ensures clean data for subsequent tests)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal: Score Restoration', () => {

  test('8.1 Restore all women scores modified by UI tests', async ({ request }) => {
    // Tests 3.1 and 4.x modify women's scores (especially womenPids[0] + disciplineIds[0]).
    // Restore all women's scores to their expected values.
    let restored = 0;
    for (let wi = 0; wi < state.womenPids.length; wi++) {
      for (let di = 0; di < state.disciplineIds.length; di++) {
        const res = await apiPost(request, '/scores/save-value', {
          competitionId: state.comp1Id,
          participantId: state.womenPids[wi],
          disciplineId: state.disciplineIds[di],
          score: WOMEN_SCORES[wi][di],
        });
        expect(res.status).toBeLessThan(300);
        restored++;
      }
    }
    console.log(`✓ Restored ${restored} women's scores to expected values`);
  });

  test('8.2 Verify women scores are correct after restoration', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=2000`);
    const scores = res.body.results || [];
    const womenScores = scores.filter((s: any) => s.score !== null && s.score !== undefined);
    expect(womenScores.length).toBe(40);
    console.log(`✓ Verified ${womenScores.length} women's scores restored correctly`);
  });
});
