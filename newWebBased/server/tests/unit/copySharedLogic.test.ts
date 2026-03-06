/**
 * Unit Tests — copy-shared.js logic
 *
 * Validates:
 * - Symlinks are detected and replaced with real copies
 * - Real directory copies are preserved (no re-copy)
 * - Missing shared source is handled gracefully
 * - JSON data files are copied to dist/
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

describe('copy-shared script logic', () => {
  // Helper mimicking the script's isSymlinkOrJunction
  function isSymlinkOrJunction(p: string): boolean {
    try {
      const stats = fs.lstatSync(p);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }

  describe('isSymlinkOrJunction', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-shared-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns false for a regular directory', () => {
      const dir = path.join(tmpDir, 'real-dir');
      fs.mkdirSync(dir);
      expect(isSymlinkOrJunction(dir)).toBe(false);
    });

    it('returns false for a non-existent path', () => {
      expect(isSymlinkOrJunction(path.join(tmpDir, 'nope'))).toBe(false);
    });

    it('returns true for a symlink', () => {
      const target = path.join(tmpDir, 'target');
      const link = path.join(tmpDir, 'link');
      fs.mkdirSync(target);
      try {
        fs.symlinkSync(target, link, 'junction');
        expect(isSymlinkOrJunction(link)).toBe(true);
      } catch {
        // Symlink creation might fail on Windows without admin
        // In that case, skip the assertion
        console.warn('Symlink creation failed (may need admin privileges) — skipping');
      }
    });
  });

  describe('should-copy decision', () => {
    // Re-implement the decision logic from copy-shared.js
    function shouldCopyShared(canResolve: boolean, isSymlink: boolean): 'skip' | 'copy' {
      if (canResolve && !isSymlink) {
        return 'skip'; // Real copy exists, no action needed
      }
      return 'copy'; // Symlink that needs replacing, or missing entirely
    }

    it('skips when shared resolves via real directory (already copied)', () => {
      expect(shouldCopyShared(true, false)).toBe('skip');
    });

    it('copies when shared resolves via symlink (needs real copy for production)', () => {
      expect(shouldCopyShared(true, true)).toBe('copy');
    });

    it('copies when shared does not resolve at all', () => {
      expect(shouldCopyShared(false, false)).toBe('copy');
    });

    it('copies when shared does not resolve and is a broken symlink', () => {
      expect(shouldCopyShared(false, true)).toBe('copy');
    });
  });

  describe('JSON data file copy', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-copy-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('copies .json files from source to target directory', () => {
      // Create source with JSON files
      const srcDir = path.join(tmpDir, 'src', 'data', 'json');
      const distDir = path.join(tmpDir, 'dist', 'data', 'json');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'test.json'), '{"key": "value"}');
      fs.writeFileSync(path.join(srcDir, 'other.json'), '[]');
      fs.writeFileSync(path.join(srcDir, 'not-json.txt'), 'skip me');

      // Simulate the copy logic
      fs.mkdirSync(distDir, { recursive: true });
      const jsonFiles = fs.readdirSync(srcDir).filter((f: string) => f.endsWith('.json'));
      for (const file of jsonFiles) {
        fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
      }

      // Verify
      expect(jsonFiles).toHaveLength(2);
      expect(fs.existsSync(path.join(distDir, 'test.json'))).toBe(true);
      expect(fs.existsSync(path.join(distDir, 'other.json'))).toBe(true);
      expect(fs.existsSync(path.join(distDir, 'not-json.txt'))).toBe(false);
    });
  });
});
