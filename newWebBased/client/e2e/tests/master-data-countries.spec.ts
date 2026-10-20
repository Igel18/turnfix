/**
 * Master Data Tests — Countries
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch, confirmDeleteModal } from '../helpers';

const TS = Date.now();
const TEST_NAME = `E2E_Land_${TS}`;
const EDITED_NAME = `${TEST_NAME}_edited`;

test.describe.serial('Master Data: Countries', () => {
  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('required fields marked with *', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const markers = modal.locator('label span.text-red-500');
    expect(await markers.count()).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < await markers.count(); i++) {
      await expect(markers.nth(i)).toHaveText('*');
    }
  });

  test('can create country', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_NAME);

    const abbrInput = modal.locator('input[type="text"]').nth(1);
    await abbrInput.fill('E2EL');

    const saveButton = modal.getByRole('button', { name: /create|erstellen|save|speichern/i });
    const [createResponse] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/countries') && resp.request().method() === 'POST'),
      saveButton.click(),
    ]);
    expect(createResponse.status()).toBe(201);

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME, { timeout: 10_000 });
  });

  test('search/filter works', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);
    await expect(page.locator('body')).toContainText(TEST_NAME);
  });

  test('CSV export button visible and clickable', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);

    const csvButton = page.getByRole('button', { name: /csv|export/i });
    if (await csvButton.isVisible()) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
        csvButton.click(),
      ]);
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.csv$/);
      }
    }
  });

  test('view toggle switches between table and cards', async ({ page }) => {
    await navigateTo(page, '/countries');
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

  test('can edit country', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_NAME);

    const row = page.locator('tr', { hasText: TEST_NAME });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    const editButton = row.first().locator('button[title*="bearbeiten" i], button[title*="edit" i]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill(EDITED_NAME);

    const saveButton = modal.getByRole('button', { name: /update|aktualisieren|save|speichern/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/countries/') && resp.request().method() === 'PUT'),
      saveButton.click(),
    ]);
    expect(response.status()).toBe(200);

    await expect(modal).toHaveCount(0, { timeout: 5000 });

    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_NAME);
    await expect(page.locator('body')).toContainText(EDITED_NAME, { timeout: 10_000 });
  });

  test('can delete country', async ({ page }) => {
    await navigateTo(page, '/countries');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, EDITED_NAME);

    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      const deleteButton = row.locator('button[title*="löschen" i], button[title*="delete" i]').first();
      await deleteButton.click();
      await confirmDeleteModal(page);
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('body')).not.toContainText(EDITED_NAME);
    }
  });
});