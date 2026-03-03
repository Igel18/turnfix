import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIconUrl, getMissingIconUrl, getDisciplineIcon } from '../utils/iconUtils';

// Mock import.meta.env.BASE_URL — Vite sets this to '/jury/' in production
// In tests the module-level `const BASE_URL = import.meta.env.BASE_URL || '/'`
// resolves to '/' because we don't run via Vite.

describe('getIconUrl', () => {
  it('should return null for undefined iconPath', () => {
    expect(getIconUrl(undefined)).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(getIconUrl('')).toBeNull();
  });

  it('should convert Qt resource path (:/) to web URL', () => {
    const result = getIconUrl(':/icons/boden.png');
    expect(result).toBe('/assets/icons/boden.png');
  });

  it('should handle Qt path with nested folders', () => {
    const result = getIconUrl(':/icons/subfolder/reck.png');
    // replace(':/icons/', '') strips the prefix
    expect(result).toBe('/assets/icons/subfolder/reck.png');
  });

  it('should return absolute paths unchanged', () => {
    expect(getIconUrl('/some/absolute/path.png')).toBe('/some/absolute/path.png');
  });

  it('should return http URLs unchanged', () => {
    expect(getIconUrl('http://example.com/icon.png')).toBe('http://example.com/icon.png');
  });

  it('should return https URLs unchanged', () => {
    expect(getIconUrl('https://cdn.example.com/icon.png')).toBe('https://cdn.example.com/icon.png');
  });

  it('should prefix plain filename with assets path', () => {
    expect(getIconUrl('barren.png')).toBe('/assets/icons/barren.png');
  });
});

describe('getMissingIconUrl', () => {
  it('should return a URL pointing to the missing-icon file', () => {
    const url = getMissingIconUrl();
    expect(url).toContain('assets/icons/');
    expect(url).toContain('missing');
  });
});

describe('getDisciplineIcon', () => {
  it('should return icon URL when iconPath is provided', () => {
    const result = getDisciplineIcon('Boden', 'boden.png');
    expect(result).toBe('/assets/icons/boden.png');
  });

  it('should return missing-icon URL when iconPath is empty string', () => {
    const result = getDisciplineIcon('Boden', '');
    expect(result).toBe(getMissingIconUrl());
  });

  it('should return missing-icon URL when iconPath is undefined', () => {
    const result = getDisciplineIcon('Boden', undefined);
    expect(result).toBe(getMissingIconUrl());
  });

  it('should ignore discipline name — no hardcoded fallback', () => {
    // Even well-known discipline names should get missing-icon if no DB path
    const result = getDisciplineIcon('Reck');
    expect(result).toBe(getMissingIconUrl());
  });

  it('should convert Qt resource paths through getIconUrl', () => {
    const result = getDisciplineIcon('Barren', ':/icons/barren.svg');
    expect(result).toBe('/assets/icons/barren.svg');
  });
});
