/**
 * Jury Portal E2E — Durchgang, Bahn and scoring context
 *
 * Depends on: Event A (master data: sport, disciplines, clubs, participants).
 * Creates its own event with three competitions:
 *   WK1: Durchgang 1 / Bahn 1  (women)   squad DG1: 2 women
 *   WK2: Durchgang 2 / Bahn 1  (men)     squad DG2: 2 men
 *   WK3: Durchgang 2 / Bahn 2  (men)     squad DG2: 2 men
 *
 * Checks the extra selection steps (Durchgang before squad, Bahn after the device),
 * the filtering of squads and participants and the context bar of the scoring view.
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { loadEventAState, apiPost, apiGet, apiPut, apiDelete, EventAState } from '../fixtures/test-state';
import { MEN_FIRST_NAMES, WOMEN_FIRST_NAMES } from '../fixtures/test-data';
import { robustGoto } from '../helpers';

const JURY_URL = 'http://localhost:3002/jury';
const TS = Date.now();
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

let base: EventAState;
let api: APIRequestContext;
let eventId = 0;
const competitionIds: number[] = [];
// Own disciplines: Event A's disciplines are overwritten by the production seeding of later setups
const disciplineIds: number[] = [];

async function createCompetition(name: string, gender: string, round: number, track: number) {
  const res = await apiPost(api, '/competitions', {
    name,
    number: name.slice(-2),
    gender,
    ageFrom: 1,
    ageTo: 99,
    competitionType: 0,
    round,
    track,
    eventId,
    disciplines: disciplineIds.map(id => ({ disciplineId: id, maxScore: 20 })),
  });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  competitionIds.push(res.body.id);
  return res.body.id as number;
}

async function addToSquad(participantIds: number[], competitionId: number, squad: string) {
  for (const participantId of participantIds) {
    const added = await apiPost(api, '/event-participants/add', { eventId, participantId, competitionId });
    expect(added.status).toBe(201);
    await apiPost(api, '/squad-management/assign', { participantId, squadName: squad, eventId });
  }
}

test.describe.serial('Jury Portal: Durchgang, Bahn and context', () => {
  test.beforeAll(async ({ playwright }) => {
    base = loadEventAState();
    api = await playwright.request.newContext();

    for (const short of ['DX', 'DY']) {
      const discipline = await apiPost(api, '/disciplines', {
        name: `E2E_DiscDG${short}_${TS}`,
        shortName: short,
        formula: '1*x',
        calculationType: 2,
        sportId: base.sportId,
        maleAllowed: true,
        femaleAllowed: true,
        shouldCalculate: false,
        attempts: 1,
      });
      expect(discipline.status, JSON.stringify(discipline.body)).toBe(201);
      disciplineIds.push(discipline.body.id || discipline.body.discipline?.int_disziplinenid || discipline.body.int_disziplinenid);
    }

    const event = await apiPost(api, '/events', {
      var_eventname: `E2E_DG_${TS}`,
      dat_eventstartdate: today,
      dat_eventenddate: tomorrow,
      var_location: `E2E_Halle_${TS}`,
    });
    expect(event.status).toBe(201);
    eventId = event.body.event?.int_eventid || event.body.int_eventid;

    const wk1 = await createCompetition(`E2E_DG1_${TS}_W1`, 'weiblich', 1, 1);
    const wk2 = await createCompetition(`E2E_DG2_${TS}_M2`, 'männlich', 2, 1);
    const wk3 = await createCompetition(`E2E_DG3_${TS}_M3`, 'männlich', 2, 2);

    await apiPost(api, '/squad-management/create', { eventId, name: 'DG1' });
    await apiPost(api, '/squad-management/create', { eventId, name: 'DG2' });

    await addToSquad(base.womenPids.slice(0, 2), wk1, 'DG1');
    await addToSquad(base.menPids.slice(0, 2), wk2, 'DG2');
    await addToSquad(base.menPids.slice(2, 4), wk3, 'DG2');

    // Rotation of squad DG1: first DX, then DY
    for (const [index, disciplineId] of disciplineIds.entries()) {
      const cell = await apiPut(api, '/time-planning/matrix/squad-cell', {
        eventId, squadName: 'DG1', round: index + 1, disciplineId,
      });
      expect(cell.status, JSON.stringify(cell.body)).toBe(200);
    }
  });

  test.afterAll(async () => {
    if (eventId) await apiDelete(api, `/events/${eventId}?force=true`);
    for (const id of disciplineIds) await apiDelete(api, `/disciplines/${id}`);
    await api.dispose();
  });

  // ─── API contract ────────────────────────────────────────────────

  test('API: durchgaenge lists both Durchgänge with their squads', async () => {
    const res = await apiGet(api, `/time-planning/durchgaenge?eventId=${eventId}`);
    expect(res.status).toBe(200);

    const byNumber = Object.fromEntries(res.body.durchgaenge.map((d: any) => [d.durchgang, d]));
    expect(Object.keys(byNumber).sort()).toEqual(['1', '2']);
    expect(byNumber[1].squads).toEqual([{ name: 'DG1', participantCount: 2 }]);
    expect(byNumber[2].squads).toEqual([{ name: 'DG2', participantCount: 4 }]);
  });

  test('API: bahn-details separates the Bahnen of Durchgang 2', async () => {
    const res = await apiGet(api, `/time-planning/bahn-details?eventId=${eventId}`);
    expect(res.status).toBe(200);

    const lanes = res.body.bahnen.map((b: any) => [b.durchgang, b.bahn]);
    expect(lanes).toEqual([[1, 1], [2, 1], [2, 2]]);
    for (const lane of res.body.bahnen) {
      expect(lane.competitions[0].disciplineIds.length).toBe(disciplineIds.length);
    }
    expect(res.body.bahnen[1].squads).toEqual([{ name: 'DG2', participantCount: 2 }]);
  });

  // ─── UI helpers ──────────────────────────────────────────────────

  async function openEvent(page: Page) {
    await robustGoto(page, JURY_URL);
    await page.evaluate(() => localStorage.setItem('juryPortal_filterToday', 'false'));
    await page.reload({ waitUntil: 'load' });

    const select = page.locator('select').first();
    await select.waitFor({ state: 'visible', timeout: 10_000 });
    await select.locator('option').nth(1).waitFor({ state: 'attached', timeout: 10_000 });
    await select.selectOption(eventId.toString());

    const next = page.getByRole('button', { name: /Weiter zur Riegeneinteilung/ });
    await expect(next).toBeEnabled({ timeout: 15_000 });
    await next.click();
  }

  async function pickFirstDevice(page: Page) {
    const cards = page.locator('.cursor-pointer').filter({ hasText: /E2E_Disc/ });
    await cards.first().waitFor({ state: 'visible', timeout: 15_000 });
    await cards.first().click();
  }

  // ─── Durchgang step ──────────────────────────────────────────────

  test('asks for the Durchgang before the squads', async ({ page }) => {
    await openEvent(page);

    await expect(page.getByRole('heading', { name: 'Durchgang auswählen' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('durchgang-card-1')).toBeVisible();
    await expect(page.getByTestId('durchgang-card-2')).toBeVisible();
    await expect(page.getByTestId('durchgang-card-2')).toContainText('1 Riege · 4 Teilnehmer');
  });

  test('shows only the squads of the chosen Durchgang', async ({ page }) => {
    await openEvent(page);
    await page.getByTestId('durchgang-card-1').click();

    await expect(page.getByRole('heading', { name: 'Riege auswählen' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'DG1' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'DG2' })).toHaveCount(0);
  });

  test('back from the squads returns to the Durchgang list', async ({ page }) => {
    await openEvent(page);
    await page.getByTestId('durchgang-card-2').click();
    await expect(page.getByRole('heading', { name: 'Riege auswählen' })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /Zurück/ }).click();
    await expect(page.getByRole('heading', { name: 'Durchgang auswählen' })).toBeVisible();
  });

  // ─── Bahn step ───────────────────────────────────────────────────

  test('skips the Bahn step when the squad has only one Bahn', async ({ page }) => {
    test.setTimeout(60_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-1').click();
    await page.getByRole('heading', { name: 'DG1' }).click();
    await pickFirstDevice(page);

    await expect(page.getByText(/Teilnehmer \d+ von \d+/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Bahn auswählen' })).toHaveCount(0);
  });

  test('asks for the Bahn when the squad competes on two Bahnen', async ({ page }) => {
    test.setTimeout(60_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-2').click();
    await page.getByRole('heading', { name: 'DG2' }).click();
    await pickFirstDevice(page);

    await expect(page.getByRole('heading', { name: 'Bahn auswählen' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('bahn-card-1')).toContainText('2 Teilnehmer');
    await expect(page.getByTestId('bahn-card-2')).toContainText('2 Teilnehmer');
  });

  test('scores only the participants of the chosen Bahn', async ({ page }) => {
    test.setTimeout(60_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-2').click();
    await page.getByRole('heading', { name: 'DG2' }).click();
    await pickFirstDevice(page);
    await page.getByTestId('bahn-card-2').click();

    await expect(page.getByRole('heading', { name: 'Teilnehmer (2)' })).toBeVisible({ timeout: 20_000 });
    const body = page.locator('body');
    // Bahn 2 (WK3) holds the men with index 2 and 3
    await expect(body).toContainText(MEN_FIRST_NAMES[2]);
    await expect(body).toContainText(MEN_FIRST_NAMES[3]);
    await expect(body).not.toContainText(MEN_FIRST_NAMES[0]);
    await expect(body).not.toContainText(MEN_FIRST_NAMES[1]);
  });

  test('back from the scoring view returns to the Bahn list', async ({ page }) => {
    test.setTimeout(60_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-2').click();
    await page.getByRole('heading', { name: 'DG2' }).click();
    await pickFirstDevice(page);
    await page.getByTestId('bahn-card-1').click();
    await expect(page.getByText(/Teilnehmer \d+ von \d+/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /Zurück/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Bahn auswählen' })).toBeVisible();
  });

  // ─── Rotation ────────────────────────────────────────────────────

  test('API: squad-rotation returns the devices of the squad in rotation order', async () => {
    const res = await apiGet(api, `/time-planning/squad-rotation?eventId=${eventId}&squad=DG1`);
    expect(res.status).toBe(200);
    expect(res.body.devices.map((d: any) => d.disciplineId)).toEqual(disciplineIds);
    expect(res.body.devices.map((d: any) => d.round)).toEqual([1, 2]);
  });

  test('API: a squad without rotation gets an empty list', async () => {
    const res = await apiGet(api, `/time-planning/squad-rotation?eventId=${eventId}&squad=DG2`);
    expect(res.body.devices).toEqual([]);
  });

  async function openDg1Device(page: Page, name: string) {
    await openEvent(page);
    await page.getByTestId('durchgang-card-1').click();
    await page.getByRole('heading', { name: 'DG1' }).click();
    const card = page.locator('.cursor-pointer').filter({ hasText: name });
    await card.first().waitFor({ state: 'visible', timeout: 15_000 });
    await card.first().click();
  }

  test('shows done, current and next device while scoring', async ({ page }) => {
    test.setTimeout(60_000);
    await openDg1Device(page, `E2E_DiscDGDY_${TS}`);

    const [first, second] = disciplineIds;
    await expect(page.getByTestId(`rotation-device-${second}`)).toHaveAttribute('data-state', 'current', { timeout: 20_000 });
    await expect(page.getByTestId(`rotation-device-${first}`)).toHaveAttribute('data-state', 'done');
    await expect(page.getByTestId('rotation-last')).toContainText('Letztes Gerät der Riege');
  });

  test('names the next device while scoring the first one', async ({ page }) => {
    test.setTimeout(60_000);
    await openDg1Device(page, `E2E_DiscDGDX_${TS}`);

    await expect(page.getByTestId('rotation-next')).toContainText(`E2E_DiscDGDY_${TS}`, { timeout: 20_000 });
    await expect(page.getByTestId(`rotation-device-${disciplineIds[1]}`)).toHaveAttribute('data-state', 'next');
  });

  test('suggests the next device after completing a device', async ({ page }) => {
    test.setTimeout(60_000);
    await openDg1Device(page, `E2E_DiscDGDX_${TS}`);
    await expect(page.getByTestId('rotation-next')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Gerät abschließen' }).click();
    await expect(page.getByRole('heading', { name: 'Gerät auswählen' })).toBeVisible({ timeout: 15_000 });

    const marked = page.locator('[data-next="true"]');
    await expect(marked).toHaveCount(1);
    await expect(marked).toContainText(`E2E_DiscDGDY_${TS}`);
    await expect(marked).toContainText('Als Nächstes');
  });

  test('shows no rotation row for a squad without planned rotation', async ({ page }) => {
    test.setTimeout(60_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-2').click();
    await page.getByRole('heading', { name: 'DG2' }).click();
    await pickFirstDevice(page);
    await page.getByTestId('bahn-card-1').click();

    await expect(page.getByTestId('context-device')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-testid^="rotation-device-"]')).toHaveCount(0);
  });

  // ─── Context bar ─────────────────────────────────────────────────

  test('the scoring view shows Durchgang, Riege, Bahn and Gerät', async ({ page }) => {
    test.setTimeout(60_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-2').click();
    await page.getByRole('heading', { name: 'DG2' }).click();
    await pickFirstDevice(page);
    await page.getByTestId('bahn-card-2').click();

    await expect(page.getByTestId('context-device')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('context-durchgang')).toContainText('2');
    await expect(page.getByTestId('context-squad')).toContainText('DG2');
    await expect(page.getByTestId('context-bahn')).toContainText('2');
    await expect(page.getByTestId('context-device')).toContainText('E2E_Disc');
  });

  test('a score entered for the chosen Bahn is stored for the right participant', async ({ page, request }) => {
    test.setTimeout(90_000);
    await openEvent(page);
    await page.getByTestId('durchgang-card-1').click();
    await page.getByRole('heading', { name: 'DG1' }).click();
    await pickFirstDevice(page);

    await expect(page.getByText(/Teilnehmer \d+ von \d+/)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('context-bahn')).toContainText('1');
    await expect(page.locator('body')).toContainText(WOMEN_FIRST_NAMES[0]);

    await page.locator('input[type="text"][inputmode="decimal"]').fill('11.25');
    await page.getByRole('button', { name: /Bewertung speichern/ }).click();
    await expect(page.getByText('1 / 2')).toBeVisible({ timeout: 15_000 });

    const scores = await apiGet(request, `/scores?eventId=${eventId}&limit=1000`);
    const stored = (scores.body.results || []).filter((s: any) => Math.abs(Number(s.score) - 11.25) < 0.001);
    expect(stored.length).toBe(1);
    expect(stored[0].participantId).toBe(base.womenPids[0]);
  });
});
