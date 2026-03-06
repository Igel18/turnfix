/**
 * Post-build script:
 * 1. Copy @turnfix/shared into node_modules (if symlink doesn't exist)
 * 2. Copy JSON data files into dist/data/json/ (always)
 *
 * In development, @turnfix/shared is linked via npm workspace symlink.
 * In production (installer), the symlink doesn't exist — this script
 * copies the actual shared package files so require('@turnfix/shared') works.
 *
 * Safe to run in both environments:
 * - If a real directory copy exists → skips (already good)
 * - If a symlink exists → replaces with real copy (symlinks break on deploy)
 * - If missing or broken → copies from ../shared/
 */
const fs = require('fs');
const path = require('path');

// ── 1. Copy JSON data files into dist/ ───────────────────────────────
// TypeScript does not copy .json assets to outDir. The data loaders
// look for a sibling json/ folder first (dist/data/json/) before
// falling back to src/data/json/. Copying them ensures the server
// works even when src/ is not present (production / other PCs).
const jsonSource = path.resolve(__dirname, '..', 'src', 'data', 'json');
const jsonTarget = path.resolve(__dirname, '..', 'dist', 'data', 'json');

if (fs.existsSync(jsonSource)) {
  fs.mkdirSync(jsonTarget, { recursive: true });
  const jsonFiles = fs.readdirSync(jsonSource).filter(f => f.endsWith('.json'));
  for (const file of jsonFiles) {
    fs.copyFileSync(path.join(jsonSource, file), path.join(jsonTarget, file));
  }
  console.log(`✓ Copied ${jsonFiles.length} JSON data files to dist/data/json/`);
} else {
  console.warn('⚠ src/data/json/ not found — JSON data files not copied');
}

// ── 2. Copy @turnfix/shared ──────────────────────────────────────────
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

// If shared resolves via a REAL directory (not symlink), we can skip.
// If it resolves only because of a symlink, we MUST replace
// the symlink with a real copy — symlinks break when deployed
// to a different machine (production installer).
if (canResolveShared() && !isSymlinkOrJunction(sharedTarget)) {
  console.log('✓ @turnfix/shared already resolves (real copy) — skipping');
  process.exit(0);
}

if (isSymlinkOrJunction(sharedTarget)) {
  console.log('🔗 @turnfix/shared is a symlink — replacing with real copy for production');
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
