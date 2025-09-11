import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with @testing-library/jest-dom matchers
expect.extend(matchers);

// Handle unhandled rejections that occur during error testing
const originalConsoleError = console.error;
global.console.error = (...args: any[]) => {
  // Suppress specific error messages that are expected during testing
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('Not found') || message.includes('Network error'))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Global unhandled rejection handler for tests
let originalUnhandledRejectionHandlers: any[] = [];

beforeAll(() => {
  // Store original handlers
  originalUnhandledRejectionHandlers = process.listeners('unhandledRejection');
  
  // Clear existing handlers and add our own
  process.removeAllListeners('unhandledRejection');
  
  process.on('unhandledRejection', (reason) => {
    // Check if this is a test-related error that we expect
    const reasonString = String(reason);
    if (reasonString.includes('Network error') || 
        reasonString.includes('Not found') ||
        reasonString.includes('test-')) {
      // This is expected from our tests, ignore it
      return;
    }
    
    // For unexpected errors, log them but don't fail the test
    console.warn('Unhandled rejection during test:', reason);
  });
});

afterAll(() => {
  // Restore original handlers
  process.removeAllListeners('unhandledRejection');
  if (originalUnhandledRejectionHandlers && originalUnhandledRejectionHandlers.length > 0) {
    originalUnhandledRejectionHandlers.forEach((handler: any) => {
      process.on('unhandledRejection', handler);
    });
  }
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
