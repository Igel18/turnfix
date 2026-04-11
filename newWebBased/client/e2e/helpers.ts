import { Page, expect } from '@playwright/test';

/**
 * E2E Test Helpers for TurnFix
 * 
 * Shared utilities for Playwright E2E tests.
 * Auth is disabled — all pages are accessible without login.
 */

// ─── Navigation Helpers ────────────────────────────────────────────

/**
 * Robust page.goto with automatic retry on transient network errors.
 * Uses 'load' instead of 'networkidle' to avoid flaky timeouts
 * caused by WebSockets, long-polling, or slow background API calls.
 * ('load' waits for all scripts/CSS, so React is ready to mount.)
 *
 * Retries up to {@link maxRetries} times on ERR_NETWORK_CHANGED,
 * ERR_CONNECTION_REFUSED, timeouts, and similar transient failures.
 */
export async function robustGoto(
  page: Page,
  url: string,
  options?: { maxRetries?: number; waitUntil?: 'domcontentloaded' | 'load' | 'commit' },
) {
  const maxRetries = options?.maxRetries ?? 2;
  const waitUntil = options?.waitUntil ?? 'load';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil });
      return; // success
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isTransient =
        msg.includes('ERR_NETWORK_CHANGED') ||
        msg.includes('ERR_CONNECTION_REFUSED') ||
        msg.includes('ERR_CONNECTION_RESET') ||
        msg.includes('ERR_INTERNET_DISCONNECTED') ||
        msg.includes('Timeout') ||
        msg.includes('timeout');

      if (isTransient && attempt < maxRetries) {
        // Brief pause before retry
        await page.waitForTimeout(1_000);
        continue;
      }
      throw err; // non-transient or exhausted retries
    }
  }
}

/**
 * Navigate to a page and wait for it to be fully loaded.
 * Uses 'load' instead of 'networkidle' for reliability.
 * Automatically retries on transient network errors.
 */
export async function navigateTo(page: Page, path: string) {
  await robustGoto(page, path);
}

/**
 * Navigate to a page and wait for a specific text to appear on the page.
 * More reliable than networkidle for pages with streaming data.
 */
export async function navigateAndWaitFor(page: Page, path: string, text: string) {
  await robustGoto(page, path);
  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
}

/**
 * Robust page.reload with automatic retry on transient network errors.
 */
export async function robustReload(page: Page) {
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await page.reload({ waitUntil: 'load' });
      return;
    } catch (err: any) {
      const msg: string = err?.message ?? '';
      const isTransient =
        msg.includes('ERR_NETWORK_CHANGED') ||
        msg.includes('ERR_CONNECTION_REFUSED') ||
        msg.includes('Timeout');
      if (isTransient && attempt < 2) {
        await page.waitForTimeout(1_000);
        continue;
      }
      throw err;
    }
  }
}

// ─── Page Header Helpers ───────────────────────────────────────────

/**
 * Get the page title from the UnifiedPageHeader.
 */
export async function getPageTitle(page: Page): Promise<string> {
  // The page title is typically the first h1 or h2
  const heading = page.locator('h1, h2').first();
  return heading.textContent() ?? '';
}

/**
 * Assert the page has the expected title.
 */
export async function expectPageTitle(page: Page, expectedTitle: string | RegExp) {
  const heading = page.locator('h1, h2').first();
  if (typeof expectedTitle === 'string') {
    await expect(heading).toContainText(expectedTitle);
  } else {
    await expect(heading).toHaveText(expectedTitle);
  }
}

// ─── Table Helpers ─────────────────────────────────────────────────

/**
 * Get the number of data rows in a table (excluding header).
 */
export async function getTableRowCount(page: Page): Promise<number> {
  // Wait for table to appear
  await page.locator('table tbody tr').first().waitFor({ timeout: 10_000 });
  return page.locator('table tbody tr').count();
}

/**
 * Check if a table contains a specific text in any cell.
 */
export async function tableContainsText(page: Page, text: string): Promise<boolean> {
  const cell = page.locator('table tbody td', { hasText: text });
  return (await cell.count()) > 0;
}

/**
 * Get all text values from a specific table column (0-based index).
 */
export async function getColumnValues(page: Page, columnIndex: number): Promise<string[]> {
  const cells = page.locator(`table tbody tr td:nth-child(${columnIndex + 1})`);
  return cells.allTextContents();
}

// ─── Dialog Helpers ────────────────────────────────────────────────

/**
 * Wait for a dialog/modal to appear.
 */
export async function waitForDialog(page: Page) {
  await page.locator('[role="dialog"], [data-state="open"]').first().waitFor({ timeout: 5_000 });
}

/**
 * Close the currently open dialog by clicking the X button or cancel.
 */
export async function closeDialog(page: Page) {
  // Try close/X button first
  const closeButton = page.locator('[role="dialog"] button[aria-label*="close"], [role="dialog"] button:has(svg)').first();
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}

/**
 * Confirm the UnifiedConfirmModal (replaces native window.confirm).
 * Waits for the styled React confirm modal to appear and clicks the
 * danger/confirm button ("Löschen" / "Delete").
 *
 * Usage: call AFTER clicking the delete button, before waitForTimeout.
 */
export async function confirmDeleteModal(page: Page) {
  // The modal has title "Löschen bestätigen" (de) / "Confirm Delete" (en)
  const modal = page.locator('.fixed.inset-0, [role="dialog"]').filter({
    hasText: /Löschen bestätigen|Confirm Delete/
  }).first();
  await modal.waitFor({ timeout: 5_000 });
  // Click the danger confirm button
  const confirmBtn = modal.getByRole('button', { name: /^Löschen$|^Delete$/ }).first();
  await confirmBtn.click();
}

// ─── Filter Helpers ────────────────────────────────────────────────

/**
 * Open the filter panel (if closed) and fill the search input.
 * The search input is hidden behind the "Filter" toggle button
 * in DatabaseManagementTemplate / UnifiedPageHeader.
 */
export async function openFilterAndSearch(page: Page, searchText: string) {
  // Check if the search input is already visible
  let searchInput = page.locator('input[type="text"], input[type="search"]').first();
  if (!(await searchInput.isVisible({ timeout: 500 }).catch(() => false))) {
    // Open filter panel
    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    if (await filterButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await filterButton.click();
      await page.waitForTimeout(500);
    }
  }
  searchInput = page.locator('input[type="text"], input[type="search"]').first();
  if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    await searchInput.fill(searchText);
    await page.waitForTimeout(1000);
  }
}

/**
 * Type into a search/filter input field.
 */
export async function searchFor(page: Page, searchText: string) {
  // Look for search input by placeholder or role
  const searchInput = page.locator('input[type="search"], input[placeholder*="Suche"], input[placeholder*="search"], input[placeholder*="Filter"]').first();
  await searchInput.fill(searchText);
  // Small delay for debounced search
  await page.waitForTimeout(500);
}

/**
 * Click the reset/clear filters button.
 */
export async function resetFilters(page: Page) {
  const resetButton = page.getByRole('button', { name: /reset|zurücksetzen|clear/i });
  if (await resetButton.isVisible()) {
    await resetButton.click();
    await page.waitForTimeout(300);
  }
}

// ─── Loading Helpers ───────────────────────────────────────────────

/**
 * Wait for any loading spinners/skeletons to disappear.
 */
export async function waitForLoadingToFinish(page: Page) {
  // Wait for loading indicators to disappear
  await page.locator('.animate-spin, .animate-pulse, [data-loading="true"]').first().waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {
    // No loading indicator found — page loaded instantly
  });
}

/**
 * Wait for the page to have no active network requests.
 * Falls back gracefully if network never becomes idle (e.g. WebSocket).
 */
export async function waitForNetworkIdle(page: Page, timeout = 5_000) {
  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle may never fire if there are persistent connections — that's OK
  });
}

// ─── Assertion Helpers ─────────────────────────────────────────────

/**
 * Assert that a toast/notification message appeared.
 */
export async function expectToast(page: Page, message: string | RegExp) {
  const toast = page.locator('[role="status"], .toast, [data-sonner-toast]', {
    hasText: typeof message === 'string' ? message : undefined
  }).first();
  await expect(toast).toBeVisible({ timeout: 5_000 });
}

/**
 * Assert that the page has no console errors.
 * Call this at the beginning of a test to start collecting.
 */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

// ─── Action Helpers ────────────────────────────────────────────────

/**
 * Click a button by its text content.
 */
export async function clickButton(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name }).click();
}

/**
 * Click the "Add" / "Hinzufügen" button (common across pages).
 * Uses .first() to avoid strict mode violations when empty state shows a duplicate add button.
 */
export async function clickAddButton(page: Page) {
  const addButton = page.getByRole('button', { name: /hinzufügen|add|neu|new/i }).first();
  await addButton.click();
}

/**
 * Click an edit button in a specific table row.
 */
export async function clickEditInRow(page: Page, rowText: string) {
  const row = page.locator('table tbody tr', { hasText: rowText });
  await row.getByRole('button', { name: /bearbeiten|edit|ändern/i }).first().click();
}

/**
 * Click a delete button in a specific table row.
 */
export async function clickDeleteInRow(page: Page, rowText: string) {
  const row = page.locator('table tbody tr', { hasText: rowText });
  await row.getByRole('button', { name: /löschen|delete|entfernen/i }).first().click();
}
