"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOrganizer = exports.requireAdmin = exports.requireAuth = exports.requireRole = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const errorHandler_1 = require("./errorHandler");
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            throw (0, errorHandler_1.createAppError)('Access token required', 401);
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
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
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next((0, errorHandler_1.createAppError)('Authentication required', 401));
        }
        if (!roles.includes(req.user.role)) {
            return next((0, errorHandler_1.createAppError)('Insufficient permissions', 403));
        }
        next();
    };
};
exports.requireRole = requireRole;
exports.requireAuth = [exports.authenticateToken];
exports.requireAdmin = [exports.authenticateToken, (0, exports.requireRole)('ADMIN')];
exports.requireOrganizer = [exports.authenticateToken, (0, exports.requireRole)('ADMIN', 'ORGANIZER')];
//# sourceMappingURL=auth.js.map