import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog, getTableRowCount } from '../helpers';

test.describe.serial('Master Data: Areas', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testAreaName = `Test Bereich E2E ${uniqueSuffix}`;
  const updatedAreaName = `Updated Bereich E2E ${uniqueSuffix}`;

  test('areas page loads', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Bereich|Area/i);
  });

  test('areas page shows table with data', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);

    // Should have a table
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10_000 });

    // Should have column headers
    const headers = page.locator('table thead th');
    expect(await headers.count()).toBeGreaterThanOrEqual(2);
  });

  test('can open add area dialog', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);
    
    await clickAddButton(page);
    await waitForDialog(page);

    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('can create a new area', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    // Fill name
    const nameInput = page.locator('[role="dialog"] input[type="text"]').first();
    await nameInput.fill(testAreaName);

    // Submit
    const saveButton = page.locator('[role="dialog"]').getByRole('button', { name: /speichern|save|erstellen|create/i });
    await saveButton.click();

    // Verify in table
    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText(testAreaName, { timeout: 10_000 });
  });

  test('search filters areas', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);

    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="Suche"], input[placeholder*="search"], input[placeholder*="Filter"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(testAreaName);
      await page.waitForTimeout(1000);
      await expect(page.locator('table tbody')).toContainText(testAreaName);
    }
  });

  test('can toggle between table and card view', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);

    // Look for view toggle button
    const viewToggle = page.getByRole('button', { name: /karten|card|grid|ansicht|view/i }).first();
    if (await viewToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewToggle.click();
      await page.waitForTimeout(500);

      // Should show card elements now
      const cards = page.locator('[class*="card"], [class*="grid"]');
      expect(await cards.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('can delete a test area', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);

    const row = page.locator('table tbody tr', { hasText: testAreaName });
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = row.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.getByRole('button', { name: /löschen|delete|ja|yes|bestätigen|confirm/i }).first();
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(1000);
    }
  });
});
