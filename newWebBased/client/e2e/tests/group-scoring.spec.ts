import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

/**
 * Group Scoring E2E Tests (🔴 HIGH priority)
 * 
 * Tests the /group-scoring page which allows entering scores for groups.
 * Uses EventManagementTemplate with selection dropdowns for:
 *  - Group, Competition, Discipline, Attempt
 * Then opens UnifiedScoreEntry modal to enter field values.
 */

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Group Scoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('page loads with event context', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Page should have heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('displays selection panel with dropdowns', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Should have selection panel heading
    const selectionPanel = page.locator('text=/Auswahl|Selection/i').first();
    await expect(selectionPanel).toBeVisible({ timeout: 10_000 });

    // Should have select elements for group, competition, discipline
    const selects = page.locator('select');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThanOrEqual(3);
  });

  test('shows info box with instructions', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Should show BlueInfoBox with group scoring info
    const infoBox = page.locator('[class*="blue"], [class*="info"]').first();
    await expect(infoBox).toBeVisible({ timeout: 10_000 });
  });

  test('group dropdown loads groups from API', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Check API for groups
    const groupsResponse = await page.request.get(
      `${API_BASE}/groups?eventId=${state.eventId}&limit=1000`
    );
    expect(groupsResponse.ok()).toBeTruthy();

    const groupsData = await groupsResponse.json();
    const groups = groupsData.results || [];

    // If groups exist, select options should be populated
    if (groups.length > 0) {
      const groupSelect = page.locator('select').first();
      const options = groupSelect.locator('option');
      // At least the placeholder + some groups
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(1);
    }
  });

  test('competition dropdown loads competitions for event', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const compsResponse = await page.request.get(
      `${API_BASE}/competitions?eventId=${state.eventId}&limit=100`
    );
    expect(compsResponse.ok()).toBeTruthy();

    const compsData = await compsResponse.json();
    expect(compsData.results || compsData.competitions || []).toBeInstanceOf(Array);
  });

  test('discipline dropdown loads disciplines', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const discResponse = await page.request.get(`${API_BASE}/disciplines?limit=500`);
    expect(discResponse.ok()).toBeTruthy();

    const discData = await discResponse.json();
    const disciplines = discData.results || [];
    expect(disciplines.length).toBeGreaterThan(0);
  });

  test('score entry button disabled without full selection', async ({ page }) => {
    await page.goto(`/group-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Without selecting group/competition/discipline, the "Enter Score" button should not be visible
    // The component uses showAddButton={!!canOpenScoreEntry}
    const addButton = page.locator('button:has-text("Wertung eingeben"), button:has-text("Enter Score")');
    await expect(addButton).toBeHidden({ timeout: 5_000 });
  });

  test('API: POST /api/scores/group validates required fields', async ({ page }) => {
    const response = await page.request.post(`${API_BASE}/scores/group`, {
      data: {
        // Missing required fields
        groupId: null,
        competitionId: null,
        disciplineId: null
      }
    });

    // Should return validation error
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: GET /api/scores/group returns scores', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/scores/group?eventId=${state.eventId}&limit=10`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(data.results).toBeInstanceOf(Array);
  });

  test('API: GET /api/scores/group with filters', async ({ page }) => {
    // Test with specific competition filter
    if (state.competitions && state.competitions.length > 0) {
      const compId = state.competitions[0].id;
      const response = await page.request.get(
        `${API_BASE}/scores/group?competitionId=${compId}&limit=10`
      );
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.results).toBeInstanceOf(Array);
    }
  });
});
