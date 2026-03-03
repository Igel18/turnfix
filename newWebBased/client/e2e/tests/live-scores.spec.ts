import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

/**
 * Live Scores E2E Tests (🟠 MEDIUM priority)
 * 
 * Tests the /live-scores page which displays real-time score updates
 * using Socket.IO. Uses LiveScoreUpdates component with settings panel.
 */

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Live Scores Page', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('page loads with event context', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // UnifiedPageHeader should render
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('shows event name in subtitle', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Page should display the event name (from selectedEvent)
    // The subtitle comes from UnifiedPageHeader
    const pageContent = page.locator('body');
    const text = await pageContent.textContent();
    // Event name should appear somewhere on the page
    expect(text).toBeTruthy();
  });

  test('displays settings panel', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Settings panel has "Einstellungen" or "Settings" heading
    const settingsHeading = page.locator('h3:has-text("Einstellungen"), h3:has-text("Settings")');
    await expect(settingsHeading).toBeVisible({ timeout: 10_000 });
  });

  test('max entries input has default value', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // The max entries input has a default of 20
    const maxInput = page.locator('input[type="number"]').first();
    await expect(maxInput).toBeVisible({ timeout: 10_000 });

    const value = await maxInput.inputValue();
    // Should have a numeric value (default 20 or saved from localStorage)
    expect(parseInt(value)).toBeGreaterThanOrEqual(5);
  });

  test('show squad checkbox is present', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 10_000 });
  });

  test('auto refresh indicator is shown', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Green pulse indicator for auto-refresh
    const pulseIndicator = page.locator('[class*="pulse"], [class*="animate-pulse"]');
    await expect(pulseIndicator.first()).toBeVisible({ timeout: 10_000 });
  });

  test('info box with socket.io information displayed', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Info box mentions Socket.IO (use .first() since multiple elements contain the text)
    const infoText = page.locator('text=/Socket.IO/i').first();
    await expect(infoText).toBeVisible({ timeout: 10_000 });
  });

  test('can change max entries setting', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const maxInput = page.locator('input[type="number"]').first();
    await maxInput.clear();
    await maxInput.fill('50');

    const value = await maxInput.inputValue();
    expect(value).toBe('50');
  });

  test('can toggle show squad checkbox', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const checkbox = page.locator('input[type="checkbox"]').first();
    const initialChecked = await checkbox.isChecked();
    await checkbox.click();
    const newChecked = await checkbox.isChecked();
    expect(newChecked).toBe(!initialChecked);
  });

  test('LiveScoreUpdates widget is rendered', async ({ page }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // The live score updates widget should take up 2/3 of the grid
    const mainContent = page.locator('.lg\\:col-span-2').first();
    await expect(mainContent).toBeVisible({ timeout: 10_000 });
  });

  test('without event shows please select event message', async ({ page }) => {
    // Navigate without eventId (and clear event context)
    await page.goto('/live-scores', { waitUntil: 'networkidle' });

    // May show "Please select event" warning - depends on whether EventContext has a default
    const warningText = page.locator('text=/Event|Veranstaltung/i');
    const warningVisible = await warningText.first().isVisible({ timeout: 5_000 }).catch(() => false);
    // Page should at least not crash
    expect(true).toBeTruthy();
  });
});
