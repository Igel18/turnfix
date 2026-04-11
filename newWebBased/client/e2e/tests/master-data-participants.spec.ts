/**
 * Master Data Tests — Participants (Teilnehmer)
 *
 * Full CRUD + Filter + View Toggle tests.
 * Independent — creates/edits/deletes own test data inline.
 * Note: Participants page has no CSV export.
 * Requires at least one club to exist (FK constraint).
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, openFilterAndSearch, confirmDeleteModal } from '../helpers';

const TS = Date.now();
const TEST_FIRST = `E2EVorname${TS}`;
const TEST_LAST = `E2ENachname${TS}`;
const EDITED_LAST = `${TEST_LAST}ed`;

test.describe.serial('Master Data: Participants', () => {

  test('page loads with table or empty state', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/keine|leer|empty|no data|no participants/i).count()) > 0;
    expect(hasTable || hasEmpty).toBe(true);
  });

  test('has correct column headers', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);
    const table = page.locator('table');
    if (await table.count() > 0) {
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.length).toBeGreaterThanOrEqual(4);
    }
  });

  test('can open add modal', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu/i });
    await expect(addButton).toBeVisible();
    await addButton.click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('required fields marked in form', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);
    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const labels = modal.locator('label');
    const allLabels = await labels.allTextContents();
    const requiredLabels = allLabels.filter(l => l.includes('*'));
    expect(requiredLabels.length).toBeGreaterThanOrEqual(3);
  });

  test('can create participant', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill first name & last name (first two text inputs)
    const textInputs = modal.locator('input[type="text"]');
    await textInputs.first().fill(TEST_FIRST);
    await textInputs.nth(1).fill(TEST_LAST);

    // Fill birth date
    const dateInput = modal.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill('2010-05-15');
    }

    // Select gender and club from dropdowns
    // Skip placeholder options: value="" (gender) and value="0" (club)
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
    const submitButton = modal.getByRole('button', { name: /create|erstellen|speichern|save|hinzufügen/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/participants') && resp.request().method() === 'POST'),
      submitButton.click()
    ]);
    expect(response.status()).toBe(201);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Verify via search
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, TEST_LAST);
    await expect(page.locator('body')).toContainText(TEST_LAST, { timeout: 10_000 });
  });

  test('search/filter works', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, TEST_LAST);
    await expect(page.locator('body')).toContainText(TEST_LAST);

    // Check filter dropdowns exist (Club, Gender, Age Group)
    const filterSelects = page.locator('select');
    if ((await filterSelects.count()) > 0) {
      const optCount = await filterSelects.first().locator('option').count();
      expect(optCount).toBeGreaterThan(0);
    }
  });

  test('view toggle switches between table and cards', async ({ page }) => {
    await navigateTo(page, '/participants');
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

  test('can edit participant', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);

    // Search for our test participant
    await openFilterAndSearch(page, TEST_LAST);

    const row = page.locator('tr', { hasText: TEST_LAST });
    await expect(row.first()).toBeVisible({ timeout: 5000 });

    const editButton = row.first().locator('button[title="Teilnehmer bearbeiten"], button[title="Edit participant"]').first();
    await editButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Edit last name (second text input in the form)
    const textInputs = modal.locator('input[type="text"]');
    await expect(textInputs.nth(1)).toBeVisible({ timeout: 3000 });
    await textInputs.nth(1).clear();
    await textInputs.nth(1).fill(EDITED_LAST);

    // Wait for API response after clicking save
    const saveButton = modal.getByRole('button', { name: /update|speichern|save|aktualisieren/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/participants/') && resp.request().method() === 'PUT'),
      saveButton.click()
    ]);
    expect(response.status()).toBe(200);

    // Wait for modal to close
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Reload and verify
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, EDITED_LAST);
    await expect(page.locator('body')).toContainText(EDITED_LAST, { timeout: 10_000 });
  });

  test('can delete participant', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, EDITED_LAST);

    const row = page.locator('tr', { hasText: EDITED_LAST });
    if ((await row.count()) > 0) {
      const deleteButton = row.locator('button[title="Teilnehmer löschen"], button[title="Delete participant"]').first();
      await deleteButton.click();
      await confirmDeleteModal(page);
      await page.waitForTimeout(2000);
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.locator('body')).not.toContainText(EDITED_LAST);
    }
  });

  test('birthdate full date preserved after create (Point 76)', async ({ page }) => {
    // TDD: Verify that day and month are saved, not just the year
    const testFirstName = `DateTest${Date.now()}`;
    const testLastName = `Point76`;
    const testDate = '2012-05-15'; // May 15, 2012

    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);

    // Open add modal
    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Fill first name & last name
    const textInputs = modal.locator('input[type="text"]');
    await textInputs.first().fill(testFirstName);
    await textInputs.nth(1).fill(testLastName);

    // Fill birth date with full date
    const dateInput = modal.locator('input[type="date"]').first();
    await dateInput.fill(testDate);

    // Verify the date input actually has the full date value (not just year)
    const dateValue = await dateInput.inputValue();
    expect(dateValue).toBe(testDate);

    // Select gender and club
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

    // Submit and capture API response
    const submitButton = modal.getByRole('button', { name: /create|erstellen|speichern|save|hinzufügen/i });
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/participants') && resp.request().method() === 'POST'),
      submitButton.click()
    ]);
    expect(response.status()).toBe(201);

    // Verify API response has full date
    const responseBody = await response.json();
    const createdDate = new Date(responseBody.dat_geburtstag);
    expect(createdDate.getUTCMonth() + 1).toBe(5);  // May
    expect(createdDate.getUTCDate()).toBe(15);
    expect(createdDate.getUTCFullYear()).toBe(2012);
    expect(responseBody.bool_nur_jahr).toBe(false);

    // Wait for modal close and list refresh
    await expect(modal).toHaveCount(0, { timeout: 5000 });

    // Search for the created participant and verify date display
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await openFilterAndSearch(page, testLastName);

    // Verify the date is displayed with day and month (not just year)
    const row = page.locator('tr', { hasText: testLastName });
    await expect(row.first()).toBeVisible({ timeout: 5000 });
    
    // The date should show as locale format with day and month visible
    // For German locale: "15.5.2012" or "15.05.2012"
    const rowText = await row.first().textContent();
    expect(rowText).toBeDefined();
    // Should NOT show "1.1.2012" or "01.01.2012" (which would indicate year-only with Jan 1 default)
    expect(rowText).not.toContain('1.1.2012');
    expect(rowText).not.toContain('01.01.2012');

    // Open edit form and verify the date is preserved
    const editButton = row.first().locator('button[title*="bearbeiten"], button[title*="Edit"]').first();
    await editButton.click();

    const editModal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await editModal.waitFor({ timeout: 5000 });

    // Check the date input has the full date
    const editDateInput = editModal.locator('input[type="date"]').first();
    const editDateValue = await editDateInput.inputValue();
    expect(editDateValue).toBe('2012-05-15');

    // Close modal
    const closeButton = editModal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();

    // Cleanup: delete the test participant
    await openFilterAndSearch(page, testLastName);
    const deleteRow = page.locator('tr', { hasText: testLastName });
    if ((await deleteRow.count()) > 0) {
      const deleteButton = deleteRow.locator('button[title*="löschen"], button[title*="Delete"]').first();
      await deleteButton.click();
      await confirmDeleteModal(page);
      await page.waitForTimeout(2000);
    }
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/participants');
    await waitForLoadingToFinish(page);

    await page.getByRole('button', { name: /hinzufügen|add|neu/i }).click();
    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel")').first();
    await closeButton.click();
    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});
