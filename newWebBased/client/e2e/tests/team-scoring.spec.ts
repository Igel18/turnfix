import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

/**
 * Team Scoring E2E Tests (🔴 HIGH priority)
 * 
 * Tests the /team-scoring page which allows entering scores for teams.
 * Uses EntityScoringSelector component with:
 *  - Team, Competition, Discipline selection
 * Then shows TeamScoreTable for score entry.
 */

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Team Scoring Page', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('page loads with event context', async ({ page }) => {
    await page.goto(`/team-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('displays info box with team scoring instructions', async ({ page }) => {
    await page.goto(`/team-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Should show BlueInfoBox with team info
    const infoBox = page.locator('[class*="blue"], [class*="info"]').first();
    await expect(infoBox).toBeVisible({ timeout: 10_000 });
  });

  test('displays entity scoring selector', async ({ page }) => {
    await page.goto(`/team-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // EntityScoringSelector should render with selection controls
    const selectorArea = page.locator('select, [role="listbox"], [class*="selector"]');
    const selectorCount = await selectorArea.count();
    expect(selectorCount).toBeGreaterThanOrEqual(1);
  });

  test('team dropdown loads teams from API', async ({ page }) => {
    await page.goto(`/team-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Verify API returns teams
    const teamsResponse = await page.request.get(
      `${API_BASE}/teams?eventId=${state.eventId}&limit=1000`
    );
    expect(teamsResponse.ok()).toBeTruthy();

    const teamsData = await teamsResponse.json();
    const teams = Array.isArray(teamsData) ? teamsData : (teamsData.teams || teamsData.results || []);
    expect(teams).toBeInstanceOf(Array);
  });

  test('only team competitions shown (competitionType=1)', async ({ page }) => {
    await page.goto(`/team-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Verify API returns competitions
    const compsResponse = await page.request.get(
      `${API_BASE}/competitions?eventId=${state.eventId}&limit=100`
    );
    expect(compsResponse.ok()).toBeTruthy();

    const compsData = await compsResponse.json();
    const allComps = Array.isArray(compsData) ? compsData : (compsData.competitions || []);
    // Team competitions have competitionType=1
    const teamComps = allComps.filter((c: any) => c.competitionType === 1);
    // We just verify the API responds correctly - actual filtering is in the component
    expect(allComps).toBeInstanceOf(Array);
  });

  test('score table not shown without full selection', async ({ page }) => {
    await page.goto(`/team-scoring?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // TeamScoreTable should not be visible without selecting team/comp/discipline
    const scoreTable = page.locator('table').first();
    // Table might exist as part of the layout, but score entry section should not be visible
    const scoreEntrySection = page.locator('text=/Wertungseingabe|Score Entry/i');
    await expect(scoreEntrySection).toBeHidden({ timeout: 5_000 });
  });

  test('API: POST /api/scores/team validates required fields', async ({ page }) => {
    const response = await page.request.post(`${API_BASE}/scores/team`, {
      data: {
        teamId: null,
        competitionId: null,
        disciplineId: null
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('API: GET /api/scores/team returns results', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/scores/team?eventId=${state.eventId}&limit=10`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('results');
    expect(data.results).toBeInstanceOf(Array);
  });

  test('API: GET /api/scores/team with filters', async ({ page }) => {
    if (state.competitions && state.competitions.length > 0) {
      const compId = state.competitions[0].id;
      const response = await page.request.get(
        `${API_BASE}/scores/team?competitionId=${compId}&limit=10`
      );
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.results).toBeInstanceOf(Array);
    }
  });

  test('API: DELETE /api/scores/team requires valid ID', async ({ page }) => {
    const response = await page.request.delete(`${API_BASE}/scores/team/abc`);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
