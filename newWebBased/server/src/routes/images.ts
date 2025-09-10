import { Router } from 'express';
import { Request, Response } from 'express';
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    cb(null, uploadsDir);
  },
  filename: (req: any, file: any, cb: any) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `layout-image-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Check if the file is an image and has allowed extension
    const allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

// Upload image endpoint
router.post('/upload', upload.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided or file type not supported',
        supportedFormats: ['PNG', 'JPG', 'JPEG', 'GIF', 'WebP', 'SVG'],
        maxSize: '5MB'
      });
    }

    // Return the relative path that can be used by the frontend
    const imagePath = `/uploads/images/${req.file.filename}`;
    
    console.log(`✅ Image uploaded successfully: ${req.file.filename} (${req.file.size} bytes)`);
    
    res.json({
      success: true,
      imagePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Delete image endpoint
router.delete('/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Image deleted successfully' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get image info endpoint
router.get('/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      res.json({
        exists: true,
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      });
    } else {
      res.status(404).json({ exists: false, error: 'Image not found' });
    }
  } catch (error) {
    console.error('Image info error:', error);
    res.status(500).json({ error: 'Failed to get image info' });
  }
});

export default router;
