/**
 * Tests for image URL resolution utilities used by LayoutDesigner.
 *
 * These functions normalise the various formats that image paths
 * (var_value) can appear in for certificate-layout image fields.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveImageUrl,
  isLocalFilePath,
  isUploadingPath,
  extractFilename,
} from '../../utils/imageUrlUtils';

// ---------------------------------------------------------------------------
// resolveImageUrl
// ---------------------------------------------------------------------------
describe('resolveImageUrl', () => {
  it('returns empty string for empty input', () => {
    expect(resolveImageUrl('')).toBe('');
  });

  it('returns empty string for falsy input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveImageUrl(null as any)).toBe('');
    expect(resolveImageUrl(undefined as any)).toBe('');
  });

  // --- Already-resolved paths ---

  it('keeps absolute http URLs as-is', () => {
    const url = 'http://example.com/img.png';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('keeps absolute https URLs as-is', () => {
    const url = 'https://cdn.example.com/path/img.jpg';
    expect(resolveImageUrl(url)).toBe(url);
  });

  it('keeps /uploads/ paths as-is', () => {
    const path = '/uploads/images/layout-image-123.png';
    expect(resolveImageUrl(path)).toBe(path);
  });

  it('keeps /uploads/ paths with nested dirs as-is', () => {
    const path = '/uploads/images/sub/deep/file.png';
    expect(resolveImageUrl(path)).toBe(path);
  });

  it('keeps /public/ paths as-is', () => {
    const path = '/public/logo.svg';
    expect(resolveImageUrl(path)).toBe(path);
  });

  // --- Windows local paths ---

  it('returns Windows local paths unchanged', () => {
    const path = 'C:\\Users\\Admin\\Pictures\\logo.png';
    expect(resolveImageUrl(path)).toBe(path);
  });

  it('returns Windows D: paths unchanged', () => {
    const path = 'D:\\images\\cert.jpg';
    expect(resolveImageUrl(path)).toBe(path);
  });

  // --- Bare filenames (the main bug-fix scenario) ---

  it('prepends /uploads/images/ to a bare filename', () => {
    expect(resolveImageUrl('layout-image-1772801513617-521967041.png'))
      .toBe('/uploads/images/layout-image-1772801513617-521967041.png');
  });

  it('prepends /uploads/images/ to a simple filename', () => {
    expect(resolveImageUrl('logo.png'))
      .toBe('/uploads/images/logo.png');
  });

  it('prepends /uploads/images/ to filename with spaces', () => {
    expect(resolveImageUrl('my image.jpg'))
      .toBe('/uploads/images/my image.jpg');
  });

  it('prepends /uploads/images/ to filename with special chars', () => {
    expect(resolveImageUrl('Ürkundenbild (1).png'))
      .toBe('/uploads/images/Ürkundenbild (1).png');
  });
});

// ---------------------------------------------------------------------------
// isLocalFilePath
// ---------------------------------------------------------------------------
describe('isLocalFilePath', () => {
  it('returns false for empty string', () => {
    expect(isLocalFilePath('')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isLocalFilePath(null as any)).toBe(false);
    expect(isLocalFilePath(undefined as any)).toBe(false);
  });

  it('detects Windows C: path as local', () => {
    expect(isLocalFilePath('C:\\Users\\Admin\\img.png')).toBe(true);
  });

  it('detects Windows D: path as local', () => {
    expect(isLocalFilePath('D:\\pictures\\logo.jpg')).toBe(true);
  });

  it('returns false for /uploads/ paths (server-relative)', () => {
    expect(isLocalFilePath('/uploads/images/file.png')).toBe(false);
  });

  it('returns false for bare filenames', () => {
    expect(isLocalFilePath('layout-image-123.png')).toBe(false);
  });

  it('returns false for http URLs', () => {
    expect(isLocalFilePath('http://example.com/img.png')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isUploadingPath
// ---------------------------------------------------------------------------
describe('isUploadingPath', () => {
  it('returns false for empty string', () => {
    expect(isUploadingPath('')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isUploadingPath(null as any)).toBe(false);
    expect(isUploadingPath(undefined as any)).toBe(false);
  });

  it('detects uploading indicator emoji', () => {
    expect(isUploadingPath('🔄 Uploading...')).toBe(true);
  });

  it('detects uploading indicator in middle of string', () => {
    expect(isUploadingPath('file 🔄 uploading')).toBe(true);
  });

  it('returns false for normal paths', () => {
    expect(isUploadingPath('/uploads/images/file.png')).toBe(false);
  });

  it('returns false for bare filenames', () => {
    expect(isUploadingPath('layout-image-123.png')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractFilename
// ---------------------------------------------------------------------------
describe('extractFilename', () => {
  it('returns empty string for empty input', () => {
    expect(extractFilename('')).toBe('');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractFilename(null as any)).toBe('');
    expect(extractFilename(undefined as any)).toBe('');
  });

  it('extracts filename from UNIX path', () => {
    expect(extractFilename('/uploads/images/logo.png')).toBe('logo.png');
  });

  it('extracts filename from Windows path', () => {
    expect(extractFilename('C:\\Users\\Admin\\Pictures\\logo.png')).toBe('logo.png');
  });

  it('returns bare filename as-is', () => {
    expect(extractFilename('logo.png')).toBe('logo.png');
  });

  it('handles mixed separators', () => {
    expect(extractFilename('some/path\\to/file.jpg')).toBe('file.jpg');
  });

  it('handles nested directories', () => {
    expect(extractFilename('/a/b/c/d/image.webp')).toBe('image.webp');
  });
});
