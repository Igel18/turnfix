import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { createAppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      throw createAppError('Access token required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // TODO: Implement user authentication with proper user model
    // const user = await prisma.user.findUnique({
    //   where: { id: decoded.userId },
    //   select: { id: true, email: true, username: true, role: true, isActive: true }
    // });

    // if (!user || !user.isActive) {
    //   throw createAppError('User not found or inactive', 401);
    // }

    // For now, create a mock user object
    const user = {
      id: decoded.userId || 1,
      email: decoded.email || 'admin@turnfix.com',
      username: decoded.username || 'admin',
      role: decoded.role || 'admin',
      isActive: true
    };

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createAppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createAppError('Insufficient permissions', 403));
    }

    next();
  };
};

export const requireAuth = [authenticateToken];
export const requireAdmin = [authenticateToken, requireRole('ADMIN')];
export const requireOrganizer = [authenticateToken, requireRole('ADMIN', 'ORGANIZER')];
