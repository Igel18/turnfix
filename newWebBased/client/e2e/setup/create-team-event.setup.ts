/**
 * Setup: Create Team Event (Mannschaftswettkampf)
 *
 * Creates a FULLY SELF-CONTAINED team competition with all dependencies via API.
 *
 * Creates:
 *   - Sport, Venue, Country, Federation, Region
 *   - 3 Clubs (TC TeamAlpha, TC TeamBeta, TC TeamGamma)
 *   - 12 Participants (4 women per team/club)
 *   - 4 Disciplines (TDA, TDB, TDC, TDD)
 *   - 1 Event with 1 Team Competition (competitionType = 1)
 *   - 3 Teams (one per club, each with 4 members)
 *   - 1 Squad (RT)
 *   - 48 Individual Scores (12 participants × 4 disciplines) via API
 *
 * Saves all IDs to .e2e-state/team-event.json for use by test files.
 */

import { test, expect } from '@playwright/test';
import {
  ALL_TEAM_NAMES,
  TEAM_GENDER,
  TEAM_CLUB_ASSIGNMENT,
  TEAM_DISCIPLINE_NAMES,
  TEAM_SCORES,
  MEMBERS_PER_TEAM,
  NUM_TEAMS,
} from '../fixtures/team-test-data';
import { API_BASE } from '../fixtures/test-data';
import {
  TeamEventState,
  saveTeamEventState,
  apiPost,
  apiGet,
} from '../fixtures/test-state';

const TS = Date.now();
const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

test.describe.serial('Setup: Create Team Event', () => {
  let state: TeamEventState;

  test.beforeAll(async () => {
    state = {
      timestamp: TS,
      sportId: 0,
      venueId: 0,
      countryId: 0,
      federationId: 0,
      regionId: 0,
      clubIds: [],
      participantIds: [],
      disciplineIds: [],
      eventId: 0,
      eventName: `E2E_TeamEvent_${TS}`,
      competitionId: 0,
      competitionName: `E2E_Mannschaft_${TS}`,
      teamIds: [],
      scoresEntered: false,
    };
  });

  // ─── Step 1: Master Data ────────────────────────────────────────

  test('1. Create sport', async ({ request }) => {
    const res = await apiPost(request, '/sports', { var_name: `E2E_TeamTurnen_${TS}` });
    expect(res.status).toBe(201);
    state.sportId = res.body.int_sportid;
    console.log(`✓ Sport: ${state.sportId}`);
  });

  test('2. Create venue', async ({ request }) => {
    const res = await apiPost(request, '/venues', {
      var_name: `E2E_TeamHalle_${TS}`,
      var_ort: 'Teamstadt',
    });
    expect(res.status).toBe(201);
    state.venueId = res.body.int_wettkampforteid;
    console.log(`✓ Venue: ${state.venueId}`);
  });

  test('3. Create country', async ({ request }) => {
    const res = await apiPost(request, '/countries', {
      var_name: `E2E_TLand_${TS}`,
      var_kuerzel: 'E2TL',
    });
    expect(res.status).toBe(201);
    state.countryId = res.body.int_laenderid;
    console.log(`✓ Country: ${state.countryId}`);
  });

  test('4. Create federation', async ({ request }) => {
    const res = await apiPost(request, '/associations/data/verbaende', {
      var_name: `E2E_TVerband_${TS}`,
      var_kuerzel: 'TV',
      int_laenderid: state.countryId,
    });
    expect(res.status).toBe(201);
    state.federationId = res.body.int_verbaendeid;
    console.log(`✓ Federation: ${state.federationId}`);
  });

  test('5. Create region', async ({ request }) => {
    const res = await apiPost(request, '/associations', {
      var_name: `E2E_TGau_${TS}`,
      int_verbaendeid: state.federationId,
    });
    expect(res.status).toBe(201);
    state.regionId = res.body.int_gaueid;
    console.log(`✓ Region: ${state.regionId}`);
  });

  test('6. Create 3 clubs', async ({ request }) => {
    for (const clubName of [`TC TeamAlpha ${TS}`, `TC TeamBeta ${TS}`, `TC TeamGamma ${TS}`]) {
      const res = await apiPost(request, '/clubs', {
        var_name: clubName,
        int_gaueid: state.regionId,
      });
      expect(res.status).toBe(201);
      state.clubIds.push(res.body.int_vereineid);
    }
    expect(state.clubIds.length).toBe(3);
    console.log(`✓ Clubs: ${state.clubIds.join(', ')}`);
  });

  // ─── Step 2: Participants ───────────────────────────────────────

  test('7. Create 12 participants (4 per team)', async ({ request }) => {
    for (let i = 0; i < ALL_TEAM_NAMES.length; i++) {
      const res = await apiPost(request, '/participants', {
        var_vorname: ALL_TEAM_NAMES[i],
        var_nachname: `TeamTest${TS}`,
        int_geschlecht: TEAM_GENDER,
        int_vereineid: state.clubIds[TEAM_CLUB_ASSIGNMENT[i]],
        dat_geburtstag: '2012-06-15',
      });
      expect(res.status).toBe(201);
      const pid = res.body.participant?.int_teilnehmerid || res.body.int_teilnehmerid;
      expect(pid).toBeTruthy();
      state.participantIds.push(pid);
    }

    expect(state.participantIds.length).toBe(12);
    console.log(`✓ Participants: ${state.participantIds.length} created`);
  });

  // ─── Step 3: Disciplines ───────────────────────────────────────

  test('8. Create 4 disciplines', async ({ request }) => {
    for (let i = 0; i < TEAM_DISCIPLINE_NAMES.length; i++) {
      const res = await apiPost(request, '/disciplines', {
        name: `E2E_Team${TEAM_DISCIPLINE_NAMES[i]}_${TS}`,
        shortName: TEAM_DISCIPLINE_NAMES[i],
        formula: '1*x',
        calculationType: 2,
        sportId: state.sportId,
        maleAllowed: false,
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

  // ─── Step 4: Event + Team Competition ──────────────────────────

  test('9. Create event', async ({ request }) => {
    const res = await apiPost(request, '/events', {
      var_eventname: state.eventName,
      dat_eventstartdate: today,
      dat_eventenddate: tomorrow,
      var_location: `E2E_TeamHalle_${TS}`,
    });
    expect(res.status).toBe(201);
    state.eventId = res.body.event?.int_eventid || res.body.int_eventid;
    console.log(`✓ Event: ${state.eventId} (${state.eventName})`);
  });

  test('10. Create team competition (competitionType=1)', async ({ request }) => {
    const res = await apiPost(request, '/competitions', {
      name: state.competitionName,
      number: 'TM',
      gender: 'weiblich',
      ageFrom: 1,
      ageTo: 99,
      competitionType: 1,  // TEAM competition
      eventId: state.eventId,
      disciplines: state.disciplineIds.map(id => ({ disciplineId: id, maxScore: 20 })),
    });
    expect(res.status).toBe(201);
    state.competitionId = res.body.id;
    console.log(`✓ Team Competition: ${state.competitionId} (${state.competitionName})`);
  });

  // ─── Step 5: Assign Participants to Event ──────────────────────

  test('11. Add participants to event and assign to competition', async ({ request }) => {
    for (const pid of state.participantIds) {
      const r = await apiPost(request, '/event-participants/add', {
        eventId: state.eventId,
        participantId: pid,
      });
      expect(r.status).toBe(201);
    }
    console.log(`✓ Added ${state.participantIds.length} participants to event`);
  });

  // ─── Step 6: Create Teams ──────────────────────────────────────

  test('12. Create 3 teams and assign members', async ({ request }) => {
    for (let t = 0; t < NUM_TEAMS; t++) {
      // Create team
      const teamRes = await apiPost(request, '/teams', {
        clubId: state.clubIds[t],
        competitionId: state.competitionId,
        number: 1,
      });
      expect(teamRes.status).toBe(201);
      const teamId = teamRes.body.id || teamRes.body.team?.int_mannschaftenid || teamRes.body.int_mannschaftenid;
      expect(teamId).toBeTruthy();
      state.teamIds.push(teamId);

      // Add 4 members to team
      const startIdx = t * MEMBERS_PER_TEAM;
      for (let m = 0; m < MEMBERS_PER_TEAM; m++) {
        const memberRes = await apiPost(request, `/teams/${teamId}/members`, {
          participantId: state.participantIds[startIdx + m],
        });
        expect(memberRes.status).toBe(201);
      }

      console.log(`✓ Team ${t + 1}: ${teamId} (${MEMBERS_PER_TEAM} members)`);
    }

    expect(state.teamIds.length).toBe(NUM_TEAMS);
    console.log(`✓ Teams: ${state.teamIds.join(', ')}`);
  });

  // ─── Step 7: Squads ────────────────────────────────────────────

  test('13. Create squad and assign participants', async ({ request }) => {
    await apiPost(request, '/squad-management/create', { eventId: state.eventId, name: 'RT' });
    for (const pid of state.participantIds) {
      await apiPost(request, '/squad-management/assign', {
        participantId: pid,
        squadName: 'RT',
        eventId: state.eventId,
      });
    }
    console.log(`✓ Squad RT: ${state.participantIds.length} participants assigned`);
  });

  // ─── Step 8: Enter Individual Scores ───────────────────────────

  test('14. Enter 48 individual scores via API', async ({ request }) => {
    let count = 0;
    for (let pi = 0; pi < state.participantIds.length; pi++) {
      for (let di = 0; di < state.disciplineIds.length; di++) {
        const res = await apiPost(request, '/scores/save-value', {
          competitionId: state.competitionId,
          participantId: state.participantIds[pi],
          disciplineId: state.disciplineIds[di],
          score: TEAM_SCORES[pi][di],
        });
        expect(res.status).toBeLessThan(300);
        count++;
      }
    }
    expect(count).toBe(48);
    state.scoresEntered = true;
    console.log(`✓ Entered ${count} individual scores`);
  });

  // ─── Step 9: Verify & Save State ───────────────────────────────

  test('15. Verify scores and save state', async ({ request }) => {
    // Verify scores exist
    const scores = await apiGet(request, `/scores?competitionId=${state.competitionId}&limit=1000`);
    expect(scores.status).toBe(200);
    const scoreResults = scores.body.results || [];
    expect(scoreResults.length).toBeGreaterThanOrEqual(48);

    // Verify teams exist
    const teams = await apiGet(request, `/teams?eventId=${state.eventId}&limit=100`);
    expect(teams.status).toBe(200);
    const teamList = teams.body.teams || teams.body;
    expect(Array.isArray(teamList)).toBe(true);
    expect(teamList.length).toBeGreaterThanOrEqual(3);

    // Save state
    saveTeamEventState(state);

    console.log('\n✅ TEAM EVENT SETUP COMPLETE');
    console.log(`   Event: ${state.eventId} (${state.eventName})`);
    console.log(`   Competition: ${state.competitionId} (${state.competitionName})`);
    console.log(`   Teams: ${state.teamIds.join(', ')}`);
    console.log(`   Disciplines: ${state.disciplineIds.join(', ')}`);
    console.log(`   Participants: ${state.participantIds.join(', ')}`);
    console.log(`   Scores: ${scoreResults.length}`);
  });
});

// End of setup
