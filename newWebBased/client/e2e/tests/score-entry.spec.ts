/**
 * Score Entry Tests — Score Capture UI
 *
 * Depends on: Event A (setup/create-event)
 * Uses shared state to verify pre-entered scores in the Score Capture UI.
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, apiPost, EventAState } from '../fixtures/test-state';
import { WOMEN_SCORES, MEN_SCORES, WOMEN_FIRST_NAMES, MEN_FIRST_NAMES, API_BASE } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

/** Wait for squad options to load in the select, then choose one.
 *  The SquadDisciplineSelector component returns null while loading,
 *  so we first wait for the select to become visible (proves data loaded),
 *  then wait for the specific option value. */
async function selectSquadOption(page: import('@playwright/test').Page, value: string) {
  const squadSelect = page.locator('select').first();
  // Wait for the select to be visible (SquadDisciplineSelector renders null while loading)
  await squadSelect.waitFor({ state: 'visible', timeout: 30_000 });
  // Wait for the specific option value to appear in DOM (API may be slow)
  await page.locator(`select option[value="${value}"]`).waitFor({ state: 'attached', timeout: 30_000 });
  await squadSelect.selectOption({ value });
  await page.waitForTimeout(2000);
}

test.describe('Score Entry: Women (Squad RW)', () => {

  test('navigate to Score Capture and select squad RW', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    // Verify participants are shown
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(10);
  });

  test('pre-entered women scores are displayed correctly', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    // Uncheck "Jury-Wertungen anzeigen" for simple view
    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Verify first participant's first score
    const firstInput = page.locator(
      `input[data-participant="${state.womenPids[0]}"][data-discipline="${state.disciplineIds[0]}"]`
    );
    await firstInput.waitFor({ state: 'visible', timeout: 10_000 });
    const value = await firstInput.inputValue();
    expect(parseFloat(value)).toBeCloseTo(WOMEN_SCORES[0][0], 1);
  });

  test('discipline column headers are visible', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    // Table should have header columns
    const headers = page.locator('thead th');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(4); // At least 4 discipline columns
  });

  test('all 10 women visible in score table', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    // Verify all 10 women are visible
    for (const firstName of WOMEN_FIRST_NAMES) {
      await expect(page.locator('body')).toContainText(firstName);
    }
  });
});

test.describe('Score Entry: Men (Squad RM)', () => {

  test('navigate to Score Capture and select squad RM', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp2Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RM');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(10);
  });

  test('pre-entered men scores are displayed correctly', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp2Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RM');

    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Verify first man's first score
    const firstInput = page.locator(
      `input[data-participant="${state.menPids[0]}"][data-discipline="${state.disciplineIds[0]}"]`
    );
    await firstInput.waitFor({ state: 'visible', timeout: 10_000 });
    const value = await firstInput.inputValue();
    expect(parseFloat(value)).toBeCloseTo(MEN_SCORES[0][0], 1);
  });

  test('can edit a score and verify it saves', async ({ page }) => {
    test.setTimeout(60_000);
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp2Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RM');

    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Edit last man's first discipline score
    const lastManPid = state.menPids[9];
    const firstDiscId = state.disciplineIds[0];
    const input = page.locator(
      `input[data-participant="${lastManPid}"][data-discipline="${firstDiscId}"]`
    );
    await input.waitFor({ state: 'visible', timeout: 10_000 });

    const originalValue = await input.inputValue();

    // Change to 8.88
    await input.click();
    await input.fill('8.88');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Verify the change persisted (reload page)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await selectSquadOption(page, 'RM');

    const juryCheckbox2 = page.locator('#showJuryScores');
    if (await juryCheckbox2.isChecked()) {
      await juryCheckbox2.uncheck();
      await page.waitForTimeout(500);
    }

    const afterInput = page.locator(
      `input[data-participant="${lastManPid}"][data-discipline="${firstDiscId}"]`
    );
    await afterInput.waitFor({ state: 'visible', timeout: 10_000 });
    const newValue = await afterInput.inputValue();
    expect(parseFloat(newValue)).toBeCloseTo(8.88, 1);

    // Restore original value
    await afterInput.click();
    await afterInput.fill(originalValue);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
  });
});

test.describe('Score Entry: API Verification', () => {

  test('40 women scores exist via API', async ({ request }) => {
    const res = await request.get(`http://localhost:3001/api/scores?competitionId=${state.comp1Id}&limit=1000`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const results = body.results || [];
    expect(results.length).toBeGreaterThanOrEqual(40);
  });

  test('40 men scores exist via API', async ({ request }) => {
    const res = await request.get(`http://localhost:3001/api/scores?competitionId=${state.comp2Id}&limit=1000`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    const results = body.results || [];
    expect(results.length).toBeGreaterThanOrEqual(40);
  });

  test('first woman total is correct', async ({ request }) => {
    const res = await request.get(`http://localhost:3001/api/scores?competitionId=${state.comp1Id}&limit=1000`);
    const results = (await res.json()).results || [];
    const annaScores = results.filter((r: any) => r.participantId === state.womenPids[0]);
    const total = annaScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(total).toBeCloseTo(36.00, 1);
  });

  test('first man total is correct', async ({ request }) => {
    const res = await request.get(`http://localhost:3001/api/scores?competitionId=${state.comp2Id}&limit=1000`);
    const results = (await res.json()).results || [];
    const adamScores = results.filter((r: any) => r.participantId === state.menPids[0]);
    const total = adamScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(total).toBeCloseTo(37.50, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Score Entry: German Decimal Comma Input
// ═══════════════════════════════════════════════════════════════════════

test.describe('Score Entry: German Decimal Comma (Regression)', () => {

  // Track scores that need restoring — afterEach ensures cleanup even on failure
  const scoresToRestore: Array<{ pid: number; discId: number; score: number }> = [];

  test.afterEach(async ({ request }) => {
    for (const entry of scoresToRestore) {
      await apiPost(request, '/scores/save-value', {
        competitionId: state.comp1Id,
        participantId: entry.pid,
        disciplineId: entry.discId,
        score: entry.score,
      });
    }
    scoresToRestore.length = 0;
  });

  test('entering "3,3" via keyboard is saved as 3.30 (not 33.00)', async ({ page, request }) => {
    test.setTimeout(60_000);
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Use last woman's last discipline to avoid interfering with other tests
    const pid = state.womenPids[9];
    const discId = state.disciplineIds[3];
    const input = page.locator(`input[data-participant="${pid}"][data-discipline="${discId}"]`);
    await input.waitFor({ state: 'visible', timeout: 10_000 });

    // Save original value
    const originalValue = await input.inputValue();

    // Type "3,3" with German decimal comma
    // Note: Playwright's fill() and pressSequentially() don't correctly insert commas
    // in inputs. We use keyboard.insertText() which dispatches a single input event.
    await input.click();
    await input.fill('');
    await page.keyboard.insertText('3,3');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);

    // Read the displayed value — should be 3.30, NOT 33.00
    const displayedAfterBlur = await input.inputValue();
    const numericDisplayed = parseFloat(displayedAfterBlur.replace(',', '.'));
    expect(numericDisplayed).toBeCloseTo(3.3, 1);
    expect(numericDisplayed).not.toBeCloseTo(33.0, 0);

    // Verify via API that the stored value is 3.3
    const res = await request.get(`${API_BASE}/scores?competitionId=${state.comp1Id}&limit=1000`);
    const results = (await res.json()).results || [];
    const match = results.find(
      (r: any) => r.participantId === pid && r.disciplineId === discId
    );
    expect(match).toBeTruthy();
    expect(match.score).toBeCloseTo(3.3, 1);
    expect(match.score).not.toBeCloseTo(33.0, 0);

    // Restore original score
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: pid,
      disciplineId: discId,
      score: parseFloat(originalValue.replace(',', '.')) || WOMEN_SCORES[9][3],
    });
  });

  test('entering "9,75" via keyboard is saved as 9.75 (not 975.00)', async ({ page, request }) => {
    test.setTimeout(60_000);
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    const pid = state.womenPids[8];
    const discId = state.disciplineIds[3];
    const input = page.locator(`input[data-participant="${pid}"][data-discipline="${discId}"]`);
    await input.waitFor({ state: 'visible', timeout: 10_000 });

    const originalValue = await input.inputValue();

    // Type "9,75" with German decimal comma
    // Note: Playwright's fill() and pressSequentially() don't correctly insert commas
    // in inputs. We use keyboard.insertText() which dispatches a single input event.
    await input.click();
    await input.fill('');
    await page.keyboard.insertText('9,75');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);

    // Verify displayed value is 9.75
    const displayedAfterBlur = await input.inputValue();
    const numDisplayed = parseFloat(displayedAfterBlur.replace(',', '.'));
    expect(numDisplayed).toBeCloseTo(9.75, 1);

    // Verify via API
    const res = await request.get(`${API_BASE}/scores?competitionId=${state.comp1Id}&limit=1000`);
    const results = (await res.json()).results || [];
    const match = results.find(
      (r: any) => r.participantId === pid && r.disciplineId === discId
    );
    expect(match).toBeTruthy();
    expect(match.score).toBeCloseTo(9.75, 1);

    // Restore
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: pid,
      disciplineId: discId,
      score: parseFloat(originalValue.replace(',', '.')) || WOMEN_SCORES[8][3],
    });
  });

  test('entering "3.3" with dot still works correctly', async ({ page, request }) => {
    test.setTimeout(60_000);
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RW');

    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    const pid = state.womenPids[7];
    const discId = state.disciplineIds[3];
    const input = page.locator(`input[data-participant="${pid}"][data-discipline="${discId}"]`);
    await input.waitFor({ state: 'visible', timeout: 10_000 });

    const originalValue = await input.inputValue();

    // Type "3.3" with English decimal point
    await input.click();
    await input.fill('3.3');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1500);

    // Should also show 3.30
    const displayed = await input.inputValue();
    const numDisplayed = parseFloat(displayed.replace(',', '.'));
    expect(numDisplayed).toBeCloseTo(3.3, 1);

    // Verify via API
    const res = await request.get(`${API_BASE}/scores?competitionId=${state.comp1Id}&limit=1000`);
    const results = (await res.json()).results || [];
    const match = results.find(
      (r: any) => r.participantId === pid && r.disciplineId === discId
    );
    expect(match).toBeTruthy();
    expect(match.score).toBeCloseTo(3.3, 1);

    // Restore
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: pid,
      disciplineId: discId,
      score: parseFloat(originalValue.replace(',', '.')) || WOMEN_SCORES[7][3],
    });
  });
});
