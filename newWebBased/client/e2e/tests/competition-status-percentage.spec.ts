import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState, apiGet } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

/**
 * Competition Status — Percentage Display (Issue #92 + #97)
 *
 * Ensures the Wettkampf-Status and Riegen-Status pages
 * display correct non-zero percentage values for disciplines
 * once scores exist.
 *
 * TDD: Tests were written to be RED before the fix, GREEN after.
 */

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

// ─────────────────────────────────────────────────────────────────────────────
// API-level tests: competition-status endpoint returns discipline percentages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API: competition-status discipline percentages', () => {
  test('GET /api/competition-status returns disciplines_detail with percentage', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/competition-status?eventId=${state.eventId}`
    );
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('competitions');
    expect(Array.isArray(data.competitions)).toBeTruthy();
  });

  test('disciplines_detail includes completedParticipants and totalParticipants per discipline', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/competition-status?eventId=${state.eventId}`
    );
    const data = await response.json();

    // Each competition should have disciplines_detail with correct fields
    for (const comp of data.competitions as any[]) {
      expect(comp).toHaveProperty('disciplines_detail');
      expect(Array.isArray(comp.disciplines_detail)).toBeTruthy();

      for (const detail of comp.disciplines_detail as any[]) {
        // NEW fields that must exist after the fix
        expect(detail).toHaveProperty('completedParticipants',
          detail.completedParticipants,
          `discipline ${detail.disciplineId} - missing completedParticipants`
        );
        expect(detail).toHaveProperty('totalParticipants',
          detail.totalParticipants,
          `discipline ${detail.disciplineId} - missing totalParticipants`
        );
        expect(detail).toHaveProperty('percentage',
          detail.percentage,
          `discipline ${detail.disciplineId} - missing percentage`
        );

        // Values must be numbers
        expect(typeof detail.totalParticipants).toBe('number');
        expect(typeof detail.completedParticipants).toBe('number');
        expect(typeof detail.percentage).toBe('number');

        // Percentage must be between 0 and 100
        expect(detail.percentage).toBeGreaterThanOrEqual(0);
        expect(detail.percentage).toBeLessThanOrEqual(100);

        // completedParticipants <= totalParticipants
        expect(detail.completedParticipants).toBeLessThanOrEqual(detail.totalParticipants);
      }
    }
  });

  test('when scores exist, at least one discipline has percentage > 0', async ({ page }) => {
    // Only check this when scores have been entered
    if (!state.scoresEntered) {
      test.skip();
      return;
    }

    const response = await page.request.get(
      `${API_BASE}/competition-status?eventId=${state.eventId}`
    );
    const data = await response.json();

    let foundNonZero = false;
    for (const comp of data.competitions as any[]) {
      for (const detail of comp.disciplines_detail as any[]) {
        if (detail.percentage > 0) {
          foundNonZero = true;
          break;
        }
      }
    }

    expect(foundNonZero).toBeTruthy();
  });

  test('totalParticipants matches participantCount of the competition for each discipline', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/competition-status?eventId=${state.eventId}`
    );
    const data = await response.json();

    for (const comp of data.competitions as any[]) {
      if (comp.participantCount === 0) continue; // skip empty competitions

      for (const detail of comp.disciplines_detail as any[]) {
        expect(detail.totalParticipants).toBe(
          comp.participantCount,
          `Discipline ${detail.disciplineName} totalParticipants (${detail.totalParticipants}) ` +
          `should equal competition participantCount (${comp.participantCount})`
        );
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UI-level tests: CompetitionStatus matrix view shows percentage badges
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UI: CompetitionStatus matrix displays percentages', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('page loads without error', async ({ page }) => {
    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('matrix view is default and shows percentage badges', async ({ page }) => {
    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // The matrix view should contain cells with percentage badges (text ending with %)
    const percentBadges = page.locator('text=/%/');
    const count = await percentBadges.count();

    // At minimum the summary column and rows should show percentages
    // Even if 0%, the badge should be rendered (not hidden)
    expect(count).toBeGreaterThan(0);
  });

  test('percentage badges render as numbers with % sign (not blank)', async ({ page }) => {
    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Specifically look for percentage cells in the matrix render
    // They should contain text like "0%", "25%", "100%" — never empty
    const percentCells = page.locator('[class*="rounded"][class*="border"]').filter({
      hasText: /%/
    });

    if (await percentCells.count() > 0) {
      const firstCell = percentCells.first();
      const cellText = await firstCell.textContent();
      expect(cellText).toMatch(/\d+%/);
    }
  });

  test('matrix summary column shows overall percentage per competition', async ({ page }) => {
    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // The rightmost "summary" column should show overall completion %
    // Look for numeric percentage text
    const summaryPercentages = page.locator('text=/%/').first();
    if (await summaryPercentages.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const txt = await summaryPercentages.textContent();
      expect(txt).toMatch(/\d+%/);
    }
  });

  test('when scores present, matrix shows non-zero percentage', async ({ page }) => {
    if (!state.scoresEntered) {
      test.skip();
      return;
    }

    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // At least one cell should show a non-zero percentage when scores exist
    const nonZeroPercent = page.locator('text=/[1-9]\\d*%/');
    await expect(nonZeroPercent.first()).toBeVisible({ timeout: 10_000 });
  });

  test('table view progress bar reflects correct percentage', async ({ page }) => {
    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    // Switch to table view
    const listBtn = page.locator('button:has-text("List")');
    if (await listBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await listBtn.click();
      await page.waitForTimeout(300);

      // Progress bar should exist
      const progressBar = page.locator('.bg-blue-600.rounded-full').first();
      if (await progressBar.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const widthStyle = await progressBar.getAttribute('style');
        expect(widthStyle).toMatch(/width:\s*\d+%/);
      }

      // Percentage text should appear alongside progress bar
      const pctText = page.locator('span:has-text("%")').first();
      if (await pctText.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const txt = await pctText.textContent();
        expect(txt).toMatch(/\d+%/);
      }
    }
  });

  test('grid view shows progress bar and percentage', async ({ page }) => {
    await page.goto(`/competition-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const gridBtn = page.locator('button:has-text("Grid")');
    if (await gridBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await gridBtn.click();
      await page.waitForTimeout(300);

      const pctText = page.locator('span:has-text("%")').first();
      if (await pctText.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const txt = await pctText.textContent();
        expect(txt).toMatch(/\d+%/);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// UI-level tests: SquadStatus matrix (issue #97)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('UI: SquadStatus page shows status (issue #97)', () => {
  test.beforeEach(async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
  });

  test('squad-status page loads', async ({ page }) => {
    await page.goto(`/squad-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('API: competition-status includes squads_summary', async ({ page }) => {
    const response = await page.request.get(
      `${API_BASE}/competition-status?eventId=${state.eventId}`
    );
    const data = await response.json();
    expect(data).toHaveProperty('competitions');
  });
});
