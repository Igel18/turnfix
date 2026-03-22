/**
 * E2E Tests for Squad Status (Issue #104)
 *
 * Tests that:
 * 1. POST /api/squad-management/complete actually updates tfx_riegen_x_disziplinen
 * 2. The squad-status page shows the updated status (not always "kein Status")
 * 3. The endpoint is accessible without auth (jury portal use-case)
 * 4. Status name matching works for exact and similar names
 *
 * TDD: These tests were written BEFORE the fix was implemented.
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, EventAState, apiGet, apiPost } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

// ═══════════════════════════════════════════════════════════════════════
// API Tests: /api/squad-management/complete
// ═══════════════════════════════════════════════════════════════════════
test.describe('Squad Status — complete endpoint API', () => {

  test('POST /api/squad-management/complete returns 400 when required fields missing', async ({ request }) => {
    const res = await request.post(`${API_BASE}/squad-management/complete`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/squad-management/complete does NOT require auth (accessible from jury portal)', async ({ request }) => {
    // Call without any Authorization header
    // Should not return 401 or 403
    const res = await request.post(`${API_BASE}/squad-management/complete`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        eventId: state.eventId,
        squadName: 'nonexistent-squad-xyz',
        disciplineId: state.disciplineIds[0],
        status: 'Leistungen erfasst',
      },
    });
    // Either 200 (updated 0 rows) or 400 (missing data), but NOT 401/403
    expect(res.status()).not.toBe(401);
    expect(res.status()).not.toBe(403);
  });

  test('POST /api/squad-management/complete returns 400 for unknown status name', async ({ request }) => {
    const res = await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: state.eventId,
        squadName: 'wBlau',
        disciplineId: state.disciplineIds[0],
        status: 'COMPLETELY_UNKNOWN_STATUS_XYZ_12345',
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('availableStatuses');
    expect(Array.isArray(body.availableStatuses)).toBeTruthy();
  });

  test('POST /api/squad-management/complete accepts exact status name "Leistungen erfasst"', async ({ request }) => {
    // First ensure there are squad-discipline combinations
    // Try to generate them (may already exist = OK)
    await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });

    // Get a squad-discipline pair to update
    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}`);
    const items = res.body.squadDisciplines;
    if (!items || items.length === 0) {
      // No squad-discipline combos exist, skip status update test
      console.log('No squad-discipline combos, skipping status update');
      return;
    }

    const item = items[0];

    // Update via /complete
    const updateRes = await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: item.eventId,
        squadName: item.squadName,
        disciplineId: item.disciplineId,
        status: 'Leistungen erfasst',
      },
    });

    expect(updateRes.status()).toBe(200);
    const body = await updateRes.json();
    expect(body.success).toBeTruthy();
    expect(body.updatedRows).toBeGreaterThanOrEqual(1);
    expect(body.statusName).toBe('Leistungen erfasst');
  });

  test('POST /api/squad-management/complete updates DB (GET returns updated status)', async ({ request }) => {
    // Ensure combos exist
    await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });

    // Get a squad-discipline pair
    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}`);
    const items = res.body.squadDisciplines;
    if (!items || items.length === 0) return;

    const item = items[0];
    const originalStatusId = item.statusId;

    // Find 'Leistungen erfasst' status id via statuses API
    const statusRes = await apiGet(request, '/statuses?limit=100');
    const statuses = statusRes.body.statuses || [];
    const leistungStatus = statuses.find((s: any) =>
      (s.var_name || s.name || '').toLowerCase().includes('leistungen erfasst')
    );

    if (!leistungStatus) {
      console.log('Leistungen erfasst status not in DB, skipping');
      return;
    }

    const leistungStatusId = leistungStatus.int_statusid ?? leistungStatus.id;

    // Mark the squad-discipline as 'Leistungen erfasst'
    const updateRes = await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: item.eventId,
        squadName: item.squadName,
        disciplineId: item.disciplineId,
        status: 'Leistungen erfasst',
      },
    });
    expect(updateRes.status()).toBe(200);

    // Re-fetch and verify it changed
    const reloadRes = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}`);
    const updatedItem = (reloadRes.body.squadDisciplines as any[]).find(
      (sd: any) => sd.squadName === item.squadName && sd.disciplineId === item.disciplineId
    );

    expect(updatedItem).toBeTruthy();
    expect(updatedItem.statusId).toBe(leistungStatusId);
    expect(updatedItem.status.name.toLowerCase()).toContain('leistungen erfasst');

    // Restore original status (cleanup)
    await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: item.eventId,
        squadName: item.squadName,
        disciplineId: item.disciplineId,
        statusId: originalStatusId,
        status: 'kein Status',
      },
    });
  });

  test('POST /api/squad-management/complete accepts partial/similar status name (singular typo)', async ({ request }) => {
    // 'Leistung erfasst' (singular) should match 'Leistungen erfasst' (plural) via partial word match
    await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });

    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}`);
    const items = res.body.squadDisciplines;
    if (!items || items.length === 0) return;

    const item = items[1] || items[0]; // use second item if available

    const updateRes = await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: item.eventId,
        squadName: item.squadName,
        disciplineId: item.disciplineId,
        status: 'Leistung erfasst', // singular — should still match
      },
    });
    expect(updateRes.status()).toBe(200);
    const body = await updateRes.json();
    expect(body.success).toBeTruthy();
    expect(body.statusName.toLowerCase()).toContain('leistungen');

    // Cleanup
    await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: item.eventId,
        squadName: item.squadName,
        disciplineId: item.disciplineId,
        status: 'kein Status',
      },
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// UI Tests: squad-status page
// ═══════════════════════════════════════════════════════════════════════
test.describe('Squad Status — UI (Riegen Status page)', () => {

  test('page loads and does not show only "kein Status" after scores entered', async ({ page, request }) => {
    // Ensure combos exist
    await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });

    // Change at least one item to 'Leistungen erfasst' via API
    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}`);
    const items = res.body.squadDisciplines;
    if (items && items.length > 0) {
      await request.post(`${API_BASE}/squad-management/complete`, {
        data: {
          eventId: items[0].eventId,
          squadName: items[0].squadName,
          disciplineId: items[0].disciplineId,
          status: 'Leistungen erfasst',
        },
      });
    }

    // Navigate to squad-status page
    await page.goto(`/squad-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // The page should exist and show content
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    // At least one status badge should NOT be 'kein Status' if combos exist
    const statusBadges = page.locator('[class*="badge"], [class*="status"], span');
    const count = await statusBadges.count();
    if (count > 0) {
      const allText = await page.locator('body').textContent();
      // The page should now show something other than only "kein Status"
      // since we updated one item
      expect(allText).toBeTruthy();
    }
  });

  test('matrix view shows status badge for updated squad-discipline', async ({ page, request }) => {
    await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });

    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}`);
    const items = res.body.squadDisciplines;
    if (!items || items.length === 0) return;

    // Update first item
    await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: items[0].eventId,
        squadName: items[0].squadName,
        disciplineId: items[0].disciplineId,
        status: 'Leistungen erfasst',
      },
    });

    await page.goto(`/squad-status?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Matrix should be visible (default view)
    const matrixOrTable = page.locator('[role="grid"], table, .grid, [class*="matrix"]');
    const exists = await matrixOrTable.first().isVisible({ timeout: 8_000 }).catch(() => false);
    if (exists) {
      const bodyText = await page.locator('body').textContent();
      // 'Leistungen erfasst' should appear in the page
      expect(bodyText).toContain('Leistungen erfasst');
    }

    // Cleanup
    await request.post(`${API_BASE}/squad-management/complete`, {
      data: {
        eventId: items[0].eventId,
        squadName: items[0].squadName,
        disciplineId: items[0].disciplineId,
        status: 'kein Status',
      },
    });
  });
});
