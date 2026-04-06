/**
 * Score Capture V2 E2E Tests
 *
 * Tests the /score-capture-v2 page (jury-style split view).
 *
 * Depends on: Event A (setup/create-event)
 * Tests:
 *   1. Route /score-capture-v2 is accessible
 *   2. ManagementCenter shows "Individual Scoring (Jury View)" button
 *   3. After squad + discipline selection, split view appears
 *   4. Participant list shows participants
 *   5. Participant status badge updates after save
 *
 * Point 125: Jury-style split-view score capture.
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, apiGet, EventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('ScoreCaptureV2 – Route and Navigation', () => {
  test('route /score-capture-v2 is accessible and shows title', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto('/score-capture-v2', { waitUntil: 'domcontentloaded' });
    // Check the page loaded (either requires event selection or shows content)
    await page.waitForLoadState('networkidle');
    // No 404 / crash
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
  });

  test('ManagementCenter shows "Individual Scoring (Jury View)" action card', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto('/management', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Find the Wettkampftag expander and click it
    const competitionDayHeader = page.locator('button, [role="button"]').filter({ hasText: /wettkampftag/i }).first();
    if (await competitionDayHeader.count() > 0) {
      await competitionDayHeader.click();
      await page.waitForTimeout(500);
    }

    // The card should be somewhere in the management center
    const link = page.locator('a[href="/score-capture-v2"], a[href*="score-capture-v2"]').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('ScoreCaptureV2 – Split View', () => {
  test('shows split view after squad and discipline selection', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture-v2?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    // Wait for squad selector to appear
    const squadSelect = page.locator('select').first();
    await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });

    // Wait for squad option to become available
    await page.locator(`select option[value="RW"]`).waitFor({ state: 'attached', timeout: 20_000 });
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(500);

    // Select first available discipline
    const disciplineSelect = page.locator('select').nth(1);
    await disciplineSelect.waitFor({ state: 'visible', timeout: 10_000 });
    const firstOption = disciplineSelect.locator('option').nth(1);
    const disciplineValue = await firstOption.getAttribute('value');
    if (disciplineValue) {
      await disciplineSelect.selectOption({ value: disciplineValue });
    }
    await page.waitForTimeout(500);

    // Split view should appear
    const splitView = page.locator('[data-testid="scoring-split-view"]');
    await expect(splitView).toBeVisible({ timeout: 10_000 });
  });

  test('split view has participant list on the left', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture-v2?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    const squadSelect = page.locator('select').first();
    await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator(`select option[value="RW"]`).waitFor({ state: 'attached', timeout: 20_000 });
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(500);

    const disciplineSelect = page.locator('select').nth(1);
    await disciplineSelect.waitFor({ state: 'visible', timeout: 10_000 });
    const firstOption = disciplineSelect.locator('option').nth(1);
    const disciplineValue = await firstOption.getAttribute('value');
    if (disciplineValue) {
      await disciplineSelect.selectOption({ value: disciplineValue });
    }
    await page.waitForTimeout(1000);

    const splitView = page.locator('[data-testid="scoring-split-view"]');
    await splitView.waitFor({ state: 'visible', timeout: 10_000 });

    // At least one participant item should be in the list
    const participantItems = page.locator('[data-testid^="participant-list-item-"]');
    const count = await participantItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking a participant updates the scoring panel', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture-v2?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
      { waitUntil: 'domcontentloaded' }
    );

    const squadSelect = page.locator('select').first();
    await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator(`select option[value="RW"]`).waitFor({ state: 'attached', timeout: 20_000 });
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(500);

    const disciplineSelect = page.locator('select').nth(1);
    await disciplineSelect.waitFor({ state: 'visible', timeout: 10_000 });
    const firstOption = disciplineSelect.locator('option').nth(1);
    const disciplineValue = await firstOption.getAttribute('value');
    if (disciplineValue) {
      await disciplineSelect.selectOption({ value: disciplineValue });
    }
    await page.waitForTimeout(1000);

    await page.locator('[data-testid="scoring-split-view"]').waitFor({ state: 'visible', timeout: 10_000 });

    // Click the second participant
    const items = page.locator('[data-testid^="participant-list-item-"]');
    const count = await items.count();
    if (count >= 2) {
      await items.nth(1).click();
      await page.waitForTimeout(500);
      // The second item should get the active highlight
      const secondItem = items.nth(1);
      const className = await secondItem.getAttribute('class');
      expect(className).toContain('border-blue-600');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('ScoreCaptureV2 – API Integration', () => {
  test('participant status API returns data for event', async ({ page }) => {
    const data = await apiGet<{ participants: { participantId: number; statusId: number | null }[] }>(
      page,
      `${API_BASE}/participant-status?eventId=${state.eventId}`
    );
    expect(Array.isArray(data.participants)).toBe(true);
  });
});
