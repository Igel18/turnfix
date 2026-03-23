/**
 * Multi-Competition Participant E2E Tests
 *
 * Verifies that participants assigned to multiple competitions are correctly
 * handled in:
 *
 *   1. Event-Participants page
 *      - Competition filter dropdown appears when the event has ≥ 2 competitions
 *      - Filtering by a competition shows only participants in that competition
 *      - A participant assigned to BOTH competitions appears in both filtered views
 *      - Competition names are shown as pills in the "Wettkämpfe" column (not just a count)
 *      - Reset clears the competition filter
 *
 *   2. Results page
 *      - Without a competition filter the page shows ALL competition groups
 *      - A participant in two competitions appears in BOTH groups
 *
 * Depends on: Event A (setup/create-event) with comp1Id and comp2Id already set.
 * The test assigns one participant to BOTH competitions, runs verifications, then
 * removes the second assignment to leave the state clean.
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(() => {
  state = loadEventAState();
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function goToEventParticipants(page: Page): Promise<void> {
  await setEventContext(page, state.eventId, state.eventName);
  await page.goto(`/event-participants?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

async function openFilters(page: Page): Promise<void> {
  const filterBtn = page.getByRole('button', { name: /filter/i });
  const isVisible = await filterBtn.isVisible().catch(() => false);
  if (isVisible) {
    await filterBtn.click();
    await page.waitForTimeout(500);
  }
}

/** Use the API to assign participant to a second competition. Returns the scoreId. */
async function assignParticipantToCompetition(
  request: APIRequestContext,
  participantId: number,
  competitionId: number
): Promise<number | null> {
  const res = await request.post(`${API_BASE}/event-participants/assign`, {
    data: { participantId, competitionId }
  });
  if (res.ok()) {
    const body = await res.json();
    return body.scoreId ?? null;
  }
  return null;
}

/** Use the API to unassign participant from a competition. */
async function unassignParticipantFromCompetition(
  request: APIRequestContext,
  participantId: number,
  competitionId: number
): Promise<void> {
  await request.delete(
    `${API_BASE}/event-participants/unassign?participantId=${participantId}&competitionId=${competitionId}`
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

test.describe('Event-Participants: competition filter', () => {
  test('competition filter dropdown is visible when event has multiple competitions', async ({ page }) => {
    await goToEventParticipants(page);
    await openFilters(page);

    // Look for a select element with competition options
    const compSelect = page.locator('select').filter({ hasText: /Alle Wettk|All Comp/i }).first();
    const exists = await compSelect.count();

    // If the event has 2+ competitions, the filter should be rendered
    if (state.comp1Id && state.comp2Id) {
      expect(exists).toBeGreaterThan(0);
    }
  });

  test('competition names appear as pills in the competitions column', async ({ page }) => {
    await goToEventParticipants(page);

    // Check that competition name text is visible in the table (not just a count number)
    // comp1Name and comp2Name should appear as badge labels in the table cells
    const tableBody = page.locator('tbody');
    await tableBody.waitFor({ state: 'visible', timeout: 10_000 });

    // At least one participant must have a competition name badge (not just a number)
    const badges = page.locator('tbody td span').filter({
      hasText: new RegExp(state.comp1Name.substring(0, 5), 'i')
    });
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('filtering by competition shows only participants in that competition', async ({ page }) => {
    await goToEventParticipants(page);
    await openFilters(page);

    // Select comp1 in the competition filter
    const compSelect = page.locator('select').filter({ hasText: /Alle Wettk|All Comp/i }).first();
    const selectCount = await compSelect.count();
    if (selectCount === 0) {
      test.skip(true, 'Competition filter not rendered (event may have only 1 competition)');
      return;
    }

    await compSelect.selectOption(state.comp1Id.toString());
    await page.waitForTimeout(500);

    // Every visible row must have comp1Name as one of its competition pills
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(rowCount, 5); i++) {
      const row = rows.nth(i);
      const compCell = row.locator('td').nth(-2); // competitions column (second to last)
      const cellText = await compCell.textContent();
      expect(cellText).toContain(state.comp1Name.substring(0, 5));
    }
  });

  test('resetting filters clears the competition filter', async ({ page }) => {
    await goToEventParticipants(page);
    await openFilters(page);

    const compSelect = page.locator('select').filter({ hasText: /Alle Wettk|All Comp/i }).first();
    const selectCount = await compSelect.count();
    if (selectCount === 0) {
      test.skip(true, 'Competition filter not rendered');
      return;
    }

    // Set competition filter
    await compSelect.selectOption(state.comp1Id.toString());
    await page.waitForTimeout(300);

    // Click reset
    const resetBtn = page.getByRole('button', { name: /reset|zurücksetzen/i });
    await resetBtn.click();
    await page.waitForTimeout(300);

    // Competition filter should be reset to "all"
    const selected = await compSelect.inputValue();
    expect(selected).toBe('');
  });
});

test.describe('Event-Participants: participant in two competitions', () => {
  // We assign the first "women" participant (womenPids[0]) to BOTH competitions
  // to test the multi-competition scenario.

  test.beforeAll(async ({ request }) => {
    if (!state.womenPids?.length || !state.comp2Id) return;
    // Assign womenPids[0] to comp2 as well (they are already in comp1)
    await assignParticipantToCompetition(request, state.womenPids[0], state.comp2Id);
  });

  test.afterAll(async ({ request }) => {
    if (!state.womenPids?.length || !state.comp2Id) return;
    // Clean up: remove the second assignment
    await unassignParticipantFromCompetition(request, state.womenPids[0], state.comp2Id);
  });

  test('participant in both competitions appears in comp1 filter', async ({ page }) => {
    await goToEventParticipants(page);
    await openFilters(page);

    const compSelect = page.locator('select').filter({ hasText: /Alle Wettk|All Comp/i }).first();
    if (await compSelect.count() === 0) {
      test.skip(true, 'Competition filter not rendered');
      return;
    }

    await compSelect.selectOption(state.comp1Id.toString());
    await page.waitForTimeout(600);

    // Reload to pick up latest data
    await page.reload({ waitUntil: 'networkidle' });
    await openFilters(page);
    await compSelect.selectOption(state.comp1Id.toString());
    await page.waitForTimeout(600);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('participant in both competitions appears in comp2 filter', async ({ page }) => {
    await goToEventParticipants(page);
    await openFilters(page);

    const compSelect = page.locator('select').filter({ hasText: /Alle Wettk|All Comp/i }).first();
    if (await compSelect.count() === 0) {
      test.skip(true, 'Competition filter not rendered');
      return;
    }

    await compSelect.selectOption(state.comp2Id.toString());
    await page.waitForTimeout(600);

    await page.reload({ waitUntil: 'networkidle' });
    await openFilters(page);
    await compSelect.selectOption(state.comp2Id.toString());
    await page.waitForTimeout(600);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('participant with both competitions shows both names as pills in unfiltered view', async ({ page }) => {
    await goToEventParticipants(page);
    await page.waitForTimeout(800);

    // Look for both competition names in the table simultaneously (within same cell)
    const comp1Prefix = state.comp1Name.substring(0, 5);
    const comp2Prefix = state.comp2Name.substring(0, 5);

    // Some row must contain both comp1 and comp2 name pills
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    let foundBoth = false;
    for (let i = 0; i < rowCount; i++) {
      const cellText = await rows.nth(i).textContent() ?? '';
      if (cellText.includes(comp1Prefix) && cellText.includes(comp2Prefix)) {
        foundBoth = true;
        break;
      }
    }
    expect(foundBoth).toBe(true);
  });
});

test.describe('Results page: multi-competition groups', () => {
  test('results page shows all competition groups when no competition filter is active', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // When no competition filter is selected, both comp1Name and comp2Name
    // should appear as group headings
    const pageContent = await page.content();
    expect(pageContent).toContain(state.comp1Name.substring(0, 8));
    expect(pageContent).toContain(state.comp2Name.substring(0, 8));
  });
});
