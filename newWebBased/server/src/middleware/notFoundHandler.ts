import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response) => {
  // Only handle API routes - let frontend handle all other routes
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  } else {
    // For non-API routes, this should not be reached if frontend is properly configured
    // but just in case, send a generic 404
    res.status(404).send('Page not found');
  }
};
