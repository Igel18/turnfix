/**
 * Setup: Create Event A
 *
 * Creates a FULLY SELF-CONTAINED event with all dependencies via API.
 * Works on an empty database (schema must exist via Prisma).
 *
 * Creates:
 *   - Sport, Venue, Country, Federation, Region
 *   - 2 Clubs (TC Alpha, TC Beta)
 *   - 20 Participants (10 women, 10 men — 5 per club)
 *   - 4 Disciplines (DA, DB, DC, DD with formula "1*x")
 *   - 1 Event with 2 Competitions (Women, Men)
 *   - 2 Squads (RW, RM)
 *   - 80 Scores (40 women + 40 men) via API
 *
 * Saves all IDs to .e2e-state/event-a.json for use by test files.
 */

import { test, expect } from '@playwright/test';
import {
  API_BASE,
  WOMEN_FIRST_NAMES,
  MEN_FIRST_NAMES,
  GENDER_FEMALE,
  GENDER_MALE,
  CLUB_ASSIGNMENT,
  DISCIPLINE_SHORT_NAMES,
  WOMEN_SCORES,
  MEN_SCORES,
} from '../fixtures/test-data';
import {
  EventAState,
  saveEventAState,
  apiPost,
  apiGet,
} from '../fixtures/test-state';

const TS = Date.now();
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

test.describe.serial('Setup: Create Event A', () => {
  let state: EventAState;

  test.beforeAll(async () => {
    state = {
      timestamp: TS,
      sportId: 0,
      venueId: 0,
      countryId: 0,
      federationId: 0,
      regionId: 0,
      clubIds: [],
      womenPids: [],
      menPids: [],
      disciplineIds: [],
      eventId: 0,
      eventName: `E2E_Event_${TS}`,
      comp1Id: 0,
      comp1Name: `E2E_Frauen_${TS}`,
      comp2Id: 0,
      comp2Name: `E2E_Maenner_${TS}`,
      scoresEntered: false,
    };
  });

  // ─── Step 1: Master Data ────────────────────────────────────────

  test('1. Create sport', async ({ request }) => {
    const res = await apiPost(request, '/sports', { var_name: `E2E_Turnen_${TS}` });
    expect(res.status).toBe(201);
    state.sportId = res.body.int_sportid;
    console.log(`✓ Sport: ${state.sportId}`);
  });

  test('2. Create venue', async ({ request }) => {
    const res = await apiPost(request, '/venues', {
      var_name: `E2E_Halle_${TS}`,
      var_ort: 'Teststadt',
    });
    expect(res.status).toBe(201);
    state.venueId = res.body.int_wettkampforteid;
    console.log(`✓ Venue: ${state.venueId}`);
  });

  test('3. Create country', async ({ request }) => {
    const res = await apiPost(request, '/countries', {
      var_name: `E2E_Land_${TS}`,
      var_kuerzel: 'E2EL',  // max 4 chars!
    });
    expect(res.status).toBe(201);
    state.countryId = res.body.int_laenderid;
    console.log(`✓ Country: ${state.countryId}`);
  });

  test('4. Create federation', async ({ request }) => {
    const res = await apiPost(request, '/associations/data/verbaende', {
      var_name: `E2E_Verband_${TS}`,
      var_kuerzel: 'EV',
      int_laenderid: state.countryId,
    });
    expect(res.status).toBe(201);
    state.federationId = res.body.int_verbaendeid;
    console.log(`✓ Federation: ${state.federationId}`);
  });

  test('5. Create region', async ({ request }) => {
    const res = await apiPost(request, '/associations', {
      var_name: `E2E_Gau_${TS}`,
      int_verbaendeid: state.federationId,
    });
    expect(res.status).toBe(201);
    state.regionId = res.body.int_gaueid;
    console.log(`✓ Region: ${state.regionId}`);
  });

  test('6. Create 2 clubs', async ({ request }) => {
    for (const clubName of [`TC Alpha ${TS}`, `TC Beta ${TS}`]) {
      const res = await apiPost(request, '/clubs', {
        var_name: clubName,
        int_gaueid: state.regionId,
      });
      expect(res.status).toBe(201);
      state.clubIds.push(res.body.int_vereineid);
    }
    expect(state.clubIds.length).toBe(2);
    console.log(`✓ Clubs: ${state.clubIds.join(', ')}`);
  });

  // ─── Step 2: Participants ───────────────────────────────────────

  test('7. Create 20 participants', async ({ request }) => {
    // 10 women
    for (let i = 0; i < WOMEN_FIRST_NAMES.length; i++) {
      const res = await apiPost(request, '/participants', {
        var_vorname: WOMEN_FIRST_NAMES[i],
        var_nachname: `Test${TS}`,
        int_geschlecht: GENDER_FEMALE,
        int_vereineid: state.clubIds[CLUB_ASSIGNMENT[i]],
        dat_geburtstag: '2015-06-15',
      });
      expect(res.status).toBe(201);
      const pid = res.body.participant?.int_teilnehmerid || res.body.int_teilnehmerid;
      expect(pid).toBeTruthy();
      state.womenPids.push(pid);
    }

    // 10 men
    for (let i = 0; i < MEN_FIRST_NAMES.length; i++) {
      const res = await apiPost(request, '/participants', {
        var_vorname: MEN_FIRST_NAMES[i],
        var_nachname: `Test${TS}`,
        int_geschlecht: GENDER_MALE,
        int_vereineid: state.clubIds[CLUB_ASSIGNMENT[i]],
        dat_geburtstag: '2015-06-15',
      });
      expect(res.status).toBe(201);
      const pid = res.body.participant?.int_teilnehmerid || res.body.int_teilnehmerid;
      expect(pid).toBeTruthy();
      state.menPids.push(pid);
    }

    expect(state.womenPids.length).toBe(10);
    expect(state.menPids.length).toBe(10);
    console.log(`✓ Participants: ${state.womenPids.length} women, ${state.menPids.length} men`);
  });

  // ─── Step 3: Disciplines ───────────────────────────────────────

  test('8. Create 4 disciplines', async ({ request }) => {
    for (let i = 0; i < DISCIPLINE_SHORT_NAMES.length; i++) {
      const res = await apiPost(request, '/disciplines', {
        name: `E2E_Disc${DISCIPLINE_SHORT_NAMES[i]}_${TS}`,
        shortName: DISCIPLINE_SHORT_NAMES[i],
        formula: '1*x',
        calculationType: 2,
        sportId: state.sportId,
        maleAllowed: true,
        femaleAllowed: true,
        shouldCalculate: false,
        attempts: 1,
      });
      expect(res.status).toBe(201);
      const did = res.body.id || res.body.discipline?.int_disziplinenid || res.body.int_disziplinenid;
      expect(did).toBeTruthy();
      state.disciplineIds.push(did);
    }
    expect(state.disciplineIds.length).toBe(4);
    console.log(`✓ Disciplines: ${state.disciplineIds.join(', ')}`);
  });

  // ─── Step 4: Event + Competitions ──────────────────────────────

  test('9. Create event', async ({ request }) => {
    const res = await apiPost(request, '/events', {
      var_eventname: state.eventName,
      dat_eventstartdate: today,
      dat_eventenddate: tomorrow,
      var_location: `E2E_Halle_${TS}`,
    });
    expect(res.status).toBe(201);
    state.eventId = res.body.event?.int_eventid || res.body.int_eventid;
    console.log(`✓ Event: ${state.eventId} (${state.eventName})`);
  });

  test('10. Create women\'s competition', async ({ request }) => {
    const res = await apiPost(request, '/competitions', {
      name: state.comp1Name,
      number: 'EW',
      gender: 'weiblich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 0,
      eventId: state.eventId,
      disciplines: state.disciplineIds.map(id => ({ disciplineId: id, maxScore: 20 })),
    });
    expect(res.status).toBe(201);
    state.comp1Id = res.body.id;
    console.log(`✓ Competition 1 (Women): ${state.comp1Id}`);
  });

  test('11. Create men\'s competition', async ({ request }) => {
    const res = await apiPost(request, '/competitions', {
      name: state.comp2Name,
      number: 'EM',
      gender: 'männlich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 0,
      eventId: state.eventId,
      disciplines: state.disciplineIds.map(id => ({ disciplineId: id, maxScore: 20 })),
    });
    expect(res.status).toBe(201);
    state.comp2Id = res.body.id;
    console.log(`✓ Competition 2 (Men): ${state.comp2Id}`);
  });

  // ─── Step 5: Assign Participants ───────────────────────────────

  test('12. Add participants to event and assign to competitions', async ({ request }) => {
    // Add women to event (auto-assigns to first competition)
    for (const pid of state.womenPids) {
      const r = await apiPost(request, '/event-participants/add', {
        eventId: state.eventId,
        participantId: pid,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Added ${state.womenPids.length} women to event`);

    // Add men to event (auto-assigns to first competition)
    for (const pid of state.menPids) {
      const r = await apiPost(request, '/event-participants/add', {
        eventId: state.eventId,
        participantId: pid,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Added ${state.menPids.length} men to event`);

    // Assign men to comp2 (men's competition)
    for (const pid of state.menPids) {
      const r = await apiPost(request, '/event-participants/assign', {
        participantId: pid,
        competitionId: state.comp2Id,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Assigned men to comp2`);

    // Unassign men from comp1 (they were auto-assigned there)
    for (const pid of state.menPids) {
      await (await request.delete(`${API_BASE}/event-participants/unassign?participantId=${pid}&competitionId=${state.comp1Id}`));
    }
    console.log(`✓ Unassigned men from comp1`);
  });

  // ─── Step 6: Squads ────────────────────────────────────────────

  test('13. Create squads and assign participants', async ({ request }) => {
    // Women squad (RW)
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'RW' });
    for (const pid of state.womenPids) {
      await apiPost(request, '/squad-management/assign', {
        participantId: pid,
        squadName: 'RW',
        eventId: state.eventId,
      });
    }

    // Men squad (RM)
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'RM' });
    for (const pid of state.menPids) {
      await apiPost(request, '/squad-management/assign', {
        participantId: pid,
        squadName: 'RM',
        eventId: state.eventId,
      });
    }
    console.log(`✓ Squads: RW (10 women), RM (10 men)`);
  });

  // ─── Step 7: Enter Scores via API ──────────────────────────────

  test('14. Enter 40 women\'s scores via API', async ({ request }) => {
    let count = 0;
    for (let wi = 0; wi < state.womenPids.length; wi++) {
      for (let di = 0; di < state.disciplineIds.length; di++) {
        const res = await apiPost(request, '/scores/save-value', {
          competitionId: state.comp1Id,
          participantId: state.womenPids[wi],
          disciplineId: state.disciplineIds[di],
          score: WOMEN_SCORES[wi][di],
        });
        expect(res.status).toBeLessThan(300);
        count++;
      }
    }
    expect(count).toBe(40);
    console.log(`✓ Entered ${count} women's scores`);
  });

  test('15. Enter 40 men\'s scores via API', async ({ request }) => {
    let count = 0;
    for (let mi = 0; mi < state.menPids.length; mi++) {
      for (let di = 0; di < state.disciplineIds.length; di++) {
        const res = await apiPost(request, '/scores/save-value', {
          competitionId: state.comp2Id,
          participantId: state.menPids[mi],
          disciplineId: state.disciplineIds[di],
          score: MEN_SCORES[mi][di],
        });
        expect(res.status).toBeLessThan(300);
        count++;
      }
    }
    expect(count).toBe(40);
    state.scoresEntered = true;
    console.log(`✓ Entered ${count} men's scores`);
  });

  // ─── Step 8: Verify & Save State ───────────────────────────────

  test('16. Verify scores and save state', async ({ request }) => {
    // Verify women's scores
    const w = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    expect(w.status).toBe(200);
    expect((w.body.results || []).length).toBeGreaterThanOrEqual(40);

    // Verify men's scores
    const m = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
    expect(m.status).toBe(200);
    expect((m.body.results || []).length).toBeGreaterThanOrEqual(40);

    // Save state for test files
    saveEventAState(state);

    console.log('\n✅ EVENT A SETUP COMPLETE');
    console.log(`   Event: ${state.eventId} (${state.eventName})`);
    console.log(`   Comp1 Women: ${state.comp1Id} (${state.comp1Name})`);
    console.log(`   Comp2 Men: ${state.comp2Id} (${state.comp2Name})`);
    console.log(`   Disciplines: ${state.disciplineIds.join(', ')}`);
    console.log(`   Women PIDs: ${state.womenPids.join(', ')}`);
    console.log(`   Men PIDs: ${state.menPids.join(', ')}`);
    console.log(`   Scores: 80 (40 + 40)`);
  });
});
