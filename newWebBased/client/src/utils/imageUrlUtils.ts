/**
 * Image URL resolution utilities for LayoutDesigner and other components.
 *
 * Certificate-layout image values (var_value) can be stored in several formats:
 *   • "/uploads/images/foo.png"  → already a valid server-relative URL
 *   • "foo.png"                  → bare filename → needs /uploads/images/ prefix
 *   • "C:\\path\\foo.png"        → local Windows path → pass through (not loadable in browser)
 *   • "http://..." / "https://…" → absolute URL → use as-is
 *   • "/public/..."              → static asset path → use as-is
 */

/**
 * Resolve an image value to a loadable URL.
 *
 * @param imagePath  The raw value from the database (var_value)
 * @returns          A URL the browser can fetch, or the original value if it
 *                   cannot be resolved (e.g. a Windows local path).
 */
export function resolveImageUrl(imagePath: string): string {
  if (!imagePath) return '';

  // Already an absolute URL
  if (imagePath.startsWith('http')) return imagePath;

  // Already a server-relative path we can serve
  if (imagePath.startsWith('/uploads/') || imagePath.startsWith('/public/')) return imagePath;

  // Windows-style local path — can't be loaded in a browser, return as-is
  if (imagePath.includes(':\\')) return imagePath;

  // Bare filename → assume it lives in /uploads/images/
  return `/uploads/images/${imagePath}`;
}

/**
 * Determine whether a path represents a local (Windows) file path that
 * cannot be loaded by the browser.
 */
export function isLocalFilePath(imagePath: string): boolean {
  if (!imagePath) return false;
  return imagePath.includes(':\\') && !imagePath.startsWith('/uploads/');
}

/**
 * Determine whether a path contains the uploading indicator.
 */
export function isUploadingPath(imagePath: string): boolean {
  if (!imagePath) return false;
  return imagePath.includes('🔄');
}

/**
 * Extract the filename portion from any path format (Windows back-slashes or
 * UNIX forward-slashes).
 */
export function extractFilename(imagePath: string): string {
  if (!imagePath) return '';
  return imagePath.split(/[\\\/]/).pop() || imagePath;
}
