/**
 * Unit Tests — iconUtils.ts
 *
 * Tests for Qt resource path → web URL conversion functions.
 */

import { getIconUrl, getIconFilename } from '../../src/utils/iconUtils';

describe('iconUtils', () => {
  // ────────────────────────────────────────────────────────────────────────
  // getIconUrl
  // ────────────────────────────────────────────────────────────────────────

  describe('getIconUrl', () => {
    it('should convert Qt path ":/icons/100.png" to web URL', () => {
      expect(getIconUrl(':/icons/100.png')).toBe('/public/icons/100.png');
    });

    it('should use custom baseUrl when provided', () => {
      expect(getIconUrl(':/icons/42.png', 'https://example.com/assets')).toBe(
        'https://example.com/assets/42.png'
      );
    });

    it('should handle filenames with subdirectories', () => {
      // e.g. ":/icons/male/boden.png"
      // The regex only strips ":/icons/" so the rest remains
      expect(getIconUrl(':/icons/male/boden.png')).toBe('/public/icons/male/boden.png');
    });

    it('should return null for null input', () => {
      expect(getIconUrl(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(getIconUrl(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getIconUrl('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(getIconUrl('   ')).toBeNull();
    });

    it('should return null for non-Qt paths (no :/icons/ prefix)', () => {
      expect(getIconUrl('some-other-path.png')).toBeNull();
    });

    it('should return null for partial prefix ":/icon/"', () => {
      expect(getIconUrl(':/icon/100.png')).toBeNull();
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // getIconFilename
  // ────────────────────────────────────────────────────────────────────────

  describe('getIconFilename', () => {
    it('should extract "100.png" from ":/icons/100.png"', () => {
      expect(getIconFilename(':/icons/100.png')).toBe('100.png');
    });

    it('should extract "boden_m.svg" from ":/icons/boden_m.svg"', () => {
      expect(getIconFilename(':/icons/boden_m.svg')).toBe('boden_m.svg');
    });

    it('should return null for null', () => {
      expect(getIconFilename(null)).toBeNull();
    });

    it('should return null for undefined', () => {
      expect(getIconFilename(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getIconFilename('')).toBeNull();
    });

    it('should extract filename from non-Qt paths too', () => {
      expect(getIconFilename('random.png')).toBe('random.png');
    });

    it('should return null for whitespace-only', () => {
      expect(getIconFilename('  ')).toBeNull();
    });
  });
});
