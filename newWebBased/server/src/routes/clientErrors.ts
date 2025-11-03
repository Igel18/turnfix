import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * Client-side error logging endpoint
 * POST /api/client-errors
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, componentStack, url, userAgent } = req.body;

    // Log the client error
    console.error('❌ CLIENT ERROR:', {
      timestamp: new Date().toISOString(),
      error,
      componentStack,
      url,
      userAgent,
      ip: req.ip
    });

    // In production, you might want to:
    // - Save to database
    // - Send to error tracking service (Sentry, etc.)
    // - Send email notification for critical errors

    res.status(200).json({ 
      success: true, 
      message: 'Error logged successfully' 
    });
  } catch (error) {
    console.error('Failed to log client error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to log error' 
    });
  }
});

export default router;
