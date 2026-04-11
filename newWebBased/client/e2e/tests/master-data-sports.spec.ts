/**
 * Master Data Tests — Sports (Sportarten)
 *
 * Full CRUD + Filter + View Toggle tests.
 * Independent — creates/edits/deletes own test data inline.
 * Note: Sports page has no CSV export.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch, confirmDeleteModal } from '../helpers';

const TS = Date.now();
const TEST_NAME = `E2E_Sport_${TS}`;
const EDITED_NAME = `${TEST_NAME}_edited`;

test.describe.serial('Master Data: Sports', () => {

  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data|no sports/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThanOrEqual(2); // Sport Name, Disciplines, Actions
    }
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('required fields marked with * in form', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Sport has 1 required field: Sport Name *
    const labels = modal.locator('label');
    const allLabels = await labels.allTextContents();
    const requiredLabels = allLabels.filter(l => l.includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(1);
  });

  test('can create sport', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill sport name
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_NAME);

    // Submit and verify API response
    const submitButton = modal.getByRole('button', { name: /create|erstellen|speichern|save/i });
    const [createResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/sports') && resp.request().method() === 'POST'),
      submitButton.click()
    ]);
    expect(createResponse.status()).toBe(201);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Verify
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME, { timeout: 10_000 });
  });

  test('search/filter works', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME);

    // Discipline status filter
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible()) {
      const optCount = await filterSelect.locator('option').count();
      expect(optCount).toBeGreaterThan(0);
    }
  });

  test('view toggle switches between table and cards', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);

    const viewToggle = page.getByRole('button', { name: /karten|card|grid|ansicht|view/i }).first();
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(500);
      const tableToggle = page.getByRole('button', { name: /tabelle|table|liste|list/i }).first();
      if (await tableToggle.isVisible()) {
        await tableToggle.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can edit sport', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);

    const row = page.locator('tr', { hasText: TEST_NAME });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    // Sports uses hardcoded English title "Edit Sport"
    const editButton = row.first().locator('button[title="Edit Sport"], button[title="Sportart bearbeiten"]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.clear();
    await nameInput.fill(EDITED_NAME);

    // Click save and verify API response
    const saveButton = modal.getByRole('button', { name: /update|speichern|save|aktualisieren/i });
    const [editResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/sports/') && resp.request().method() === 'PUT'),
      saveButton.click()
    ]);
    expect(editResponse.status()).toBe(200);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Reload and verify
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);
    await expect(page.locator('body')).toContainText(EDITED_NAME, { timeout: 10_000 });
  });

  test('can delete sport', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      // Sports uses hardcoded English title "Delete Sport"
      const deleteButton = row.locator('button[title="Delete Sport"], button[title="Sportart löschen"]').first();
      await deleteButton.click();
      await confirmDeleteModal(page);
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('body')).not.toContainText(EDITED_NAME);
    }
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/sports');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
