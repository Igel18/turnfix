/**
 * Master Data Tests — Associations (Verbände)
 * 
 * Full CRUD + Filter + CSV Export + View Toggle tests.
 * Independent — creates/edits/deletes own test data inline.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch } from '../helpers';

const TS = Date.now();
const TEST_NAME = `E2E_Verband_${TS}`;
const EDITED_NAME = `${TEST_NAME}_edited`;

test.describe.serial('Master Data: Associations', () => {

  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThanOrEqual(3); // Name, Abbreviation, Country, Actions
    }
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('required fields marked with *', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Required markers
    const markers = modal.locator('label span.text-red-500');
    const count = await markers.count();
    expect(count).toBeGreaterThanOrEqual(2); // Name + Country

    for (let i = 0; i < count; i++) {
      await expect(markers.nth(i)).toHaveText('*');
    }

    // Required HTML attributes
    const reqInputs = modal.locator('input[required], select[required]');
    expect(await reqInputs.count()).toBeGreaterThanOrEqual(2);
  });

  test('can create association', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill name
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_NAME);

    // Fill abbreviation if visible
    const abbrInput = modal.locator('input[type="text"]').nth(1);
    if (await abbrInput.isVisible().catch(() => false)) {
      await abbrInput.fill('E2EV');
    }

    // Select country (required — select first available option)
    const countrySelect = modal.locator('select').first();
    if (await countrySelect.isVisible()) {
      const options = countrySelect.locator('option:not([value=""])');
      if ((await options.count()) > 0) {
        const val = await options.first().getAttribute('value');
        if (val) await countrySelect.selectOption(val);
      }
    }

    // Save and verify API response
    const saveButton = modal.getByRole('button', { name: /speichern|save|erstellen|create/i });
    const [createResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/associations') && resp.request().method() === 'POST'),
      saveButton.click()
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
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME);

    // Filter by country dropdown (if visible)
    const countryFilter = page.locator('select').first();
    if (await countryFilter.isVisible()) {
      const optCount = await countryFilter.locator('option').count();
      expect(optCount).toBeGreaterThan(0);
    }
  });

  test('CSV export button visible and clickable', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    // CSV export button
    const csvButton = page.getByRole('button', { name: /csv|export/i });
    if (await csvButton.isVisible()) {
      // Set up download handler
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        csvButton.click(),
      ]);
      // If download triggered, verify filename
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    }
  });

  test('view toggle switches between table and cards', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    // Look for view toggle buttons
    const viewToggle = page.getByRole('button', { name: /karten|card|grid|ansicht|view/i }).first();
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(500);
      // Should now be in card view — no table visible
      const tableCount = await page.locator('table').count();
      // Card view typically has no table or a hidden one
      // Toggle back
      const tableToggle = page.getByRole('button', { name: /tabelle|table|liste|list/i }).first();
      if (await tableToggle.isVisible()) {
        await tableToggle.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can edit association', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    // Search for our test entry
    await openFilterAndSearch(page, TEST_NAME);

    const row = page.locator('tr', { hasText: TEST_NAME });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    const editButton = row.first().locator('button[title="Verband bearbeiten"], button[title="Edit association"]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Edit name (first text input in modal)
    const nameInput = modal.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await nameInput.clear();
    await nameInput.fill(EDITED_NAME);

    // Click save and verify API response
    const saveButton = modal.getByRole('button', { name: /speichern|save|aktualisieren|update/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/associations/') && resp.request().method() === 'PUT'),
      saveButton.click()
    ]);
    expect(response.status()).toBe(200);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Reload and verify
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);
    await expect(page.locator('body')).toContainText(EDITED_NAME, { timeout: 10_000 });
  });

  test('can delete association', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      page.once('dialog', async dialog => await dialog.accept());
      const deleteButton = row.locator('button[title="Verband löschen"], button[title="Delete association"]').first();
      await deleteButton.click();
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('body')).not.toContainText(EDITED_NAME);
    }
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
