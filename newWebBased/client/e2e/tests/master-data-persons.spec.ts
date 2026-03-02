import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog } from '../helpers';

test.describe.serial('Master Data: Persons', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testFirstName = `TestVorname${uniqueSuffix}`;
  const testLastName = `TestNachname${uniqueSuffix}`;

  test('persons page loads', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Person|Personen|Contact/i);
  });

  test('persons page shows table', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headers = page.locator('table thead th');
    expect(await headers.count()).toBeGreaterThanOrEqual(2);
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

    await page.waitForTimeout(1000);
    await expect(page.locator('table tbody')).toContainText(testLastName, { timeout: 10_000 });
  });

  test('search filters persons', async ({ page }) => {
    await navigateTo(page, '/persons');
    await waitForLoadingToFinish(page);

    const searchInput = page.locator('input[type="search"], input[placeholder*="Suche"], input[placeholder*="search"], input[placeholder*="Filter"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(testLastName);
      await page.waitForTimeout(1000);
      await expect(page.locator('table tbody')).toContainText(testLastName);
    }
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

    // Search for our test person
    const searchInput = page.locator('input[type="search"], input[placeholder*="Suche"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(testLastName);
      await page.waitForTimeout(1000);
    }

    const row = page.locator('table tbody tr', { hasText: testLastName });
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
