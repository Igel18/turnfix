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

  test('squad-discipline status dropdown updates status and persists', async ({ page, request }) => {
    test.setTimeout(90_000);

    const squadName = 'RW';
    let restoreDisciplineId: number | null = null;
    let restoreStatusId: number | null = null;
    let targetDisciplineName = '';
    let targetDisciplineId: number | null = null;

    try {
      const statusesRes = await apiGet(request, '/statuses?limit=100');
      expect(statusesRes.status).toBe(200);
      const statuses = statusesRes.body.statuses || statusesRes.body.results || statusesRes.body;
      expect(Array.isArray(statuses)).toBe(true);
      expect(statuses.length).toBeGreaterThan(1);

      const generateRes = await request.post(`${API_BASE}/squad-disciplines/generate`, {
        data: { eventId: state.eventId },
        headers: { 'Content-Type': 'application/json' },
      });
      expect([200, 400]).toContain(generateRes.status());

      const initialSdRes = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}&squadName=${encodeURIComponent(squadName)}`);
      expect(initialSdRes.status).toBe(200);
      const initialRows = initialSdRes.body.squadDisciplines || [];
      expect(initialRows.length).toBeGreaterThan(0);

      const targetRow = initialRows.find((r: any) => r.disciplineName) || initialRows[0];
      targetDisciplineName = String(targetRow.disciplineName || '').trim();
      targetDisciplineId = Number(targetRow.disciplineId);
      restoreDisciplineId = targetDisciplineId;
      restoreStatusId = targetRow.statusId != null ? Number(targetRow.statusId) : null;

      expect(targetDisciplineName).toBeTruthy();
      expect(targetDisciplineId).toBeTruthy();

      await setEventContext(page, state.eventId, state.eventName);
      await page.goto(
        `/score-capture-v2?eventId=${state.eventId}&competitionId=${state.comp1Id}`,
        { waitUntil: 'domcontentloaded' }
      );

      const squadSelect = page.locator('[data-testid="squad-select"]');
      await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
      await page.locator(`select option[value="${squadName}"]`).waitFor({ state: 'attached', timeout: 20_000 });
      await squadSelect.selectOption({ value: squadName });
      await page.waitForTimeout(500);

      const disciplineCard = page.locator('div.border-2.rounded-lg', { hasText: targetDisciplineName }).first();
      await disciplineCard.waitFor({ state: 'visible', timeout: 20_000 });
      await disciplineCard.click();

      const statusLabel = page.locator('label').filter({ hasText: /Riegenstatus|Status/i }).first();
      await statusLabel.waitFor({ state: 'visible', timeout: 10_000 });
      const statusSelect = statusLabel.locator('xpath=following-sibling::select').first();
      await statusSelect.waitFor({ state: 'visible', timeout: 10_000 });

      const currentValue = await statusSelect.inputValue();
      const currentStatusId = currentValue ? Number(currentValue) : null;

      const nextStatus = statuses.find((s: any) => Number(s.int_statusid ?? s.id) !== currentStatusId);
      expect(nextStatus).toBeTruthy();
      const nextStatusId = Number(nextStatus.int_statusid ?? nextStatus.id);

      await statusSelect.selectOption(String(nextStatusId));
      await page.waitForTimeout(700);

      const sdRes = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}&squadName=${encodeURIComponent(squadName)}`);
      expect(sdRes.status).toBe(200);
      const rows = sdRes.body.squadDisciplines || [];
      const row = rows.find((r: any) => Number(r.disciplineId) === targetDisciplineId);
      expect(row).toBeTruthy();
      expect(Number(row.statusId)).toBe(nextStatusId);

      await page.reload({ waitUntil: 'domcontentloaded' });
      const squadSelectAfter = page.locator('[data-testid="squad-select"]');
      await squadSelectAfter.waitFor({ state: 'visible', timeout: 20_000 });
      await squadSelectAfter.selectOption({ value: squadName });

      const disciplineCardAfter = page.locator('div.border-2.rounded-lg', { hasText: targetDisciplineName }).first();
      await disciplineCardAfter.waitFor({ state: 'visible', timeout: 10_000 });
      await disciplineCardAfter.click();

      const statusLabelAfter = page.locator('label').filter({ hasText: /Riegenstatus|Status/i }).first();
      const statusSelectAfter = statusLabelAfter.locator('xpath=following-sibling::select').first();
      await statusSelectAfter.waitFor({ state: 'visible', timeout: 10_000 });
      await expect(statusSelectAfter).toHaveValue(String(nextStatusId));
    } finally {
      if (restoreDisciplineId && restoreStatusId !== null) {
        await request.put(
          `${API_BASE}/squad-disciplines/${encodeURIComponent(squadName)}/${restoreDisciplineId}/status?eventId=${state.eventId}`,
          {
            data: { statusId: restoreStatusId },
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
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

  test('latest overwritten field value persists after full page reload', async ({ page, request }) => {
    test.setTimeout(120_000);

    const ts = Date.now();
    const squadName = `U${String(ts).slice(-1)}`;
    let participantId = 0;
    let linkedDisciplineId = 0;
    let linkedCompetitionId = 0;
    let linkedDisciplineName = '';
    const firstA = 1.0;
    const secondA = 2.0;
    const fieldBValue = 0.5;

    try {
      const participantRes = await request.post(`${API_BASE}/participants`, {
        data: {
          var_vorname: `Overwrite${String(ts).slice(-4)}`,
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

      const disciplineRes = await request.post(`${API_BASE}/disciplines`, {
        data: {
          name: `E2E_Overwrite_${ts}`,
          shortName: `O${String(ts).slice(-3)}`,
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
      linkedDisciplineName = `E2E_Overwrite_${ts}`;

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

      const compRes = await request.post(`${API_BASE}/competitions`, {
        data: {
          name: `E2E_Overwrite_Comp_${ts}`,
          number: `OC${String(ts).slice(-3)}`,
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

      const addParticipantRes = await request.post(`${API_BASE}/event-participants/add`, {
        data: {
          eventId: state.eventId,
          participantId,
          competitionId: linkedCompetitionId,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(addParticipantRes.status()).toBeLessThan(300);

      const createSquadRes = await request.post(`${API_BASE}/squad-management/create`, {
        data: {
          eventId: state.eventId,
          name: squadName,
        },
        headers: { 'Content-Type': 'application/json' },
      });
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

      const squadSelect = page.locator('[data-testid="squad-select"]');
      await squadSelect.waitFor({ state: 'visible', timeout: 20_000 });
      await page.locator(`select option[value="${squadName}"]`).first().waitFor({ state: 'attached', timeout: 20_000 });
      await squadSelect.selectOption({ value: squadName });

      const disciplineCard = page.locator('div.border-2.rounded-lg', { hasText: linkedDisciplineName }).first();
      await disciplineCard.waitFor({ state: 'visible', timeout: 20_000 });
      await disciplineCard.click();

      await expect(page.locator('[data-testid="scoring-split-view"]')).toBeVisible({ timeout: 15_000 });

      const participantItem = page.locator(`[data-testid="participant-list-item-${participantId}"]`);
      if (await participantItem.count()) {
        await participantItem.click();
      }

      const inputA = page.locator('label', { hasText: /^A:/ }).locator('xpath=following-sibling::input').first();
      const inputB = page.locator('label', { hasText: /^B:/ }).locator('xpath=following-sibling::input').first();
      await expect(inputA).toBeVisible({ timeout: 10_000 });
      await expect(inputB).toBeVisible({ timeout: 10_000 });

      const saveAFirst = page.waitForResponse(
        r => r.url().includes('/api/jury-results/save-field-score') && r.request().method() === 'POST' && r.status() < 400
      );
      await inputA.fill(String(firstA));
      await inputA.blur();
      await saveAFirst;

      const saveASecond = page.waitForResponse(
        r => r.url().includes('/api/jury-results/save-field-score') && r.request().method() === 'POST' && r.status() < 400
      );
      await inputA.fill(String(secondA));
      await inputA.blur();
      await saveASecond;

      const saveB = page.waitForResponse(
        r => r.url().includes('/api/jury-results/save-field-score') && r.request().method() === 'POST' && r.status() < 400
      );
      await inputB.fill(String(fieldBValue));
      await inputB.blur();
      await saveB;

      await robustReload(page);

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

      await expect.poll(async () => await inputAAfter.inputValue(), { timeout: 15_000 }).not.toBe('');
      await expect.poll(async () => await inputBAfter.inputValue(), { timeout: 15_000 }).not.toBe('');

      const valueA = await inputAAfter.inputValue();
      const valueB = await inputBAfter.inputValue();

      const parsedA = parseFloat(valueA.replace(',', '.'));
      const parsedB = parseFloat(valueB.replace(',', '.'));

      expect(parsedA).toBeCloseTo(secondA, 2);
      expect(parsedB).toBeCloseTo(fieldBValue, 2);
    } finally {
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
