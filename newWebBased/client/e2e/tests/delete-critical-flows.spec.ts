import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, apiDelete, apiGet, apiPost, EventAState } from '../fixtures/test-state';
import { confirmDeleteModal } from '../helpers';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe.serial('Critical Delete Flows', () => {
  test('UI: remove event participant from event', async ({ page, request }) => {
    const firstName = `DelEP_${Date.now()}`;
    const lastName = `Test${state.timestamp}`;

    const participantRes = await apiPost(request, '/participants', {
      var_vorname: firstName,
      var_nachname: lastName,
      int_geschlecht: 2,
      int_vereineid: state.clubIds[0],
      dat_geburtstag: '2015-06-15',
    });
    expect(participantRes.status).toBe(201);

    const participantId = participantRes.body.participant?.int_teilnehmerid || participantRes.body.int_teilnehmerid;
    expect(participantId).toBeTruthy();

    const addRes = await apiPost(request, '/event-participants/add', {
      eventId: state.eventId,
      participantId,
    });
    expect([200, 201]).toContain(addRes.status);

    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/event-participants?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await searchInput.fill(firstName);
      await page.waitForTimeout(700);
    }

    const row = page.locator('table tbody tr', { hasText: firstName }).first();
    await expect(row).toBeVisible({ timeout: 10000 });

    const namedDeleteButton = row.getByRole('button', { name: /remove|delete|lösch|entfernen/i }).first();
    const titleDeleteButton = row.locator(
      'button[title*="Remove" i], button[title*="Delete" i], button[title*="Lösch" i], button[aria-label*="Delete" i], button[aria-label*="Lösch" i]'
    ).first();

    if (await namedDeleteButton.isVisible({ timeout: 800 }).catch(() => false)) {
      await namedDeleteButton.click();
    } else if (await titleDeleteButton.isVisible({ timeout: 800 }).catch(() => false)) {
      await titleDeleteButton.click();
    } else {
      await row.locator('button').last().click();
    }

    await confirmDeleteModal(page);
    await page.waitForTimeout(1000);

    const participantsRes = await apiGet(request, `/event-participants?eventId=${state.eventId}&includeAvailable=false&limit=200`);
    expect(participantsRes.status).toBe(200);
    const list = participantsRes.body.eventParticipants || participantsRes.body.participants || [];
    const stillAssigned = list.some((p: any) => p.id === participantId);
    expect(stillAssigned).toBe(false);

    await apiDelete(request, `/participants/${participantId}`);
  });

  test('UI: delete squad from squads page', async ({ page, request }) => {
    const squadName = `D${String(Date.now()).slice(-4)}`;

    const participantRes = await apiPost(request, '/participants', {
      var_vorname: `DelSQ_${Date.now()}`,
      var_nachname: `Test${state.timestamp}`,
      int_geschlecht: 2,
      int_vereineid: state.clubIds[0],
      dat_geburtstag: '2015-06-15',
    });
    expect(participantRes.status).toBe(201);
    const participantId = participantRes.body.participant?.int_teilnehmerid || participantRes.body.int_teilnehmerid;

    const addRes = await apiPost(request, '/event-participants/add', {
      eventId: state.eventId,
      participantId,
    });
    expect([200, 201]).toContain(addRes.status);

    const createSquadRes = await apiPost(request, '/squad-management/create', {
      eventId: state.eventId,
      name: squadName,
    });
    expect([200, 201]).toContain(createSquadRes.status);

    const assignRes = await apiPost(request, '/squad-management/assign', {
      participantId,
      squadName,
      eventId: state.eventId,
    });
    expect([200, 201]).toContain(assignRes.status);

    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/squads?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const tableRow = page.locator('table tbody tr', { hasText: squadName }).first();
    const cardItem = page.locator('div, li', { hasText: squadName }).filter({ has: page.locator('button') }).first();

    const row = await tableRow.isVisible({ timeout: 1000 }).catch(() => false) ? tableRow : cardItem;
    await expect(row).toBeVisible({ timeout: 10000 });

    const namedDeleteButton = row.getByRole('button', { name: /remove|delete|lösch|entfernen/i }).first();
    const titleDeleteButton = row.locator(
      'button[title*="Delete" i], button[title*="Lösch" i], button[aria-label*="Delete" i], button[aria-label*="Lösch" i]'
    ).first();

    if (await namedDeleteButton.isVisible({ timeout: 800 }).catch(() => false)) {
      await namedDeleteButton.click();
    } else if (await titleDeleteButton.isVisible({ timeout: 800 }).catch(() => false)) {
      await titleDeleteButton.click();
    } else {
      await row.locator('button').last().click();
    }

    await confirmDeleteModal(page);
    await page.waitForTimeout(1000);

    const squadsRes = await apiGet(request, `/squad-management?eventId=${state.eventId}`);
    expect(squadsRes.status).toBe(200);
    const squads = squadsRes.body.squads || squadsRes.body || [];
    const stillExists = squads.some((s: any) => (s.name || s.squad_name) === squadName);
    expect(stillExists).toBe(false);

    await apiDelete(request, `/event-participants/remove?eventId=${state.eventId}&participantId=${participantId}`);
    await apiDelete(request, `/participants/${participantId}`);
  });

  test('API: delete temporary group', async ({ request }) => {
    const groupName = `E2E_DelGroup_${Date.now()}`;

    const createRes = await apiPost(request, '/groups', {
      clubId: state.clubIds[0],
      name: groupName,
    });
    expect(createRes.status).toBe(201);

    const groupId = createRes.body.id;
    expect(groupId).toBeTruthy();

    const delRes = await apiDelete(request, `/groups/${groupId}`);
    expect([200, 204]).toContain(delRes.status);

    const groupsRes = await apiGet(request, '/groups?limit=1000');
    expect(groupsRes.status).toBe(200);
    const groups = groupsRes.body.data || groupsRes.body || [];
    expect(groups.some((g: any) => g.id === groupId || g.int_gruppenid === groupId)).toBe(false);
  });

  test('API: delete temporary team', async ({ request }) => {
    const teamNumber = 900 + Math.floor(Math.random() * 90);

    const createRes = await apiPost(request, '/teams', {
      clubId: state.clubIds[0],
      competitionId: state.comp1Id,
      number: teamNumber,
      riege: 'T9',
      startNumber: 9900 + Math.floor(Math.random() * 50),
    });
    expect([200, 201]).toContain(createRes.status);

    const teamId = createRes.body.id || createRes.body.int_mannschaftenid;
    expect(teamId).toBeTruthy();

    const delRes = await apiDelete(request, `/teams/${teamId}`);
    expect([200, 204]).toContain(delRes.status);

    const teamsRes = await apiGet(request, `/teams?eventId=${state.eventId}&limit=200`);
    expect(teamsRes.status).toBe(200);
    const teams = teamsRes.body.teams || teamsRes.body || [];
    expect(teams.some((t: any) => t.id === teamId || t.int_mannschaftenid === teamId)).toBe(false);
  });
});
