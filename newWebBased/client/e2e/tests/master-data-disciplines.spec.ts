/**
 * Master Data Tests — Disciplines (Disziplinen)
 *
 * Full CRUD + Filter + View Toggle tests.
 * Independent — creates/edits/deletes own test data inline.
 * Note: Disciplines page has no CSV export.
 * Disciplines have a complex form with many sections.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch } from '../helpers';

const TS = Date.now();
const TEST_NAME = `E2E_Disziplin_${TS}`;
const TEST_SHORT = 'E2ED';
const EDITED_NAME = `${TEST_NAME}_ed`;

test.describe.serial('Master Data: Disciplines', () => {

  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data|no disciplines/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('form has required fields and sections', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Discipline form has multiple sections with required fields
    const labels = modal.locator('label');
    const allLabels = await labels.allTextContents();
    const requiredLabels = allLabels.filter(l => l.includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(2); // name + sport
  });

  test('can create discipline', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill name (first text input)
    const textInputs = modal.locator('input[type="text"]');
    await textInputs.first().fill(TEST_NAME);

    // Fill short name (second text input)
    const shortNameInput = textInputs.nth(1);
    if (await shortNameInput.isVisible()) {
      await shortNameInput.fill(TEST_SHORT);
    }

    // Select sport and other required fields
    // Skip placeholder options with value="" or value="0" (sport placeholder)
    const selects = modal.locator('select');
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i++) {
      const sel = selects.nth(i);
      const realOptions = sel.locator('option:not([value=""]):not([value="0"]):not([disabled])');
      if ((await realOptions.count()) > 0) {
        const val = await realOptions.first().getAttribute('value');
        if (val) await sel.selectOption(val);
      }
    }

    // Submit and wait for API response
    const submitButton = modal.getByRole('button', { name: /create|erstellen|speichern|save/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/disciplines') && resp.request().method() === 'POST'),
      submitButton.click()
    ]);
    expect(response.status()).toBe(201);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Verify via search
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME, { timeout: 10_000 });
  });

  test('search/filter works', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME);

    // Sport filter dropdown
    const filterSelects = page.locator('select');
    if ((await filterSelects.count()) > 0) {
      const firstFilter = filterSelects.first();
      const optCount = await firstFilter.locator('option').count();
      expect(optCount).toBeGreaterThan(0);
    }
  });

  test('view toggle switches between table and cards', async ({ page }) => {
    await navigateTo(page, '/disciplines');
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

  test('can edit discipline', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);

    const row = page.locator('tr', { hasText: TEST_NAME });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    const editButton = row.first().locator('button[title="Edit discipline"], button[title="Disziplin bearbeiten"]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill(EDITED_NAME);

    const saveButton = modal.getByRole('button', { name: /update|speichern|save|aktualisieren/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/disciplines/') && resp.request().method() === 'PUT'),
      saveButton.click()
    ]);
    expect(response.status()).toBe(200);

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);
    await expect(page.locator('body')).toContainText(EDITED_NAME, { timeout: 10_000 });
  });

  test('can delete discipline', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      page.once('dialog', async dialog => await dialog.accept());
      const deleteButton = row.locator('button[title="Delete discipline"], button[title="Disziplin löschen"]').first();
      await deleteButton.click();
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('body')).not.toContainText(EDITED_NAME);
    }
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/disciplines');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu|erstellen/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
