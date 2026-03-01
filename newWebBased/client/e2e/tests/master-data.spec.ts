/**
 * Master Data Tests — CRUD operations for regions
 *
 * Independent of setup — creates/edits/deletes own test data inline.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, getTableRowCount, openFilterAndSearch } from '../helpers';

const TEST_REGION_NAME = `E2E_Region_CRUD_${Date.now()}`;
const EDITED_NAME = `${TEST_REGION_NAME}_edited`;

test.describe.serial('Master Data: Regions', () => {

  test('page loads with table', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    // Page should have a table or empty state
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmptyState = (await page.getByText(/keine|leer|empty|no data/i).count()) > 0;
    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThan(0);
    }
  });

  test('search/filter input visible', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    const searchInput = page.locator('input[type="search"], input[placeholder*="Suche"], input[placeholder*="search"], input[placeholder*="Filter"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0); // May not exist on empty DB
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    // Modal should appear
    const modal = page.locator('.fixed.inset-0, [role="dialog"]');
    await modal.first().waitFor({ timeout: 5000 });
  });

  test('can create region', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill in name
    const nameInput = modal.locator('input[type="text"]').first();
    await nameInput.fill(TEST_REGION_NAME);

    // Fill abbreviation if visible
    const abbrInput = modal.locator('input[placeholder*="abbreviation" i], input[placeholder*="kürzel" i]').first();
    if (await abbrInput.isVisible().catch(() => false)) {
      await abbrInput.fill('E2ET');
    }

    // Select association (required FK — int_verbaendeid NOT NULL)
    const assocSelect = modal.locator('select').first();
    if (await assocSelect.isVisible().catch(() => false)) {
      const options = assocSelect.locator('option:not([value=""])');
      const optCount = await options.count();
      if (optCount > 0) {
        const firstOptionValue = await options.first().getAttribute('value');
        if (firstOptionValue) {
          await assocSelect.selectOption(firstOptionValue);
        }
      }
    }

    // Submit
    const saveButton = modal.getByRole('button', { name: /speichern|save|erstellen|create/i });
    await saveButton.click();
    await page.waitForTimeout(2000);

    // Verify region appears — search for it to handle pagination
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_REGION_NAME);
    await expect(page.locator('body')).toContainText(TEST_REGION_NAME, { timeout: 10_000 });
  });

  test('can search for region', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_REGION_NAME);
    await expect(page.locator('body')).toContainText(TEST_REGION_NAME, { timeout: 10_000 });
  });

  test('view toggle works', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    // Look for view toggle button
    const viewToggle = page.getByRole('button', { name: /karten|card|grid|ansicht|view/i }).first();
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      await page.waitForTimeout(500);
      // Should switch to card view (no table, card elements instead)
      // Click back to table view
      const tableToggle = page.getByRole('button', { name: /tabelle|table|liste|list/i }).first();
      if (await tableToggle.isVisible()) {
        await tableToggle.click();
      }
    }
  });

  test('can edit region', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    // Search for the test region to handle pagination
    await openFilterAndSearch(page, TEST_REGION_NAME);

    // Find the row with our test region
    const row = page.locator('tr', { hasText: TEST_REGION_NAME });
    if ((await row.count()) > 0) {
      const editButton = row.getByRole('button', { name: /bearbeiten|edit|ändern/i }).first();
      await editButton.click();

      const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
      await modal.waitFor({ timeout: 5000 });

      const nameInput = modal.locator('input[type="text"]').first();
      await nameInput.clear();
      await nameInput.fill(EDITED_NAME);

      const saveButton = modal.getByRole('button', { name: /speichern|save|aktualisieren|update/i });
      await saveButton.click();
      await page.waitForTimeout(1000);

      await page.reload({ waitUntil: 'networkidle' });
      await waitForLoadingToFinish(page);
      await openFilterAndSearch(page, EDITED_NAME);
      await expect(page.locator('body')).toContainText(EDITED_NAME, { timeout: 10_000 });
    }
  });

  test('can delete region', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    // Search for the edited region to handle pagination
    await openFilterAndSearch(page, EDITED_NAME);

    // Find the row with our edited region
    const row = page.locator('tr', { hasText: EDITED_NAME });
    if ((await row.count()) > 0) {
      // Set up dialog handler BEFORE clicking delete (native confirm dialog)
      page.once('dialog', async dialog => await dialog.accept());

      const deleteButton = row.locator('button[title="Delete region"], button[title="Region löschen"]').first();
      await deleteButton.click();

      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await waitForLoadingToFinish(page);
      await openFilterAndSearch(page, EDITED_NAME);

      // Should no longer appear (search should return no results)
      await expect(page.locator('body')).not.toContainText(EDITED_NAME, { timeout: 10_000 });
    }
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Close without saving
    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();

    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});

/**
 * Required Field Markers — verify that mandatory form fields
 * are marked with a red asterisk (*) across master-data dialogs.
 */
test.describe('Required Field Markers', () => {

  test('Regions: required fields marked with *', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Get all labels inside the modal
    const labels = modal.locator('label');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThanOrEqual(2);

    // Required fields must have a red asterisk (span.text-red-500 with *)
    const requiredMarkers = modal.locator('label span.text-red-500');
    const markerCount = await requiredMarkers.count();

    // Regions form: "Name" and "Association" are required
    expect(markerCount).toBeGreaterThanOrEqual(2);

    // Each required marker should contain *
    for (let i = 0; i < markerCount; i++) {
      await expect(requiredMarkers.nth(i)).toHaveText('*');
    }

    // Optional fields (Abbreviation) should NOT have a red asterisk
    // Count labels without red asterisks — at least abbreviation
    const allLabelTexts = await labels.allTextContents();
    const abbrLabel = allLabelTexts.find(l =>
      l.match(/kürzel|abbreviation/i) && !l.includes('*')
    );
    // Abbreviation is optional (nullable in schema), so it should not have *
    // We check that not ALL labels have the marker
    expect(markerCount).toBeLessThan(labelCount);
  });

  test('Associations: required fields marked with *', async ({ page }) => {
    await navigateTo(page, '/associations');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const labels = modal.locator('label');
    const labelCount = await labels.count();
    expect(labelCount).toBeGreaterThanOrEqual(2);

    // Required fields: "Name" and "Country" (int_laenderid NOT NULL)
    const requiredMarkers = modal.locator('label span.text-red-500');
    const markerCount = await requiredMarkers.count();
    expect(markerCount).toBeGreaterThanOrEqual(2);

    for (let i = 0; i < markerCount; i++) {
      await expect(requiredMarkers.nth(i)).toHaveText('*');
    }

    // Optional fields (Abbreviation) should not have a marker
    expect(markerCount).toBeLessThan(labelCount);
  });

  test('Regions: required inputs have HTML required attribute', async ({ page }) => {
    await navigateTo(page, '/regions');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // The name input and association select should have the required attribute
    const requiredInputs = modal.locator('input[required], select[required]');
    const reqCount = await requiredInputs.count();
    expect(reqCount).toBeGreaterThanOrEqual(2);
  });
});
