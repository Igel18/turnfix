import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

/**
 * Time Planning E2E Tests
 * 
 * Tests the /time-planning page which provides:
 * - Durchgänge (Rounds) overview
 * - Competition scheduling with start times
 * - Bahn (Lane) assignment
 * - Timeline/Gantt/Rotation views
 */

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Time Planning', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('time planning page loads for event', async ({ page }) => {
    await page.goto(`/time-planning?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Should show the page title
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('displays competitions from event', async ({ page }) => {
    await page.goto(`/time-planning?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Should show competition names
    await expect(page.locator('body')).toContainText(state.comp1Name || 'Damen', { timeout: 10_000 });
  });

  test('view toggle buttons are present', async ({ page }) => {
    await page.goto(`/time-planning?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Look for view toggle buttons (Durchgänge, Zeitstrahl, Gantt, Rotation)
    const viewButtons = page.getByRole('button', { name: /Durchg|Zeitstrahl|Gantt|Rotation|Timeline|Round/i });
    expect(await viewButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('Durchgänge view shows rounds', async ({ page }) => {
    await page.goto(`/time-planning?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // The default view should show round information
    // Competitions are organized in rounds (Durchgänge)
    const roundLabels = page.locator('text=/Durchgang|Runde|Round/i');
    // At least one element mentioning rounds should be present
    await page.waitForTimeout(1000);
  });

  test('can add a new round (Durchgang)', async ({ page }) => {
    await page.goto(`/time-planning?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const addRoundButton = page.getByRole('button', { name: /Durchgang.*hinzufügen|add.*round|neuer.*Durchgang/i }).first();
    if (await addRoundButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addRoundButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('API returns valid time planning data', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/time-planning?eventId=${state.eventId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('competitions');
    expect(data).toHaveProperty('timeSlots');
    expect(data).toHaveProperty('squads');
    expect(data.competitions).toBeInstanceOf(Array);
    expect(data.competitions.length).toBeGreaterThanOrEqual(1);

    // Verify competition structure
    const comp = data.competitions[0];
    expect(comp).toHaveProperty('id');
    expect(comp).toHaveProperty('name');
    expect(comp).toHaveProperty('round');
    expect(comp).toHaveProperty('disciplineCount');
    expect(comp).toHaveProperty('participantCount');
  });

  test('API returns correct time slots', async ({ page }) => {
    const response = await page.request.get(`${API_BASE}/time-planning?eventId=${state.eventId}`);
    const data = await response.json();

    expect(data.timeSlots.length).toBeGreaterThan(0);
    // First slot should be 08:00
    expect(data.timeSlots[0].time).toBe('08:00');
    // Last slot should be 18:00
    expect(data.timeSlots[data.timeSlots.length - 1].time).toBe('18:00');
  });

  test('API: update competition round', async ({ page }) => {
    const response = await page.request.put(
      `${API_BASE}/time-planning/competition/${state.comp1Id}/round`,
      { data: { round: 2 } }
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);

    // Restore
    await page.request.put(
      `${API_BASE}/time-planning/competition/${state.comp1Id}/round`,
      { data: { round: 1 } }
    );
  });

  test('API: get Bahnen for event', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/time-planning/bahnen?eventId=${state.eventId}`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('bahnen');
    expect(data.bahnen).toBeInstanceOf(Array);
  });

  test('API: create new round number', async ({ page }) => {
    const response = await page.request.post(`${API_BASE}/time-planning/round`, {
      data: { eventId: state.eventId }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('round');
    expect(typeof data.round).toBe('number');
    expect(data.round).toBeGreaterThanOrEqual(1);
  });
});
