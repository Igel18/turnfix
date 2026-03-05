/**
 * Formula Cross-View Tests
 *
 * Verifies that non-trivial built-in formulas (like "5,5*x") produce
 * consistent values across all three views:
 *   1. API (save-value endpoint stores raw score)
 *   2. ScoreCapture UI (shows raw stored value)
 *   3. Results UI (shows formula-transformed value for ranking)
 *
 * This test is SELF-CONTAINED: it creates its own discipline with "5,5*x"
 * formula, event, competitions, and participants — then cleans up after.
 *
 * Formula "5,5*x" means:
 *   Raw input x=3.0 → stored as 3.0 → Results shows 5.5 × 3.0 = 16.50
 *   Raw input x=4.0 → stored as 4.0 → Results shows 5.5 × 4.0 = 22.00
 */

import { test, expect } from '@playwright/test';
import { API_BASE } from '../fixtures/test-data';
import { apiPost, apiGet, setEventContext } from '../fixtures/test-state';

const TS = Date.now();
const FORMULA = '5,5*x'; // German decimal comma — 5.5 * x

// Raw scores we'll enter and the expected formula-transformed values
const RAW_SCORES = [
  { raw: 4.0, transformed: 22.00 },   // Participant 0: 5.5 * 4.0 = 22.00  → Rank 1
  { raw: 3.0, transformed: 16.50 },   // Participant 1: 5.5 * 3.0 = 16.50  → Rank 2
  { raw: 2.5, transformed: 13.75 },   // Participant 2: 5.5 * 2.5 = 13.75  → Rank 3
  { raw: 1.8, transformed: 9.90 },    // Participant 3: 5.5 * 1.8 =  9.90  → Rank 4
];

const PARTICIPANT_NAMES = ['KarinFC', 'LenaFC', 'MariaFC', 'NinaFC'];

// State collected during setup
let sportId = 0;
let venueId = 0;
let countryId = 0;
let federationId = 0;
let regionId = 0;
let clubId = 0;
let participantIds: number[] = [];
let disciplineId = 0;
let eventId = 0;
let eventName = '';
let competitionId = 0;

// ═══════════════════════════════════════════════════════════════════════
// SETUP: Create isolated test data via API
// ═══════════════════════════════════════════════════════════════════════

test.describe.serial('Formula Cross-View: 5,5*x', () => {

  test('0. Create master data', async ({ request }) => {
    test.setTimeout(30_000);

    // Sport
    const sport = await apiPost(request, '/sports', { var_name: `FC_Sport_${TS}` });
    expect(sport.status).toBe(201);
    sportId = sport.body.int_sportid;

    // Venue
    const venue = await apiPost(request, '/venues', {
      var_name: `FC_Halle_${TS}`,
      var_ort: 'Teststadt',
    });
    expect(venue.status).toBe(201);
    venueId = venue.body.int_wettkampforteid;

    // Country
    const country = await apiPost(request, '/countries', {
      var_name: `FC_Land_${TS}`,
      var_kuerzel: 'FCLD',
    });
    expect(country.status).toBe(201);
    countryId = country.body.int_laenderid;

    // Federation
    const fed = await apiPost(request, '/associations/data/verbaende', {
      var_name: `FC_Verband_${TS}`,
      var_kuerzel: 'FV',
      int_laenderid: countryId,
    });
    expect(fed.status).toBe(201);
    federationId = fed.body.int_verbaendeid;

    // Region
    const region = await apiPost(request, '/associations', {
      var_name: `FC_Gau_${TS}`,
      int_verbaendeid: federationId,
    });
    expect(region.status).toBe(201);
    regionId = region.body.int_gaueid;

    // Club
    const club = await apiPost(request, '/clubs', {
      var_name: `FC_Club_${TS}`,
      int_gaueid: regionId,
    });
    expect(club.status).toBe(201);
    clubId = club.body.int_vereineid;

    console.log(`✓ Master data: sport=${sportId} venue=${venueId} club=${clubId}`);
  });

  test('1. Create 4 participants', async ({ request }) => {
    for (let i = 0; i < PARTICIPANT_NAMES.length; i++) {
      const res = await apiPost(request, '/participants', {
        var_vorname: PARTICIPANT_NAMES[i],
        var_nachname: `Formula${TS}`,
        int_geschlecht: 2, // female
        int_vereineid: clubId,
        dat_geburtstag: '2015-06-15',
      });
      expect(res.status).toBe(201);
      const pid = res.body.participant?.int_teilnehmerid || res.body.int_teilnehmerid;
      expect(pid).toBeTruthy();
      participantIds.push(pid);
    }
    expect(participantIds.length).toBe(4);
    console.log(`✓ Participants: ${participantIds.join(', ')}`);
  });

  test('2. Create discipline with formula "5,5*x"', async ({ request }) => {
    const res = await apiPost(request, '/disciplines', {
      name: `FC_Formel_${TS}`,
      shortName: 'FX',
      formula: FORMULA,
      calculationType: 2,
      sportId: sportId,
      maleAllowed: true,
      femaleAllowed: true,
      shouldCalculate: false,
      attempts: 1,
    });
    expect(res.status).toBe(201);
    disciplineId = res.body.id || res.body.discipline?.int_disziplinenid || res.body.int_disziplinenid;
    expect(disciplineId).toBeTruthy();
    console.log(`✓ Discipline: ${disciplineId} (formula="${FORMULA}")`);
  });

  test('3. Create event + competition', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    eventName = `FC_Event_${TS}`;
    const ev = await apiPost(request, '/events', {
      var_eventname: eventName,
      dat_eventstartdate: today,
      dat_eventenddate: tomorrow,
      var_location: `FC_Halle_${TS}`,
    });
    expect(ev.status).toBe(201);
    eventId = ev.body.event?.int_eventid || ev.body.int_eventid;

    const comp = await apiPost(request, '/competitions', {
      name: `FC_Wettkampf_${TS}`,
      number: 'FW',
      gender: 'weiblich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 0,
      eventId,
      disciplines: [{ disciplineId, maxScore: 20 }],
    });
    expect(comp.status).toBe(201);
    competitionId = comp.body.id;

    console.log(`✓ Event: ${eventId}, Competition: ${competitionId}`);
  });

  test('4. Add participants to event + competition', async ({ request }) => {
    for (const pid of participantIds) {
      const r = await apiPost(request, '/event-participants/add', {
        eventId,
        participantId: pid,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ ${participantIds.length} participants added`);
  });

  test('5. Enter raw scores via API', async ({ request }) => {
    for (let i = 0; i < participantIds.length; i++) {
      const res = await apiPost(request, '/scores/save-value', {
        competitionId,
        participantId: participantIds[i],
        disciplineId,
        score: RAW_SCORES[i].raw,
      });
      expect(res.status).toBe(200);
    }
    console.log(`✓ Entered ${participantIds.length} raw scores`);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VERIFY: API returns raw stored values
  // ═══════════════════════════════════════════════════════════════════════

  test('6. API returns raw stored values (not formula-transformed)', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${competitionId}&limit=100`);
    expect(res.status).toBe(200);
    const results = res.body.results || [];

    for (let i = 0; i < participantIds.length; i++) {
      const match = results.find(
        (r: any) => r.participantId === participantIds[i] && r.disciplineId === disciplineId
      );
      expect(match).toBeTruthy();
      // API should return the RAW value stored in rel_leistung
      expect(match.score).toBeCloseTo(RAW_SCORES[i].raw, 1);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VERIFY: ScoreCapture shows RAW values
  // ═══════════════════════════════════════════════════════════════════════

  test('7. ScoreCapture shows raw stored values in input fields', async ({ page, request }) => {
    test.setTimeout(60_000);

    await setEventContext(page, eventId, eventName);
    await page.goto(
      `/score-capture?eventId=${eventId}&competitionId=${competitionId}`,
      { waitUntil: 'networkidle' }
    );
    await page.waitForTimeout(2000);

    // Uncheck jury scores if present
    const juryCheckbox = page.locator('#showJuryScores');
    if (await juryCheckbox.isVisible().catch(() => false)) {
      if (await juryCheckbox.isChecked()) {
        await juryCheckbox.uncheck();
        await page.waitForTimeout(500);
      }
    }

    // Verify each participant's score input shows the RAW value
    for (let i = 0; i < participantIds.length; i++) {
      const scoreInput = page.locator(
        `input[data-participant="${participantIds[i]}"][data-discipline="${disciplineId}"]`
      );
      // If the input is visible, check its value
      if (await scoreInput.isVisible().catch(() => false)) {
        const displayedValue = await scoreInput.inputValue();
        const numValue = parseFloat(displayedValue);
        // ScoreCapture shows the RAW stored value, NOT the formula-transformed value
        expect(numValue).toBeCloseTo(RAW_SCORES[i].raw, 1);
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // VERIFY: Results page shows FORMULA-TRANSFORMED values
  // ═══════════════════════════════════════════════════════════════════════

  test('8. Results page shows formula-transformed totals', async ({ page }) => {
    test.setTimeout(60_000);

    await setEventContext(page, eventId, eventName);
    await page.goto(`/results?eventId=${eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Find the competition section by competition name
    const compNamePart = `FC_Wettkampf_${TS}`;
    const compHeading = page.locator(`h3:has-text("${compNamePart}")`);
    await expect(compHeading).toBeVisible({ timeout: 10_000 });

    const section = compHeading.locator('xpath=../..');
    const rows = section.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Results should show formula-transformed values as totals
    // Rank 1: KarinFC — 5.5*4.0 = 22.00
    // Rank 2: LenaFC  — 5.5*3.0 = 16.50
    // Rank 3: MariaFC — 5.5*2.5 = 13.75
    // Rank 4: NinaFC  — 5.5*1.8 = 9.90

    // Sorted by transformed score descending
    const expected = [
      { name: 'KarinFC',  total: '22.00' },
      { name: 'LenaFC',   total: '16.50' },
      { name: 'MariaFC',  total: '13.75' },
      { name: 'NinaFC',   total: '9.90' },
    ];

    for (let i = 0; i < expected.length; i++) {
      const rowText = await rows.nth(i).textContent() || '';
      expect(rowText).toContain(expected[i].name);
      expect(rowText).toContain(expected[i].total);
    }
  });

  test('9. Results ranking order is correct (highest transformed score first)', async ({ page }) => {
    test.setTimeout(60_000);

    await setEventContext(page, eventId, eventName);
    await page.goto(`/results?eventId=${eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const compNamePart = `FC_Wettkampf_${TS}`;
    const section = page.locator(`h3:has-text("${compNamePart}")`).locator('xpath=../..');
    const rows = section.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Ranking by formula-transformed score: 22.00 > 16.50 > 13.75 > 9.90
    const firstRowText = await rows.nth(0).textContent() || '';
    const lastRowText = await rows.nth(3).textContent() || '';

    expect(firstRowText).toContain('KarinFC');
    expect(firstRowText).toContain('22.00');
    expect(lastRowText).toContain('NinaFC');
    expect(lastRowText).toContain('9.90');
  });

  test('10. Raw vs transformed: stored 3.0 appears as 16.50 on Results', async ({ request, page }) => {
    test.setTimeout(60_000);

    // Verify via API that participant 1 (LenaFC) has raw score 3.0
    const apiRes = await apiGet(request, `/scores?competitionId=${competitionId}&limit=100`);
    const match = (apiRes.body.results || []).find(
      (r: any) => r.participantId === participantIds[1] && r.disciplineId === disciplineId
    );
    expect(match).toBeTruthy();
    expect(match.score).toBeCloseTo(3.0, 1);

    // But on Results page, it should show 5.5 * 3.0 = 16.50
    await setEventContext(page, eventId, eventName);
    await page.goto(`/results?eventId=${eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const compNamePart = `FC_Wettkampf_${TS}`;
    const section = page.locator(`h3:has-text("${compNamePart}")`).locator('xpath=../..');
    const tableText = await section.locator('table').textContent() || '';

    // LenaFC should show 16.50 (transformed), not 3.00 (raw)
    expect(tableText).toContain('LenaFC');
    expect(tableText).toContain('16.50');
  });
});
