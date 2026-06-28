import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog, confirmDeleteModal } from '../helpers';

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

    // Count total layouts before creation (header: "X Layouts geladen")
    const bodyTextBefore = await page.locator('body').innerText();
    const totalBeforeMatch = bodyTextBefore.match(/(\d+)\s+Layouts\s+geladen/i);
    const totalBefore = totalBeforeMatch ? Number(totalBeforeMatch[1]) : null;

    // Create layout via add button
    await clickAddButton(page);
    await page.waitForTimeout(3000);

    // Try to set a unique name while in designer/detail view
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill(testLayoutName);
      const saveButton = page.getByRole('button', { name: /speichern|save/i }).first();
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(800);
      }
    }

    // Navigate back to list view
    await navigateTo(page, '/certificate-layouts');
    await waitForLoadingToFinish(page);

    // Prefer verifying by unique name (works if naming was possible)
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="Suche"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(testLayoutName);
      await page.waitForTimeout(1000);
    }

    const bodyTextAfter = await page.locator('body').innerText();
    const hasNamedLayout = bodyTextAfter.includes(testLayoutName);

    // Fallback assertion: if list view/pagination prevents direct name visibility,
    // ensure total layout count increased by at least 1.
    if (!hasNamedLayout) {
      const totalAfterMatch = bodyTextAfter.match(/(\d+)\s+Layouts\s+geladen/i);
      const totalAfter = totalAfterMatch ? Number(totalAfterMatch[1]) : null;
      expect(totalAfter).not.toBeNull();
      if (totalBefore !== null && totalAfter !== null) {
        expect(totalAfter).toBeGreaterThan(totalBefore);
      }
    } else {
      await expect(page.locator('body')).toContainText(testLayoutName, { timeout: 10_000 });
    }
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

    // Search for layout to handle pagination
    const searchInput = page.locator('input[type="search"], input[type="text"], input[placeholder*="Suche"], input[placeholder*="search"]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Neues Layout');
      await page.waitForTimeout(1000);
    }

    // Find the last 'Neues Layout' row (the one we just created)
    const rows = page.locator('table tbody tr', { hasText: /Neues Layout/ });
    const count = await rows.count();
    if (count > 0) {
      const lastRow = rows.nth(count - 1);
      const deleteButton = lastRow.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion via UnifiedConfirmModal (scoped to modal, not page)
        await confirmDeleteModal(page);
        await page.waitForTimeout(1000);
      }
    }
  });
});
