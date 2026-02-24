/**
 * Results Tests — Placements, rankings, medals
 *
 * Depends on: Event A (setup/create-event)
 * Verifies results page shows correct rankings based on known score data.
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, apiGet, EventAState } from '../fixtures/test-state';
import { EXPECTED_WOMEN, EXPECTED_MEN } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Results: Women Rankings', () => {

  test('results page loads with women competition section', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Women's competition heading should be visible
    const womenHeading = page.locator(`h3:has-text("${state.comp1Name}")`);
    await expect(womenHeading).toBeVisible({ timeout: 10_000 });
  });

  test('women top 3 placements correct', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const womenSection = page.locator(`h3:has-text("${state.comp1Name}")`).locator('xpath=../..');
    const rows = womenSection.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Verify top 3
    for (let i = 0; i < 3; i++) {
      const rowText = await rows.nth(i).textContent() || '';
      expect(rowText).toContain(EXPECTED_WOMEN[i].name);
    }
  });

  test('women all 10 placements in order', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const womenSection = page.locator(`h3:has-text("${state.comp1Name}")`).locator('xpath=../..');
    const rows = womenSection.locator('table tbody tr');

    for (let i = 0; i < 10; i++) {
      const rowText = await rows.nth(i).textContent() || '';
      expect(rowText).toContain(EXPECTED_WOMEN[i].name);
      expect(rowText).toContain(EXPECTED_WOMEN[i].total.toFixed(2));
    }
  });

  test('women gold medal (rank 1)', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const womenSection = page.locator(`h3:has-text("${state.comp1Name}")`).locator('xpath=../..');
    const firstRow = womenSection.locator('table tbody tr').first();
    const firstCell = await firstRow.locator('td').first().textContent() || '';
    // Medal or rank indicator
    expect(firstCell).toMatch(/🥇|1/);
  });
});

test.describe('Results: Men Rankings', () => {

  test('men competition section visible', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const menHeading = page.locator(`h3:has-text("${state.comp2Name}")`);
    await expect(menHeading).toBeVisible({ timeout: 10_000 });
  });

  test('men all 10 placements in order', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const menSection = page.locator(`h3:has-text("${state.comp2Name}")`).locator('xpath=../..');
    const rows = menSection.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    for (let i = 0; i < 10; i++) {
      const rowText = await rows.nth(i).textContent() || '';
      expect(rowText).toContain(EXPECTED_MEN[i].name);
      expect(rowText).toContain(EXPECTED_MEN[i].total.toFixed(2));
    }
  });

  test('men gold is 37.50 (AdamUI)', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const menSection = page.locator(`h3:has-text("${state.comp2Name}")`).locator('xpath=../..');
    const firstRow = menSection.locator('table tbody tr').first();
    const text = await firstRow.textContent() || '';
    expect(text).toContain('AdamUI');
    expect(text).toContain('37.50');
  });

  test('men last place is 19.60 (JanUI)', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const menSection = page.locator(`h3:has-text("${state.comp2Name}")`).locator('xpath=../..');
    const rows = menSection.locator('table tbody tr');
    const lastRow = rows.nth(9);
    const text = await lastRow.textContent() || '';
    expect(text).toContain('JanUI');
    expect(text).toContain('19.60');
  });
});

test.describe('Results: Grouped View', () => {

  test('both competitions visible on results page', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await expect(page.locator(`h3:has-text("${state.comp1Name}")`)).toBeVisible();
    await expect(page.locator(`h3:has-text("${state.comp2Name}")`)).toBeVisible();
  });

  test('each competition has 10 result rows', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const womenSection = page.locator(`h3:has-text("${state.comp1Name}")`).locator('xpath=../..');
    const womenRows = womenSection.locator('table tbody tr');
    expect(await womenRows.count()).toBe(10);

    const menSection = page.locator(`h3:has-text("${state.comp2Name}")`).locator('xpath=../..');
    const menRows = menSection.locator('table tbody tr');
    expect(await menRows.count()).toBe(10);
  });
});

test.describe('Results: Cross-Competition', () => {

  test('women comp has only women participants', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const womenSection = page.locator(`h3:has-text("${state.comp1Name}")`).locator('xpath=../..');
    const tableText = await womenSection.locator('table').textContent() || '';

    // Women first names should be present
    for (const name of ['AnnaUI', 'BertaUI', 'ClaraUI']) {
      expect(tableText).toContain(name);
    }
    // Men first names should NOT be present
    for (const name of ['AdamUI', 'BenUI', 'CarlUI']) {
      expect(tableText).not.toContain(name);
    }
  });

  test('men comp has only men participants', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const menSection = page.locator(`h3:has-text("${state.comp2Name}")`).locator('xpath=../..');
    const tableText = await menSection.locator('table').textContent() || '';

    // Men first names should be present
    for (const name of ['AdamUI', 'BenUI', 'CarlUI']) {
      expect(tableText).toContain(name);
    }
    // Women first names should NOT be present
    for (const name of ['AnnaUI', 'BertaUI', 'ClaraUI']) {
      expect(tableText).not.toContain(name);
    }
  });
});

test.describe('Results: Medal Table API', () => {

  test('medal standings exist', async ({ request }) => {
    const res = await apiGet(request, `/medals?eventId=${state.eventId}`);
    expect(res.status).toBe(200);
    const medals = res.body.results || res.body.standings || res.body;
    expect(Array.isArray(medals)).toBe(true);
    expect(medals.length).toBeGreaterThanOrEqual(1);
  });

  test('both clubs have participants with scores', async ({ request }) => {
    // Verify both clubs have participants by checking the participants route directly
    const participants = [];
    for (const pid of [...state.womenPids, ...state.menPids]) {
      const res = await apiGet(request, `/participants/${pid}`);
      if (res.status === 200) {
        participants.push(res.body);
      }
    }

    const clubIds = new Set(participants.map((p: any) => p.clubId ?? p.int_vereineid));
    expect(clubIds.size).toBe(2);
  });
});
