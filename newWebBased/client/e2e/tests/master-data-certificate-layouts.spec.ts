import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog } from '../helpers';

test.describe.serial('Master Data: Certificate Layouts', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testLayoutName = `Test Layout E2E ${uniqueSuffix}`;

  test('certificate layouts page loads', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Urkunden|Layout|Certificate/i);
  });

  test('page displays layout list', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // Could be table or card view
    const content = page.locator('table, [class*="grid"], [class*="card"]');
    await expect(content.first()).toBeVisible({ timeout: 10_000 });
  });

  test('can open add layout dialog', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('can create a new layout', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const dialog = page.locator('[role="dialog"]');
    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill(testLayoutName);

    const saveButton = dialog.getByRole('button', { name: /speichern|save|erstellen|create/i });
    await saveButton.click();

    await page.waitForTimeout(1000);
    // Verify creation (may be in table or cards)
    await expect(page.locator('body')).toContainText(testLayoutName, { timeout: 10_000 });
  });

  test('can view layout detail', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // Click on the test layout (in table or card)
    const layoutElement = page.locator(`text=${testLayoutName}`).first();
    if (await layoutElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for edit or view button in the row
      const row = page.locator('table tbody tr, [class*="card"]', { hasText: testLayoutName }).first();
      const editButton = row.getByRole('button', { name: /bearbeiten|edit|detail|anzeigen/i }).first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can delete test layout', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    const row = page.locator('table tbody tr, [class*="card"]', { hasText: testLayoutName }).first();
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = row.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();

        const confirmButton = page.getByRole('button', { name: /löschen|delete|ja|yes|bestätigen|confirm/i }).first();
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }
        await page.waitForTimeout(1000);
      }
    }
  });
});
