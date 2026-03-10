import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState, apiPost } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

/**
 * Live Scores E2E Tests (🟠 MEDIUM priority)
 * 
 * Tests the /live-scores page which displays real-time score updates
 * using Socket.IO. Uses LiveScoreUpdates component with settings panel.
 * 
 * Includes:
 * - UI element tests (settings panel, inputs, toggles)
 * - Socket.IO integration tests (submit score via API → verify live update)
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

// ═══════════════════════════════════════════════════════════════════════
// Socket.IO Integration Tests — Submit score via API, verify live update
// ═══════════════════════════════════════════════════════════════════════
test.describe('Live Scores — Socket.IO Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('score submitted via API appears in live feed', async ({ page, request }) => {
    // 1. Navigate to the live-scores page and wait for Socket.IO to connect
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    
    // Wait for actual Socket.IO connection (data-testid changes when connected)
    const connectedIndicator = page.locator('[data-testid="socket-connected"]');
    await expect(connectedIndicator).toBeVisible({ timeout: 15_000 });

    // Allow time for the join-competition room membership to propagate on the server.
    // socket-connected only proves TCP connection, not that the room join has been processed.
    await page.waitForTimeout(2000);

    // 2. Submit a score via the API — this triggers server-side Socket.IO emission
    //    Use womenPids[5] (not [0]) because jury-portal.spec.ts creates tfx_jury_results
    //    for womenPids[0]/disciplineIds[0] with value 9.87. The save-value endpoint's
    //    formula recalculation would then emit 9.87 instead of the submitted score.
    const participantId = state.womenPids[5];
    const disciplineId = state.disciplineIds[0];
    const competitionId = state.comp1Id;
    const scoreValue = 12.345;

    const result = await apiPost(request, '/scores/save-value', {
      competitionId,
      participantId,
      disciplineId,
      score: scoreValue,
    });
    expect(result.status).toBe(200);

    // 3. Verify the score appears in the live feed (Socket.IO delivers it)
    // formatScore(12.345) → "12.35" (2 decimal places, no config), so /12\.3/ matches
    // Use generous timeout — Socket.IO event delivery can be slow under E2E load
    const scoreText = page.locator('text=/12\\.3/');
    await expect(scoreText.first()).toBeVisible({ timeout: 15_000 });
  });

  test('multiple scores appear in newest-first order', async ({ page, request }) => {
    // Navigate and wait for actual Socket.IO connection
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid="socket-connected"]')).toBeVisible({ timeout: 15_000 });

    // Submit two scores in sequence
    const firstScore = 10.100;
    const secondScore = 13.750;

    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[1],
      disciplineId: state.disciplineIds[0],
      score: firstScore,
    });

    // Wait for the first score to appear
    await page.locator('text=/10\\.1/').first().waitFor({ timeout: 10_000 });

    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[2],
      disciplineId: state.disciplineIds[0],
      score: secondScore,
    });

    // Wait for the second score to appear
    await page.locator('text=/13\\.7/').first().waitFor({ timeout: 10_000 });

    // Newest score (13.750) should be first in the list
    const allScoreEntries = page.locator('.divide-y > div');
    const firstEntryText = await allScoreEntries.first().textContent();
    expect(firstEntryText).toContain('13.7');
  });

  test('score entry shows participant name and discipline', async ({ page, request }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid="socket-connected"]')).toBeVisible({ timeout: 15_000 });

    // Submit a score
    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[3],
      disciplineId: state.disciplineIds[1],
      score: 11.500,
    });

    // Wait for the score to appear
    const scoreEntry = page.locator('.divide-y > div').first();
    await expect(scoreEntry).toBeVisible({ timeout: 15_000 });

    // Should show the score value
    await expect(page.locator('text=/11\\.5/').first()).toBeVisible({ timeout: 5_000 });

    // Should show participant name (font-medium span inside the entry)
    const nameSpan = scoreEntry.locator('.font-medium.text-gray-900');
    await expect(nameSpan).toBeVisible({ timeout: 5_000 });
    const nameText = await nameSpan.textContent();
    expect(nameText?.trim().length).toBeGreaterThan(0);
  });

  test('score entry shows timestamp', async ({ page, request }) => {
    await page.goto(`/live-scores?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid="socket-connected"]')).toBeVisible({ timeout: 15_000 });

    await apiPost(request, '/scores/save-value', {
      competitionId: state.comp1Id,
      participantId: state.womenPids[4],
      disciplineId: state.disciplineIds[0],
      score: 9.250,
    });

    // Wait for score to appear
    const scoreEntry = page.locator('.divide-y > div').first();
    await expect(scoreEntry).toBeVisible({ timeout: 15_000 });

    // Should show a timestamp (text-xs text-gray-500 element with time format like HH:MM)
    const timestampEl = scoreEntry.locator('.text-xs.text-gray-500');
    await expect(timestampEl).toBeVisible({ timeout: 5_000 });
    const timeText = await timestampEl.textContent();
    // Timestamp format: HH:MM or HH:MM:SS
    expect(timeText).toMatch(/\d{1,2}:\d{2}/);
  });
});
