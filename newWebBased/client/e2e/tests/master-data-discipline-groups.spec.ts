import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, expectPageTitle, clickAddButton, waitForDialog, openFilterAndSearch } from '../helpers';

const API_BASE = 'http://localhost:3001/api';

test.describe.serial('Master Data: Discipline Groups', () => {
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testGroupName = `Test DisGrp E2E ${uniqueSuffix}`;

  // Clean up leftover "Test DisGrp E2E" entries from previous runs
  test.beforeAll(async ({ request }) => {
    try {
      const res = await request.get(`${API_BASE}/discipline-groups?limit=500`);
      if (res.ok()) {
        const data = await res.json();
        const groups = data.disciplineGroups || data || [];
        const staleEntries = groups.filter((g: any) =>
          (g.name || g.var_name || '').startsWith('Test DisGrp E2E')
        );
        for (const entry of staleEntries) {
          const id = entry.id || entry.int_diszgrpid;
          if (id) {
            await request.delete(`${API_BASE}/discipline-groups/${id}`).catch(() => {});
          }
        }
        if (staleEntries.length > 0) {
          console.log(`🧹 Cleaned up ${staleEntries.length} stale "Test DisGrp E2E" entries`);
        }
      }
    } catch (e) {
      console.log('⚠ Could not clean up stale test entries:', e);
    }
  });

  test('discipline groups page loads', async ({ page }) => {
    await navigateTo(page, '/discipline-groups');
    await waitForLoadingToFinish(page);
    await expectPageTitle(page, /Disziplin.*Grupp|Discipline.*Group/i);
  });

  test('page shows table with data', async ({ page }) => {
    await navigateTo(page, '/discipline-groups');
    await waitForLoadingToFinish(page);

    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10_000 });

    const headers = page.locator('table thead th');
    expect(await headers.count()).toBeGreaterThanOrEqual(2);
  });

  test('can open add dialog', async ({ page }) => {
    await navigateTo(page, '/discipline-groups');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });

  test('can create a new discipline group', async ({ page }) => {
    await navigateTo(page, '/discipline-groups');
    await waitForLoadingToFinish(page);

    await clickAddButton(page);
    await waitForDialog(page);

    const dialog = page.locator('[role="dialog"]');
    const nameInput = dialog.locator('input[type="text"]').first();
    await nameInput.fill(testGroupName);

    const saveButton = dialog.getByRole('button', { name: /speichern|save|erstellen|create/i });
    await saveButton.click();

    await page.waitForTimeout(1000);

    // The new entry may be on a different page due to pagination.
    // Open filter panel and search to find it reliably.
    await openFilterAndSearch(page, testGroupName);
    await expect(page.locator('table tbody')).toContainText(testGroupName, { timeout: 10_000 });
  });

  test('search filters discipline groups', async ({ page }) => {
    await navigateTo(page, '/discipline-groups');
    await waitForLoadingToFinish(page);

    await openFilterAndSearch(page, testGroupName);
    await expect(page.locator('table tbody')).toContainText(testGroupName);
  });

  test('can delete test discipline group', async ({ page }) => {
    await navigateTo(page, '/discipline-groups');
    await waitForLoadingToFinish(page);

    // Search for the test entry to make it visible (may be on another page)
    await openFilterAndSearch(page, testGroupName);

    const row = page.locator('table tbody tr', { hasText: testGroupName });
    if (await row.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteButton = row.getByRole('button', { name: /löschen|delete|entfernen/i }).first();
      await deleteButton.click();

      const confirmButton = page.getByRole('button', { name: /löschen|delete|ja|yes|bestätigen|confirm/i }).first();
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }
      await page.waitForTimeout(1000);
    }
  });
});
