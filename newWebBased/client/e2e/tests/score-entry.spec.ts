/**
 * Score Entry Tests — Score Capture UI
 *
 * Depends on: Event A (setup/create-event)
 * Uses shared state to verify pre-entered scores in the Score Capture UI.
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';
import { WOMEN_SCORES, MEN_SCORES, WOMEN_FIRST_NAMES, MEN_FIRST_NAMES } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

/** Wait for squad options to load in the select, then choose one */
async function selectSquadOption(page: import('@playwright/test').Page, value: string) {
  const squadSelect = page.locator('select').first();
  // Wait for the specific option value to appear in DOM (API may be slow)
  await page.locator(`select option[value="${value}"]`).waitFor({ state: 'attached', timeout: 15_000 });
  await squadSelect.selectOption({ value });
  await page.waitForTimeout(2000);
}

test.describe('Score Entry: Women (Squad RW)', () => {

  test('navigate to Score Capture and select squad RW', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(1000);

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
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
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
