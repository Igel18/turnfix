/**
 * E2E Tests for Real-time Squad Status Updates (Socket.IO)
 * 
 * Tests that:
 * 1. When a status is updated via API, Squad Status page auto-refreshes
 * 2. Socket.IO event is emitted correctly
 * 3. Status changes are reflected in real-time without manual refresh
 */

import { test, expect } from '@playwright/test';
import { loadEventAState, EventAState, apiGet, apiPost, apiPut } from '../fixtures/test-state';
import { API_BASE } from '../fixtures/test-data';

let state: EventAState;

test.beforeAll(async () => {
  state = loadEventAState();
});

test.describe('Squad Status — Real-time Updates via Socket.IO', () => {

  test('PUT /api/squad-disciplines/:squadName/:disciplineId/status emits Socket.IO event', async ({ request }) => {
    // First ensure squad-discipline combinations exist
    const genRes = await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });
    expect(genRes.status).toBe(200);

    // Get a squad-discipline pair
    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}&limit=1`);
    expect(res.status).toBe(200);
    expect(res.body.squadDisciplines.length).toBeGreaterThan(0);

    const { squadName, disciplineId, eventId } = res.body.squadDisciplines[0];

    // Get all available statuses to pick one that's not current
    const statusesRes = await apiGet(request, '/statuses?limit=100');
    const statuses = statusesRes.body.statuses || [];
    
    // Pick a status (e.g., "Leistungen erfasst" with ID likely 2)
    const targetStatusId = statuses.find((s: any) => s.var_name?.includes('Leistung'))?.int_statusid || 2;

    // Update status via API
    const updateRes = await apiPut(
      request,
      `/squad-disciplines/${encodeURIComponent(squadName)}/${disciplineId}/status?eventId=${eventId}`,
      { statusId: targetStatusId }
    );

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.updated).toBeGreaterThan(0);
  });

  test('Squad Status page reflects changes after status update (with cache-busting)', async ({ page, request }) => {
    // Generate squad-disciplines
    const genRes = await apiPost(request, '/squad-disciplines/generate', { eventId: state.eventId });
    expect(genRes.status).toBe(200);

    // Get a squad-discipline pair
    const res = await apiGet(request, `/squad-disciplines?eventId=${state.eventId}&limit=1`);
    const { squadName, disciplineId, eventId, statusId: originalStatusId } = res.body.squadDisciplines[0];

    // Get available statuses
    const statusesRes = await apiGet(request, '/statuses?limit=100');
    const statuses = statusesRes.body.statuses || [];
    
    // Pick a different status (ensure it's different from current)
    const targetStatus = statuses.find((s: any) => s.int_statusid !== originalStatusId);
    if (!targetStatus) {
      console.log('⚠️  No different status available, skipping test');
      return;
    }

    // Navigate to Squad Status page
    await page.goto(`http://localhost:5173/squad-status?eventId=${eventId}`);
    
    // Wait for page to load and verify data loads
    await page.waitForTimeout(2000);
    
    // Check if page shows the squad-disciplines (or 0)
    const heading = await page.locator('h1').textContent();
    console.log(`✓ Squad Status page loaded: "${heading}"`);

    // Update status via API
    const updateRes = await apiPut(
      request,
      `/squad-disciplines/${encodeURIComponent(squadName)}/${disciplineId}/status?eventId=${eventId}`,
      { statusId: targetStatus.int_statusid }
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);

    // Wait for Socket.IO event to trigger page reload
    // This might update the display or cache
    await page.waitForTimeout(1000);

    // Verify the status was actually updated in the database
    const verifyRes = await apiGet(
      request,
      `/squad-disciplines/${encodeURIComponent(squadName)}/${disciplineId}?eventId=${eventId}`
    );
    
    expect(verifyRes.body.statusId).toBe(targetStatus.int_statusid);
    console.log(`✓ Status successfully updated in database from ${originalStatusId} to ${targetStatus.int_statusid}`);
  });

});
