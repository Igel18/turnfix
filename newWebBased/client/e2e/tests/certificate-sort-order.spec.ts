/**
 * Certificate Sort Order E2E Tests
 *
 * Feature: When printing certificates from the Results page, the user can
 * choose whether the PDF should be ordered:
 *
 *   - desc (default): last place first, 1st place last
 *     → When the printer delivers the stack the winner is on top.
 *   - asc:            1st place first, last place last
 *
 * Tests:
 *   1. "Urkunden-PDF generieren" button opens certificate dialog
 *   2. Dialog shows sort order toggle ("Reihenfolge im PDF")
 *   3. Default selection is "Letzter Platz zuerst" (desc)
 *   4. Clicking "1. Platz zuerst" activates that button
 *   5. Clicking back to "Letzter Platz zuerst" switches back
 *   6. With desc order selected → PDF download triggers successfully
 *   7. With asc order selected → PDF download triggers successfully
 *
 * Depends on: Event A (setup/create-event) with at least one competition
 * that has participants and scores.
 */

import { test, expect, Page } from '@playwright/test';
import { loadEventAState, setEventContext, EventAState } from '../fixtures/test-state';

let state: EventAState;

test.beforeAll(() => {
  state = loadEventAState();
});

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Navigate to the Results page with Event A context. */
async function goToResults(page: Page): Promise<void> {
  await setEventContext(page, state.eventId, state.eventName);
  await page.goto(`/results?eventId=${state.eventId}`, { waitUntil: 'networkidle' });
  // Wait for ranking data to load
  await page.waitForTimeout(1500);
}

/**
 * Find & click the "Urkunden-PDF generieren" button in the page header.
 * Returns once the certificate dialog is open.
 */
async function openCertificateDialog(page: Page): Promise<void> {
  const printBtn = page.getByRole('button', { name: /Urkunden/i });
  await printBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await printBtn.click();

  // Dialog must be visible
  const dialog = page.getByRole('dialog');
  await dialog.waitFor({ state: 'visible', timeout: 8_000 });
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

test.describe.serial('Certificate Sort Order Dialog', () => {

  // ── 1. Dialog opens ─────────────────────────────────────────────────────────

  test('Print-certificates button opens the certificate dialog', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    console.log('✓ Certificate dialog opened successfully');
  });

  // ── 2. Sort order section visible ───────────────────────────────────────────

  test('Dialog contains "Reihenfolge im PDF" sort order section', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    const label = page.getByText(/Reihenfolge im PDF/i);
    await expect(label).toBeVisible();
    console.log('✓ Sort order label is visible');
  });

  test('Dialog shows both sort order buttons', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    const descBtn = page.getByRole('button', { name: /Letzter Platz zuerst/i });
    const ascBtn = page.getByRole('button', { name: /1\. Platz zuerst/i });

    await expect(descBtn).toBeVisible();
    await expect(ascBtn).toBeVisible();
    console.log('✓ Both sort order buttons are visible');
  });

  // ── 3. Default is desc ──────────────────────────────────────────────────────

  test('Default sort order button is "Letzter Platz zuerst" (desc)', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    // The active button has the purple styling (bg-purple-100 border-purple-500)
    const descBtn = page.getByRole('button', { name: /Letzter Platz zuerst/i });
    const ascBtn  = page.getByRole('button', { name: /1\. Platz zuerst/i });

    // desc button should be active (purple border)
    await expect(descBtn).toHaveClass(/border-purple-500/);
    // asc button should NOT be active
    await expect(ascBtn).not.toHaveClass(/border-purple-500/);
    console.log('✓ Default sort order is desc (Letzter Platz zuerst)');
  });

  // ── 4. Switching to asc ─────────────────────────────────────────────────────

  test('Clicking "1. Platz zuerst" activates ascending order', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    const ascBtn  = page.getByRole('button', { name: /1\. Platz zuerst/i });
    const descBtn = page.getByRole('button', { name: /Letzter Platz zuerst/i });

    await ascBtn.click();

    await expect(ascBtn).toHaveClass(/border-purple-500/);
    await expect(descBtn).not.toHaveClass(/border-purple-500/);
    console.log('✓ Ascending order selected');
  });

  // ── 5. Switching back to desc ───────────────────────────────────────────────

  test('Switching to asc and back to desc works correctly', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    const ascBtn  = page.getByRole('button', { name: /1\. Platz zuerst/i });
    const descBtn = page.getByRole('button', { name: /Letzter Platz zuerst/i });

    // Switch to asc
    await ascBtn.click();
    await expect(ascBtn).toHaveClass(/border-purple-500/);

    // Switch back to desc
    await descBtn.click();
    await expect(descBtn).toHaveClass(/border-purple-500/);
    await expect(ascBtn).not.toHaveClass(/border-purple-500/);
    console.log('✓ Switching back to desc works');
  });

  // ── 6. PDF download (desc, default) ─────────────────────────────────────────

  test('PDF download triggers with desc sort order selected', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    // Select a layout (pick the first available one)
    const layoutSelect = page.locator('select').first();
    const options = await layoutSelect.locator('option').all();
    // Skip the empty placeholder option
    const realOptions = options.filter(async (o) => (await o.getAttribute('value')) !== '');
    if (realOptions.length === 0) {
      test.skip(); // No layouts configured, skip gracefully
      return;
    }
    const firstOptionValue = await realOptions[0].getAttribute('value');
    if (!firstOptionValue) { test.skip(); return; }
    await layoutSelect.selectOption(firstOptionValue);

    // Ensure desc is selected (default)
    const descBtn = page.getByRole('button', { name: /Letzter Platz zuerst/i });
    await expect(descBtn).toHaveClass(/border-purple-500/);

    // Click "PDF generieren" and wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: /PDF generieren/i }).click(),
    ]);

    expect(download).not.toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ PDF downloaded (desc): ${download.suggestedFilename()}`);
  });

  // ── 7. PDF download (asc) ────────────────────────────────────────────────────

  test('PDF download triggers with asc sort order selected', async ({ page }) => {
    await goToResults(page);
    await openCertificateDialog(page);

    // Select a layout
    const layoutSelect = page.locator('select').first();
    const options = await layoutSelect.locator('option').all();
    const realOptions = options.filter(async (o) => (await o.getAttribute('value')) !== '');
    if (realOptions.length === 0) { test.skip(); return; }
    const firstOptionValue = await realOptions[0].getAttribute('value');
    if (!firstOptionValue) { test.skip(); return; }
    await layoutSelect.selectOption(firstOptionValue);

    // Switch to asc
    const ascBtn = page.getByRole('button', { name: /1\. Platz zuerst/i });
    await ascBtn.click();
    await expect(ascBtn).toHaveClass(/border-purple-500/);

    // Click "PDF generieren" and wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      page.getByRole('button', { name: /PDF generieren/i }).click(),
    ]);

    expect(download).not.toBeNull();
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ PDF downloaded (asc): ${download.suggestedFilename()}`);
  });
});
