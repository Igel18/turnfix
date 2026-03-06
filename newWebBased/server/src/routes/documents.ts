/**
 * Documents API — Unified file management for all upload categories.
 *
 * Categories:
 *   icons    → server/public/icons/     (discipline icons, PNG/SVG)
 *   images   → uploads/images/          (certificate / layout images)
 *   xml      → uploads/xml/             (GymNet XML imports)
 *   json     → server/src/data/json/    (preset JSON files, read-only browse)
 *
 * Endpoints:
 *   GET    /api/documents              List files (optional ?category=...)
 *   GET    /api/documents/categories   List available categories with counts
 *   POST   /api/documents/upload       Upload a file (multipart, field "file")
 *   DELETE /api/documents/:category/:filename  Delete a file
 *   GET    /api/documents/download/:category/:filename  Download / serve a file
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
const multer = require('multer');

const router = Router();

// ---------------------------------------------------------------------------
// Category definitions — single source of truth
// ---------------------------------------------------------------------------

interface CategoryDef {
  /** Display key (used in API responses) */
  key: string;
  /** Absolute directory on disk */
  dir: string;
  /** Allowed MIME types (empty = all) */
  allowedMimes: string[];
  /** Maximum file size in bytes (0 = unlimited) */
  maxFileSize: number;
  /** Whether upload is allowed (false = read-only) */
  uploadAllowed: boolean;
  /** Whether delete is allowed */
  deleteAllowed: boolean;
  /** URL prefix for serving the file (if different from /uploads/) */
  urlPrefix: string;
}

// __dirname = .../server/src/routes  →  go up 2 levels to get server root
const serverRoot = path.resolve(__dirname, '..', '..');

// uploads/ is served via express.static('uploads') which resolves relative to
// process.cwd().  The images.ts route also uses process.cwd().  We must use the
// same base so Documents sees the files that were uploaded via the layout editor.
const uploadsRoot = process.cwd();

const CATEGORIES: Record<string, CategoryDef> = {
  icons: {
    key: 'icons',
    dir: path.join(serverRoot, 'public', 'icons'),
    allowedMimes: ['image/png', 'image/svg+xml', 'image/jpeg', 'image/gif', 'image/webp'],
    maxFileSize: 2 * 1024 * 1024, // 2 MB
    uploadAllowed: true,
    deleteAllowed: true,
    urlPrefix: '/public/icons',
  },
  images: {
    key: 'images',
    dir: path.join(uploadsRoot, 'uploads', 'images'),
    allowedMimes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    uploadAllowed: true,
    deleteAllowed: true,
    urlPrefix: '/uploads/images',
  },
  xml: {
    key: 'xml',
    dir: path.join(uploadsRoot, 'uploads', 'xml'),
    allowedMimes: ['text/xml', 'application/xml'],
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    uploadAllowed: true,
    deleteAllowed: true,
    urlPrefix: '/uploads/xml',
  },
  json: {
    key: 'json',
    dir: path.join(serverRoot, 'src', 'data', 'json'),
    allowedMimes: ['application/json'],
    maxFileSize: 0,
    uploadAllowed: false, // preset JSONs are read-only via this UI
    deleteAllowed: false,
    urlPrefix: '/api/documents/download/json', // served through our endpoint
  },
};

// Ensure directories exist
for (const cat of Object.values(CATEGORIES)) {
  if (!fs.existsSync(cat.dir)) {
    fs.mkdirSync(cat.dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readDir(category: CategoryDef): Array<{
  filename: string;
  category: string;
  size: number;
  modified: string;
  created: string;
  mimetype: string;
  url: string;
}> {
  if (!fs.existsSync(category.dir)) return [];

  return fs.readdirSync(category.dir)
    .filter(f => {
      const fullPath = path.join(category.dir, f);
      try { return fs.statSync(fullPath).isFile(); } catch { return false; }
    })
    .map(filename => {
      const fullPath = path.join(category.dir, filename);
      const stats = fs.statSync(fullPath);
      const ext = path.extname(filename).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        '.xml': 'application/xml', '.json': 'application/json',
      };
      return {
        filename,
        category: category.key,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        mimetype: mimeMap[ext] || 'application/octet-stream',
        url: `${category.urlPrefix}/${filename}`,
      };
    });
}

function sanitizeFilename(name: string): string {
  // Remove path components, keep only the base name, replace unsafe chars
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

// ---------------------------------------------------------------------------
// Multer setup — dynamic destination per category
// ---------------------------------------------------------------------------

const storage = multer.diskStorage({
  destination: (req: any, _file: any, cb: any) => {
    const catKey = req.body?.category || req.query?.category || 'images';
    const cat = CATEGORIES[catKey];
    if (!cat) return cb(new Error(`Unknown category: ${catKey}`));
    if (!cat.uploadAllowed) return cb(new Error(`Upload not allowed for category: ${catKey}`));
    cb(null, cat.dir);
  },
  filename: (_req: any, file: any, cb: any) => {
    // Keep original name but sanitise
    const sanitized = sanitizeFilename(file.originalname);
    // If file already exists, add timestamp
    const catKey = _req.body?.category || _req.query?.category || 'images';
    const cat = CATEGORIES[catKey];
    if (cat && fs.existsSync(path.join(cat.dir, sanitized))) {
      const ext = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      cb(null, `${base}-${Date.now()}${ext}`);
    } else {
      cb(null, sanitized);
    }
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // global max 10 MB
  fileFilter: (req: any, file: any, cb: any) => {
    const catKey = req.body?.category || req.query?.category || 'images';
    const cat = CATEGORIES[catKey];
    if (!cat) return cb(null, false);
    if (cat.allowedMimes.length > 0 && !cat.allowedMimes.includes(file.mimetype)) {
      return cb(null, false);
    }
    // Per-category size limit is enforced after upload (multer doesn't support dynamic limits easily)
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/documents/count
 * Returns total file count across all categories
 */
router.get('/count', (_req: Request, res: Response) => {
  try {
    let total = 0;
    for (const cat of Object.values(CATEGORIES)) {
      total += readDir(cat).length;
    }
    res.json({ count: total });
  } catch (error) {
    console.error('[Documents] Error counting files:', error);
    res.status(500).json({ error: 'Failed to count files' });
  }
});

/**
 * GET /api/documents/categories
 * Returns list of categories with file counts
 */
router.get('/categories', (_req: Request, res: Response) => {
  try {
    const cats = Object.values(CATEGORIES).map(cat => ({
      key: cat.key,
      fileCount: readDir(cat).length,
      uploadAllowed: cat.uploadAllowed,
      deleteAllowed: cat.deleteAllowed,
      maxFileSize: cat.maxFileSize,
      allowedMimes: cat.allowedMimes,
    }));
    res.json({ categories: cats });
  } catch (error) {
    console.error('[Documents] Error listing categories:', error);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

/**
 * GET /api/documents?category=icons&search=boden
 * Lists files, optionally filtered by category and search term
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const categoryFilter = req.query.category as string | undefined;
    const search = (req.query.search as string || '').toLowerCase();

    let files: ReturnType<typeof readDir> = [];

    if (categoryFilter) {
      // Specific category requested
      if (CATEGORIES[categoryFilter]) {
        files = readDir(CATEGORIES[categoryFilter]);
      }
      // else: unknown category → files stays empty
    } else {
      // All categories
      for (const cat of Object.values(CATEGORIES)) {
        files.push(...readDir(cat));
      }
    }

    // Search filter
    if (search) {
      files = files.filter(f => f.filename.toLowerCase().includes(search));
    }

    // Sort by category then filename
    files.sort((a, b) => a.category.localeCompare(b.category) || a.filename.localeCompare(b.filename));

    res.json({
      files,
      total: files.length,
    });
  } catch (error) {
    console.error('[Documents] Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

/**
 * POST /api/documents/upload
 * Upload a file. Send as multipart/form-data with field "file" and "category".
 */
router.post('/upload', (req: Request, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      // Multer errors (e.g. upload not allowed, unknown category) → 400
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided or file type not supported',
        });
      }

      const catKey = req.body?.category || 'images';
      const cat = CATEGORIES[catKey];

      // Check per-category size limit
      if (cat && cat.maxFileSize > 0 && req.file.size > cat.maxFileSize) {
        // File too large — delete and report
        fs.unlinkSync(req.file.path);
        return res.status(413).json({
          error: `File too large for category "${catKey}". Max: ${Math.round(cat.maxFileSize / 1024 / 1024)} MB`,
        });
      }

      const url = cat ? `${cat.urlPrefix}/${req.file.filename}` : `/uploads/${req.file.filename}`;

      console.log(`[Documents] Uploaded: ${req.file.filename} → ${catKey} (${req.file.size} bytes)`);

      res.json({
        success: true,
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          category: catKey,
          size: req.file.size,
          mimetype: req.file.mimetype,
          url,
        },
      });
    } catch (error) {
      console.error('[Documents] Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });
});

/**
 * DELETE /api/documents/:category/:filename
 */
router.delete('/:category/:filename', (req: Request, res: Response) => {
  try {
    const { category, filename } = req.params;
    const cat = CATEGORIES[category];

    if (!cat) return res.status(400).json({ error: `Unknown category: ${category}` });
    if (!cat.deleteAllowed) return res.status(403).json({ error: `Delete not allowed for category: ${category}` });

    const safeName = sanitizeFilename(filename);
    const filePath = path.join(cat.dir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    console.log(`[Documents] Deleted: ${category}/${safeName}`);
    res.json({ success: true, message: `Deleted ${safeName}` });
  } catch (error) {
    console.error('[Documents] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

/**
 * GET /api/documents/download/:category/:filename
 * Serves the file as a download (or inline for images)
 */
router.get('/download/:category/:filename', (req: Request, res: Response) => {
  try {
    const { category, filename } = req.params;
    const cat = CATEGORIES[category];

    if (!cat) return res.status(400).json({ error: `Unknown category: ${category}` });

    const safeName = sanitizeFilename(filename);
    const filePath = path.join(cat.dir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('[Documents] Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

/**
 * GET /api/documents/icons
 * Helper: list available icon filenames (for discipline icon dropdown)
 */
router.get('/icons', (_req: Request, res: Response) => {
  try {
    const iconsCat = CATEGORIES.icons;
    const icons = readDir(iconsCat).map(f => ({
      filename: f.filename,
      url: f.url,
      path: `:/icons/${f.filename}`, // Qt-compatible path for DB storage
    }));
    res.json({ icons });
  } catch (error) {
    console.error('[Documents] Error listing icons:', error);
    res.status(500).json({ error: 'Failed to list icons' });
  }
});

export default router;
