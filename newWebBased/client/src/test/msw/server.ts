/**
 * MSW Server Setup
 *
 * Creates a mock server for Vitest (Node.js environment).
 * Import and start in test files or the global test setup.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
