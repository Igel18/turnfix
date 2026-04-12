/**
 * Master Data Tests — Locations / Venues (Austragungsorte)
 *
 * Full CRUD + Filter + Delete-Confirm tests.
 * Independent — creates/edits/deletes own test data inline.
 * Key test: delete triggers UnifiedConfirmModal (not native browser confirm).
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch, confirmDeleteModal } from '../helpers';

const TS = Date.now();
const TEST_NAME = `E2E_Ort_${TS}`;
const EDITED_NAME = `${TEST_NAME}_ed`;

test.describe.serial('Master Data: Locations / Venues', () => {

  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data|keine Austragungsorte/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct page title', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Austragungsort|Location|Venue/i);
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    await expect(modal).toBeVisible();
  });

  test('name field is required', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    // Name label should have a required marker
    const labels = modal.locator('label');
    const allLabels = await labels.allTextContents();
    const requiredLabels = allLabels.filter(l => l.includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('can create location', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_NAME);

    const submitButton = modal.getByRole('button', { name: /erstellen|create|speichern|save/i });
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/venues') && r.request().method() === 'POST'),
      submitButton.click()
    ]);
    expect(response.status()).toBeLessThan(300);

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME, { timeout: 10_000 });
  });

  test('can edit location', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_NAME);

    const row = page.locator('tr', { hasText: TEST_NAME });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    const editButton = row.first().locator('button[title*="bearbeiten"], button[title*="Edit"], button[title*="edit"]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill(EDITED_NAME);

    const saveButton = modal.getByRole('button', { name: /aktualisieren|update|speichern|save/i });
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/venues') && r.request().method() === 'PUT'),
      saveButton.click()
    ]);
    expect(response.status()).toBeLessThan(300);

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);
    await expect(page.locator('body')).toContainText(EDITED_NAME, { timeout: 10_000 });
  });

  test('delete shows UnifiedConfirmModal, not native dialog', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      const deleteButton = row.first().locator('button[title*="löschen"], button[title*="Delete"], button[title*="delete"]').first();
      await deleteButton.click();

      const confirmModal = page.locator('.fixed.inset-0, [role="dialog"]').filter({
        hasText: /Löschen bestätigen|Confirm Delete/
      }).first();
      await expect(confirmModal).toBeVisible({ timeout: 5000 });

      // Cancel — record must survive
      const cancelButton = confirmModal.getByRole('button', { name: /abbrechen|cancel/i }).first();
      await cancelButton.click();
      await expect(page.locator('body')).toContainText(EDITED_NAME);
    }
  });

  test('can delete location and confirm via modal', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      const deleteButton = row.first().locator('button[title*="löschen"], button[title*="Delete"], button[title*="delete"]').first();
      await deleteButton.click();
      await confirmDeleteModal(page);
      await page.waitForTimeout(1500);

      await page.reload({ waitUntil: 'networkidle' });
      await waitForLoadingToFinish(page);
      await openFilterAndSearch(page, EDITED_NAME);
      await expect(page.locator('body')).not.toContainText(EDITED_NAME, { timeout: 10_000 });
    }
  });

  test('modal closes without saving on cancel', async ({ page }) => {
    await navigateTo(page, '/locations');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
