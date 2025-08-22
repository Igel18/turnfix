"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    username: zod_1.z.string().min(3).max(50),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    role: zod_1.z.enum(['ADMIN', 'ORGANIZER', 'JUDGE', 'CLUB_ADMIN', 'USER']).default('USER'),
    isActive: zod_1.z.boolean().default(true)
});
const updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    username: zod_1.z.string().min(3).max(50).optional(),
    password: zod_1.z.string().min(6).optional(),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    role: zod_1.z.enum(['ADMIN', 'ORGANIZER', 'JUDGE', 'CLUB_ADMIN', 'USER']).optional(),
    isActive: zod_1.z.boolean().optional()
});
// Get all users with pagination
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        const role = req.query.role;
        const isActive = req.query.isActive;
        const whereConditions = {};
        if (search) {
            whereConditions.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (role) {
            whereConditions.role = role;
        }
        if (isActive !== undefined) {
            whereConditions.isActive = isActive === 'true';
        }
        const users = await prisma.user.findMany({
            where: whereConditions,
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
        });
        const totalCount = await prisma.user.count({
            where: whereConditions
        });
        res.json({
            users,
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                lastLoginAt: true,
                createdClubs: {
                    select: {
                        id: true,
                        name: true,
                        shortName: true
                    }
                },
                _count: {
                    select: {
                        auditLogs: true,
                        refreshTokens: true
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new user (Admin only)
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        // Check if current user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user?.id }
        });
        if (currentUser?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        const validatedData = createUserSchema.parse(req.body);
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: validatedData.email },
                    { username: validatedData.username }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.password, 12);
        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                username: validatedData.username,
                password: hashedPassword,
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                role: validatedData.role,
                isActive: validatedData.isActive
            },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.status(201).json({ user });
    }
    catch (error) {
        console.error('Error creating user:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update user
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const validatedData = updateUserSchema.parse(req.body);
        // Check if current user is admin or updating their own profile
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user?.id }
        });
        if (currentUser?.role !== 'ADMIN' && req.user?.id !== userId) {
            return res.status(403).json({ error: 'Access denied. You can only update your own profile or be an admin.' });
        }
        // Build update data
        const updateData = {};
        if (validatedData.email)
            updateData.email = validatedData.email;
        if (validatedData.username)
            updateData.username = validatedData.username;
        if (validatedData.firstName !== undefined)
            updateData.firstName = validatedData.firstName;
        if (validatedData.lastName !== undefined)
            updateData.lastName = validatedData.lastName;
        if (validatedData.isActive !== undefined)
            updateData.isActive = validatedData.isActive;
        // Only admins can change roles
        if (validatedData.role && currentUser?.role === 'ADMIN') {
            updateData.role = validatedData.role;
        }
        // Hash password if provided
        if (validatedData.password) {
            updateData.password = await bcryptjs_1.default.hash(validatedData.password, 12);
        }
        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({ user });
    }
    catch (error) {
        console.error('Error updating user:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete user (Admin only)
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        // Check if current user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user?.id }
        });
        if (currentUser?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        // Prevent self-deletion
        if (req.user?.id === userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await prisma.user.delete({
            where: { id: userId }
        });
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Toggle user active status
router.patch('/:id/toggle-active', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.params.id;
        // Check if current user is admin
        const currentUser = await prisma.user.findUnique({
            where: { id: req.user?.id }
        });
        if (currentUser?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Access denied. Admin role required.' });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { isActive: !user.isActive },
            select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                isActive: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json({ user: updatedUser });
    }
    catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map