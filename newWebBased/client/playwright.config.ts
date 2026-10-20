import { defineConfig, devices } from '@playwright/test';

const testDatabaseName = process.env.TURNFIX_TEST_DATABASE_NAME || `turnfix_e2e_${process.pid}_${Date.now()}`;
process.env.TURNFIX_TEST_DATABASE_NAME = testDatabaseName;
const backendPort = Number(process.env.TURNFIX_E2E_SERVER_PORT || 3001);
const juryPort = Number(process.env.TURNFIX_E2E_JURY_PORT || 3002);
const clientPort = Number(process.env.TURNFIX_E2E_CLIENT_PORT || 5173);

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
  /* Retry flaky tests: 1 locally, 2 on CI */
  retries: process.env.CI ? 2 : 1,
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
    baseURL: `http://localhost:${clientPort}`,
    /* Collect trace on first retry */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Default timeout per action */
    actionTimeout: 10_000,
    /* Default navigation timeout — generous to absorb cold starts */
    navigationTimeout: 20_000,
    /* Locale for consistent date formatting */
    locale: 'de-DE',
  },

  /* Test timeout */
  timeout: 30_000,
  globalTeardown: './e2e/global-teardown-db.cjs',

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
      testMatch: /tests\/(navigation|master-data[\w-]*|event-management|configuration|jury-server-access|formula-crossview)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // ── Dependent tests: Need setup data ──
    {
      name: 'tests',
      dependencies: ['setup'],
      testMatch: /tests\/(score-entry|score-capture-v2|results|competition|import-verification|placement|statistical|jury-portal|status|pdf-export|load-test|team-competition|time-planning|group-scoring|team-scoring|squad-auto-assign|squad-status|squad-status-realtime|live-scores|medallienspiegel|delete-critical-flows)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      timeout: 60_000, // Load tests need more time
    },
  ],

  /* Auto-start backend + frontend servers before tests */
  webServer: [
    {
      command: 'node scripts/start-e2e-stack.js',
      cwd: '../server',
      env: { TURNFIX_TEST_DATABASE_NAME: testDatabaseName },
      port: backendPort,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { TURNFIX_RUNTIME_PORT: String(backendPort) },
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'node src/index.js',
      cwd: '../jury-server',
      env: { JURY_PORT: String(juryPort) },
      port: juryPort,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npx vite --port ${clientPort}`,
      cwd: '.',
      port: clientPort,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_URL: `http://localhost:${backendPort}` },
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
