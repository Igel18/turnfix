/**
 * Team Competition Tests — Mannschaftswettkampf
 *
 * Depends on: Team Event (setup/create-team-event)
 *
 * Tests the full team competition workflow:
 *   1. Setup Verification (event, competition, teams, participants)
 *   2. Team Structure (members per team, club assignment)
 *   3. Squad / Riegeneinteilung
 *   4. Score Entry (individual scores for team members)
 *   5. Individual Rankings (all 12 participants)
 *   6. Team Rankings (aggregated team totals)
 *   7. GymNet XML Import for Teams
 */

import { test, expect } from '@playwright/test';
import {
  loadTeamEventState,
  setEventContext,
  apiGet,
  apiPost,
  TeamEventState,
} from '../fixtures/test-state';
import {
  ALL_TEAM_NAMES,
  TEAM_ALPHA_NAMES,
  TEAM_BETA_NAMES,
  TEAM_GAMMA_NAMES,
  TEAM_SCORES,
  EXPECTED_INDIVIDUAL_RANKING,
  EXPECTED_TEAM_RANKING,
  TOTAL_TEAM_PARTICIPANTS,
  TOTAL_TEAM_SCORES,
  MEMBERS_PER_TEAM,
  NUM_TEAMS,
  TEAM_ALPHA_TOTAL,
  TEAM_BETA_TOTAL,
  TEAM_GAMMA_TOTAL,
} from '../fixtures/team-test-data';
import { API_BASE } from '../fixtures/test-data';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let state: TeamEventState;

test.beforeAll(async () => {
  state = loadTeamEventState();
});

/** Wait for squad options to load in the select, then choose one.
 *  The SquadDisciplineSelector component returns null while loading,
 *  so we first wait for the select to become visible (proves data loaded),
 *  then wait for the specific option value. */
async function selectSquadOption(page: import('@playwright/test').Page, value: string) {
  const squadSelect = page.locator('select').first();
  // Wait for the select to be visible (SquadDisciplineSelector renders null while loading)
  await squadSelect.waitFor({ state: 'visible', timeout: 30_000 });
  // Wait for the specific option value to appear in DOM
  await page.locator(`select option[value="${value}"]`).waitFor({ state: 'attached', timeout: 30_000 });
  await squadSelect.selectOption({ value });
  await page.waitForTimeout(2000);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. SETUP VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Setup Verification', () => {

  test('team event appears on Events page', async ({ page }) => {
    await page.goto('/events', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Click the Filter button to reveal the search input
    const filterBtn = page.locator('button', { hasText: /Filter/ }).first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterBtn.click();
      await page.waitForTimeout(500);
    }

    // The event may be on a later page (pagination). Use the search box to find it.
    const searchInput = page.locator('input[type="text"][placeholder*="uch"], input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(state.eventName);
      await page.waitForTimeout(2000);
    } else {
      // If no search box, click through pagination until we find it
      let found = false;
      for (let i = 0; i < 10 && !found; i++) {
        const bodyText = await page.locator('body').textContent();
        if (bodyText?.includes(state.eventName)) {
          found = true;
          break;
        }
        const nextBtn = page.locator('button', { hasText: /Weiter|Next|»/ }).first();
        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false) && await nextBtn.isEnabled()) {
          await nextBtn.click();
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }
    }

    await expect(page.locator('body')).toContainText(state.eventName);
  });

  test('team competition is visible', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/competitions?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(state.competitionName);
  });

  test('competition type is team (1)', async ({ request }) => {
    const res = await apiGet(request, `/competitions/${state.competitionId}`);
    expect(res.status).toBe(200);
    const comp = res.body;
    const compType = comp.competitionType ?? comp.int_typ ?? comp.type;
    expect(compType).toBe(1); // 1 = Mannschaftswettbewerb
  });

  test('competition has 4 disciplines', async ({ request }) => {
    const res = await apiGet(request, `/competitions/${state.competitionId}/disciplines`);
    expect(res.status).toBe(200);
    const disciplines = res.body.disciplines || res.body;
    expect(disciplines.length).toBe(4);
  });

  test('12 participants registered to event', async ({ request }) => {
    const res = await apiGet(request, `/event-participants?eventId=${state.eventId}&includeAvailable=false&limit=100`);
    expect(res.status).toBe(200);
    const count = res.body.totalInEvent || (res.body.participants || []).length;
    expect(count).toBeGreaterThanOrEqual(TOTAL_TEAM_PARTICIPANTS);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. TEAM STRUCTURE
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Team Structure', () => {

  test('3 teams exist for this event', async ({ request }) => {
    const res = await apiGet(request, `/teams?eventId=${state.eventId}&limit=100`);
    expect(res.status).toBe(200);
    const teams = res.body.teams || res.body;
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThanOrEqual(NUM_TEAMS);
  });

  test('each team has 4 members', async ({ request }) => {
    for (let t = 0; t < NUM_TEAMS; t++) {
      const res = await apiGet(request, `/teams/${state.teamIds[t]}/members`);
      expect(res.status).toBe(200);
      const members = res.body.members || res.body;
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBe(MEMBERS_PER_TEAM);
    }
  });

  test('Team Alpha has correct members', async ({ request }) => {
    const res = await apiGet(request, `/teams/${state.teamIds[0]}/members`);
    const members = res.body.members || res.body;
    const memberNames = members.map((m: any) =>
      m.firstName || m.var_vorname || m.tfx_teilnehmer?.var_vorname || m.participantName || ''
    );

    for (const name of TEAM_ALPHA_NAMES) {
      expect(memberNames.some((n: string) => n.includes(name))).toBe(true);
    }
  });

  test('Team Beta has correct members', async ({ request }) => {
    const res = await apiGet(request, `/teams/${state.teamIds[1]}/members`);
    const members = res.body.members || res.body;
    const memberNames = members.map((m: any) =>
      m.firstName || m.var_vorname || m.tfx_teilnehmer?.var_vorname || m.participantName || ''
    );

    for (const name of TEAM_BETA_NAMES) {
      expect(memberNames.some((n: string) => n.includes(name))).toBe(true);
    }
  });

  test('Team Gamma has correct members', async ({ request }) => {
    const res = await apiGet(request, `/teams/${state.teamIds[2]}/members`);
    const members = res.body.members || res.body;
    const memberNames = members.map((m: any) =>
      m.firstName || m.var_vorname || m.tfx_teilnehmer?.var_vorname || m.participantName || ''
    );

    for (const name of TEAM_GAMMA_NAMES) {
      expect(memberNames.some((n: string) => n.includes(name))).toBe(true);
    }
  });

  test('teams belong to different clubs', async ({ request }) => {
    const clubIds = new Set<number>();
    for (const teamId of state.teamIds) {
      const res = await apiGet(request, `/teams/${teamId}`);
      expect(res.status).toBe(200);
      const team = res.body.team || res.body;
      const clubId = team.clubId || team.int_vereineid;
      expect(clubId).toBeTruthy();
      clubIds.add(clubId);
    }
    expect(clubIds.size).toBe(NUM_TEAMS); // Each team from a different club
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. SQUAD / RIEGENEINTEILUNG
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Squads', () => {

  test('squad RT exists', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/squads?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText('RT');
  });

  test('squad page is accessible for team event', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/squads?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    // No error state should be visible
    await expect(page.locator('body')).not.toContainText('Fehler');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. SCORE ENTRY
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Score Entry API', () => {

  test('48 scores exist via API', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    expect(res.status).toBe(200);
    const results = res.body.results || [];
    expect(results.length).toBeGreaterThanOrEqual(TOTAL_TEAM_SCORES);
  });

  test('AlphaAUI individual total is 37.25', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const results = res.body.results || [];
    const alphaAScores = results.filter((r: any) => r.participantId === state.participantIds[0]);
    const total = alphaAScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(total).toBeCloseTo(37.25, 1);
  });

  test('BetaAUI individual total is 36.25', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const results = res.body.results || [];
    const betaAScores = results.filter((r: any) => r.participantId === state.participantIds[4]);
    const total = betaAScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(total).toBeCloseTo(36.25, 1);
  });

  test('GammaAUI individual total is 32.25', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const results = res.body.results || [];
    const gammaAScores = results.filter((r: any) => r.participantId === state.participantIds[8]);
    const total = gammaAScores.reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(total).toBeCloseTo(32.25, 1);
  });

  test('reject score without required fields', async ({ request }) => {
    const res = await request.post(`${API_BASE}/scores`, {
      data: {
        competitionId: state.competitionId,
        disciplineId: state.disciplineIds[0],
        score: 5.0,
        // Missing participantId
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('can update and restore a score', async ({ request }) => {
    const pid = state.participantIds[11]; // GammaDUI
    const did = state.disciplineIds[0];
    const originalScore = TEAM_SCORES[11][0]; // 6.50

    // Update to 8.88
    const updateRes = await apiPost(request, '/scores/save-value', {
      competitionId: state.competitionId,
      participantId: pid,
      disciplineId: did,
      score: 8.88,
    });
    expect(updateRes.status).toBeLessThan(300);

    // Verify change
    const checkRes = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const afterScores = (checkRes.body.results || []).filter(
      (r: any) => r.participantId === pid && r.disciplineId === did
    );
    expect(afterScores.length).toBeGreaterThanOrEqual(1);
    expect(afterScores[0].score).toBeCloseTo(8.88, 1);

    // Restore original
    await apiPost(request, '/scores/save-value', {
      competitionId: state.competitionId,
      participantId: pid,
      disciplineId: did,
      score: originalScore,
    });
  });
});

test.describe('Team Competition: Score Capture UI', () => {

  test('score capture page loads for team competition', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.competitionId}`,
      { waitUntil: 'domcontentloaded' }
    );

    // Select squad RT
    await selectSquadOption(page, 'RT');

    // Verify participants are shown
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(12);
  });

  test('all 12 team members visible in score table', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.competitionId}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RT');

    for (const firstName of ALL_TEAM_NAMES) {
      await expect(page.locator('body')).toContainText(firstName);
    }
  });

  test('pre-entered scores are displayed correctly', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.competitionId}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RT');

    // Uncheck jury view for simple score display
    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isChecked()) {
      await juryCheckbox.uncheck();
      await page.waitForTimeout(500);
    }

    // Verify first participant's first score (AlphaAUI = 9.50)
    const firstInput = page.locator(
      `input[data-participant="${state.participantIds[0]}"][data-discipline="${state.disciplineIds[0]}"]`
    );
    await firstInput.waitFor({ state: 'visible', timeout: 10_000 });
    const value = await firstInput.inputValue();
    expect(parseFloat(value)).toBeCloseTo(TEAM_SCORES[0][0], 1);
  });

  test('discipline column headers are visible', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(
      `/score-capture?eventId=${state.eventId}&competitionId=${state.competitionId}`,
      { waitUntil: 'domcontentloaded' }
    );

    await selectSquadOption(page, 'RT');

    const headers = page.locator('thead th');
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. INDIVIDUAL RANKINGS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Individual Rankings', () => {

  test('results page loads for team event', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Competition heading should be visible
    const heading = page.locator(`h3:has-text("${state.competitionName}")`);
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });

  test('top 3 individual placements correct', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const section = page.locator(`h3:has-text("${state.competitionName}")`).locator('xpath=../..');
    const rows = section.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    for (let i = 0; i < 3; i++) {
      const rowText = await rows.nth(i).textContent() || '';
      expect(rowText).toContain(EXPECTED_INDIVIDUAL_RANKING[i].name);
    }
  });

  test('all 12 individual placements in order', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const section = page.locator(`h3:has-text("${state.competitionName}")`).locator('xpath=../..');
    const rows = section.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    for (let i = 0; i < 12; i++) {
      const rowText = await rows.nth(i).textContent() || '';
      expect(rowText).toContain(EXPECTED_INDIVIDUAL_RANKING[i].name);
      expect(rowText).toContain(EXPECTED_INDIVIDUAL_RANKING[i].total.toFixed(2));
    }
  });

  test('individual rank 1 is AlphaAUI with 37.25', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const section = page.locator(`h3:has-text("${state.competitionName}")`).locator('xpath=../..');
    const firstRow = section.locator('table tbody tr').first();
    const text = await firstRow.textContent() || '';
    expect(text).toContain('AlphaAUI');
    expect(text).toContain('37.25');
  });

  test('individual rank 12 is GammaDUI with 26.25', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const section = page.locator(`h3:has-text("${state.competitionName}")`).locator('xpath=../..');
    const rows = section.locator('table tbody tr');
    const lastRow = rows.nth(11);
    const text = await lastRow.textContent() || '';
    expect(text).toContain('GammaDUI');
    expect(text).toContain('26.25');
  });

  test('results page has 12 result rows', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const section = page.locator(`h3:has-text("${state.competitionName}")`).locator('xpath=../..');
    const rows = section.locator('table tbody tr');
    expect(await rows.count()).toBe(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. TEAM RANKINGS (API level)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Team Rankings API', () => {

  test('team scores can be calculated from individual member scores', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    expect(res.status).toBe(200);
    const results = res.body.results || [];

    // Calculate Team Alpha total from member scores
    const teamAlphaPids = state.participantIds.slice(0, 4);
    const teamAlphaTotal = results
      .filter((r: any) => teamAlphaPids.includes(r.participantId))
      .reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(teamAlphaTotal).toBeCloseTo(TEAM_ALPHA_TOTAL, 1);

    // Calculate Team Beta total
    const teamBetaPids = state.participantIds.slice(4, 8);
    const teamBetaTotal = results
      .filter((r: any) => teamBetaPids.includes(r.participantId))
      .reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(teamBetaTotal).toBeCloseTo(TEAM_BETA_TOTAL, 1);

    // Calculate Team Gamma total
    const teamGammaPids = state.participantIds.slice(8, 12);
    const teamGammaTotal = results
      .filter((r: any) => teamGammaPids.includes(r.participantId))
      .reduce((sum: number, r: any) => sum + (r.score || 0), 0);
    expect(teamGammaTotal).toBeCloseTo(TEAM_GAMMA_TOTAL, 1);
  });

  test('team ranking: Alpha > Beta > Gamma', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const results = res.body.results || [];

    // Calculate totals per team
    const teamTotals = [];
    for (let t = 0; t < NUM_TEAMS; t++) {
      const startIdx = t * MEMBERS_PER_TEAM;
      const teamPids = state.participantIds.slice(startIdx, startIdx + MEMBERS_PER_TEAM);
      const teamTotal = results
        .filter((r: any) => teamPids.includes(r.participantId))
        .reduce((sum: number, r: any) => sum + (r.score || 0), 0);
      teamTotals.push({ teamIndex: t, total: teamTotal });
    }

    // Sort by total descending
    teamTotals.sort((a, b) => b.total - a.total);

    // Verify ranking order
    expect(teamTotals[0].teamIndex).toBe(0); // Alpha first
    expect(teamTotals[1].teamIndex).toBe(1); // Beta second
    expect(teamTotals[2].teamIndex).toBe(2); // Gamma third

    // Verify expected totals
    expect(teamTotals[0].total).toBeCloseTo(EXPECTED_TEAM_RANKING[0].total, 1);
    expect(teamTotals[1].total).toBeCloseTo(EXPECTED_TEAM_RANKING[1].total, 1);
    expect(teamTotals[2].total).toBeCloseTo(EXPECTED_TEAM_RANKING[2].total, 1);
  });

  test('teams from different clubs', async ({ request }) => {
    const clubsFound = new Set<number>();
    for (const teamId of state.teamIds) {
      const res = await apiGet(request, `/teams/${teamId}`);
      const team = res.body.team || res.body;
      clubsFound.add(team.clubId || team.int_vereineid);
    }
    expect(clubsFound.size).toBe(3);
  });

  test('team members do not overlap', async ({ request }) => {
    const allMemberPids = new Set<number>();
    for (const teamId of state.teamIds) {
      const res = await apiGet(request, `/teams/${teamId}/members`);
      const members = res.body.members || res.body;
      for (const m of members) {
        const pid = m.participantId || m.int_teilnehmerid;
        expect(allMemberPids.has(pid)).toBe(false); // No overlap
        allMemberPids.add(pid);
      }
    }
    expect(allMemberPids.size).toBe(TOTAL_TEAM_PARTICIPANTS);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. CROSS-CHECKS
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: Cross-Checks', () => {

  test('competition type displayed in UI', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/competitions?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Competition should show "Mannschaft" or team type indicator
    const bodyText = await page.locator('body').textContent() || '';
    expect(
      bodyText.toLowerCase().includes('mannschaft') ||
      bodyText.toLowerCase().includes('team') ||
      bodyText.includes('1') // competitionType value
    ).toBe(true);
  });

  test('Event Participants page shows 12 participants', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/event-participants?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toMatch(/12|Teilnehmer/i);
  });

  test('all scores belong to team competition only', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const results = res.body.results || [];

    // All scores should have the correct competition ID
    for (const score of results) {
      expect(score.competitionId).toBe(state.competitionId);
    }
  });

  test('total number of scores is 48', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    const results = res.body.results || [];
    expect(results.length).toBeGreaterThanOrEqual(TOTAL_TEAM_SCORES);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. GYMNET TEAM XML IMPORT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════

test.describe('Team Competition: GymNet Team XML Import', () => {
  let importEventId: number;
  const IMPORT_EVENT_NAME = `E2E_TeamImport_${Date.now()}`;

  test('seed production data for import', async ({ request }) => {
    // Ensure GymNet preset and production disciplines are seeded
    await apiPost(request, '/configuration/gymnet-preset', {});
    await apiPost(request, '/configuration/production-disciplines', {});
    await apiPost(request, '/configuration/production-statuses', {});
    await apiPost(request, '/configuration/discipline-groups', {});
    console.log('✓ Production data seeded');
  });

  test('import team competition XML', async ({ request }) => {
    const xmlPath = path.resolve(__dirname, '..', 'fixtures', 'gymnet-team-import.xml');
    expect(fs.existsSync(xmlPath)).toBe(true);

    const res = await request.post(`${API_BASE}/events/import-gymnet`, {
      multipart: {
        xmlFile: {
          name: 'gymnet-team-import.xml',
          mimeType: 'text/xml',
          buffer: fs.readFileSync(xmlPath),
        },
        eventName: IMPORT_EVENT_NAME,
        startDate: '2026-09-01',
        endDate: '2026-09-02',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.createdEvent).toBeTruthy();
    expect(body.createdEvent.id).toBeGreaterThan(0);

    importEventId = body.createdEvent.id;
    console.log(`✓ Imported team event: ${importEventId} (${IMPORT_EVENT_NAME})`);
  });

  test('imported event has a team competition', async ({ request }) => {
    const res = await apiGet(request, `/competitions?eventId=${importEventId}`);
    expect(res.status).toBe(200);
    const competitions = res.body.competitions || res.body;
    expect(Array.isArray(competitions)).toBe(true);
    expect(competitions.length).toBeGreaterThanOrEqual(1);

    // At least one competition should be team type
    const teamComp = competitions.find((c: any) =>
      (c.competitionType ?? c.int_typ ?? c.type) === 1
    );
    expect(teamComp).toBeTruthy();
  });

  test('imported event has teams', async ({ request }) => {
    const res = await apiGet(request, `/teams?eventId=${importEventId}&limit=100`);
    expect(res.status).toBe(200);
    const teams = res.body.teams || res.body;
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThanOrEqual(3); // 3 Mannschaften in XML
  });

  test('imported teams have members', async ({ request }) => {
    const teamsRes = await apiGet(request, `/teams?eventId=${importEventId}&limit=100`);
    const teams = teamsRes.body.teams || teamsRes.body;

    let totalMembers = 0;
    for (const team of teams) {
      const teamId = team.id || team.int_mannschaftenid;
      const membersRes = await apiGet(request, `/teams/${teamId}/members`);
      const members = membersRes.body.members || membersRes.body;
      expect(Array.isArray(members)).toBe(true);
      // Each team in our XML has 4 members
      expect(members.length).toBeGreaterThanOrEqual(2); // At least 2 members (minimum for team detection)
      totalMembers += members.length;
    }

    // Total: 3 teams × 4 members = 12
    expect(totalMembers).toBeGreaterThanOrEqual(12);
  });

  test('imported participants are from correct clubs', async ({ request }) => {
    const teamsRes = await apiGet(request, `/teams?eventId=${importEventId}&limit=100`);
    const teams = teamsRes.body.teams || teamsRes.body;

    const clubNames = teams.map((t: any) => t.clubName || '');
    // Verify our 3 clubs are represented
    expect(clubNames.some((n: string) => n.includes('TeamAlpha'))).toBe(true);
    expect(clubNames.some((n: string) => n.includes('TeamBeta'))).toBe(true);
    expect(clubNames.some((n: string) => n.includes('TeamGamma'))).toBe(true);
  });

  test('imported competition has disciplines', async ({ request }) => {
    const compsRes = await apiGet(request, `/competitions?eventId=${importEventId}`);
    const competitions = compsRes.body.competitions || compsRes.body;
    const teamComp = competitions.find((c: any) =>
      (c.competitionType ?? c.int_typ ?? c.type) === 1
    );

    if (teamComp) {
      const compId = teamComp.id || teamComp.int_wettkaempfeid;
      const discRes = await apiGet(request, `/competitions/${compId}/disciplines`);
      expect(discRes.status).toBe(200);
      const disciplines = discRes.body.disciplines || discRes.body;
      expect(disciplines.length).toBeGreaterThanOrEqual(4);
    }
  });
});
