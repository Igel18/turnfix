/**
 * Post-build script: Copy @turnfix/shared into node_modules
 *
 * In development, @turnfix/shared is linked via npm workspace symlink.
 * In production (installer), the symlink doesn't exist — this script
 * copies the actual shared package files so require('@turnfix/shared') works.
 *
 * Safe to run in both environments:
 * - If the symlink exists and resolves → skips (dev is fine)
 * - If missing or broken → copies from ../shared/
 */
const fs = require('fs');
const path = require('path');

const sharedSource = path.resolve(__dirname, '..', '..', 'shared');
const sharedTarget = path.resolve(__dirname, '..', 'node_modules', '@turnfix', 'shared');

function isSymlinkOrJunction(p) {
  try {
    const stats = fs.lstatSync(p);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

function canResolveShared() {
  try {
    require.resolve('@turnfix/shared');
    return true;
  } catch {
    return false;
  }
}

// If shared already resolves (symlink works in dev), skip
if (canResolveShared()) {
  console.log('✓ @turnfix/shared already resolves — skipping copy');
  process.exit(0);
}

// Source must exist
if (!fs.existsSync(sharedSource)) {
  console.warn('⚠ Shared source not found at:', sharedSource);
  console.warn('  @turnfix/shared will not be available at runtime.');
  process.exit(0); // Don't fail the build
}

// Check that shared has been built
const sharedDist = path.join(sharedSource, 'dist', 'index.js');
if (!fs.existsSync(sharedDist)) {
  console.warn('⚠ Shared package not built (dist/index.js missing)');
  console.warn('  Run: cd ../shared && npm run build');
  process.exit(0);
}

console.log('📦 Copying @turnfix/shared into node_modules...');

// Remove broken symlink or old copy
if (fs.existsSync(sharedTarget) || isSymlinkOrJunction(sharedTarget)) {
  fs.rmSync(sharedTarget, { recursive: true, force: true });
}

// Ensure @turnfix directory exists
const turnfixDir = path.dirname(sharedTarget);
fs.mkdirSync(turnfixDir, { recursive: true });
fs.mkdirSync(sharedTarget, { recursive: true });

// Copy package.json
fs.copyFileSync(
  path.join(sharedSource, 'package.json'),
  path.join(sharedTarget, 'package.json')
);

// Copy dist/
const distSource = path.join(sharedSource, 'dist');
const distTarget = path.join(sharedTarget, 'dist');
fs.cpSync(distSource, distTarget, { recursive: true });

// Copy node_modules/ (for expr-eval dependency)
const nmSource = path.join(sharedSource, 'node_modules');
const nmTarget = path.join(sharedTarget, 'node_modules');
if (fs.existsSync(nmSource)) {
  fs.cpSync(nmSource, nmTarget, { recursive: true });
}

console.log('✓ @turnfix/shared copied successfully');
