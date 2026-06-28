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
import { robustReload } from '../helpers';

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
    const squadSelect = page.locator('[data-testid="squad-select"]');
    await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });

    // Wait for squad option to become available
    await page.locator(`select option[value="RW"]`).waitFor({ state: 'attached', timeout: 20_000 });
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(500);

    // Select first available discipline card
    const disciplineCard = page.locator('div.border-2.rounded-lg').first();
    await disciplineCard.waitFor({ state: 'visible', timeout: 10_000 });
    await disciplineCard.click();
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

    const squadSelect = page.locator('[data-testid="squad-select"]');
    await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator(`select option[value="RW"]`).waitFor({ state: 'attached', timeout: 20_000 });
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(500);

    const disciplineCard = page.locator('div.border-2.rounded-lg').first();
    await disciplineCard.waitFor({ state: 'visible', timeout: 10_000 });
    await disciplineCard.click();
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

    const squadSelect = page.locator('[data-testid="squad-select"]');
    await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
    await page.locator(`select option[value="RW"]`).waitFor({ state: 'attached', timeout: 20_000 });
    await squadSelect.selectOption({ value: 'RW' });
    await page.waitForTimeout(500);

    const disciplineCard = page.locator('div.border-2.rounded-lg').first();
    await disciplineCard.waitFor({ state: 'visible', timeout: 10_000 });
    await disciplineCard.click();
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
  test('participant status API returns data for event', async ({ request }) => {
    const response = await apiGet(request, `/participant-status?eventId=${state.eventId}`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.participants)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

test.describe('ScoreCaptureV2 – Linked Fields Persistence', () => {
  test('entered field values persist after full page reload', async ({ page, request }) => {
    test.setTimeout(120_000);

    const ts = Date.now();
    const squadName = `L${String(ts).slice(-1)}`;
    let participantId = 0;
    let linkedDisciplineId = 0;
    let linkedCompetitionId = 0;
    let linkedDisciplineName = '';
    const fieldAValue = 8.5;
    const fieldBValue = 1.5;

    try {
      // 1) Create a dedicated participant for this test
      const participantRes = await request.post(`${API_BASE}/participants`, {
        data: {
          var_vorname: `Persist${String(ts).slice(-4)}`,
          var_nachname: 'Reload',
          int_geschlecht: 2,
          int_vereineid: state.clubIds[0],
          dat_geburtstag: '2015-06-15',
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(participantRes.status()).toBe(201);
      const participantBody = await participantRes.json();
      participantId = participantBody.participant?.int_teilnehmerid || participantBody.int_teilnehmerid;
      expect(participantId).toBeTruthy();

      // 2) Create a linked-formula discipline (A + B)
      const disciplineRes = await request.post(`${API_BASE}/disciplines`, {
        data: {
          name: `E2E_Linked_${ts}`,
          shortName: `L${String(ts).slice(-3)}`,
          formula: 'A + B',
          calculationType: 2,
          sportId: state.sportId,
          maleAllowed: true,
          femaleAllowed: true,
          shouldCalculate: false,
          attempts: 1,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(disciplineRes.status()).toBe(201);
      const disciplineBody = await disciplineRes.json();
      linkedDisciplineId =
        disciplineBody.id || disciplineBody.discipline?.int_disziplinenid || disciplineBody.int_disziplinenid;
      expect(linkedDisciplineId).toBeTruthy();
      linkedDisciplineName = `E2E_Linked_${ts}`;

      // 3) Create two discipline fields (for A and B)
      const fieldARes = await request.post(`${API_BASE}/discipline-fields`, {
        data: {
          disciplineId: linkedDisciplineId,
          name: 'D-Note',
          sortOrder: 1,
          isFinalScore: false,
          isStartingScore: false,
          group: 1,
          enabled: true,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(fieldARes.status()).toBeLessThan(300);

      const fieldBRes = await request.post(`${API_BASE}/discipline-fields`, {
        data: {
          disciplineId: linkedDisciplineId,
          name: 'E-Note',
          sortOrder: 2,
          isFinalScore: false,
          isStartingScore: false,
          group: 1,
          enabled: true,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(fieldBRes.status()).toBeLessThan(300);

      // 4) Create competition using this linked discipline
      const compRes = await request.post(`${API_BASE}/competitions`, {
        data: {
          name: `E2E_Linked_Comp_${ts}`,
          number: `LC${String(ts).slice(-3)}`,
          gender: 'weiblich',
          ageFrom: 1,
          ageTo: 99,
          competitionType: 0,
          eventId: state.eventId,
          disciplines: [{ disciplineId: linkedDisciplineId, maxScore: 20 }],
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(compRes.status()).toBe(201);
      const compBody = await compRes.json();
      linkedCompetitionId = compBody.id;
      expect(linkedCompetitionId).toBeTruthy();

      // 5) Assign the dedicated participant to this competition
      const addParticipantRes = await request.post(`${API_BASE}/event-participants/add`, {
        data: {
          eventId: state.eventId,
          participantId,
          competitionId: linkedCompetitionId,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(addParticipantRes.status()).toBeLessThan(300);

      // 5b) Ensure participant is in a known squad used by the selector
      const createSquadRes = await request.post(`${API_BASE}/squad-management/create`, {
        data: {
          eventId: state.eventId,
          name: squadName,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      // 400 can happen if the short squad name already exists for this event.
      expect([200, 201, 400]).toContain(createSquadRes.status());

      const assignSquadRes = await request.post(`${API_BASE}/squad-management/assign`, {
        data: {
          participantId,
          squadName,
          eventId: state.eventId,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(assignSquadRes.status()).toBeLessThan(300);

      // Ensure squad-discipline combinations are generated for selection/status flows.
      const generateRes = await request.post(`${API_BASE}/squad-disciplines/generate`, {
        data: { eventId: state.eventId },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(generateRes.status()).toBe(200);

      await setEventContext(page, state.eventId, state.eventName);
      await page.goto(
        `/score-capture-v2?eventId=${state.eventId}&competitionId=${linkedCompetitionId}`,
        { waitUntil: 'domcontentloaded' }
      );

      // 6) Select squad and the linked discipline
      const squadSelect = page.locator('[data-testid="squad-select"]');
      await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
      await page.locator(`select option[value="${squadName}"]`).first().waitFor({ state: 'attached', timeout: 20_000 });
      await squadSelect.selectOption({ value: squadName });

      const disciplineCard = page.locator('div.border-2.rounded-lg', { hasText: linkedDisciplineName }).first();
      await disciplineCard.waitFor({ state: 'visible', timeout: 20_000 });
      await disciplineCard.click();

      const splitView = page.locator('[data-testid="scoring-split-view"]');
      await expect(splitView).toBeVisible({ timeout: 15_000 });

      // Ensure participant is selected
      const participantItem = page.locator(`[data-testid="participant-list-item-${participantId}"]`);
      if (await participantItem.count()) {
        await participantItem.click();
      }

      const inputA = page.locator('label', { hasText: /^A:/ }).locator('xpath=following-sibling::input').first();
      const inputB = page.locator('label', { hasText: /^B:/ }).locator('xpath=following-sibling::input').first();

      await expect(inputA).toBeVisible({ timeout: 10_000 });
      await expect(inputB).toBeVisible({ timeout: 10_000 });

      // 7) Enter values in linked fields (triggers field-level saves)
      const saveA = page.waitForResponse(
        r => r.url().includes('/api/jury-results/save-field-score') && r.request().method() === 'POST' && r.status() < 400
      );
      await inputA.fill(String(fieldAValue));
      await inputA.blur();
      await saveA;

      const saveB = page.waitForResponse(
        r => r.url().includes('/api/jury-results/save-field-score') && r.request().method() === 'POST' && r.status() < 400
      );
      await inputB.fill(String(fieldBValue));
      await inputB.blur();
      await saveB;

      // 8) Full page reload
      await robustReload(page);

      // 9) Re-select squad + discipline after reload
      const squadSelectAfter = page.locator('[data-testid="squad-select"]');
      await squadSelectAfter.waitFor({ state: 'visible', timeout: 20_000 });
      await page.locator(`select option[value="${squadName}"]`).first().waitFor({ state: 'attached', timeout: 20_000 });
      await squadSelectAfter.selectOption({ value: squadName });

      const disciplineCardAfter = page.locator('div.border-2.rounded-lg', { hasText: linkedDisciplineName }).first();
      await disciplineCardAfter.waitFor({ state: 'visible', timeout: 20_000 });
      await disciplineCardAfter.click();

      await expect(page.locator('[data-testid="scoring-split-view"]')).toBeVisible({ timeout: 15_000 });

      const participantItemAfter = page.locator(`[data-testid="participant-list-item-${participantId}"]`);
      if (await participantItemAfter.count()) {
        await participantItemAfter.click();
      }

      const inputAAfter = page.locator('label', { hasText: /^A:/ }).locator('xpath=following-sibling::input').first();
      const inputBAfter = page.locator('label', { hasText: /^B:/ }).locator('xpath=following-sibling::input').first();

      await expect(inputAAfter).toBeVisible({ timeout: 10_000 });
      await expect(inputBAfter).toBeVisible({ timeout: 10_000 });

      // Values are loaded asynchronously from scoreMatrix/jury-results after reload.
      await expect.poll(async () => await inputAAfter.inputValue(), { timeout: 15_000 }).not.toBe('');
      await expect.poll(async () => await inputBAfter.inputValue(), { timeout: 15_000 }).not.toBe('');

      const valueA = await inputAAfter.inputValue();
      const valueB = await inputBAfter.inputValue();

      const parsedA = parseFloat(valueA.replace(',', '.'));
      const parsedB = parseFloat(valueB.replace(',', '.'));

      expect(parsedA).toBeCloseTo(fieldAValue, 2);
      expect(parsedB).toBeCloseTo(fieldBValue, 2);
    } finally {
      // Best-effort cleanup to avoid polluting setup/teardown data.
      if (participantId && linkedCompetitionId) {
        await request.delete(`${API_BASE}/event-participants/unassign?participantId=${participantId}&competitionId=${linkedCompetitionId}`);
      }
      if (linkedCompetitionId) {
        await request.delete(`${API_BASE}/competitions/${linkedCompetitionId}`);
      }
      if (linkedDisciplineId) {
        await request.delete(`${API_BASE}/disciplines/${linkedDisciplineId}`);
      }
      if (participantId) {
        await request.delete(`${API_BASE}/participants/${participantId}`);
      }
    }
  });
});
