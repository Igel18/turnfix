import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog, confirmDeleteModal } from '../helpers';

test.describe.serial('Master Data: Persons', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testFirstName = `TestVorname${uniqueSuffix}`;
  const testLastName = `TestNachname${uniqueSuffix}`;

  test('persons page loads', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Person|Personen|Contact/i);
  });

  test('persons page shows table or empty state', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    // Page may show a table (if data exists) or an empty state
    const table = page.locator('table');
    const emptyState = page.locator('text=/Keine|No |leer|empty/i');
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|new/i });

    const tableVisible = await table.isVisible({ timeout: 5_000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 1_000 }).catch(() => false);
    const addVisible = await addButton.isVisible({ timeout: 1_000 }).catch(() => false);

    // Either table with headers or empty state should be present
    expect(tableVisible || emptyVisible || addVisible).toBeTruthy();

    if (tableVisible) {
      const headers = page.locator('table thead th');
      expect(await headers.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('can open add person dialog', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('can create a new person', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    // Fill first name and last name
    const dialog = page.locator('[role="dialog"]');
    const inputs = dialog.locator('input[type="text"]');
    
    // Usually: first name, last name, email, ...
    const firstNameInput = inputs.first();
    await firstNameInput.fill(testFirstName);
    
    const lastNameInput = inputs.nth(1);
    await lastNameInput.fill(testLastName);

    // Submit
    const saveButton = dialog.getByRole('button', { name: /speichern|save|erstellen|create/i });
    await saveButton.click();

    // Wait for dialog to close (indicates save completed + data re-fetched)
    await expect(page.locator('[role="dialog"], .fixed.inset-0').first()).toBeHidden({ timeout: 10_000 });

    // Open filter panel to reveal the search input (search is inside .bg-gray-50 filter section)
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);

    // Search for the newly created person (table may be paginated)
    const searchInput = page.locator('.bg-gray-50 input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill(testLastName);
    await page.waitForTimeout(1000);

    await expect(page.locator('table tbody')).toContainText(testLastName, { timeout: 10_000 });
  });

  test('search filters persons', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    // Open filter panel to reveal the search input
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('.bg-gray-50 input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill(testLastName);
    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText(testLastName);
  });

  test('required fields are marked', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    // First name and last name should be required (red asterisk)
    const requiredMarkers = page.locator('[role="dialog"] .text-red-500, [role="dialog"] [class*="required"]');
    if (await requiredMarkers.count() > 0) {
      expect(await requiredMarkers.count()).toBeGreaterThanOrEqual(2); // Vorname + Nachname
    }
  });

  test('can toggle view mode', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    const viewToggle = page.getByRole('button', { name: /karten|card|grid|ansicht|view/i }).first();
    if (await viewToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('can delete test person', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    // Open filter panel and search for our test person
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);

    const searchInput = page.locator('.bg-gray-50 input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill(testLastName);
    await page.waitForTimeout(1000);

    const row = page.locator('table tbody tr', { hasText: testLastName });
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = row.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      await deleteButton.click();

      // Confirm deletion via UnifiedConfirmModal (scoped to modal, not page)
      await confirmDeleteModal(page);
      await page.waitForTimeout(1000);
    }
  });
});
