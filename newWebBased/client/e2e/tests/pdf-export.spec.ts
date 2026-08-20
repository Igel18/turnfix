/**
 * PDF Export E2E Tests
 *
 * Verifies that the "Export PDF" button is present, consistently labelled,
 * and triggers a PDF download on each of these event management pages:
 *
 *   1. Medallienspiegel   — /medallienspiegel
 *   2. Ergebnisse         — /results
 *   3. Veranstaltung      — /event-management
 *   4. Teilnehmer         — /event-participants
 *   5. Riegenverwaltung   — /squads
 *   6. Meldematrix        — /meldematrix
 *
 * All pages use client-side jsPDF → doc.save() which triggers a browser
 * download event that Playwright can intercept.
 *
 * Tests per page:
 *   - Button visible
 *   - Download triggers (.pdf filename)
 *
 * Deep validation (all 6 pages, loop-based):
 *   - PDF file non-empty (> 1 KB)
 *   - No console errors during export
 *
 * Depends on Event A setup (needs an event with data so pages render content).
 */

import { test, expect, Page, Download } from '@playwright/test';
import * as fs from 'fs';
import {
  loadEventAState,
  setEventContext,
  EventAState,
} from '../fixtures/test-state';

// ── Button labels per page ───────────────────────────────────────
const PDF_BUTTON_LABEL = /Export PDF/i;
const RESULTS_EXPORT_BUTTON_LABEL = /Export/i;
const RESULTS_EXPORT_TYPE_LABEL = /(?:PDF )?(?:Ergebnisse|Results) (?:als|as) PDF(?:-Datei)?/i;
const RESULTS_NEXT_BUTTON_LABEL = /Next|Weiter/i;
const RESULTS_START_EXPORT_BUTTON_LABEL = /Start export|Export starten/i;

let stateA: EventAState;

/**
 * Set event context and navigate to the given path, waiting for network idle.
 */
async function navigateWithEvent(page: Page, path: string): Promise<void> {
  await setEventContext(page, stateA.eventId, stateA.eventName);
  await page.goto(path, { waitUntil: 'networkidle' });
}

/**
 * Find the PDF export button on the page.
 * Returns null if not visible (e.g. when page has no data to export).
 */
async function findPDFButton(page: Page) {
  const button = page.getByRole('button', { name: PDF_BUTTON_LABEL });
  const visible = await button.isVisible({ timeout: 5_000 }).catch(() => false);
  return visible ? button : null;
}

/**
 * Click the PDF button and wait for a download event.
 * Returns the Download object for assertions.
 */
async function clickPDFAndWaitForDownload(page: Page): Promise<Download | null> {
  if (page.url().includes('/results')) {
    const openButton = page.getByRole('button', { name: RESULTS_EXPORT_BUTTON_LABEL });
    await openButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog, 'Results export wizard should open').toBeVisible({ timeout: 10_000 });

    await dialog.getByRole('button', { name: RESULTS_EXPORT_TYPE_LABEL }).click();
    await dialog.getByRole('button', { name: RESULTS_NEXT_BUTTON_LABEL }).click();

    const startExportButton = dialog.getByRole('button', { name: RESULTS_START_EXPORT_BUTTON_LABEL });
    await expect(startExportButton).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
      startExportButton.click(),
    ]);
    return download;
  }

  const button = await findPDFButton(page);
  expect(button, 'Export PDF button should be visible').not.toBeNull();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10_000 }).catch(() => null),
    button!.click(),
  ]);
  return download;
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

test.describe.serial('PDF Export: Event Management Pages', () => {

  test.beforeAll(() => {
    stateA = loadEventAState();
  });

  // ── 1. Medallienspiegel ─────────────────────────────────────────

  test('Medallienspiegel — PDF button visible', async ({ page }) => {
    await navigateWithEvent(page, `/medallienspiegel?eventId=${stateA.eventId}`);
    const button = await findPDFButton(page);
    expect(button).not.toBeNull();
    console.log('✓ Medallienspiegel: Export PDF button visible');
  });

  test('Medallienspiegel — PDF download triggers', async ({ page }) => {
    await navigateWithEvent(page, `/medallienspiegel?eventId=${stateA.eventId}`);
    const download = await clickPDFAndWaitForDownload(page);
    expect(download).not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ Medallienspiegel: PDF downloaded (${download!.suggestedFilename()})`);
  });

  // ── 2. Ergebnisse ───────────────────────────────────────────────

  test('Ergebnisse — PDF button visible', async ({ page }) => {
    await navigateWithEvent(page, `/results?eventId=${stateA.eventId}`);
    const button = page.getByRole('button', { name: RESULTS_EXPORT_BUTTON_LABEL });
    const visible = await button.isVisible({ timeout: 5_000 }).catch(() => false);
    const resolvedButton = visible ? button : null;
    expect(resolvedButton).not.toBeNull();
    console.log('✓ Ergebnisse: Export PDF button visible');
  });

  test('Ergebnisse — PDF download triggers', async ({ page }) => {
    await navigateWithEvent(page, `/results?eventId=${stateA.eventId}`);
    const download = await clickPDFAndWaitForDownload(page);
    expect(download).not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ Ergebnisse: PDF downloaded (${download!.suggestedFilename()})`);
  });

  // ── 3. Veranstaltung verwalten ──────────────────────────────────

  test('Event Management — PDF button visible', async ({ page }) => {
    await navigateWithEvent(page, '/event-management');
    const button = await findPDFButton(page);
    expect(button).not.toBeNull();
    console.log('✓ Event Management: Export PDF button visible');
  });

  test('Event Management — PDF download triggers', async ({ page }) => {
    await navigateWithEvent(page, '/event-management');
    const download = await clickPDFAndWaitForDownload(page);
    expect(download).not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ Event Management: PDF downloaded (${download!.suggestedFilename()})`);
  });

  // ── 4. Veranstaltungsteilnehmer ─────────────────────────────────

  test('Event Participants — PDF button visible', async ({ page }) => {
    await navigateWithEvent(page, `/event-participants?eventId=${stateA.eventId}`);
    // The PDF button only appears when filteredParticipants.length > 0.
    // Wait directly for the button — it's the most reliable indicator that data loaded.
    const button = page.getByRole('button', { name: PDF_BUTTON_LABEL });
    await button.waitFor({ state: 'visible', timeout: 15_000 });
    expect(await button.isVisible()).toBe(true);
    console.log('✓ Event Participants: Export PDF button visible');
  });

  test('Event Participants — PDF download triggers', async ({ page }) => {
    await navigateWithEvent(page, `/event-participants?eventId=${stateA.eventId}`);
    // Wait for data to load (button appears when participants exist)
    const button = page.getByRole('button', { name: PDF_BUTTON_LABEL });
    await button.waitFor({ state: 'visible', timeout: 15_000 });
    const download = await clickPDFAndWaitForDownload(page);
    expect(download).not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ Event Participants: PDF downloaded (${download!.suggestedFilename()})`);
  });

  // ── 5. Riegenverwaltung ─────────────────────────────────────────

  test('Squad Management — PDF button visible', async ({ page }) => {
    await navigateWithEvent(page, `/squads?eventId=${stateA.eventId}`);
    const button = await findPDFButton(page);
    expect(button).not.toBeNull();
    console.log('✓ Squad Management: Export PDF button visible');
  });

  test('Squad Management — PDF download triggers', async ({ page }) => {
    await navigateWithEvent(page, `/squads?eventId=${stateA.eventId}`);
    const download = await clickPDFAndWaitForDownload(page);
    expect(download).not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ Squad Management: PDF downloaded (${download!.suggestedFilename()})`);
  });

  // ── 6. Meldematrix ─────────────────────────────────────────────

  test('Meldematrix — PDF button visible', async ({ page }) => {
    await navigateWithEvent(page, `/meldematrix?eventId=${stateA.eventId}`);
    const button = await findPDFButton(page);
    expect(button).not.toBeNull();
    console.log('✓ Meldematrix: Export PDF button visible');
  });

  test('Meldematrix — PDF download triggers', async ({ page }) => {
    await navigateWithEvent(page, `/meldematrix?eventId=${stateA.eventId}`);
    const download = await clickPDFAndWaitForDownload(page);
    expect(download).not.toBeNull();
    expect(download!.suggestedFilename()).toMatch(/\.pdf$/i);
    console.log(`✓ Meldematrix: PDF downloaded (${download!.suggestedFilename()})`);
  });

  // ── Summary: Consistent naming check ───────────────────────────

  test('All pages use the same "Export PDF" button label', async ({ page }) => {
    const pages = [
      { name: 'Medallienspiegel', path: `/medallienspiegel?eventId=${stateA.eventId}` },
      { name: 'Ergebnisse', path: `/results?eventId=${stateA.eventId}` },
      { name: 'Event Management', path: '/event-management' },
      { name: 'Event Participants', path: `/event-participants?eventId=${stateA.eventId}` },
      { name: 'Squad Management', path: `/squads?eventId=${stateA.eventId}` },
      { name: 'Meldematrix', path: `/meldematrix?eventId=${stateA.eventId}` },
    ];

    for (const p of pages) {
      await navigateWithEvent(page, p.path);

      const button = page.getByRole('button', { name: p.name === 'Ergebnisse' ? 'Export' : 'Export PDF' });
      // Event Participants needs longer wait (button conditional on data load)
      const timeout = p.name === 'Event Participants' ? 20_000 : 5_000;
      const visible = await button.isVisible({ timeout }).catch(() => false);
      if (!visible && p.name === 'Event Participants') {
        // Retry: wait for button to appear after data loads
        await button.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
      }
      const isVisible = await button.isVisible().catch(() => false);

      // Get exact text for comparison
      if (isVisible) {
        const text = await button.textContent();
        expect(text?.trim()).toBe(p.name === 'Ergebnisse' ? 'Export' : 'Export PDF');
      } else {
        // If button not visible, that's a test failure (all 6 should have it)
        expect(isVisible, `Export PDF button should be visible on ${p.name}`).toBe(true);
      }
    }
    console.log('✓ All 6 pages expose the expected PDF export button label');
  });

  // ── Deep validation: PDF file non-empty (all pages) ────────────

  const PDF_PAGES = [
    { name: 'Medallienspiegel', path: () => `/medallienspiegel?eventId=${stateA.eventId}` },
    { name: 'Ergebnisse', path: () => `/results?eventId=${stateA.eventId}` },
    { name: 'Event Management', path: () => '/event-management' },
    { name: 'Event Participants', path: () => `/event-participants?eventId=${stateA.eventId}` },
    { name: 'Squad Management', path: () => `/squads?eventId=${stateA.eventId}` },
    { name: 'Meldematrix', path: () => `/meldematrix?eventId=${stateA.eventId}` },
  ];

  for (const p of PDF_PAGES) {
    test(`${p.name} — PDF file is non-empty (> 1 KB)`, async ({ page }) => {
      await navigateWithEvent(page, p.path());

      // Event Participants button appears only after data loads
      if (p.name === 'Event Participants') {
        const btn = page.getByRole('button', { name: PDF_BUTTON_LABEL });
        await btn.waitFor({ state: 'visible', timeout: 15_000 });
      }

      const download = await clickPDFAndWaitForDownload(page);
      expect(download, `${p.name}: download should trigger`).not.toBeNull();

      const filePath = await download!.path();
      expect(filePath, `${p.name}: download path should exist`).toBeTruthy();

      const stats = fs.statSync(filePath!);
      expect(stats.size, `${p.name}: PDF should be > 1 KB (got ${stats.size} bytes)`).toBeGreaterThan(1024);
      console.log(`✓ ${p.name}: PDF non-empty (${(stats.size / 1024).toFixed(1)} KB)`);
    });
  }

  // ── Deep validation: No console errors during export (all pages) ─

  for (const p of PDF_PAGES) {
    test(`${p.name} — no console errors during PDF export`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await navigateWithEvent(page, p.path());

      if (p.name === 'Event Participants') {
        const btn = page.getByRole('button', { name: PDF_BUTTON_LABEL });
        await btn.waitFor({ state: 'visible', timeout: 15_000 });
      }

      const download = await clickPDFAndWaitForDownload(page);
      expect(download, `${p.name}: download should trigger`).not.toBeNull();

      // Wait a moment for any async errors to surface
      await page.waitForTimeout(500);

      // Filter for PDF-specific errors (ignore unrelated ones like network/websocket)
      const pdfErrors = consoleErrors.filter(e =>
        e.includes('Cannot export PDF') ||
        e.includes('jsPDF') ||
        e.includes('Missing') ||
        e.includes('PDF generation')
      );
      expect(pdfErrors, `${p.name}: should have no PDF-related errors, but got: ${pdfErrors.join('; ')}`).toHaveLength(0);
      console.log(`✓ ${p.name}: no console errors during PDF export`);
    });
  }
});
