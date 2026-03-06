/**
 * Documents Page — Utility & Logic Tests
 *
 * Tests the helper functions, data transformations, and icon mapping logic
 * used in the Documents page and DisciplineFormModal icon picker.
 */

import { describe, it, expect } from 'vitest';

// ──────────────────────────────────────────────────────────────────────────
// Test the helper functions (copied from Documents.tsx to test in isolation)
// ──────────────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryColor(cat: string): string {
  switch (cat) {
    case 'icons': return 'bg-amber-100 text-amber-800';
    case 'images': return 'bg-blue-100 text-blue-800';
    case 'xml': return 'bg-green-100 text-green-800';
    case 'json': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function isImage(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

function acceptForCategory(cat: string): string {
  switch (cat) {
    case 'icons': return 'image/png,image/svg+xml,image/jpeg,image/gif,image/webp';
    case 'images': return 'image/*';
    case 'xml': return '.xml,text/xml,application/xml';
    case 'json': return '.json,application/json';
    default: return '*';
  }
}

// ──────────────────────────────────────────────────────────────────────────
// formatSize
// ──────────────────────────────────────────────────────────────────────────

describe('formatSize', () => {
  it('should format bytes', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(1)).toBe('1 B');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(10240)).toBe('10.0 KB');
    expect(formatSize(1048575)).toBe('1024.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatSize(1048576)).toBe('1.0 MB');
    expect(formatSize(5242880)).toBe('5.0 MB');
    expect(formatSize(10485760)).toBe('10.0 MB');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// categoryColor
// ──────────────────────────────────────────────────────────────────────────

describe('categoryColor', () => {
  it('should return amber for icons', () => {
    expect(categoryColor('icons')).toContain('amber');
  });

  it('should return blue for images', () => {
    expect(categoryColor('images')).toContain('blue');
  });

  it('should return green for xml', () => {
    expect(categoryColor('xml')).toContain('green');
  });

  it('should return purple for json', () => {
    expect(categoryColor('json')).toContain('purple');
  });

  it('should return gray for unknown categories', () => {
    expect(categoryColor('other')).toContain('gray');
    expect(categoryColor('')).toContain('gray');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// isImage
// ──────────────────────────────────────────────────────────────────────────

describe('isImage', () => {
  it('should detect PNG as image', () => {
    expect(isImage('image/png')).toBe(true);
  });

  it('should detect JPEG as image', () => {
    expect(isImage('image/jpeg')).toBe(true);
  });

  it('should detect SVG as image', () => {
    expect(isImage('image/svg+xml')).toBe(true);
  });

  it('should detect GIF as image', () => {
    expect(isImage('image/gif')).toBe(true);
  });

  it('should detect WebP as image', () => {
    expect(isImage('image/webp')).toBe(true);
  });

  it('should NOT detect XML as image', () => {
    expect(isImage('application/xml')).toBe(false);
  });

  it('should NOT detect JSON as image', () => {
    expect(isImage('application/json')).toBe(false);
  });

  it('should NOT detect plain text as image', () => {
    expect(isImage('text/plain')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// acceptForCategory
// ──────────────────────────────────────────────────────────────────────────

describe('acceptForCategory', () => {
  it('should return image types for icons', () => {
    const accept = acceptForCategory('icons');
    expect(accept).toContain('image/png');
    expect(accept).toContain('image/svg+xml');
  });

  it('should return image/* for images', () => {
    expect(acceptForCategory('images')).toBe('image/*');
  });

  it('should return xml types for xml', () => {
    const accept = acceptForCategory('xml');
    expect(accept).toContain('.xml');
    expect(accept).toContain('text/xml');
  });

  it('should return json types for json', () => {
    const accept = acceptForCategory('json');
    expect(accept).toContain('.json');
    expect(accept).toContain('application/json');
  });

  it('should return wildcard for unknown category', () => {
    expect(acceptForCategory('other')).toBe('*');
  });
});
