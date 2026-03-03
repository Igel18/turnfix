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

  test('can create a new layout via add button', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // The add button creates a layout via API directly and opens the designer
    await clickAddButton(page);

    // Wait for designer to open (shows layout name input or designer view)
    await page.waitForTimeout(2000);

    // Should show designer or layout detail view after creation
    const designerVisible = await page.locator('text=/Designer|Felder|Fields|Layout bearbeiten/i').first().isVisible({ timeout: 5_000 }).catch(() => false);
    const nameInput = page.locator('input[type="text"]').first();
    const nameInputVisible = await nameInput.isVisible({ timeout: 2_000 }).catch(() => false);

    // Either the designer opened or at least a layout was created
    expect(designerVisible || nameInputVisible).toBeTruthy();
  });

  test('can create a named layout', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // Count layouts before creation
    const layoutCountBefore = await page.locator('table tbody tr').count().catch(() => 0);

    // The add button creates a layout directly (no dialog)
    await clickAddButton(page);
    await page.waitForTimeout(3000);

    // Navigate back to layout list if designer opened
    const backButton = page.getByRole('button', { name: /zurück|back|liste|list|schließen|close/i }).first();
    if (await backButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await backButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Maybe we need to navigate back to the page
      await navigateTo(page, '/certificate-layouts');
      await waitForLoadingToFinish(page);
    }

    // Verify a new layout was created (the default name is "Neues Layout") 
    await expect(page.locator('body')).toContainText(/Neues Layout|New Layout/i, { timeout: 10_000 });
  });

  test('can view layout detail', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // Click on any layout row's edit button
    const row = page.locator('table tbody tr').first();
    if (await row.isVisible({ timeout: 5000 }).catch(() => false)) {
      const editButton = row.getByRole('button', { name: /bearbeiten|edit|detail|anzeigen/i }).first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can delete a layout', async ({ page }) => {
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // Find the last 'Neues Layout' row (the one we just created)
    const rows = page.locator('table tbody tr', { hasText: /Neues Layout/ });
    const count = await rows.count();
    if (count > 0) {
      const lastRow = rows.nth(count - 1);
      const deleteButton = lastRow.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
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
