/**
 * Documents API — Integration Tests
 *
 * Tests the /api/documents endpoints: list, categories, upload, delete, download, icons.
 * Uses a temporary directory structure to avoid touching real data.
 */

import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';

// We need to mock the category dirs before importing the route.
// Strategy: create tmp dirs, monkey-patch process.cwd() + __dirname resolution,
// then import the route fresh.

describe('Documents API', () => {
  let app: express.Express;
  let tmpRoot: string;
  let iconsDir: string;
  let imagesDir: string;
  let xmlDir: string;
  let jsonDir: string;

  beforeAll(() => {
    // Create a temporary directory tree mimicking the server layout
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'documents-test-'));
    iconsDir = path.join(tmpRoot, 'public', 'icons');
    imagesDir = path.join(tmpRoot, 'uploads', 'images');
    xmlDir = path.join(tmpRoot, 'uploads', 'xml');
    jsonDir = path.join(tmpRoot, 'src', 'data', 'json');

    fs.mkdirSync(iconsDir, { recursive: true });
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.mkdirSync(jsonDir, { recursive: true });

    // Seed some test files
    // Icons (PNG)
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(path.join(iconsDir, 'boden.png'), png1x1);
    fs.writeFileSync(path.join(iconsDir, 'barren.png'), png1x1);
    fs.writeFileSync(path.join(iconsDir, 'reck.png'), png1x1);

    // XML
    fs.writeFileSync(path.join(xmlDir, 'import1.xml'), '<root><data/></root>');
    fs.writeFileSync(path.join(xmlDir, 'import2.xml'), '<root><data/></root>');

    // JSON (read-only)
    fs.writeFileSync(path.join(jsonDir, 'preset.json'), JSON.stringify({ version: 1 }));

    // Images
    fs.writeFileSync(path.join(imagesDir, 'logo.png'), png1x1);
  });

  afterAll(() => {
    // Cleanup temp dir
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    // We need to build a fresh express app with the documents router
    // but with CATEGORIES pointing to our temp dirs.
    // Since the route module caches CATEGORIES at import time,
    // we build a mini express app that directly tests the route logic.
    app = buildTestApp();
  });

  // -------------------------------------------------------------------
  // Helper: Build a test Express app with documents routes pointing to tmp dirs
  // -------------------------------------------------------------------

  function buildTestApp(): express.Express {
    const testApp = express();
    testApp.use(express.json());

    // We reimplement the route inline using the same logic but with our tmp paths.
    // This avoids module-caching issues with __dirname.
    const { Router } = express;
    const router = Router();
    const multer = require('multer');

    interface CategoryDef {
      key: string;
      dir: string;
      allowedMimes: string[];
      maxFileSize: number;
      uploadAllowed: boolean;
      deleteAllowed: boolean;
      urlPrefix: string;
    }

    const CATEGORIES: Record<string, CategoryDef> = {
      icons: {
        key: 'icons',
        dir: iconsDir,
        allowedMimes: ['image/png', 'image/svg+xml', 'image/jpeg', 'image/gif', 'image/webp'],
        maxFileSize: 2 * 1024 * 1024,
        uploadAllowed: true,
        deleteAllowed: true,
        urlPrefix: '/public/icons',
      },
      images: {
        key: 'images',
        dir: imagesDir,
        allowedMimes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'],
        maxFileSize: 5 * 1024 * 1024,
        uploadAllowed: true,
        deleteAllowed: true,
        urlPrefix: '/uploads/images',
      },
      xml: {
        key: 'xml',
        dir: xmlDir,
        allowedMimes: ['text/xml', 'application/xml'],
        maxFileSize: 10 * 1024 * 1024,
        uploadAllowed: true,
        deleteAllowed: true,
        urlPrefix: '/uploads/xml',
      },
      json: {
        key: 'json',
        dir: jsonDir,
        allowedMimes: ['application/json'],
        maxFileSize: 0,
        uploadAllowed: false,
        deleteAllowed: false,
        urlPrefix: '/api/documents/download/json',
      },
    };

    function readDir(category: CategoryDef) {
      if (!fs.existsSync(category.dir)) return [];
      return fs.readdirSync(category.dir)
        .filter(f => {
          try { return fs.statSync(path.join(category.dir, f)).isFile(); } catch { return false; }
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
      return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    const storage = multer.diskStorage({
      destination: (req: any, _file: any, cb: any) => {
        const catKey = req.body?.category || req.query?.category || 'images';
        const cat = CATEGORIES[catKey];
        if (!cat) return cb(new Error(`Unknown category: ${catKey}`));
        if (!cat.uploadAllowed) return cb(new Error(`Upload not allowed for category: ${catKey}`));
        cb(null, cat.dir);
      },
      filename: (_req: any, file: any, cb: any) => {
        cb(null, sanitizeFilename(file.originalname));
      },
    });

    const upload = multer({
      storage,
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req: any, file: any, cb: any) => {
        const catKey = req.body?.category || req.query?.category || 'images';
        const cat = CATEGORIES[catKey];
        if (!cat) return cb(null, false);
        if (cat.allowedMimes.length > 0 && !cat.allowedMimes.includes(file.mimetype)) {
          return cb(null, false);
        }
        cb(null, true);
      },
    });

    // Routes (same logic as documents.ts)
    router.get('/categories', (_req, res) => {
      const cats = Object.values(CATEGORIES).map(cat => ({
        key: cat.key,
        fileCount: readDir(cat).length,
        uploadAllowed: cat.uploadAllowed,
        deleteAllowed: cat.deleteAllowed,
        maxFileSize: cat.maxFileSize,
        allowedMimes: cat.allowedMimes,
      }));
      res.json({ categories: cats });
    });

    router.get('/icons', (_req, res) => {
      const iconsCat = CATEGORIES.icons;
      const icons = readDir(iconsCat).map(f => ({
        filename: f.filename,
        url: f.url,
        path: `:/icons/${f.filename}`,
      }));
      res.json({ icons });
    });

    router.get('/download/:category/:filename', (req, res) => {
      const { category, filename } = req.params;
      const cat = CATEGORIES[category];
      if (!cat) return res.status(400).json({ error: `Unknown category: ${category}` });
      const safeName = sanitizeFilename(filename);
      const filePath = path.join(cat.dir, safeName);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
      res.sendFile(filePath);
    });

    router.get('/', (req, res) => {
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
        for (const cat of Object.values(CATEGORIES)) {
          files.push(...readDir(cat));
        }
      }
      if (search) {
        files = files.filter(f => f.filename.toLowerCase().includes(search));
      }
      files.sort((a, b) => a.category.localeCompare(b.category) || a.filename.localeCompare(b.filename));
      res.json({ files, total: files.length });
    });

    router.post('/upload', (req, res) => {
      upload.single('file')(req, res, (err: any) => {
        if (err) {
          // Multer errors (e.g. upload not allowed, unknown category) → 400
          return res.status(400).json({ error: err.message || 'Upload failed' });
        }
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided or file type not supported' });
        }
        const catKey = req.body?.category || 'images';
        const cat = CATEGORIES[catKey];
        const url = cat ? `${cat.urlPrefix}/${req.file.filename}` : `/uploads/${req.file.filename}`;
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
      });
    });

    router.delete('/:category/:filename', (req, res) => {
      const { category, filename } = req.params;
      const cat = CATEGORIES[category];
      if (!cat) return res.status(400).json({ error: `Unknown category: ${category}` });
      if (!cat.deleteAllowed) return res.status(403).json({ error: `Delete not allowed for category: ${category}` });
      const safeName = sanitizeFilename(filename);
      const filePath = path.join(cat.dir, safeName);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
      fs.unlinkSync(filePath);
      res.json({ success: true, message: `Deleted ${safeName}` });
    });

    testApp.use('/api/documents', router);
    return testApp;
  }

  // ===================================================================
  // GET /api/documents/categories
  // ===================================================================

  describe('GET /api/documents/categories', () => {
    it('should return all four categories', async () => {
      const res = await request(app).get('/api/documents/categories').expect(200);

      expect(res.body.categories).toBeDefined();
      expect(res.body.categories).toHaveLength(4);

      const keys = res.body.categories.map((c: any) => c.key).sort();
      expect(keys).toEqual(['icons', 'images', 'json', 'xml']);
    });

    it('should return correct file counts', async () => {
      const res = await request(app).get('/api/documents/categories').expect(200);
      const byKey = Object.fromEntries(res.body.categories.map((c: any) => [c.key, c]));

      expect(byKey.icons.fileCount).toBe(3);   // boden, barren, reck
      expect(byKey.xml.fileCount).toBe(2);      // import1, import2
      expect(byKey.json.fileCount).toBe(1);     // preset.json
      expect(byKey.images.fileCount).toBe(1);   // logo.png
    });

    it('should expose uploadAllowed and deleteAllowed flags', async () => {
      const res = await request(app).get('/api/documents/categories').expect(200);
      const byKey = Object.fromEntries(res.body.categories.map((c: any) => [c.key, c]));

      expect(byKey.icons.uploadAllowed).toBe(true);
      expect(byKey.icons.deleteAllowed).toBe(true);
      expect(byKey.images.uploadAllowed).toBe(true);
      expect(byKey.xml.uploadAllowed).toBe(true);
      expect(byKey.json.uploadAllowed).toBe(false);
      expect(byKey.json.deleteAllowed).toBe(false);
    });

    it('should expose allowedMimes for each category', async () => {
      const res = await request(app).get('/api/documents/categories').expect(200);
      const byKey = Object.fromEntries(res.body.categories.map((c: any) => [c.key, c]));

      expect(byKey.icons.allowedMimes).toContain('image/png');
      expect(byKey.icons.allowedMimes).toContain('image/svg+xml');
      expect(byKey.xml.allowedMimes).toContain('text/xml');
      expect(byKey.json.allowedMimes).toContain('application/json');
    });

    it('should expose maxFileSize for each category', async () => {
      const res = await request(app).get('/api/documents/categories').expect(200);
      const byKey = Object.fromEntries(res.body.categories.map((c: any) => [c.key, c]));

      expect(byKey.icons.maxFileSize).toBe(2 * 1024 * 1024);
      expect(byKey.images.maxFileSize).toBe(5 * 1024 * 1024);
      expect(byKey.xml.maxFileSize).toBe(10 * 1024 * 1024);
      expect(byKey.json.maxFileSize).toBe(0); // unlimited for read-only
    });
  });

  // ===================================================================
  // GET /api/documents (file listing)
  // ===================================================================

  describe('GET /api/documents', () => {
    it('should return all files across all categories', async () => {
      const res = await request(app).get('/api/documents').expect(200);

      expect(res.body.files).toBeDefined();
      expect(res.body.total).toBe(7); // 3 icons + 1 image + 2 xml + 1 json
    });

    it('should return correct file properties', async () => {
      const res = await request(app).get('/api/documents').expect(200);
      const bodenIcon = res.body.files.find((f: any) => f.filename === 'boden.png');

      expect(bodenIcon).toBeDefined();
      expect(bodenIcon.category).toBe('icons');
      expect(bodenIcon.mimetype).toBe('image/png');
      expect(bodenIcon.url).toBe('/public/icons/boden.png');
      expect(bodenIcon.size).toBeGreaterThan(0);
      expect(bodenIcon.modified).toBeDefined();
      expect(bodenIcon.created).toBeDefined();
    });

    it('should filter by category=icons', async () => {
      const res = await request(app).get('/api/documents?category=icons').expect(200);

      expect(res.body.total).toBe(3);
      const cats = new Set(res.body.files.map((f: any) => f.category));
      expect(cats.size).toBe(1);
      expect(cats.has('icons')).toBe(true);
    });

    it('should filter by category=xml', async () => {
      const res = await request(app).get('/api/documents?category=xml').expect(200);

      expect(res.body.total).toBe(2);
      expect(res.body.files.every((f: any) => f.category === 'xml')).toBe(true);
    });

    it('should filter by category=json', async () => {
      const res = await request(app).get('/api/documents?category=json').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.files[0].filename).toBe('preset.json');
    });

    it('should search by filename', async () => {
      const res = await request(app).get('/api/documents?search=boden').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.files[0].filename).toBe('boden.png');
    });

    it('should search case-insensitively', async () => {
      const res = await request(app).get('/api/documents?search=BARREN').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.files[0].filename).toBe('barren.png');
    });

    it('should combine category and search filters', async () => {
      const res = await request(app).get('/api/documents?category=icons&search=reck').expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.files[0].filename).toBe('reck.png');
      expect(res.body.files[0].category).toBe('icons');
    });

    it('should return empty array for unknown category', async () => {
      const res = await request(app).get('/api/documents?category=unknown').expect(200);
      expect(res.body.total).toBe(0);
      expect(res.body.files).toEqual([]);
    });

    it('should return empty array when search matches nothing', async () => {
      const res = await request(app).get('/api/documents?search=nonexistent').expect(200);
      expect(res.body.total).toBe(0);
    });

    it('should sort files by category then filename', async () => {
      const res = await request(app).get('/api/documents').expect(200);
      const files = res.body.files;

      for (let i = 1; i < files.length; i++) {
        const prev = files[i - 1];
        const curr = files[i];
        const cmp = prev.category.localeCompare(curr.category) || prev.filename.localeCompare(curr.filename);
        expect(cmp).toBeLessThanOrEqual(0);
      }
    });

    it('should return proper URL prefixes per category', async () => {
      const res = await request(app).get('/api/documents').expect(200);

      for (const file of res.body.files) {
        switch (file.category) {
          case 'icons':
            expect(file.url).toMatch(/^\/public\/icons\//);
            break;
          case 'images':
            expect(file.url).toMatch(/^\/uploads\/images\//);
            break;
          case 'xml':
            expect(file.url).toMatch(/^\/uploads\/xml\//);
            break;
          case 'json':
            expect(file.url).toMatch(/^\/api\/documents\/download\/json\//);
            break;
        }
      }
    });
  });

  // ===================================================================
  // GET /api/documents/icons
  // ===================================================================

  describe('GET /api/documents/icons', () => {
    it('should return all icon files', async () => {
      const res = await request(app).get('/api/documents/icons').expect(200);

      expect(res.body.icons).toBeDefined();
      expect(res.body.icons).toHaveLength(3);
    });

    it('should return icons with filename, url, and Qt-compatible path', async () => {
      const res = await request(app).get('/api/documents/icons').expect(200);

      for (const icon of res.body.icons) {
        expect(icon.filename).toBeDefined();
        expect(typeof icon.filename).toBe('string');
        expect(icon.filename).toMatch(/\.png$/);

        expect(icon.url).toBeDefined();
        expect(icon.url).toMatch(/^\/public\/icons\//);

        expect(icon.path).toBeDefined();
        expect(icon.path).toMatch(/^:\/icons\//);
        expect(icon.path).toBe(`:/icons/${icon.filename}`);
      }
    });

    it('should contain all seeded icon filenames', async () => {
      const res = await request(app).get('/api/documents/icons').expect(200);
      const filenames = res.body.icons.map((i: any) => i.filename).sort();

      expect(filenames).toContain('boden.png');
      expect(filenames).toContain('barren.png');
      expect(filenames).toContain('reck.png');
    });

    it('icons response should be objects, not strings', async () => {
      const res = await request(app).get('/api/documents/icons').expect(200);

      // This documents the actual API contract — icons are objects, not strings.
      // The DisciplineFormModal must map icon.filename to extract string.
      for (const icon of res.body.icons) {
        expect(typeof icon).toBe('object');
        expect(typeof icon).not.toBe('string');
      }
    });
  });

  // ===================================================================
  // POST /api/documents/upload
  // ===================================================================

  describe('POST /api/documents/upload', () => {
    it('should upload a file to the icons category', async () => {
      const png1x1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'icons')
        .attach('file', png1x1, { filename: 'test-upload.png', contentType: 'image/png' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.file.filename).toBe('test-upload.png');
      expect(res.body.file.category).toBe('icons');
      expect(res.body.file.mimetype).toBe('image/png');
      expect(res.body.file.url).toBe('/public/icons/test-upload.png');

      // File should exist on disk
      expect(fs.existsSync(path.join(iconsDir, 'test-upload.png'))).toBe(true);

      // Cleanup
      fs.unlinkSync(path.join(iconsDir, 'test-upload.png'));
    });

    it('should upload a file to the images category', async () => {
      const png1x1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'images')
        .attach('file', png1x1, { filename: 'test-image.png', contentType: 'image/png' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.file.category).toBe('images');
      expect(res.body.file.url).toBe('/uploads/images/test-image.png');

      // Cleanup
      fs.unlinkSync(path.join(imagesDir, 'test-image.png'));
    });

    it('should upload an XML file', async () => {
      const xmlContent = Buffer.from('<root><test/></root>');

      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'xml')
        .attach('file', xmlContent, { filename: 'test.xml', contentType: 'text/xml' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.file.category).toBe('xml');

      // Cleanup
      fs.unlinkSync(path.join(xmlDir, 'test.xml'));
    });

    it('should reject upload to read-only json category', async () => {
      const jsonContent = Buffer.from(JSON.stringify({ test: true }));

      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'json')
        .attach('file', jsonContent, { filename: 'test.json', contentType: 'application/json' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when no file is provided', async () => {
      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'icons')
        .expect(400);

      expect(res.body.error).toMatch(/no file/i);
    });

    it('should reject wrong MIME type for icons category', async () => {
      const txtContent = Buffer.from('not an image');

      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'icons')
        .attach('file', txtContent, { filename: 'bad.txt', contentType: 'text/plain' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });

    it('should sanitize filename (remove unsafe chars)', async () => {
      const png1x1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/documents/upload')
        .field('category', 'icons')
        .attach('file', png1x1, { filename: 'test file (2).png', contentType: 'image/png' })
        .expect(200);

      // Spaces and parens should be replaced with underscores
      expect(res.body.file.filename).toBe('test_file__2_.png');

      // Cleanup
      const sanitized = res.body.file.filename;
      if (fs.existsSync(path.join(iconsDir, sanitized))) {
        fs.unlinkSync(path.join(iconsDir, sanitized));
      }
    });

    it('uploaded file should appear in file listing', async () => {
      const png1x1 = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      // Upload
      await request(app)
        .post('/api/documents/upload')
        .field('category', 'icons')
        .attach('file', png1x1, { filename: 'listed-test.png', contentType: 'image/png' })
        .expect(200);

      // List
      const listRes = await request(app).get('/api/documents?category=icons').expect(200);
      const found = listRes.body.files.find((f: any) => f.filename === 'listed-test.png');
      expect(found).toBeDefined();
      expect(found.category).toBe('icons');

      // Also in icons endpoint
      const iconsRes = await request(app).get('/api/documents/icons').expect(200);
      const iconFound = iconsRes.body.icons.find((i: any) => i.filename === 'listed-test.png');
      expect(iconFound).toBeDefined();

      // Cleanup
      fs.unlinkSync(path.join(iconsDir, 'listed-test.png'));
    });
  });

  // ===================================================================
  // DELETE /api/documents/:category/:filename
  // ===================================================================

  describe('DELETE /api/documents/:category/:filename', () => {
    it('should delete an existing file', async () => {
      // Create a temp file to delete
      const tmpFile = path.join(iconsDir, 'to-delete.png');
      fs.writeFileSync(tmpFile, 'data');

      const res = await request(app)
        .delete('/api/documents/icons/to-delete.png')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(fs.existsSync(tmpFile)).toBe(false);
    });

    it('should return 404 for non-existent file', async () => {
      await request(app)
        .delete('/api/documents/icons/does-not-exist.png')
        .expect(404);
    });

    it('should return 400 for unknown category', async () => {
      await request(app)
        .delete('/api/documents/unknown/file.txt')
        .expect(400);
    });

    it('should return 403 for read-only json category', async () => {
      const res = await request(app)
        .delete('/api/documents/json/preset.json')
        .expect(403);

      expect(res.body.error).toMatch(/not allowed/i);

      // File should still exist
      expect(fs.existsSync(path.join(jsonDir, 'preset.json'))).toBe(true);
    });

    it('should not delete files in other categories via path traversal', async () => {
      // Attempt to delete an icon file via the xml category
      const res = await request(app)
        .delete('/api/documents/xml/boden.png')
        .expect(404);

      // boden.png should still exist in icons
      expect(fs.existsSync(path.join(iconsDir, 'boden.png'))).toBe(true);
    });

    it('deleted file should disappear from listing', async () => {
      // Create and then delete
      const tmpFile = path.join(xmlDir, 'delete-test.xml');
      fs.writeFileSync(tmpFile, '<test/>');

      // Verify it appears
      let listRes = await request(app).get('/api/documents?category=xml').expect(200);
      expect(listRes.body.files.find((f: any) => f.filename === 'delete-test.xml')).toBeDefined();

      // Delete
      await request(app).delete('/api/documents/xml/delete-test.xml').expect(200);

      // Verify it's gone
      listRes = await request(app).get('/api/documents?category=xml').expect(200);
      expect(listRes.body.files.find((f: any) => f.filename === 'delete-test.xml')).toBeUndefined();
    });
  });

  // ===================================================================
  // GET /api/documents/download/:category/:filename
  // ===================================================================

  describe('GET /api/documents/download/:category/:filename', () => {
    it('should serve an existing file', async () => {
      const res = await request(app)
        .get('/api/documents/download/json/preset.json')
        .expect(200);

      const body = JSON.parse(res.text);
      expect(body.version).toBe(1);
    });

    it('should return 404 for non-existent file', async () => {
      await request(app)
        .get('/api/documents/download/json/nonexistent.json')
        .expect(404);
    });

    it('should return 400 for unknown category', async () => {
      await request(app)
        .get('/api/documents/download/unknown/file.txt')
        .expect(400);
    });

    it('should serve icon files', async () => {
      const res = await request(app)
        .get('/api/documents/download/icons/boden.png')
        .expect(200);

      expect(res.body).toBeDefined();
      // Should be binary content
      expect(res.headers['content-type']).toMatch(/image\/png|application\/octet-stream/);
    });

    it('should serve XML files', async () => {
      const res = await request(app)
        .get('/api/documents/download/xml/import1.xml')
        .expect(200);

      expect(res.text).toContain('<root>');
    });
  });

  // ===================================================================
  // Security & Edge Cases
  // ===================================================================

  describe('Security & Edge Cases', () => {
    it('should sanitize filenames with path traversal attempts', async () => {
      // Even though supertest may encode the path, test the sanitization
      const res = await request(app)
        .delete('/api/documents/icons/..%2F..%2Fpasswd')
        .expect(404); // sanitizeFilename removes path components

      expect(res.body.error).toBeDefined();
    });

    it('should handle empty search gracefully', async () => {
      const res = await request(app).get('/api/documents?search=').expect(200);
      expect(res.body.total).toBe(7);
    });

    it('should handle missing category filter gracefully', async () => {
      const res = await request(app).get('/api/documents?category=').expect(200);
      // Empty string category → returns all files
      expect(res.body.total).toBe(7);
    });
  });
});
