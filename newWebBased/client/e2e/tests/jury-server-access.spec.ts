/**
 * Jury Server Access Control E2E Tests
 *
 * Independent of setup — verifies routing and access restrictions on port 3002.
 *
 * Tests:
 *   1. Jury portal links in Management UI include /jury suffix
 *   2. Jury Portal loads correctly at :3002/jury
 *   3. Management UI is NOT accessible on port 3002
 *   4. Non-jury API endpoints are blocked on port 3002
 *   5. Jury-relevant API endpoints work on port 3002
 *   6. Root redirect on port 3002 goes to /jury
 */

import { test, expect } from '@playwright/test';

const JURY_SERVER = 'http://localhost:3002';
const MANAGEMENT_SERVER = 'http://localhost:5173'; // Vite dev server

// ═══════════════════════════════════════════════════════════════════════
// 1. JURY PORTAL LINK TESTS (Management UI)
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal Links in Management UI', () => {

  test('Home page jury portal link includes /jury path', async ({ page }) => {
    await page.goto(MANAGEMENT_SERVER, { waitUntil: 'networkidle' });

    // Find all links that point to port 3002
    const juryLinks = page.locator('a[href*=":3002"]');
    const count = await juryLinks.count();

    expect(count).toBeGreaterThan(0);

    // Every link to port 3002 must include /jury
    for (let i = 0; i < count; i++) {
      const href = await juryLinks.nth(i).getAttribute('href');
      expect(href, `Jury link #${i} should end with /jury`).toMatch(/:3002\/jury/);
    }
  });

  test('ManagementCenter jury portal link includes /jury path', async ({ page }) => {
    await page.goto(`${MANAGEMENT_SERVER}/management`, { waitUntil: 'networkidle' });

    // Find all links that point to port 3002
    const juryLinks = page.locator('a[href*=":3002"]');
    const count = await juryLinks.count();

    // At least one link should exist (the Jury Portal action card)
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await juryLinks.nth(i).getAttribute('href');
      expect(href, `ManagementCenter jury link #${i} should end with /jury`).toMatch(/:3002\/jury/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. JURY PORTAL LOADS ON PORT 3002
// ═══════════════════════════════════════════════════════════════════════

test.describe('Jury Portal Access on port 3002', () => {

  test('jury portal loads at /jury', async ({ page }) => {
    await page.goto(`${JURY_SERVER}/jury`, { waitUntil: 'networkidle' });

    // Should show the Jury Portal UI (not a redirect or error)
    await expect(page.locator('body')).not.toBeEmpty();

    // Should contain Jury Portal content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/jury|Jury|Portal|Wertung/i);
  });

  test('root URL redirects to /jury', async ({ page }) => {
    const response = await page.goto(JURY_SERVER, { waitUntil: 'networkidle' });

    // After redirect, URL should be at /jury
    expect(page.url()).toMatch(/\/jury/);

    // Page should load successfully
    expect(response?.status()).toBeLessThan(400);
  });

  test('/jury sub-routes serve the SPA', async ({ page }) => {
    const response = await page.goto(`${JURY_SERVER}/jury/some-route`, { waitUntil: 'networkidle' });

    // SPA catch-all should serve index.html with 200
    expect(response?.status()).toBe(200);
    expect(page.url()).toContain('/jury/some-route');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. MANAGEMENT UI NOT ACCESSIBLE ON PORT 3002
// ═══════════════════════════════════════════════════════════════════════

test.describe('Management UI blocked on port 3002', () => {

  test('management routes redirect to /jury', async ({ page }) => {
    // Try typical Management UI routes on port 3002
    const managementRoutes = [
      '/events',
      '/disciplines',
      '/management',
      '/configuration',
      '/results',
      '/competitions',
      '/participants',
      '/discipline-groups',
    ];

    for (const route of managementRoutes) {
      await page.goto(`${JURY_SERVER}${route}`, { waitUntil: 'networkidle' });

      // Should redirect to /jury — NOT serve the management UI
      expect(page.url(), `${route} should redirect to /jury`).toMatch(/\/jury/);
    }
  });

  test('management root path redirects to /jury', async ({ page }) => {
    await page.goto(`${JURY_SERVER}/`, { waitUntil: 'networkidle' });
    expect(page.url()).toMatch(/\/jury/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. API ACCESS CONTROL ON PORT 3002
// ═══════════════════════════════════════════════════════════════════════

test.describe('API access control on port 3002', () => {

  test('health endpoint is accessible', async ({ request }) => {
    const response = await request.get(`${JURY_SERVER}/api/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.service).toBe('jury-portal');
  });

  test('jury-relevant GET endpoints are accessible', async ({ request }) => {
    // These endpoints should work (they may return empty data, but not 403)
    const allowedEndpoints = [
      '/api/events',
      '/api/discipline-fields',
    ];

    for (const endpoint of allowedEndpoints) {
      const response = await request.get(`${JURY_SERVER}${endpoint}`);
      expect(response.status(), `${endpoint} should be accessible`).not.toBe(403);
    }
  });

  test('management-only API endpoints are blocked', async ({ request }) => {
    // These endpoints should be blocked on port 3002
    const blockedEndpoints = [
      { method: 'GET', url: '/api/admin/users' },
      { method: 'GET', url: '/api/firewall/rules' },
      { method: 'GET', url: '/api/configuration' },
      { method: 'GET', url: '/api/disciplines' },
      { method: 'GET', url: '/api/clubs' },
      { method: 'GET', url: '/api/associations' },
      { method: 'GET', url: '/api/areas' },
      { method: 'GET', url: '/api/regions' },
      { method: 'GET', url: '/api/participants' },
      { method: 'GET', url: '/api/discipline-groups' },
      { method: 'GET', url: '/api/certificate-layouts' },
      { method: 'POST', url: '/api/events' },
      { method: 'DELETE', url: '/api/events/1' },
      { method: 'PUT', url: '/api/events/1' },
    ];

    for (const { method, url } of blockedEndpoints) {
      let response;
      if (method === 'GET') {
        response = await request.get(`${JURY_SERVER}${url}`);
      } else if (method === 'POST') {
        response = await request.post(`${JURY_SERVER}${url}`, { data: {} });
      } else if (method === 'DELETE') {
        response = await request.delete(`${JURY_SERVER}${url}`);
      } else if (method === 'PUT') {
        response = await request.put(`${JURY_SERVER}${url}`, { data: {} });
      }

      expect(response?.status(), `${method} ${url} should be blocked (403)`).toBe(403);

      const body = await response?.json();
      expect(body?.error).toBe('Forbidden');
    }
  });

  test('POST to non-jury endpoints is blocked', async ({ request }) => {
    const response = await request.post(`${JURY_SERVER}/api/disciplines`, {
      data: { name: 'Test' },
    });
    expect(response.status()).toBe(403);
  });

  test('scores/save-value POST is allowed (jury needs it)', async ({ request }) => {
    // This will probably fail with 400/422 because of missing data,
    // but it should NOT be 403 (Forbidden)
    const response = await request.post(`${JURY_SERVER}/api/scores/save-value`, {
      data: {},
    });
    expect(response.status()).not.toBe(403);
  });

  test('jury-results POST is allowed (jury needs it)', async ({ request }) => {
    const response = await request.post(`${JURY_SERVER}/api/jury-results`, {
      data: {},
    });
    expect(response.status()).not.toBe(403);
  });
});
