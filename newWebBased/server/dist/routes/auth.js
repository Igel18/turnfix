"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(50),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string()
});
const refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string()
});
// Helper functions
const generateTokens = (userId) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' });
    return { accessToken, refreshToken };
};
// Register
router.post('/register', async (req, res, next) => {
    try {
        const { email, username, password, firstName, lastName } = registerSchema.parse(req.body);
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }]
            }
        });
        if (existingUser) {
            throw (0, errorHandler_1.createAppError)('User with this email or username already exists', 409);
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 12);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                firstName,
                lastName
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true
            }
        });
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id);
        // Store refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            }
        });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user,
                tokens: { accessToken, refreshToken }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: { refreshTokens: true }
        });
        if (!user || !user.isActive) {
            throw (0, errorHandler_1.createAppError)('Invalid credentials', 401);
        }
        // Verify password
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            throw (0, errorHandler_1.createAppError)('Invalid credentials', 401);
        }
        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });
        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user.id);
        // Store refresh token
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        // Clean up old refresh tokens
        await prisma.refreshToken.deleteMany({
            where: {
                userId: user.id,
                expiresAt: { lt: new Date() }
            }
        });
        const userData = {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            lastLoginAt: user.lastLoginAt
        };
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userData,
                tokens: { accessToken, refreshToken }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Refresh token
router.post('/refresh', async (req, res, next) => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        // Find stored refresh token
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true }
        });
        if (!storedToken || storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
            throw (0, errorHandler_1.createAppError)('Invalid or expired refresh token', 401);
        }
        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(storedToken.userId);
        // Update refresh token
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: {
                token: newRefreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });
        res.json({
            success: true,
            data: {
                tokens: { accessToken, refreshToken: newRefreshToken }
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// Logout
router.post('/logout', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { refreshToken } = refreshTokenSchema.parse(req.body);
        // Delete refresh token
        await prisma.refreshToken.deleteMany({
            where: {
                token: refreshToken,
                userId: req.user.id
            }
        });
        res.json({
            success: true,
            message: 'Logout successful'
        });
    }
    catch (error) {
        next(error);
    }
});
// Get current user
router.get('/me', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                lastLoginAt: true
            }
        });
        res.json({
            success: true,
            data: { user }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map