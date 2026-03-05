import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for TurnFix
 *
 * Architecture:
 *   setup   → Creates Event A (via API) and Event B (GymNet import)
 *   tests   → All test specs (depend on setup)
 *   teardown → Cleans up all created data
 *
 * Prerequisites:
 * - Backend server running on port 3001 (npm run dev in server/)
 * - Frontend dev server running on port 5173 (npm run dev in client/)
 *
 * Run tests:
 *   npx playwright test                          # Run all (setup → tests → teardown)
 *   npx playwright test --project=setup          # Run setup only
 *   npx playwright test --project=tests          # Run tests only (setup must have run)
 *   npx playwright test --project=independent    # Run independent tests (no setup needed)
 *   npx playwright test --headed                 # Run with browser visible
 *   npx playwright test --ui                     # Interactive UI mode
 *   npx playwright test --debug                  # Debug mode with inspector
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests sequentially — E2E tests share state via JSON files */
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

  /* Project dependency chain: setup → tests → teardown */
  projects: [
    // ── Setup: Creates test data (Event A + Event B + Team Event) ──
    {
      name: 'setup',
      testMatch: /setup\/(create|import)-(team-)?event\.setup\.ts/,
      teardown: 'teardown',
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Teardown: Cleans up all test data ──
    {
      name: 'teardown',
      testMatch: /setup\/teardown\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Independent tests: No setup needed ──
    {
      name: 'independent',
      testMatch: /tests\/(navigation|master-data[\w-]*|event-management|jury-server-access)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Dependent tests: Need setup data ──
    {
      name: 'tests',
      dependencies: ['setup'],
      testMatch: /tests\/(score-entry|results|competition|import-verification|placement|statistical|jury-portal|status|pdf-export|load-test|team-competition|time-planning|group-scoring|team-scoring|squad-auto-assign|squad-status|live-scores|medallienspiegel)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 60_000, // Load tests need more time
    },
  ],

  /* Auto-start backend + frontend servers before tests */
  webServer: [
    {
      command: 'npx ts-node src/index.ts',
      cwd: '../server',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'node src/index.js',
      cwd: '../jury-server',
      port: 3002,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npx vite',
      cwd: '.',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
