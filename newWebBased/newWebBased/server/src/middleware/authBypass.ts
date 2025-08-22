// Temporary authentication bypass middleware
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
  file?: any; // Multer file object
}

// Temporary bypass for authentication during development
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Bypass authentication - add a dummy user
  req.user = {
    id: '1',
    email: 'admin@turnfix.com', 
    username: 'admin',
    role: 'admin'
  };
  next();
};
