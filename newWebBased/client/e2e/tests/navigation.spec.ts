/**
 * Navigation Tests — Smoke tests for all pages
 *
 * Independent of setup — verifies page loading and basic navigation.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, expectPageTitle, waitForLoadingToFinish } from '../helpers';

test.describe('Navigation: Page Loading', () => {

  test('homepage loads with branding', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page.locator('body')).toContainText(/TurnFix/i);
  });

  test('management center loads', async ({ page }) => {
    await navigateTo(page, '/management');
    await expect(page.locator('body')).toContainText(/Verwaltung|Management/i);
  });

  test('regions page loads', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Gaue|Regionen|Region/i);
  });

  test('associations page loads', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(/Verband|Verbände|Association/i);
  });

  test('clubs page loads', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Verein|Club/i);
  });

  test('participants page loads', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Teilnehmer|Participant|Athlet/i);
  });

  test('disciplines page loads', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Disziplin|Discipline/i);
  });

  test('sports page loads', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(/Sport/i);
  });

  test('events page loads', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Event|Veranstaltung/i);
  });

  test('configuration page loads', async ({ page }) => {
    await navigateTo(page, '/configuration');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(/Konfiguration|Configuration/i);
  });

  test('formulas page loads', async ({ page }) => {
    await navigateTo(page, '/formulas');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(/Formel|Formula/i);
  });

  test('locations page loads', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(/Wettkampfort|Location|Ort/i);
  });

  test('login page shows auth-disabled notice', async ({ page }) => {
    await navigateTo(page, '/login');
    await expect(page.locator('body')).toContainText(/Authentifizierung|deaktiviert|Auth|disabled/i);
  });
});

test.describe('Navigation: Flow', () => {

  test('Home → Management → Regions → back', async ({ page }) => {
    await navigateTo(page, '/');
    // Navigate to management center
    const mgmtLink = page.getByRole('link', { name: /Verwaltung|Management/i }).first();
    await mgmtLink.click();
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).toContainText(/Verwaltung|Management/i);

    // Navigate to regions
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Gaue|Regionen|Region/i);
  });

  test('direct URL navigation for all management pages', async ({ page }) => {
    const pages = ['/regions', '/clubs', '/participants', '/disciplines', '/events'];
    for (const p of pages) {
      await navigateTo(page, p);
      await waitForLoadingToFinish(page);
      // Just verify no error (page renders something)
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('Management Center shows navigation cards', async ({ page }) => {
    await navigateTo(page, '/management');
    // Should have links to main sections
    await expect(page.locator('body')).toContainText(/Event/i);
    await expect(page.locator('body')).toContainText(/Verein|Club/i);
  });
});
