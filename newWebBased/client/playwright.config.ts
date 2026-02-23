import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for TurnFix
 * 
 * Prerequisites:
 * - Backend server running on port 3001 (npm run dev in server/)
 * - Frontend dev server running on port 5173 (npm run dev in client/)
 * 
 * Run tests:
 *   npx playwright test              # Run all tests
 *   npx playwright test --headed     # Run with browser visible
 *   npx playwright test --ui         # Interactive UI mode
 *   npx playwright test --debug      # Debug mode with inspector
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests sequentially by default (E2E tests may share state) */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Single worker for sequential execution */
  workers: 1,
  /* Reporter */
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  /* Shared settings for all projects */
  use: {
    /* Base URL for navigation — Vite dev server */
    baseURL: 'http://localhost:5173',
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Default timeout per action */
    actionTimeout: 10_000,
    /* Default navigation timeout */
    navigationTimeout: 15_000,
    /* Locale for consistent date formatting */
    locale: 'de-DE',
  },

  /* Test timeout */
  timeout: 30_000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* No webServer config — servers must be running externally.
   * Start backend: cd server && npm run dev
   * Start frontend: cd client && npm run dev
   */
});
