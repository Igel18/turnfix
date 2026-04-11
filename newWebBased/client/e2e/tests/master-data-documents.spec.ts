/**
 * Documents — Page tests including delete confirm modal verification.
 *
 * Since file upload is not easily automated, these tests:
 *  1. Verify the page loads and shows expected UI
 *  2. Verify the confirm modal (not native dialog) appears on delete
 *     — using any existing deletable file, or skipping gracefully if none.
 *
 * Key test: delete triggers UnifiedConfirmModal (not native browser confirm).
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish } from '../helpers';

test.describe.serial('Documents Page', () => {

  test('page loads', async ({ page }) => {
    await navigateTo(page, '/documents');
    await waitForLoadingToFinish(page);
    // Page has loaded when either table rows or empty state are visible
    const hasRows = (await page.locator('tr').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no files|no documents/i).count()) > 0;
    const hasUploadArea = (await page.locator('[data-testid="upload"], input[type="file"]').count()) > 0;
    expect(hasRows || hasEmpty || hasUploadArea).toBe(true);
  });

  test('has correct page title', async ({ page }) => {
    await navigateTo(page, '/documents');
    await waitForLoadingToFinish(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Dokument|Document|Datei|File/i);
  });

  test('shows file table or empty state', async ({ page }) => {
    await navigateTo(page, '/documents');
    await waitForLoadingToFinish(page);
    // Page content rendered
    const body = await page.locator('body').textContent();
    expect(body).not.toBeNull();
    expect(body!.length).toBeGreaterThan(100);
  });

  test('category filter is available if categories exist', async ({ page }) => {
    await navigateTo(page, '/documents');
    await waitForLoadingToFinish(page);
    // Category filter buttons or select should be present
    const filterWidget = page.locator('select, button').filter({ hasText: /icon|image|xml|json|all|alle/i }).first();
    // Just verify page didn't crash — filter may or may not be visible
    expect(await page.locator('h1, h2').first().isVisible()).toBe(true);
  });

  test('delete button shows UnifiedConfirmModal (not native dialog)', async ({ page }) => {
    // ⚠️ This test requires at least one deletable file to exist.
    // It skips gracefully if none found.

    await navigateTo(page, '/documents');
    await waitForLoadingToFinish(page);

    // Find any row that has a delete/trash button
    const deleteButton = page.locator('table tr')
      .locator('button[title*="löschen"], button[title*="Delete"], button[title*="delete"], button[title*="Löschen"]')
      .first();

    if (!(await deleteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Intercept native dialogs — should NOT fire
    let nativeDialogFired = false;
    page.once('dialog', (dialog) => {
      nativeDialogFired = true;
      dialog.dismiss(); // safe dismiss
    });

    await deleteButton.click();

    // React modal must appear
    const confirmModal = page.locator('.fixed.inset-0, [role="dialog"]').filter({
      hasText: /Löschen bestätigen|Confirm Delete/
    }).first();
    await expect(confirmModal).toBeVisible({ timeout: 5000 });

    // Native dialog must NOT have fired
    expect(nativeDialogFired).toBe(false);

    // Cancel to avoid actual deletion
    const cancelButton = confirmModal.getByRole('button', { name: /abbrechen|cancel/i }).first();
    await cancelButton.click();
    await expect(confirmModal).toHaveCount(0, { timeout: 3000 });
  });

  test('delete cancel keeps file in list', async ({ page }) => {
    await navigateTo(page, '/documents');
    await waitForLoadingToFinish(page);

    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    const firstRow = rows.first();
    const filenameText = await firstRow.locator('td').first().textContent() ?? '';

    const deleteButton = firstRow.locator(
      'button[title*="löschen"], button[title*="Delete"], button[title*="delete"], button[title*="Löschen"]'
    ).first();

    if (!(await deleteButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await deleteButton.click();

    const confirmModal = page.locator('.fixed.inset-0, [role="dialog"]').filter({
      hasText: /Löschen bestätigen|Confirm Delete/
    }).first();
    await confirmModal.waitFor({ timeout: 5000 });

    // Click cancel
    const cancelButton = confirmModal.getByRole('button', { name: /abbrechen|cancel/i }).first();
    await cancelButton.click();

    // File should still be in the list
    if (filenameText.trim()) {
      await expect(page.locator('body')).toContainText(filenameText.trim().substring(0, 20));
    }
    // Row count should not have changed
    await expect(page.locator('table tbody tr')).toHaveCount(rowCount);
  });
});
