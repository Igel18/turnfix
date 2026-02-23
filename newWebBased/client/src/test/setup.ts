import { expect, afterEach, afterAll, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { server } from './msw/server';

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// ── MSW server lifecycle ──────────────────────────────────────────────────
// Start MSW before all tests, reset handlers between tests, stop after all.
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
