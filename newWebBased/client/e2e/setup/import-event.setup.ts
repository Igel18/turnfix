/**
 * Setup: Import Event B (GymNet XML)
 *
 * Seeds production data (disciplines, statuses, groups) and imports
 * an event from the GymNet XML test fixture.
 *
 * Creates:
 *   - Seeded production disciplines, statuses, groups
 *   - 1 Imported Event with competitions, participants, clubs from XML
 *
 * Saves state to .e2e-state/event-b.json for use by test files.
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { API_BASE } from '../fixtures/test-data';
import { EventBState, saveEventBState, apiPost, apiGet } from '../fixtures/test-state';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TS = Date.now();
const EVENT_NAME = `E2E_GymNet_Import_${TS}`;

test.describe.serial('Setup: Import Event B (GymNet)', () => {
  let state: EventBState;

  test.beforeAll(async () => {
    state = {
      timestamp: TS,
      eventId: 0,
      eventName: EVENT_NAME,
      importResult: null,
    };
  });

  // ─── Step 1: Seed production data ──────────────────────────────

  test('1. Seed GymNet preset', async ({ request }) => {
    const res = await apiPost(request, '/configuration/gymnet-preset');
    expect(res.status).toBeLessThan(500);
    console.log(`✓ GymNet preset seeded`);
  });

  test('2. Seed production disciplines', async ({ request }) => {
    const res = await apiPost(request, '/configuration/production-disciplines');
    expect(res.status).toBeLessThan(500);
    console.log(`✓ Production disciplines seeded`);
  });

  test('3. Seed production statuses', async ({ request }) => {
    const res = await apiPost(request, '/configuration/production-statuses');
    expect(res.status).toBeLessThan(500);
    console.log(`✓ Production statuses seeded`);
  });

  test('4. Seed discipline groups', async ({ request }) => {
    const res = await apiPost(request, '/configuration/discipline-groups');
    expect(res.status).toBeLessThan(500);
    console.log(`✓ Discipline groups seeded`);
  });

  // ─── Step 2: Import from XML ───────────────────────────────────

  test('5. Upload GymNet XML and create event', async ({ request }) => {
    const xmlPath = path.resolve(__dirname, '..', 'fixtures', 'gymnet-test-import.xml');
    expect(fs.existsSync(xmlPath)).toBe(true);

    const res = await request.post(`${API_BASE}/events/import-gymnet`, {
      multipart: {
        xmlFile: {
          name: 'gymnet-test-import.xml',
          mimeType: 'text/xml',
          buffer: fs.readFileSync(xmlPath),
        },
        eventName: EVENT_NAME,
        startDate: '2026-07-01',
        endDate: '2026-07-02',
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.createdEvent).toBeTruthy();
    expect(body.createdEvent.id).toBeGreaterThan(0);
    expect(body.createdEvent.name).toBe(EVENT_NAME);

    state.eventId = body.createdEvent.id;
    state.importResult = body;

    console.log(`✓ Imported event: ${state.eventId} (${EVENT_NAME})`);
  });

  test('6. Accept discipline suggestions if available', async ({ request }) => {
    const hints = state.importResult?.hints || [];
    const suggestions = hints.filter((h: any) => h.type === 'suggestion' && h.disciplines.length > 0);

    if (suggestions.length === 0) {
      console.log('✓ No discipline suggestions to accept (auto-linked)');
      return;
    }

    for (const suggestion of suggestions) {
      const res = await request.post(`${API_BASE}/events/accept-discipline-suggestions`, {
        data: {
          competitionId: suggestion.competitionId,
          disciplines: suggestion.disciplines,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.ok()).toBeTruthy();
    }
    console.log(`✓ Accepted ${suggestions.length} discipline suggestions`);
  });

  // ─── Step 3: Verify & Save State ──────────────────────────────

  test('7. Verify import and save state', async ({ request }) => {
    // Verify event exists
    const res = await apiGet(request, `/events/${state.eventId}`);
    expect(res.status).toBe(200);

    // Verify competitions were created
    const comps = await apiGet(request, `/competitions?eventId=${state.eventId}`);
    expect(comps.status).toBe(200);
    const competitions = comps.body.competitions || comps.body;
    expect(Array.isArray(competitions)).toBe(true);
    expect(competitions.length).toBeGreaterThanOrEqual(1);

    // Save state
    saveEventBState(state);

    console.log('\n✅ EVENT B (IMPORT) SETUP COMPLETE');
    console.log(`   Event: ${state.eventId} (${EVENT_NAME})`);
    console.log(`   Competitions: ${competitions.length}`);
    console.log(`   Import result saved`);
  });
});
