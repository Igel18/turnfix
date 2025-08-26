"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.createAppError = void 0;
const zod_1 = require("zod");
const createAppError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createAppError = createAppError;
const errorHandler = (error, req, res, next) => {
    console.error('Error:', error);
    // Handle Zod validation errors
    if (error instanceof zod_1.ZodError) {
        res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.issues.map((err) => ({
                field: err.path.join('.'),
                message: err.message
            }))
        });
        return;
    }
    // Handle custom app errors
    if ('statusCode' in error && 'isOperational' in error) {
        const appError = error;
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
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map