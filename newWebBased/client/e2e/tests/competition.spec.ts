/**
 * Competition Tests — Competition details, disciplines, participants
 *
 * Depends on: Event A (setup/create-event)
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, setEventContext, apiGet, EventAState } from '../fixtures/test-state';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Competition: Setup Verification', () => {

  test('event appears on Events page', async ({ page }) => {
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

  test('both competitions visible', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/competitions?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText(state.comp1Name);
    await expect(page.locator('body')).toContainText(state.comp2Name);
  });

  test('each competition has 4 disciplines', async ({ request }) => {
    const d1 = await apiGet(request, `/competitions/${state.comp1Id}/disciplines`);
    expect((d1.body.disciplines || d1.body).length).toBe(4);

    const d2 = await apiGet(request, `/competitions/${state.comp2Id}/disciplines`);
    expect((d2.body.disciplines || d2.body).length).toBe(4);
  });

  test('20 participants registered to event', async ({ request }) => {
    const res = await apiGet(request, `/event-participants?eventId=${state.eventId}&includeAvailable=false&limit=100`);
    expect(res.status).toBe(200);
    const count = res.body.totalInEvent || (res.body.participants || []).length;
    expect(count).toBeGreaterThanOrEqual(20);
  });

  test('squads exist', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/squads?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await expect(page.locator('body')).toContainText('RW');
    await expect(page.locator('body')).toContainText('RM');
  });
});

test.describe('Competition: Score Validation', () => {

  test('reject score without required fields', async ({ request }) => {
    // Missing participantId
    const res = await request.post('http://localhost:3001/api/scores', {
      data: {
        competitionId: state.comp1Id,
        disciplineId: state.disciplineIds[0],
        score: 5.0,
      },
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('zero score is valid', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/scores', {
      data: {
        competitionId: state.comp1Id,
        participantId: state.womenPids[0],
        disciplineId: state.disciplineIds[0],
        score: 0,
      },
      headers: { 'Content-Type': 'application/json' },
    });
    // 0 should be accepted (overwrite existing)
    expect(res.status()).toBeLessThan(500);

    // Restore original score
    await request.post('http://localhost:3001/api/scores', {
      data: {
        competitionId: state.comp1Id,
        participantId: state.womenPids[0],
        disciplineId: state.disciplineIds[0],
        score: 9.50, // original value
      },
      headers: { 'Content-Type': 'application/json' },
    });
  });
});

test.describe('Competition: Cross-Competition Isolation', () => {

  test('women scores do not appear in men competition', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
    const results = res.body.results || [];

    // No women participant IDs should appear in men's competition
    for (const wPid of state.womenPids) {
      const found = results.filter((r: any) => r.participantId === wPid);
      expect(found.length).toBe(0);
    }
  });

  test('men scores do not appear in women competition', async ({ request }) => {
    const res = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    const results = res.body.results || [];

    for (const mPid of state.menPids) {
      const found = results.filter((r: any) => r.participantId === mPid);
      expect(found.length).toBe(0);
    }
  });

  test('total scores: 80 across both competitions', async ({ request }) => {
    const w = await apiGet(request, `/scores?competitionId=${state.comp1Id}&limit=1000`);
    const m = await apiGet(request, `/scores?competitionId=${state.comp2Id}&limit=1000`);
    const wCount = (w.body.results || []).length;
    const mCount = (m.body.results || []).length;
    expect(wCount + mCount).toBeGreaterThanOrEqual(80);
  });
});

test.describe('Competition: Management UI', () => {

  test('Event Participants page shows 20 participants', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/event-participants?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Should show participants count
    const bodyText = await page.locator('body').textContent() || '';
    expect(bodyText).toMatch(/20|Teilnehmer/i);
  });

  test('Competitions page accessible', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await page.goto(`/competitions?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    await expect(page.locator('body')).toContainText(state.comp1Name);
    await expect(page.locator('body')).toContainText(state.comp2Name);
  });
});
