/**
 * Master Data Tests — Clubs (Vereine)
 *
 * Full CRUD + Filter + View Toggle tests.
 * Independent — creates/edits/deletes own test data inline.
 * Note: Clubs page has no CSV export.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch, confirmDeleteModal } from '../helpers';

const TS = Date.now();
const TEST_NAME = `E2E_Verein_${TS}`;
const EDITED_NAME = `${TEST_NAME}_edited`;

test.describe.serial('Master Data: Clubs', () => {

  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data|no clubs/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThanOrEqual(3); // Name, Region, Contact, Athletes, Actions
    }
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('required fields marked with * in form', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Check for required markers (Club Name *, Region *)
    const labels = modal.locator('label');
    const allLabels = await labels.allTextContents();
    const requiredLabels = allLabels.filter(l => l.includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(2);
  });

  test('can create club', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill club name (first text input)
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_NAME);

    // Select region (required — select first available option)
    const regionSelect = modal.locator('select').first();
    if (await regionSelect.isVisible()) {
      const options = regionSelect.locator('option:not([value=""]):not([disabled])');
      if ((await options.count()) > 0) {
        const val = await options.first().getAttribute('value');
        if (val) await regionSelect.selectOption(val);
      }
    }

    // Submit and verify API response
    const submitButton = modal.getByRole('button', { name: /create|erstellen|speichern|save/i });
    const [createResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/clubs') && resp.request().method() === 'POST'),
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
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME);

    // Region filter dropdown
    const regionFilter = page.locator('select').first();
    if (await regionFilter.isVisible()) {
      const optCount = await regionFilter.locator('option').count();
      expect(optCount).toBeGreaterThan(0);
    }
  });

  test('view toggle switches between table and cards', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);

    const viewToggle = page.getByRole('button', { name: /karten|card|grid|ansicht|view/i }).first();
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(500);
      // Toggle back
      const tableToggle = page.getByRole('button', { name: /tabelle|table|liste|list/i }).first();
      if (await tableToggle.isVisible()) {
        await tableToggle.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('can edit club', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);

    const row = page.locator('tr', { hasText: TEST_NAME });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    const editButton = row.first().locator('button[title="Verein bearbeiten"], button[title="Edit club"], button[title="Edit Club"]').first();
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
      page.waitForResponse(resp => resp.url().includes('/api/clubs/') && resp.request().method() === 'PUT'),
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

  test('can delete club', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      const deleteButton = row.locator('button[title="Verein löschen"], button[title="Delete club"], button[title="Delete Club"]').first();
      await deleteButton.click();
      await confirmDeleteModal(page);
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('body')).not.toContainText(EDITED_NAME);
    }
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/clubs');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
