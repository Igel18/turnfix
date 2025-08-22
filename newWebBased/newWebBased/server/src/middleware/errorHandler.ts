import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export const createAppError = (message: string, statusCode: number): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
    return;
  }

  // Handle custom app errors
  if ('statusCode' in error && 'isOperational' in error) {
    const appError = error as AppError;
    res.status(appError.statusCode).json({
      success: false,
      message: appError.message
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Token expired'
    });
    return;
  }

  // Handle Prisma errors
  if (error.message.includes('Unique constraint')) {
    res.status(409).json({
      success: false,
      message: 'Resource already exists'
    });
    return;
  }

  // Default error
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
};
