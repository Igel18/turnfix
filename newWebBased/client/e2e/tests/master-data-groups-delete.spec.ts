/**
 * Groups Page — Delete Confirm Modal Tests
 *
 * Tests that deleting a group shows the UnifiedConfirmModal (not native browser confirm).
 *
 * Requires Event A setup to have run (loadEventAState).
 * Creates a test group via API, navigates to /groups, tests delete confirm flow.
 */

import { test, expect } from '@playwright/test';
import { navigateTo, waitForLoadingToFinish, confirmDeleteModal } from '../helpers';
import {
  loadEventAState,
  setEventContext,
  apiPost,
  apiDelete,
  EventAState,
} from '../fixtures/test-state';

const TS = Date.now();
const TEST_GROUP_NAME = `E2E_Gruppe_${TS}`;

let state: EventAState;
let createdGroupId: number | null = null;

test.beforeAll(() => {
  state = loadEventAState();
});

test.afterAll(async ({ request }) => {
  // Cleanup: delete the test group if it wasn't deleted by the test
  if (createdGroupId !== null) {
    await apiDelete(request, `/groups/${createdGroupId}`).catch(() => {/* ignore */});
    createdGroupId = null;
  }
});

test.describe.serial('Groups: Delete Confirm Modal', () => {

  test('setup: create test group via API', async ({ request }) => {
    const clubId = state.clubIds[0];
    const result = await apiPost(request, '/groups', {
      clubId,
      name: TEST_GROUP_NAME,
    });
    expect(result.status).toBe(201);
    createdGroupId = result.body.id;
    expect(createdGroupId).toBeTruthy();
  });

  test('page loads with groups list', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await navigateTo(page, '/groups');
    await waitForLoadingToFinish(page);
    await expect(page.locator('h1, h2').first()).toContainText(/Gruppe|Group/i);
  });

  test('test group is visible in the list', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await navigateTo(page, '/groups');
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).toContainText(TEST_GROUP_NAME, { timeout: 10_000 });
  });

  test('delete button shows UnifiedConfirmModal (not native dialog)', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await navigateTo(page, '/groups');
    await waitForLoadingToFinish(page);

    // Find the group item card
    const groupItem = page.locator('li, div[class*="rounded"], div[class*="item"]')
      .filter({ hasText: TEST_GROUP_NAME })
      .first();
    await expect(groupItem).toBeVisible({ timeout: 10_000 });

    // Delete button: title "Delete Gruppe" (from MasterList.tsx entityName config)
    const deleteButton = groupItem.locator('button[title="Delete Gruppe"], button[title*="delete"], button[title*="Delete"]').first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    // Intercept native dialogs — should NOT fire
    let nativeDialogFired = false;
    page.once('dialog', (dialog) => {
      nativeDialogFired = true;
      dialog.dismiss();
    });

    await deleteButton.click();

    // React modal must appear
    const confirmModal = page.locator('.fixed.inset-0, [role="dialog"]').filter({
      hasText: /Löschen bestätigen|Confirm Delete/
    }).first();
    await expect(confirmModal).toBeVisible({ timeout: 5000 });

    // Native dialog must NOT have fired
    expect(nativeDialogFired).toBe(false);

    // Cancel — group must survive
    const cancelButton = confirmModal.getByRole('button', { name: /abbrechen|cancel/i }).first();
    await cancelButton.click();
    await expect(confirmModal).toHaveCount(0, { timeout: 3000 });

    // Group still visible
    await expect(page.locator('body')).toContainText(TEST_GROUP_NAME);
  });

  test('can delete group and confirm via modal', async ({ page }) => {
    await setEventContext(page, state.eventId, state.eventName);
    await navigateTo(page, '/groups');
    await waitForLoadingToFinish(page);

    const groupItem = page.locator('li, div[class*="rounded"], div[class*="item"]')
      .filter({ hasText: TEST_GROUP_NAME })
      .first();
    await expect(groupItem).toBeVisible({ timeout: 10_000 });

    const deleteButton = groupItem.locator('button[title="Delete Gruppe"], button[title*="delete"], button[title*="Delete"]').first();
    await deleteButton.click();

    await confirmDeleteModal(page);
    await page.waitForTimeout(1500);

    // Group must be gone
    await page.reload({ waitUntil: 'networkidle' });
    await waitForLoadingToFinish(page);
    await expect(page.locator('body')).not.toContainText(TEST_GROUP_NAME, { timeout: 10_000 });

    // Mark as cleaned up
    createdGroupId = null;
  });
});
