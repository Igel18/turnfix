import { describe, it, expect } from 'vitest';
import {
  getIconFilename,
  stripQtPrefix,
  MISSING_ICON_FILENAME,
  MISSING_ICON_EMOJI,
} from '../iconUtils';
import * as iconUtils from '../iconUtils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('MISSING_ICON_FILENAME', () => {
  it('should be a non-empty string ending with an image extension', () => {
    expect(MISSING_ICON_FILENAME).toBeTruthy();
    expect(MISSING_ICON_FILENAME).toMatch(/\.(svg|png|jpg)$/);
  });
});

describe('MISSING_ICON_EMOJI', () => {
  it('should be a non-empty string', () => {
    expect(MISSING_ICON_EMOJI).toBeTruthy();
    expect(MISSING_ICON_EMOJI.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getIconFilename
// ---------------------------------------------------------------------------

describe('getIconFilename', () => {
  it('should extract filename from Qt resource path ":/icons/balken.png"', () => {
    expect(getIconFilename(':/icons/balken.png')).toBe('balken.png');
  });

  it('should extract filename from Qt resource path ":/icons/100.png"', () => {
    expect(getIconFilename(':/icons/100.png')).toBe('100.png');
  });

  it('should extract filename from short Qt path ":/something.png"', () => {
    expect(getIconFilename(':/something.png')).toBe('something.png');
  });

  it('should extract filename from nested Qt path ":/icons/sub/deep.png"', () => {
    expect(getIconFilename(':/icons/sub/deep.png')).toBe('deep.png');
  });

  it('should return the filename from a plain filename', () => {
    expect(getIconFilename('boden.png')).toBe('boden.png');
  });

  it('should return the filename from a relative path', () => {
    expect(getIconFilename('icons/boden.png')).toBe('boden.png');
  });

  it('should return null for null input', () => {
    expect(getIconFilename(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(getIconFilename(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(getIconFilename('')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(getIconFilename('   ')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stripQtPrefix
// ---------------------------------------------------------------------------

describe('stripQtPrefix', () => {
  it('should strip ":/icons/" prefix', () => {
    expect(stripQtPrefix(':/icons/balken.png')).toBe('balken.png');
  });

  it('should strip ":/" prefix when no icons folder', () => {
    expect(stripQtPrefix(':/something.png')).toBe('something.png');
  });

  it('should return path as-is if no Qt prefix', () => {
    expect(stripQtPrefix('balken.png')).toBe('balken.png');
  });

  it('should return path as-is for relative paths', () => {
    expect(stripQtPrefix('icons/balken.png')).toBe('icons/balken.png');
  });

  it('should return path as-is for absolute paths', () => {
    expect(stripQtPrefix('/public/icons/balken.png')).toBe('/public/icons/balken.png');
  });

  it('should return path as-is for http URLs', () => {
    expect(stripQtPrefix('http://localhost:3001/icons/balken.png')).toBe('http://localhost:3001/icons/balken.png');
  });
});

// ---------------------------------------------------------------------------
// No hardcoded fallback maps
// ---------------------------------------------------------------------------

describe('No hardcoded fallback maps', () => {
  it('should NOT export DISCIPLINE_ICON_MAP', () => {
    expect((iconUtils as any).DISCIPLINE_ICON_MAP).toBeUndefined();
  });

  it('should NOT export DISCIPLINE_EMOJI_MAP', () => {
    expect((iconUtils as any).DISCIPLINE_EMOJI_MAP).toBeUndefined();
  });

  it('should NOT export DISCIPLINE_SHORT_NAME_MAP', () => {
    expect((iconUtils as any).DISCIPLINE_SHORT_NAME_MAP).toBeUndefined();
  });

  it('should NOT export getFallbackDeviceEmoji', () => {
    expect((iconUtils as any).getFallbackDeviceEmoji).toBeUndefined();
  });
});
