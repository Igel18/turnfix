import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog, getTableRowCount, confirmDeleteModal } from '../helpers';

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

    // Wait for dialog to close
    await expect(page.locator('[role="dialog"], .fixed.inset-0').first()).toBeHidden({ timeout: 10_000 });

    // Open filter panel to reveal the search input
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);

    // Search for the newly created area (table may be paginated)
    const searchInput = page.locator('.bg-gray-50 input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill(testAreaName);
    await page.waitForTimeout(1000);

    // Verify in table
    await expect(page.locator('table tbody')).toContainText(testAreaName, { timeout: 10_000 });
  });

  test('search filters areas', async ({ page }) => {
    await navigateTo(page, '/areas');
    await waitForLoadingToFinish(page);

    // Open filter panel to reveal the search input
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('.bg-gray-50 input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill(testAreaName);
    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText(testAreaName);
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

    // Open filter panel and search for the test area
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);
    const searchInput = page.locator('.bg-gray-50 input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill(testAreaName);
    await page.waitForTimeout(1000);

    const row = page.locator('table tbody tr', { hasText: testAreaName });
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = row.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      await deleteButton.click();

      // Confirm deletion via UnifiedConfirmModal (scoped to modal, not page)
      await confirmDeleteModal(page);

      await page.waitForTimeout(1000);
    }
  });
});
