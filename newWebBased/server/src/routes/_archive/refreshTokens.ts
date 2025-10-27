import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Validation schemas
const createRefreshTokenSchema = z.object({
  token: z.string().min(1),
  userId: z.string().min(1),
  expiresAt: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format"
  })
});

const updateRefreshTokenSchema = createRefreshTokenSchema.partial();

// Get all refresh tokens with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId as string;

    const whereConditions: any = {};
    if (userId) {
      whereConditions.userId = userId;
    }

    const refreshTokens = await prisma.refreshToken.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const totalCount = await prisma.refreshToken.count({
      where: whereConditions
    });

    res.json({
      refreshTokens,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching refresh tokens:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get refresh token by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tokenId = req.params.id;

    const refreshToken = await prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!refreshToken) {
      return res.status(404).json({ error: 'Refresh token not found' });
    }

    res.json({ refreshToken });
  } catch (error) {
    console.error('Error fetching refresh token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new refresh token
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createRefreshTokenSchema.parse(req.body);

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: validatedData.userId }
    });

    if (!userExists) {
      return res.status(400).json({ error: 'User not found' });
    }

    const refreshToken = await prisma.refreshToken.create({
      data: {
        token: validatedData.token,
        userId: validatedData.userId,
        expiresAt: new Date(validatedData.expiresAt)
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({ refreshToken });
  } catch (error) {
    console.error('Error creating refresh token:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update refresh token
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tokenId = req.params.id;
    const validatedData = updateRefreshTokenSchema.parse(req.body);

    // Build update data
    const updateData: any = {};
    if (validatedData.token) updateData.token = validatedData.token;
    if (validatedData.userId) updateData.userId = validatedData.userId;
    if (validatedData.expiresAt) updateData.expiresAt = new Date(validatedData.expiresAt);

    const refreshToken = await prisma.refreshToken.update({
      where: { id: tokenId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({ refreshToken });
  } catch (error) {
    console.error('Error updating refresh token:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete refresh token
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const tokenId = req.params.id;

    await prisma.refreshToken.delete({
      where: { id: tokenId }
    });

    res.json({ message: 'Refresh token deleted successfully' });
  } catch (error) {
    console.error('Error deleting refresh token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete expired refresh tokens
router.delete('/expired/cleanup', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    
    const deletedTokens = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    res.json({ 
      message: 'Expired refresh tokens cleaned up successfully',
      deletedCount: deletedTokens.count
    });
  } catch (error) {
    console.error('Error cleaning up expired refresh tokens:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
