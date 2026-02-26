/**
 * Test State Management
 *
 * Provides typed interfaces and load/save functions for sharing state
 * between setup projects and test projects via JSON files.
 *
 * State files are stored in client/.e2e-state/ (gitignored).
 */

import * as fs from 'fs';
import * as path from 'path';
import { APIRequestContext } from '@playwright/test';
import { API_BASE } from './test-data';

// ═══════════════════════════════════════════════════════════════════════
// STATE INTERFACES
// ═══════════════════════════════════════════════════════════════════════

/** State from create-event.setup.ts (Event A — created via API) */
export interface EventAState {
  /** Timestamp used for unique naming */
  timestamp: number;

  // Master data IDs
  sportId: number;
  venueId: number;
  countryId: number;
  federationId: number;
  regionId: number;
  clubIds: number[];          // [club1Id, club2Id]

  // Participant IDs
  womenPids: number[];        // 10 women participant IDs (ordered by index)
  menPids: number[];          // 10 men participant IDs (ordered by index)

  // Discipline IDs
  disciplineIds: number[];    // 4 discipline IDs [DA, DB, DC, DD]

  // Event + Competition IDs
  eventId: number;
  eventName: string;
  comp1Id: number;            // Women's competition
  comp1Name: string;
  comp2Id: number;            // Men's competition
  comp2Name: string;

  // Scores entered?
  scoresEntered: boolean;
}

/** State from import-event.setup.ts (Event B — imported from GymNet XML) */
export interface EventBState {
  /** Timestamp used for unique naming */
  timestamp: number;

  eventId: number;
  eventName: string;
  importResult: any;          // Full import API response
}

/** State from create-team-event.setup.ts (Team Competition — created via API) */
export interface TeamEventState {
  /** Timestamp used for unique naming */
  timestamp: number;

  // Master data IDs
  sportId: number;
  venueId: number;
  countryId: number;
  federationId: number;
  regionId: number;
  clubIds: number[];          // [alpha, beta, gamma]

  // Participant IDs (12 total: 4 per team)
  participantIds: number[];   // all 12 participant IDs ordered by team (alpha[0-3], beta[4-7], gamma[8-11])

  // Discipline IDs
  disciplineIds: number[];    // 4 discipline IDs [TDA, TDB, TDC, TDD]

  // Event + Competition IDs
  eventId: number;
  eventName: string;
  competitionId: number;      // Team competition (competitionType=1)
  competitionName: string;

  // Team IDs
  teamIds: number[];          // [teamAlpha, teamBeta, teamGamma]

  // Scores entered?
  scoresEntered: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// STATE FILE PATHS
// ═══════════════════════════════════════════════════════════════════════

const STATE_DIR = path.resolve(process.cwd(), '.e2e-state');
const EVENT_A_FILE = path.join(STATE_DIR, 'event-a.json');
const EVENT_B_FILE = path.join(STATE_DIR, 'event-b.json');
const TEAM_EVENT_FILE = path.join(STATE_DIR, 'team-event.json');

function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SAVE / LOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/** Save Event A state (called by create-event.setup.ts) */
export function saveEventAState(state: EventAState): void {
  ensureStateDir();
  fs.writeFileSync(EVENT_A_FILE, JSON.stringify(state, null, 2));
  console.log(`💾 Event A state saved to ${EVENT_A_FILE}`);
}

/** Load Event A state (called by test files) */
export function loadEventAState(): EventAState {
  if (!fs.existsSync(EVENT_A_FILE)) {
    throw new Error(
      'Event A state not found. Did the setup project run?\n' +
      `Expected file: ${EVENT_A_FILE}\n` +
      'Run: npx playwright test --project=setup'
    );
  }
  return JSON.parse(fs.readFileSync(EVENT_A_FILE, 'utf-8'));
}

/** Save Event B state (called by import-event.setup.ts) */
export function saveEventBState(state: EventBState): void {
  ensureStateDir();
  fs.writeFileSync(EVENT_B_FILE, JSON.stringify(state, null, 2));
  console.log(`💾 Event B state saved to ${EVENT_B_FILE}`);
}

/** Load Event B state (called by test files) */
export function loadEventBState(): EventBState {
  if (!fs.existsSync(EVENT_B_FILE)) {
    throw new Error(
      'Event B state not found. Did the import-event setup run?\n' +
      `Expected file: ${EVENT_B_FILE}\n` +
      'Run: npx playwright test --project=setup'
    );
  }
  return JSON.parse(fs.readFileSync(EVENT_B_FILE, 'utf-8'));
}

/** Save Team Event state (called by create-team-event.setup.ts) */
export function saveTeamEventState(state: TeamEventState): void {
  ensureStateDir();
  fs.writeFileSync(TEAM_EVENT_FILE, JSON.stringify(state, null, 2));
  console.log(`💾 Team Event state saved to ${TEAM_EVENT_FILE}`);
}

/** Load Team Event state (called by team test files) */
export function loadTeamEventState(): TeamEventState {
  if (!fs.existsSync(TEAM_EVENT_FILE)) {
    throw new Error(
      'Team Event state not found. Did the create-team-event setup run?\n' +
      `Expected file: ${TEAM_EVENT_FILE}\n` +
      'Run: npx playwright test --project=setup'
    );
  }
  return JSON.parse(fs.readFileSync(TEAM_EVENT_FILE, 'utf-8'));
}

/** Clean up state files (called by teardown) */
export function cleanupStateFiles(): void {
  if (fs.existsSync(EVENT_A_FILE)) fs.unlinkSync(EVENT_A_FILE);
  if (fs.existsSync(EVENT_B_FILE)) fs.unlinkSync(EVENT_B_FILE);
  if (fs.existsSync(TEAM_EVENT_FILE)) fs.unlinkSync(TEAM_EVENT_FILE);
  if (fs.existsSync(STATE_DIR)) {
    try { fs.rmdirSync(STATE_DIR); } catch { /* non-empty dir, ignore */ }
  }
  console.log('🗑️ State files cleaned up');
}

// ═══════════════════════════════════════════════════════════════════════
// SHARED API HELPERS
// ═══════════════════════════════════════════════════════════════════════

/** POST to API and return { status, body } */
export async function apiPost(request: APIRequestContext, path: string, data: unknown) {
  const response = await request.post(`${API_BASE}${path}`, {
    data,
    headers: { 'Content-Type': 'application/json' },
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/** GET from API and return { status, body } */
export async function apiGet(request: APIRequestContext, path: string) {
  const response = await request.get(`${API_BASE}${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/** DELETE from API and return { status, body } */
export async function apiDelete(request: APIRequestContext, path: string) {
  const response = await request.delete(`${API_BASE}${path}`);
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/** Set EventContext in localStorage (required for event-aware pages) */
export async function setEventContext(
  page: import('@playwright/test').Page,
  eventId: number,
  eventName: string,
) {
  if (page.url() === 'about:blank' || !page.url().includes('localhost')) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  }
  await page.evaluate(({ id, name }) => {
    localStorage.setItem('turnfix-selected-event', JSON.stringify({
      int_eventid: id,
      var_eventname: name,
      dat_eventstartdate: new Date().toISOString().split('T')[0],
      dat_eventenddate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      var_location: 'E2E Halle',
      status: 'upcoming',
    }));
  }, { id: eventId, name: eventName });
}

/** Get all score IDs for a competition (used for cleanup) */
export async function getWertungenIds(
  request: APIRequestContext,
  competitionId: number,
): Promise<number[]> {
  const res = await apiGet(request, `/scores?competitionId=${competitionId}&limit=1000`);
  const results = res.body.results || [];
  const ids = new Set<number>();
  for (const r of results) {
    if (r.id) ids.add(r.id);
  }
  return [...ids];
}
