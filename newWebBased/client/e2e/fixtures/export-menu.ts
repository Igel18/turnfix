import type { Locator, Page } from '@playwright/test';

/** Unified header export trigger (ExportMenu). */
export function exportTrigger(page: Page): Locator {
  return page.getByTestId('action-export');
}

/** Opens the unified export dropdown and returns the menu item with the given name (e.g. /PDF/). */
export async function openExportItem(page: Page, name: RegExp | string): Promise<Locator> {
  const trigger = exportTrigger(page);
  await trigger.waitFor({ state: 'visible', timeout: 15_000 });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click();
  }
  return page.getByRole('menuitem', { name });
}
