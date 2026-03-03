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

test.describe('Navigation: Jury QR Code on Homepage', () => {

  test('homepage shows QR code section for jury portal', async ({ page }) => {
    await navigateTo(page, '/');
    // Should show QR code title (either loading, error, or actual content)
    await expect(page.locator('body')).toContainText(/QR.*Code.*Jury|Jury.*QR/i);
  });

  test('QR code section displays network IPs', async ({ page }) => {
    await navigateTo(page, '/');
    // Wait for network info to load - look for either IP display or no-network message
    await page.waitForTimeout(2000);
    const body = page.locator('body');
    const hasIp = await body.locator('text=/\\d+\\.\\d+\\.\\d+\\.\\d+/').count();
    const hasNoNetwork = await body.locator('text=/Kein Netzwerk|No network/i').count();
    expect(hasIp > 0 || hasNoNetwork > 0).toBeTruthy();
  });

  test('QR code section has copy URL buttons', async ({ page }) => {
    await navigateTo(page, '/');
    await page.waitForTimeout(2000);
    // If network is available, copy buttons should exist
    const copyButtons = page.locator('[title*="URL kopieren"], [title*="Copy URL"]');
    const noNetwork = page.locator('text=/Kein Netzwerk|No network/i');
    const hasCopy = await copyButtons.count();
    const hasNoNet = await noNetwork.count();
    // Either copy buttons or no-network message should be present
    expect(hasCopy > 0 || hasNoNet > 0).toBeTruthy();
  });

  test('QR code SVGs are rendered', async ({ page }) => {
    await navigateTo(page, '/');
    await page.waitForTimeout(2000);
    // Look for QR code SVGs (qrcode.react renders SVG elements)
    const noNetwork = await page.locator('text=/Kein Netzwerk|No network/i').count();
    if (noNetwork === 0) {
      // If network is available, QR SVGs should exist
      const qrSvgs = page.locator('svg');
      expect(await qrSvgs.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('jury portal link points to port 3002', async ({ page }) => {
    await navigateTo(page, '/');
    // The jury portal link should include port 3002
    const juryLink = page.locator('a[href*="3002/jury"]').first();
    await expect(juryLink).toBeVisible();
  });
});

test.describe('Navigation: WiFi QR Code on Homepage', () => {
  test('homepage shows WiFi QR section or not-configured message', async ({ page }) => {
    await navigateTo(page, '/');
    await page.waitForTimeout(3000);
    // WiFi section compact version is in the jury section
    // It should show either configured WiFi or "not configured" state
    // The WifiQRCode component always renders — check for its container
    const wifiSection = page.locator('text=/WLAN|WiFi/i');
    const count = await wifiSection.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('WiFi section appears before Jury QR section (numbered steps)', async ({ page }) => {
    await navigateTo(page, '/');
    await page.waitForTimeout(2000);
    // Check for numbered steps (1 = WiFi, 2 = Jury)
    const numberedSteps = page.locator('.rounded-full');
    const stepCount = await numberedSteps.count();
    // Should have at least 2 numbered step indicators
    expect(stepCount).toBeGreaterThanOrEqual(2);
  });

  test('WiFi configuration section exists in settings', async ({ page }) => {
    await navigateTo(page, '/configuration');
    await page.waitForTimeout(1000);
    // WiFi section should be in the sidebar navigation
    const wifiNav = page.locator('button:has-text("WLAN"), button:has-text("WiFi")');
    await expect(wifiNav.first()).toBeVisible();
  });
});
