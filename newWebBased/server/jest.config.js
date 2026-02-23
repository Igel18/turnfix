const path = require('path');
const dotenv = require('dotenv');

// Load test environment so DATABASE_URL points at turnfix_test
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/debug-*.ts',
    '!src/test-*.ts',
    '!src/seed*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Global setup: create test DB, apply schema, seed data (runs ONCE)
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  // Global teardown: drop test DB (runs ONCE after all suites)
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',
  // Per-file setup: connect Prisma, cleanup hooks
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  testTimeout: 30000,
  clearMocks: true,
  restoreMocks: true,
  // Run tests sequentially because integration tests share a test database.
  // Parallel execution causes race conditions with FK constraints and shared state.
  maxWorkers: 1,
  // Force exit after all tests — some route-level PrismaClient instances
  // hold open connections that would otherwise keep Jest hanging.
  forceExit: true,
};
