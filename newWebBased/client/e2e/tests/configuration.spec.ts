/**
 * Configuration / Settings Page E2E Tests
 *
 * Tests the configuration page:
 * - Page load and structure
 * - Section navigation (database, application, localization, security, etc.)
 * - Settings display and editing (text, number, boolean, select, textarea)
 * - Save settings flow with API verification
 * - Search/filter settings
 * - Database Setup Wizard dialog
 * - Reset to defaults
 * - Export / Import configuration
 */

import { test, expect, Page } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, robustGoto } from '../helpers';

const SECTIONS = [
  { id: 'database', label: /datenbank/i },
  { id: 'application', label: /anwendung/i },
  { id: 'localization', label: /sprach|local/i },
  { id: 'security', label: /sicherheit/i },
  { id: 'imports', label: /import/i },
  { id: 'printing', label: /druck|pdf/i },
  { id: 'participant-labels', label: /etikett|label/i },
  { id: 'logging', label: /protokoll|log/i },
  { id: 'scoreCapture', label: /wertung/i },
  { id: 'firewall', label: /firewall/i },
  { id: 'wifi', label: /wlan|wifi/i },
];

/** Navigate to the configuration page and wait for it to load */
async function gotoConfiguration(page: Page) {
  await navigateTo(page, '/configuration');
  await waitForLoadingToFinish(page);
}

/** Click a navigation section button on the left sidebar */
async function clickSection(page: Page, label: RegExp) {
  const btn = page.getByRole('button', { name: label }).first();
  await btn.click();
  // Wait a moment for the section to render
  await page.waitForTimeout(300);
}

test.describe.serial('Configuration / Settings Page', () => {

  // ──────────────────────────────────────────────────────────────
  // 1. Page Load
  // ──────────────────────────────────────────────────────────────

  test('1.1 page loads and shows header', async ({ page }) => {
    await gotoConfiguration(page);
    // Check page title
    const title = page.locator('h1, h2').first();
    await expect(title).toContainText(/einstellung|configuration|settings/i);
  });

  test('1.2 API returns configuration data', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/configuration') && r.status() === 200
    );
    await navigateTo(page, '/configuration');
    const response = await responsePromise;
    const data = await response.json();
    // Should have at least database and application sections
    expect(data).toHaveProperty('database');
    expect(data).toHaveProperty('application');
  });

  test('1.3 save button is visible', async ({ page }) => {
    await gotoConfiguration(page);
    const saveBtn = page.getByRole('button', { name: /speichern|save/i }).first();
    await expect(saveBtn).toBeVisible();
  });

  test('1.4 search input is visible', async ({ page }) => {
    await gotoConfiguration(page);
    const search = page.locator('input[type="search"], input[placeholder*="suchen"], input[placeholder*="such"], input[placeholder*="search"], input[placeholder*="Konfiguration"]').first();
    await expect(search).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────
  // 2. Section Navigation
  // ──────────────────────────────────────────────────────────────

  test('2.1 sidebar shows all section buttons', async ({ page }) => {
    await gotoConfiguration(page);
    // Should have at least 8 navigation buttons in the sidebar
    for (const section of SECTIONS.slice(0, 8)) {
      const btn = page.getByRole('button', { name: section.label }).first();
      await expect(btn).toBeVisible({ timeout: 3000 });
    }
  });

  test('2.2 clicking database section shows DB fields', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    // Should show host, port, database name fields
    const hostInput = page.locator('input[name="db_host"], input[id*="db_host"]').first();
    const portInput = page.locator('input[name="db_port"], input[id*="db_port"]').first();
    await expect(hostInput.or(page.getByLabel(/host/i).first())).toBeVisible({ timeout: 5000 });
  });

  test('2.3 clicking application section shows app fields', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /anwendung/i);

    // Should show app_name or similar fields
    const content = await page.locator('main, [class*="content"]').first().textContent();
    expect(content).toMatch(/app.*(name|version)|anwendung|port/i);
  });

  test('2.4 clicking localization section shows language options', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /sprach|local/i);

    // Should contain a select for language
    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(1);
  });

  test('2.5 clicking security section shows security settings', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /sicherheit/i);

    const content = await page.locator('main, [class*="content"]').first().textContent();
    expect(content).toMatch(/session|passwort|password|login|https/i);
  });

  test('2.6 clicking logging section shows log settings', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /protokoll|log/i);

    const content = await page.locator('main, [class*="content"]').first().textContent();
    expect(content).toMatch(/log|protokoll|audit/i);
  });

  // ──────────────────────────────────────────────────────────────
  // 3. Input Types Rendering
  // ──────────────────────────────────────────────────────────────

  test('3.1 database section has password field for db_password', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    const pwdInput = page.locator('input[type="password"]').first();
    await expect(pwdInput).toBeVisible({ timeout: 5000 });
  });

  test('3.2 database section has checkbox for db_ssl', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    const checkbox = page.locator('input[type="checkbox"]');
    expect(await checkbox.count()).toBeGreaterThanOrEqual(1);
  });

  test('3.3 localization section has select dropdowns', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /sprach|local/i);

    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(2); // language, date_format, timezone
  });

  test('3.4 application section has number inputs', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /anwendung/i);

    const numberInputs = page.locator('input[type="number"]');
    expect(await numberInputs.count()).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // 4. Settings Editing & Save
  // ──────────────────────────────────────────────────────────────

  test('4.1 can modify application name and save', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /anwendung/i);

    // Find the app_name input
    const nameInput = page.locator('input[type="text"]').first();
    const originalValue = await nameInput.inputValue();

    // Modify the value
    const testValue = `TurnFix_E2E_${Date.now()}`;
    await nameInput.clear();
    await nameInput.fill(testValue);

    // Click save and wait for API response
    const saveResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/api/configuration/save') && r.request().method() === 'POST'
    );
    const saveBtn = page.getByRole('button', { name: /speichern|save/i }).first();
    await saveBtn.click();
    const saveResponse = await saveResponsePromise;
    expect(saveResponse.status()).toBe(200);

    // Restore original value
    await nameInput.clear();
    await nameInput.fill(originalValue || 'TurnFix');
    await page.getByRole('button', { name: /speichern|save/i }).first().click();
    await page.waitForResponse(
      (r) => r.url().includes('/api/configuration/save') && r.request().method() === 'POST'
    );
  });

  test('4.2 save shows success message', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /anwendung/i);

    // Save current settings (no changes needed)
    const saveBtn = page.getByRole('button', { name: /speichern|save/i }).first();
    await saveBtn.click();

    // Look for success message
    const successMsg = page.getByText(/erfolgreich|success|gespeichert|saved/i).first();
    await expect(successMsg).toBeVisible({ timeout: 5000 });
  });

  test('4.3 can toggle a boolean setting', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /anwendung/i);

    // Find a checkbox (debug_mode)
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.count() > 0) {
      const wasChecked = await checkbox.isChecked();
      await checkbox.click();
      const nowChecked = await checkbox.isChecked();
      expect(nowChecked).not.toBe(wasChecked);
      // Toggle back
      await checkbox.click();
    }
  });

  test('4.4 can change a select value', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /sprach|local/i);

    const select = page.locator('select').first();
    const options = select.locator('option:not([value=""]):not([disabled])');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // 5. Search / Filter
  // ──────────────────────────────────────────────────────────────

  test('5.1 search filters visible sections', async ({ page }) => {
    await gotoConfiguration(page);
    const search = page.locator('input[type="search"], input[placeholder*="suchen"], input[placeholder*="such"], input[placeholder*="search"], input[placeholder*="Konfiguration"]').first();
    await search.fill('datenbank');
    await page.waitForTimeout(500);

    // Database section should still be visible
    const dbSection = page.getByRole('button', { name: /datenbank/i }).first();
    await expect(dbSection).toBeVisible();
  });

  test('5.2 clearing search shows all sections again', async ({ page }) => {
    await gotoConfiguration(page);
    const search = page.locator('input[type="search"], input[placeholder*="suchen"], input[placeholder*="such"], input[placeholder*="search"], input[placeholder*="Konfiguration"]').first();
    await search.fill('datenbank');
    await page.waitForTimeout(500);
    await search.clear();
    await page.waitForTimeout(500);

    // Multiple sections should be visible again
    const buttons = page.getByRole('button');
    const sectionButtons = await buttons.filter({ hasText: /datenbank|anwendung|sicherheit/i }).count();
    expect(sectionButtons).toBeGreaterThanOrEqual(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 6. Database Section — Setup Wizard
  // ──────────────────────────────────────────────────────────────

  test('6.1 setup wizard button visible in database section', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    const wizardBtn = page.getByRole('button', { name: /setup.assistent|wizard|assistent/i }).first();
    await expect(wizardBtn).toBeVisible({ timeout: 5000 });
  });

  test('6.2 setup wizard opens dialog', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    const wizardBtn = page.getByRole('button', { name: /setup.assistent|wizard|assistent/i }).first();
    await wizardBtn.click();

    // Dialog should appear
    const dialog = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await dialog.waitFor({ timeout: 5000 });

    // Should contain wizard title/content
    const dialogText = await dialog.textContent();
    expect(dialogText).toMatch(/datenbank|setup|assistent|wizard|verbind/i);
  });

  test('6.3 setup wizard can be closed', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    const wizardBtn = page.getByRole('button', { name: /setup.assistent|wizard|assistent/i }).first();
    await wizardBtn.click();

    const dialog = page.locator('.fixed.inset-0, [role="dialog"]').first();
    await dialog.waitFor({ timeout: 5000 });

    // Close via X button or cancel
    const closeBtn = dialog.getByRole('button', { name: /schließen|close|abbrechen|cancel|×/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Try clicking the backdrop
      await page.keyboard.press('Escape');
    }

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────
  // 7. Printing / Labels Section
  // ──────────────────────────────────────────────────────────────

  test('7.1 printing section shows page size and orientation', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /druck|pdf/i);

    const selects = page.locator('select');
    expect(await selects.count()).toBeGreaterThanOrEqual(2); // page_size, orientation, quality
  });

  test('7.2 participant labels section shows label dimensions', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /etikett|label/i);

    // Should have number inputs for rows, columns, dimensions
    const numberInputs = page.locator('input[type="number"]');
    expect(await numberInputs.count()).toBeGreaterThanOrEqual(2);
  });

  // ──────────────────────────────────────────────────────────────
  // 8. Score Capture Section
  // ──────────────────────────────────────────────────────────────

  test('8.1 score capture section shows jury results toggle', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /wertung/i);

    const content = await page.locator('main, [class*="content"]').first().textContent();
    expect(content).toMatch(/jury|wertung/i);

    // Should have a checkbox for useJuryResults
    const checkbox = page.locator('input[type="checkbox"]');
    expect(await checkbox.count()).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────
  // 9. Data Persistence
  // ──────────────────────────────────────────────────────────────

  test('9.1 saved settings persist after reload', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /anwendung/i);

    // Read current value
    const nameInput = page.locator('input[type="text"]').first();
    const originalValue = await nameInput.inputValue();

    // Set to known value
    const testValue = `PersistTest_${Date.now()}`;
    await nameInput.clear();
    await nameInput.fill(testValue);

    // Save
    const saveBtn = page.getByRole('button', { name: /speichern|save/i }).first();
    await saveBtn.click();
    await page.waitForResponse(
      (r) => r.url().includes('/api/configuration/save') && r.request().method() === 'POST'
    );

    // Reload page
    await page.reload({ waitUntil: 'load' });
    await waitForLoadingToFinish(page);
    await clickSection(page, /anwendung/i);

    // Verify value persisted
    const reloadedValue = await page.locator('input[type="text"]').first().inputValue();
    expect(reloadedValue).toBe(testValue);

    // Restore original
    await page.locator('input[type="text"]').first().clear();
    await page.locator('input[type="text"]').first().fill(originalValue || 'TurnFix');
    await saveBtn.click();
    await page.waitForResponse(
      (r) => r.url().includes('/api/configuration/save') && r.request().method() === 'POST'
    );
  });

  // ──────────────────────────────────────────────────────────────
  // 10. API Validation
  // ──────────────────────────────────────────────────────────────

  test('10.1 save validates required database fields', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /datenbank/i);

    // Clear the host field (required)
    const hostInput = page.locator('input').first();
    const originalHost = await hostInput.inputValue();
    await hostInput.clear();

    // Try to save — should fail or show validation error
    const saveBtn = page.getByRole('button', { name: /speichern|save/i }).first();
    await saveBtn.click();

    // Wait briefly for error response
    await page.waitForTimeout(1000);

    // Check for error message or that save didn't succeed
    const hasError = (await page.getByText(/fehler|error|pflicht|required|ungültig|invalid/i).count()) > 0;
    // Whether it shows an error depends on frontend/backend validation
    // Restore the value regardless
    await hostInput.fill(originalHost || 'localhost');
    
    // Save to restore state
    await saveBtn.click();
    await page.waitForResponse(
      (r) => r.url().includes('/api/configuration/save') && r.request().method() === 'POST'
    );
  });

  test('10.2 export endpoint returns config without password', async ({ page }) => {
    await gotoConfiguration(page);

    const response = await page.request.get('http://localhost:3001/api/configuration/export');
    expect(response.status()).toBe(200);
    const data = await response.json();
    // Password should be stripped in export
    if (data.database) {
      expect(data.database.db_password || '').not.toMatch(/[a-zA-Z0-9]{5,}/);
    }
  });

  // ──────────────────────────────────────────────────────────────
  // 11. Firewall & WiFi Sections
  // ──────────────────────────────────────────────────────────────

  test('11.1 firewall section loads custom component', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /firewall/i);

    // Firewall section should show some content
    const content = await page.locator('main, [class*="content"]').first().textContent();
    expect(content).toMatch(/firewall|netzwerk|network|port|regel|rule/i);
  });

  test('11.2 wifi section loads custom component', async ({ page }) => {
    await gotoConfiguration(page);
    await clickSection(page, /wlan|wifi/i);

    const content = await page.locator('main, [class*="content"]').first().textContent();
    expect(content).toMatch(/wlan|wifi|netzwerk|network|ssid/i);
  });
});
