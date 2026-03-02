import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog } from '../helpers';

test.describe.serial('Master Data: Statuses', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testStatusName = `Test Status E2E ${uniqueSuffix}`;

  test('status page loads', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Status/i);
  });

  test('page shows table with data', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);

    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headers = page.locator('table thead th');
    expect(await headers.count()).toBeGreaterThanOrEqual(2);
  });

  test('can open add dialog', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('can create a new status', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const dialog = page.locator('[role="dialog"]');
    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill(testStatusName);

    const saveButton = dialog.getByRole('button', { name: /speichern|save|erstellen|create/i });
    await saveButton.click();

    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText(testStatusName, { timeout: 10_000 });
  });

  test('search filters statuses', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Suche"], input[placeholder*="search"], input[placeholder*="Filter"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(testStatusName);
      await page.waitForTimeout(1000);
      await expect(page.locator('table tbody')).toContainText(testStatusName);
    }
  });

  test('can delete test status', async ({ page }) => {
    await navigateTo(page, '/status-management');
    await waitForLoadingToFinish(page);

    const row = page.locator('table tbody tr', { hasText: testStatusName });
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = row.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      await deleteButton.click();

      const confirmButton = page.getByRole('button', { name: /löschen|delete|ja|yes|bestätigen|confirm/i }).first();
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
    }
  });
});
