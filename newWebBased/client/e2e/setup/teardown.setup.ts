/**
 * Teardown: Clean up all test data
 *
 * Runs AFTER all tests complete.
 * Reads state files and deletes all created data in reverse order.
 */

import { test } from '@playwright/test';
import { API_BASE } from '../fixtures/test-data';
import {
  loadEventAState,
  loadEventBState,
  cleanupStateFiles,
  apiDelete,
  apiGet,
  getWertungenIds,
  EventAState,
  EventBState,
} from '../fixtures/test-state';

test.describe.serial('Teardown: Cleanup', () => {

  test('1. Clean up Event A (created event)', async ({ request }) => {
    let stateA: EventAState | null = null;
    try {
      stateA = loadEventAState();
    } catch {
      console.log('⏭️ Event A state not found — skipping cleanup');
      return;
    }

    console.log(`🧹 Cleaning up Event A (${stateA.eventId})...`);

    // 1. Delete scores
    try {
      const w1 = await getWertungenIds(request, stateA.comp1Id);
      const w2 = await getWertungenIds(request, stateA.comp2Id);
      const allWids = [...new Set([...w1, ...w2])];
      for (const wid of allWids) {
        await apiDelete(request, `/scores/${wid}`);
      }
      console.log(`  ✓ Deleted ${allWids.length} scores`);
    } catch (e) {
      console.log(`  ⚠ Score cleanup: ${e}`);
    }

    // 2. Unassign participants
    try {
      for (const pid of [...stateA.womenPids, ...stateA.menPids]) {
        await apiDelete(request, `/event-participants/unassign?participantId=${pid}&competitionId=${stateA.comp1Id}`);
        await apiDelete(request, `/event-participants/unassign?participantId=${pid}&competitionId=${stateA.comp2Id}`);
      }
      console.log(`  ✓ Unassigned participants`);
    } catch (e) {
      console.log(`  ⚠ Participant unassign: ${e}`);
    }

    // 3. Delete competitions
    if (stateA.comp1Id) await apiDelete(request, `/competitions/${stateA.comp1Id}`);
    if (stateA.comp2Id) await apiDelete(request, `/competitions/${stateA.comp2Id}`);
    console.log(`  ✓ Deleted competitions`);

    // 4. Delete event
    if (stateA.eventId) await apiDelete(request, `/events/${stateA.eventId}`);
    console.log(`  ✓ Deleted event`);

    // 5. Delete participants
    for (const pid of [...stateA.womenPids, ...stateA.menPids]) {
      await apiDelete(request, `/participants/${pid}`);
    }
    console.log(`  ✓ Deleted ${stateA.womenPids.length + stateA.menPids.length} participants`);

    // 6. Delete disciplines
    for (const did of stateA.disciplineIds) {
      await apiDelete(request, `/disciplines/${did}`);
    }
    console.log(`  ✓ Deleted ${stateA.disciplineIds.length} disciplines`);

    // 7. Delete clubs
    for (const cid of stateA.clubIds) {
      await apiDelete(request, `/clubs/${cid}`);
    }
    console.log(`  ✓ Deleted ${stateA.clubIds.length} clubs`);

    // 8. Delete region
    if (stateA.regionId) await apiDelete(request, `/regions/${stateA.regionId}`);
    console.log(`  ✓ Deleted region`);

    // 9. Delete federation
    if (stateA.federationId) await apiDelete(request, `/associations/data/verbaende/${stateA.federationId}`);
    console.log(`  ✓ Deleted federation`);

    // 10. Delete country
    if (stateA.countryId) await apiDelete(request, `/countries/${stateA.countryId}`);
    console.log(`  ✓ Deleted country`);

    // 11. Delete venue
    if (stateA.venueId) await apiDelete(request, `/venues/${stateA.venueId}`);
    console.log(`  ✓ Deleted venue`);

    // 12. Delete sport
    if (stateA.sportId) await apiDelete(request, `/sports/${stateA.sportId}`);
    console.log(`  ✓ Deleted sport`);

    console.log(`✅ Event A cleanup complete`);
  });

  test('2. Clean up Event B (imported event)', async ({ request }) => {
    let stateB: EventBState | null = null;
    try {
      stateB = loadEventBState();
    } catch {
      console.log('⏭️ Event B state not found — skipping cleanup');
      return;
    }

    console.log(`🧹 Cleaning up Event B (${stateB.eventId})...`);

    // Cascade delete the imported event and all associated data
    const res = await apiDelete(request, `/events/${stateB.eventId}?force=true`);
    if (res.status < 400) {
      console.log(`✅ Event B cascade-deleted`);
    } else {
      console.log(`⚠ Event B delete returned ${res.status}`);
    }
  });

  test('3. Clean up state files', async () => {
    cleanupStateFiles();
    console.log('✅ All cleanup complete');
  });
});
