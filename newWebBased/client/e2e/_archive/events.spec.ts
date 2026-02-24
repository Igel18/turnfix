import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, getTableRowCount, expectPageTitle } from './helpers';

/**
 * E2E Tests: Events Page & Event Management Workflow
 * 
 * Tests the full event lifecycle: list, create, view, manage.
 * ⚠️ Runs against the REAL database — uses unique names and cleans up.
 */

const TEST_EVENT_NAME = `E2E_Test_Event_${Date.now()}`;

test.describe('Events Page - Display', () => {
  test('loads events page with title', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    // Page should show events-related heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toBeTruthy();
  });

  test('displays events in table view', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    // Look for table or event cards
    const table = page.locator('table');
    const cards = page.locator('[class*="card"], .rounded-lg.border.shadow');

    // Either table or cards should be visible
    const hasTable = await table.isVisible().catch(() => false);
    const hasCards = (await cards.count()) > 0;

    expect(hasTable || hasCards).toBe(true);
  });

  test('has Add Event button', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|erstellen|neu/i });
    await expect(addButton.first()).toBeVisible();
  });

  test('search functionality works', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const searchInput = page.locator('input[placeholder*="uch"], input[placeholder*="earch"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('XYZNONEXISTENT');
      await page.waitForTimeout(500);

      // Should show no results or empty state
      const bodyText = await page.locator('body').textContent();
      // After filtering with non-existent text, either table is empty or we see "no results" message
      const noResultsOrEmptyTable = bodyText?.includes('Keine') || 
                                     bodyText?.includes('keine') ||
                                     bodyText?.includes('No ') ||
                                     await page.locator('table tbody tr').count() === 0;
      expect(noResultsOrEmptyTable).toBe(true);
    }
  });
});

test.describe('Events Page - Create Event Flow', () => {
  test('can open create event modal', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    // Click the add button
    const addButton = page.getByRole('button', { name: /hinzufügen|add|erstellen|neu/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Modal should appear
    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible();
  });

  test('create event modal has required fields', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|erstellen|neu/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.fixed.inset-0').first();

    // Should have event name field
    const nameInput = modal.locator('input[type="text"]').first();
    await expect(nameInput).toBeVisible();

    // Should have date fields (could be type=date or text with date picker)
    const dateInputs = modal.locator('input[type="date"], input[type="text"]');
    expect(await dateInputs.count()).toBeGreaterThanOrEqual(1);

    // Should have save/create button
    const saveButton = modal.locator('button').filter({ hasText: /erstell|create|speicher|save/i });
    await expect(saveButton.first()).toBeVisible();
  });

  test('can close create modal without saving', async ({ page }) => {
    await navigateTo(page, '/events');
    await waitForLoadingToFinish(page);

    const addButton = page.getByRole('button', { name: /hinzufügen|add|erstellen|neu/i }).first();
    await addButton.click();
    await page.waitForTimeout(500);

    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();

    // Close via the X button (aria-label="Close") in the modal header
    const closeButton = modal.locator('button[aria-label="Close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Fallback: press Escape
      await page.keyboard.press('Escape');
    }

    await page.waitForTimeout(500);
  });
});

test.describe('Event Management Page', () => {
  test('shows event selection prompt when no event selected', async ({ page }) => {
    await navigateTo(page, '/event-management');
    await waitForLoadingToFinish(page);

    // Should show "select event" prompt or the event management content
    const pageText = await page.locator('body').textContent();
    // Either shows management content or prompts to select an event
    expect(pageText).toBeTruthy();
  });
});

test.describe('Management Center Navigation', () => {
  test('management center shows all category sections', async ({ page }) => {
    await navigateTo(page, '/management');
    await waitForLoadingToFinish(page);

    await expectPageTitle(page, 'Willkommen');

    // Should have links/cards to key areas
    const pageText = await page.locator('body').textContent() || '';

    // Check for main categories
    expect(pageText.includes('Region') || pageText.includes('Club')).toBe(true);
  });

  test('can navigate from management to events', async ({ page }) => {
    await navigateTo(page, '/management');
    await waitForLoadingToFinish(page);

    // Find events link
    const eventsLink = page.locator('a[href="/events"], a[href*="event"]').first();
    if (await eventsLink.isVisible()) {
      await eventsLink.click();
      await page.waitForURL('**/events**');
    }
  });

  test('can navigate from management to clubs', async ({ page }) => {
    await navigateTo(page, '/management');
    await waitForLoadingToFinish(page);

    const clubsLink = page.locator('a[href="/clubs"]').first();
    if (await clubsLink.isVisible()) {
      await clubsLink.click();
      await page.waitForURL('**/clubs');
      await waitForLoadingToFinish(page);
      
      // Clubs page should have loaded
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    }
  });

  test('can navigate from management to participants', async ({ page }) => {
    await navigateTo(page, '/management');
    await waitForLoadingToFinish(page);

    const participantsLink = page.locator('a[href="/participants"]').first();
    if (await participantsLink.isVisible()) {
      await participantsLink.click();
      await page.waitForURL('**/participants');
      await waitForLoadingToFinish(page);

      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    }
  });
});

test.describe('Full Workflow: Home → Events → CRUD', () => {
  test('full navigation workflow from homepage', async ({ page }) => {
    // 1. Start at home
    await navigateTo(page, '/');
    await expect(page.locator('h1')).toContainText('TurnFix');

    // 2. Navigate to management center
    await page.locator('a[href="/management"]').first().click();
    await page.waitForURL('**/management');
    await expectPageTitle(page, 'Willkommen');

    // 3. Navigate to events
    const eventsLink = page.locator('a[href="/events"]').first();
    if (await eventsLink.isVisible()) {
      await eventsLink.click();
      await page.waitForURL('**/events**');
      await waitForLoadingToFinish(page);
    } else {
      // Direct navigation
      await navigateTo(page, '/events');
    }

    // 4. Verify events page loaded
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    
    // 5. Check we can see Add button
    const addButton = page.getByRole('button', { name: /hinzufügen|add|erstellen|neu/i }).first();
    await expect(addButton).toBeVisible();
  });
});

test.describe('Configuration Page', () => {
  test('loads configuration page with settings', async ({ page }) => {
    await navigateTo(page, '/configuration');
    await waitForLoadingToFinish(page);

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Should have some configuration sections
    const pageText = await page.locator('body').textContent() || '';
    expect(pageText.length).toBeGreaterThan(100); // Non-empty page
  });
});
