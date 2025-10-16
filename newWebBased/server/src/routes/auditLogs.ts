import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Validation schemas
const createAuditLogSchema = z.object({
  userId: z.string().optional(),
  action: z.string().min(1),
  resource: z.string().min(1),
  resourceId: z.string().optional(),
  oldValues: z.record(z.string(), z.any()).optional(),
  newValues: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

const updateAuditLogSchema = createAuditLogSchema.partial();

// Get all audit logs with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const userId = req.query.userId as string;
    const action = req.query.action as string;
    const resource = req.query.resource as string;
    const resourceId = req.query.resourceId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const whereConditions: any = {};
    
    if (userId) {
      whereConditions.userId = userId;
    }
    if (action) {
      whereConditions.action = { contains: action, mode: 'insensitive' };
    }
    if (resource) {
      whereConditions.resource = { contains: resource, mode: 'insensitive' };
    }
    if (resourceId) {
      whereConditions.resourceId = resourceId;
    }
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) {
        whereConditions.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereConditions.createdAt.lte = new Date(endDate);
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
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

    const totalCount = await prisma.auditLog.count({
      where: whereConditions
    });

    res.json({
      auditLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit log by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logId = req.params.id;

    const auditLog = await prisma.auditLog.findUnique({
      where: { id: logId },
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

    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    res.json({ auditLog });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new audit log
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createAuditLogSchema.parse(req.body);

    // Check if user exists (if userId provided)
    if (validatedData.userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: validatedData.userId }
      });

      if (!userExists) {
        return res.status(400).json({ error: 'User not found' });
      }
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        userId: validatedData.userId,
        action: validatedData.action,
        resource: validatedData.resource,
        resourceId: validatedData.resourceId,
        oldValues: validatedData.oldValues as any,
        newValues: validatedData.newValues as any,
        ipAddress: validatedData.ipAddress,
        userAgent: validatedData.userAgent
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

    res.status(201).json({ auditLog });
  } catch (error) {
    console.error('Error creating audit log:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update audit log (usually not recommended, but provided for completeness)
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logId = req.params.id;
    const validatedData = updateAuditLogSchema.parse(req.body);

    // Build update data
    const updateData: any = {};
    if (validatedData.action) updateData.action = validatedData.action;
    if (validatedData.resource) updateData.resource = validatedData.resource;
    if (validatedData.resourceId) updateData.resourceId = validatedData.resourceId;
    if (validatedData.oldValues !== undefined) updateData.oldValues = validatedData.oldValues as any;
    if (validatedData.newValues !== undefined) updateData.newValues = validatedData.newValues as any;
    if (validatedData.ipAddress) updateData.ipAddress = validatedData.ipAddress;
    if (validatedData.userAgent) updateData.userAgent = validatedData.userAgent;
    if (validatedData.userId) updateData.userId = validatedData.userId;

    const auditLog = await prisma.auditLog.update({
      where: { id: logId },
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

    res.json({ auditLog });
  } catch (error) {
    console.error('Error updating audit log:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete audit log
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const logId = req.params.id;

    await prisma.auditLog.delete({
      where: { id: logId }
    });

    res.json({ message: 'Audit log deleted successfully' });
  } catch (error) {
    console.error('Error deleting audit log:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit logs by user
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.params.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const auditLogs = await prisma.auditLog.findMany({
      where: { userId },
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

    const totalCount = await prisma.auditLog.count({
      where: { userId }
    });

    res.json({
      auditLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit logs by resource
router.get('/resource/:resource', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const resource = req.params.resource;
    const resourceId = req.query.resourceId as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const whereConditions: any = { resource };
    if (resourceId) {
      whereConditions.resourceId = resourceId;
    }

    const auditLogs = await prisma.auditLog.findMany({
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

    const totalCount = await prisma.auditLog.count({
      where: whereConditions
    });

    res.json({
      auditLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching resource audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete old audit logs (cleanup)
router.delete('/cleanup/:days', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.params.days);
    if (days < 30) {
      return res.status(400).json({ error: 'Cannot delete audit logs newer than 30 days for compliance' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    res.json({
      message: `Audit logs older than ${days} days deleted successfully`,
      deletedCount: deletedLogs.count
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
