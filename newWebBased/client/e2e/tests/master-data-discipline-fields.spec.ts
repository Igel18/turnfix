/**
 * Master Data Tests — Discipline Fields (Disziplinfelder)
 *
 * CRUD + Delete-Confirm tests.
 * Assumes at least one discipline exists in the system (standard seeded data).
 * Key test: delete triggers UnifiedConfirmModal (not native browser confirm).
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch, confirmDeleteModal } from '../helpers';

// var_name column is VarChar(15); TEST_FIELD_NAME ≤12 so EDITED (+ '_ed') ≤15
const TEST_FIELD_NAME = `EF_${Date.now().toString().slice(-9)}`;
const EDITED_FIELD_NAME = `${TEST_FIELD_NAME}_ed`;

test.describe.serial('Master Data: Discipline Fields', () => {

  test('page loads', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct page title', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Disziplinfeld|Discipline Field/i);
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|Feld hinzufügen/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    await expect(modal).toBeVisible();
  });

  test('required fields are marked', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|Feld hinzufügen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    const labels = modal.locator('label');
    const allLabels = await labels.allTextContents();
    const requiredLabels = allLabels.filter(l => l.includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('can create discipline field', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|Feld hinzufügen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Select first available discipline from the dropdown
    const disciplineSelect = modal.locator('select').first();
    const optionsCount = await disciplineSelect.locator('option').count();
    if (optionsCount > 1) {
      // Select first real option (not placeholder)
      await disciplineSelect.selectOption({ index: 1 });
    }

    // Fill field name
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_FIELD_NAME);

    // Fill required sort order (number input)
    const sortOrderInput = modal.locator('input[type="number"]').first();
    await sortOrderInput.fill('10');

    const submitButton = modal.getByRole('button', { name: /erstellen|create|speichern|save/i });
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/discipline-fields') && r.request().method() === 'POST'),
      submitButton.click(),
    ]);
    expect(response.status()).toBeLessThan(300);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(TEST_FIELD_NAME, { timeout: 10_000 });
  });

  test('can edit discipline field', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);

    const row = page.locator('tr', { hasText: TEST_FIELD_NAME });
    if ((await row.count()) === 0) {
      test.skip();
      return;
    }

    const editButton = row.first().locator('button[title*="bearbeiten"], button[title*="Edit"], button[title*="edit"]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill(EDITED_FIELD_NAME);

    const saveButton = modal.getByRole('button', { name: /aktualisieren|update|speichern|save/i });
    await saveButton.click();

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(EDITED_FIELD_NAME, { timeout: 10_000 });
  });

  test('filter works', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_FIELD_NAME);
    await expect(page.locator('body')).toContainText(EDITED_FIELD_NAME);
  });

  test('delete shows UnifiedConfirmModal, not native dialog', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);

    const row = page.locator('tr', { hasText: EDITED_FIELD_NAME });
    if ((await row.count()) === 0) {
      test.skip();
      return;
    }

    const deleteButton = row.first().locator('button[title*="löschen"], button[title*="Delete"], button[title*="delete"]').first();
    await deleteButton.click();

    const confirmModal = page.locator('.fixed.inset-0, [role="dialog"]').filter({
      hasText: /Löschen bestätigen|Confirm Delete/
    }).first();
    await expect(confirmModal).toBeVisible({ timeout: 5000 });

    // Cancel — record must survive
    const cancelButton = confirmModal.getByRole('button', { name: /abbrechen|cancel/i }).first();
    await cancelButton.click();
    await expect(page.locator('body')).toContainText(EDITED_FIELD_NAME);
  });

  test('can delete discipline field and confirm via modal', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);

    const row = page.locator('tr', { hasText: EDITED_FIELD_NAME });
    if ((await row.count()) === 0) {
      test.skip();
      return;
    }

    const deleteButton = row.first().locator('button[title*="löschen"], button[title*="Delete"], button[title*="delete"]').first();
    await deleteButton.click();
    await confirmDeleteModal(page);
    await page.waitForTimeout(1500);

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).not.toContainText(EDITED_FIELD_NAME, { timeout: 10_000 });
  });

  test('modal closes without saving on cancel', async ({ page }) => {
    await navigateTo(page, '/discipline-fields');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|Feld hinzufügen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
