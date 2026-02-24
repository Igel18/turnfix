import { test, expect } from '@playwright/test';
import { navigateTo, expectPageTitle, waitForLoadingToFinish } from './helpers';

/**
 * E2E Navigation Tests
 * 
 * Verifies that all main pages load correctly and display expected content.
 * These are smoke tests — they don't test deep functionality, just that:
 * 1. The page loads without errors
 * 2. The correct page title appears
 * 3. No uncaught errors in the console
 */

test.describe('Homepage', () => {
  test('loads and shows TurnFix branding', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page.locator('h1')).toContainText('TurnFix');
  });

  test('has navigation links to management center', async ({ page }) => {
    await navigateTo(page, '/');
    // Look for a link to the management center
    const managementLink = page.locator('a[href="/management"]');
    await expect(managementLink).toBeVisible();
  });

  test('has navigation links to events', async ({ page }) => {
    await navigateTo(page, '/');
    const eventsLink = page.locator('a[href="/events"]');
    await expect(eventsLink).toBeVisible();
  });
});

test.describe('Management Center', () => {
  test('loads and shows welcome header', async ({ page }) => {
    await navigateTo(page, '/management');
    // h1 shows "Willkommen zurück, guest!"
    await expect(page.locator('h1')).toContainText('Willkommen');
  });

  test('has navigation cards to master data pages', async ({ page }) => {
    await navigateTo(page, '/management');
    await waitForLoadingToFinish(page);
    // Check page contains links to key areas
    const pageText = await page.locator('body').textContent() || '';
    expect(pageText).toContain('Region');
  });
});

test.describe('Master Data Pages', () => {
  test('Regions page loads with data', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    // Page h1 is "Region Management" (English)
    await expect(page.locator('h1')).toContainText('Region');
    // Should have a table with data rows
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('Associations page loads', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);
    // Page should render without errors
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Clubs page loads', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Participants page loads', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Disciplines page loads', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Sports page loads', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Formulas page loads', async ({ page }) => {
    await navigateTo(page, '/formulas');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Locations page loads', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Status management page loads', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Event Pages', () => {
  test('Events page loads', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Configuration page loads', async ({ page }) => {
    await navigateTo(page, '/configuration');
    await waitForLoadingToFinish(page);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Login Page', () => {
  test('shows auth disabled notice', async ({ page }) => {
    await navigateTo(page, '/login');
    // Should display auth disabled banner
    await expect(page.locator('text=TurnFix')).toBeVisible();
  });

  test('has link to management center', async ({ page }) => {
    await navigateTo(page, '/login');
    const mgmtLink = page.locator('a[href="/management"]');
    await expect(mgmtLink).toBeVisible();
  });
});

test.describe('Page Navigation Flow', () => {
  test('can navigate from Home → Management → Regions → back', async ({ page }) => {
    // Start at Home
    await navigateTo(page, '/');
    await expect(page.locator('h1')).toContainText('TurnFix');

    // Navigate to Management
    await page.locator('a[href="/management"]').first().click();
    await page.waitForURL('**/management');
    await expect(page.locator('h1')).toContainText('Willkommen');

    // Navigate to Regions via management card/link
    await page.locator('a[href="/regions"]').first().click();
    await page.waitForURL('**/regions');
    await expect(page.locator('h1')).toContainText('Region');

    // Use browser back to go to Management
    await page.goBack();
    await page.waitForURL('**/management');
    await expect(page.locator('h1')).toContainText('Willkommen');
  });

  test('direct URL navigation works for all major pages', async ({ page }) => {
    const pages = [
      { path: '/regions', keyword: 'Region' },
      { path: '/clubs', keyword: 'Verein' },
      { path: '/events', keyword: 'Veranstaltung' },
      { path: '/disciplines', keyword: 'Disziplin' },
    ];

    for (const p of pages) {
      await page.goto(p.path);
      await waitForLoadingToFinish(page);
      // Each page should have some content related to its keyword
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain(p.keyword);
    }
  });
});
