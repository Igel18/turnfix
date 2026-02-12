/**
 * debug.ts Tests
 * Tests for debug utility functions and debug mode detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDebugEnabled, debugLog, setDebugMode } from '../../utils/debug';

describe('debug.ts', () => {
  // Save original values
  const originalLocalStorage = global.localStorage;
  const originalLocation = global.window?.location;

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] || null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
      clear() {
        this.store = {};
      }
    };
    
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });

    // Mock window.location
    delete (global as any).window;
    (global as any).window = {
      location: {
        search: ''
      }
    };

    // Clear console spy
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore originals
    localStorage.clear();
  });

  // ────────────────────────────────────────────────────────────
  // isDebugEnabled Tests
  // ────────────────────────────────────────────────────────────
  describe('isDebugEnabled', () => {
    it('returns false when no debug flag is set', () => {
      expect(isDebugEnabled()).toBe(false);
    });

    it('returns true when localStorage DEBUG is "true"', () => {
      localStorage.setItem('DEBUG', 'true');
      expect(isDebugEnabled()).toBe(true);
    });

    it('returns false when localStorage DEBUG is "false"', () => {
      localStorage.setItem('DEBUG', 'false');
      expect(isDebugEnabled()).toBe(false);
    });

    it('is case-insensitive for localStorage value', () => {
      localStorage.setItem('DEBUG', 'TRUE');
      expect(isDebugEnabled()).toBe(true);

      localStorage.setItem('DEBUG', 'True');
      expect(isDebugEnabled()).toBe(true);

      localStorage.setItem('DEBUG', 'FALSE');
      expect(isDebugEnabled()).toBe(false);
    });

    it('returns true when URL param debug=true', () => {
      window.location.search = '?debug=true';
      expect(isDebugEnabled()).toBe(true);
    });

    it('returns false when URL param debug is not true', () => {
      window.location.search = '?debug=false';
      expect(isDebugEnabled()).toBe(false);
    });

    it('prioritizes localStorage over URL param', () => {
      localStorage.setItem('DEBUG', 'false');
      window.location.search = '?debug=true';
      expect(isDebugEnabled()).toBe(false);
    });

    it('uses URL param when localStorage is not set', () => {
      window.location.search = '?debug=true';
      expect(isDebugEnabled()).toBe(true);
    });

    it('handles multiple URL params correctly', () => {
      window.location.search = '?foo=bar&debug=true&baz=qux';
      expect(isDebugEnabled()).toBe(true);
    });

    it('returns false for invalid localStorage values', () => {
      localStorage.setItem('DEBUG', 'yes');
      expect(isDebugEnabled()).toBe(false);

      localStorage.setItem('DEBUG', '1');
      expect(isDebugEnabled()).toBe(false);

      localStorage.setItem('DEBUG', 'enabled');
      expect(isDebugEnabled()).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // setDebugMode Tests
  // ────────────────────────────────────────────────────────────
  describe('setDebugMode', () => {
    it('sets localStorage DEBUG to "true"', () => {
      setDebugMode(true);
      expect(localStorage.getItem('DEBUG')).toBe('true');
    });

    it('sets localStorage DEBUG to "false"', () => {
      setDebugMode(false);
      expect(localStorage.getItem('DEBUG')).toBe('false');
    });

    it('enables debug mode when set to true', () => {
      setDebugMode(true);
      expect(isDebugEnabled()).toBe(true);
    });

    it('disables debug mode when set to false', () => {
      setDebugMode(true);
      expect(isDebugEnabled()).toBe(true);

      setDebugMode(false);
      expect(isDebugEnabled()).toBe(false);
    });

    it('overwrites existing value', () => {
      localStorage.setItem('DEBUG', 'false');
      setDebugMode(true);
      expect(localStorage.getItem('DEBUG')).toBe('true');
    });
  });

  // ────────────────────────────────────────────────────────────
  // debugLog Tests
  // ────────────────────────────────────────────────────────────
  describe('debugLog', () => {
    it('does not log when debug is disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(false);
      debugLog('test message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logs with [DEBUG] prefix when debug is enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      debugLog('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'test message');
      consoleSpy.mockRestore();
    });

    it('logs multiple arguments', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      debugLog('message', 123, { foo: 'bar' }, [1, 2, 3]);
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'message', 123, { foo: 'bar' }, [1, 2, 3]);
      consoleSpy.mockRestore();
    });

    it('logs objects correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      const testObj = { name: 'Test', value: 42 };
      debugLog('Object:', testObj);
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Object:', testObj);
      consoleSpy.mockRestore();
    });

    it('logs arrays correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      const testArr = [1, 2, 3, 4, 5];
      debugLog('Array:', testArr);
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Array:', testArr);
      consoleSpy.mockRestore();
    });

    it('handles undefined and null', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      debugLog('Values:', undefined, null);
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Values:', undefined, null);
      consoleSpy.mockRestore();
    });

    it('handles empty arguments', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      debugLog();
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]');
      consoleSpy.mockRestore();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Integration Tests
  // ────────────────────────────────────────────────────────────
  describe('Integration: debugLog with isDebugEnabled', () => {
    it('respects debug flag changes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Initially disabled
      setDebugMode(false);
      debugLog('message 1');
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Enable
      setDebugMode(true);
      debugLog('message 2');
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'message 2');
      
      // Disable again
      setDebugMode(false);
      consoleSpy.mockClear();
      debugLog('message 3');
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('works with URL parameter', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Set via URL
      window.location.search = '?debug=true';
      debugLog('url message');
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'url message');
      consoleSpy.mockRestore();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Edge Cases
  // ────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('handles rapid enable/disable toggles', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      for (let i = 0; i < 10; i++) {
        setDebugMode(i % 2 === 0);
        debugLog(`message ${i}`);
      }
      
      // Should have logged 5 times (even indices)
      expect(consoleSpy).toHaveBeenCalledTimes(5);
      consoleSpy.mockRestore();
    });

    it('handles large objects', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      const largeObj = { data: new Array(1000).fill({ id: 1, name: 'test' }) };
      debugLog('Large object:', largeObj);
      
      expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Large object:', largeObj);
      consoleSpy.mockRestore();
    });

    it('handles circular references', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      setDebugMode(true);
      const circular: any = { name: 'test' };
      circular.self = circular;
      
      // Should not throw
      expect(() => debugLog('Circular:', circular)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  // ────────────────────────────────────────────────────────────
  // Real-World Scenarios
  // ────────────────────────────────────────────────────────────
  describe('Real-World Scenarios', () => {
    it('simulates developer workflow', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Developer opens app
      expect(isDebugEnabled()).toBe(false);
      
      // Opens console and enables debug
      setDebugMode(true);
      
      // Application logs debug info
      debugLog('🔍 Loading data...');
      debugLog('📊 Data loaded:', { count: 42 });
      debugLog('✅ Render complete');
      
      expect(consoleSpy).toHaveBeenCalledTimes(3);
      
      // Developer done debugging
      setDebugMode(false);
      debugLog('This should not log');
      
      expect(consoleSpy).toHaveBeenCalledTimes(3); // Still 3
      
      consoleSpy.mockRestore();
    });

    it('simulates production mode (no logs)', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Production: debug disabled
      expect(isDebugEnabled()).toBe(false);
      
      // Application attempts to log
      debugLog('API request');
      debugLog('Data processing');
      debugLog('Render');
      
      // Nothing logged in production
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('simulates QA testing with URL param', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // QA opens app with ?debug=true
      window.location.search = '?debug=true';
      
      // Logs should appear
      debugLog('🔧 Debug mode active');
      debugLog('📝 Running tests...');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(isDebugEnabled()).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });
});
