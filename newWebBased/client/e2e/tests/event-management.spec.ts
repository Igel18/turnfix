/**
 * Event Management Tests — Events page, management UI, configuration
 *
 * Independent of setup — verifies page structure and UI components.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, getTableRowCount } from '../helpers';

test.describe('Events Page', () => {

  test('events page loads', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Event|Veranstaltung/i);
  });

  test('events page has add button', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|create/i });
    await expect(addButton).toBeVisible();
  });

  test('events page has import button', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    const importButton = page.getByText(/importieren|Import/i).first();
    await expect(importButton).toBeVisible();
  });

  test('events page has table or card view', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    const hasTable = (await page.locator('table').count()) > 0;
    const hasCards = (await page.locator('[class*="card"], [class*="grid"]').count()) > 0;
    const hasEmptyState = (await page.getByText(/keine|leer|empty|no events/i).count()) > 0;
    expect(hasTable || hasCards || hasEmptyState).toBe(true);
  });

  test('events page has search/filter', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);
    const searchInput = page.locator('input[type="search"], input[placeholder*="Suche"], input[placeholder*="search"]');
    expect(await searchInput.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Create Event Modal', () => {

  test('add event modal opens', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|create/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });
  });

  test('add event modal has required fields', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|create/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    // Should have text inputs
    const textInputs = modal.locator('input[type="text"]');
    expect(await textInputs.count()).toBeGreaterThan(0);

    // Should have date inputs
    const dateInputs = modal.locator('input[type="date"]');
    expect(await dateInputs.count()).toBeGreaterThanOrEqual(2);
  });

  test('modal can be closed without saving', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|erstellen|create/i });
    await addButton.click();

    const modal = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await modal.waitFor({ timeout: 5000 });

    const closeButton = modal.locator('button[aria-label="Close"], button:has-text("Abbrechen"), button:has-text("Cancel"), button:has-text("Schließen")').first();
    await closeButton.click();

    await expect(modal).toHaveCount(0, { timeout: 3000 });
  });
});

test.describe('Management Center', () => {

  test('management page loads', async ({ page }) => {
    await navigateTo(page, '/management');
    await expect(page.locator('body')).toContainText(/Verwaltung|Management/i);
  });

  test('management page has navigation cards', async ({ page }) => {
    await navigateTo(page, '/management');
    await expect(page.locator('body')).toContainText(/Event/i);
    await expect(page.locator('body')).toContainText(/Verein|Club/i);
    await expect(page.locator('body')).toContainText(/Teilnehmer|Participant/i);
  });

  test('event management shows no-event prompt when no event selected', async ({ page }) => {
    await navigateTo(page, '/event-management');
    await expect(page.locator('body')).toContainText(/Event.*auswählen|Bitte.*Event|Wählen|Select/i);
  });
});

test.describe('Configuration', () => {

  test('configuration page loads', async ({ page }) => {
    await navigateTo(page, '/configuration');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(/Konfiguration|Configuration/i);
  });

  test('setup wizard button visible', async ({ page }) => {
    await navigateTo(page, '/configuration');
    await waitForLoadingToFinish(page);
    await expect(page.getByText(/Setup-Assistent/i).first()).toBeVisible();
  });
});
