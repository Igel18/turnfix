import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import prisma from '../lib/prisma';

const router = Router();

// Validation schemas
const regionCreateSchema = z.object({
  var_name: z.string().min(1).max(150),
  var_kuerzel: z.string().max(15).optional(),
  int_verbaendeid: z.number().int().nullable().optional()
});

const regionUpdateSchema = regionCreateSchema.partial();

const regionQuerySchema = z.object({
  search: z.string().optional(),
  verband_id: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(50),
  offset: z.string().transform(Number).default(0)
});

// Get regions count
router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await prisma.tfx_gaue.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting regions:', error);
    res.status(500).json({ error: 'Failed to count regions' });
  }
});

// Get all regions with search and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = regionQuerySchema.parse(req.query);
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (query.search) {
      whereClause += ` WHERE LOWER(g.var_name) LIKE LOWER($${paramIndex}) OR LOWER(g.var_kuerzel) LIKE LOWER($${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }
    
    if (query.verband_id) {
      whereClause += query.search ? ' AND' : ' WHERE';
      whereClause += ` g.int_verbaendeid = $${paramIndex}`;
      params.push(query.verband_id);
      paramIndex++;
    }
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
    `;
    
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');
    
    const dataQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as verband_name,
        v.var_kuerzel as verband_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
      ORDER BY g.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(query.limit, query.offset);
    const regions = await prisma.$queryRawUnsafe(dataQuery, ...params) as any[];
    
    res.json({
      regions,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get region by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid region ID' });
    }

    const query = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as verband_name,
        v.var_kuerzel as verband_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;

    const regions = await prisma.$queryRawUnsafe(query, id) as any[];
    
    if (!regions || regions.length === 0) {
      return res.status(404).json({ error: 'Region not found' });
    }

    res.json(regions[0]);
  } catch (error) {
    console.error('Error fetching region:', error);
    res.status(500).json({ error: 'Failed to fetch region' });
  }
});

// Create new region
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const data = regionCreateSchema.parse(req.body);
    
    const insertQuery = `
      INSERT INTO tfx_gaue (var_name, var_kuerzel, int_verbaendeid)
      VALUES ($1, $2, $3)
      RETURNING int_gaueid
    `;

    const result = await prisma.$queryRawUnsafe(
      insertQuery,
      data.var_name,
      data.var_kuerzel || null,
      data.int_verbaendeid || null
    ) as any[];

    const regionId = result[0]?.int_gaueid;

    // Fetch the created region with association data
    const fetchQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as verband_name,
        v.var_kuerzel as verband_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;

    const regions = await prisma.$queryRawUnsafe(fetchQuery, regionId) as any[];
    
    res.status(201).json(regions[0]);
  } catch (error) {
    console.error('Error creating region:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Failed to create region' });
  }
});

// Update region
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid region ID' });
    }

    const data = regionUpdateSchema.parse(req.body);
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data.var_name !== undefined) {
      updates.push(`var_name = $${paramIndex++}`);
      params.push(data.var_name);
    }
    if (data.var_kuerzel !== undefined) {
      updates.push(`var_kuerzel = $${paramIndex++}`);
      params.push(data.var_kuerzel);
    }
    if (data.int_verbaendeid !== undefined) {
      updates.push(`int_verbaendeid = $${paramIndex++}`);
      params.push(data.int_verbaendeid || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updateQuery = `
      UPDATE tfx_gaue 
      SET ${updates.join(', ')}
      WHERE int_gaueid = $${paramIndex}
      RETURNING int_gaueid
    `;
    params.push(id);

    const result = await prisma.$queryRawUnsafe(updateQuery, ...params) as any[];
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Region not found' });
    }

    // Fetch updated region with association data
    const fetchQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as verband_name,
        v.var_kuerzel as verband_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;

    const regions = await prisma.$queryRawUnsafe(fetchQuery, id) as any[];
    res.json(regions[0]);
  } catch (error) {
    console.error('Error updating region:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Failed to update region' });
  }
});

// Delete region
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid region ID' });
    }

    // Check if region is being used by clubs
    const clubCheckQuery = 'SELECT COUNT(*) as count FROM tfx_vereine WHERE int_gaueid = $1';
    const clubCheck = await prisma.$queryRawUnsafe(clubCheckQuery, id) as any[];
    const clubCount = parseInt(clubCheck[0]?.count || '0');

    if (clubCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete region. It is currently assigned to ${clubCount} club(s).` 
      });
    }

    const deleteQuery = 'DELETE FROM tfx_gaue WHERE int_gaueid = $1 RETURNING int_gaueid';
    const result = await prisma.$queryRawUnsafe(deleteQuery, id) as any[];
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Region not found' });
    }

    res.json({ message: 'Region deleted successfully' });
  } catch (error) {
    console.error('Error deleting region:', error);
    res.status(500).json({ error: 'Failed to delete region' });
  }
});

// Get data endpoints for dropdowns
router.get('/data/verbaende', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT int_verbaendeid, var_name, var_kuerzel
      FROM tfx_verbaende
      ORDER BY var_name ASC
    `;
    
    const verbaende = await prisma.$queryRawUnsafe(query) as any[];
    res.json(verbaende);
  } catch (error) {
    console.error('Error fetching verbaende:', error);
    res.status(500).json({ error: 'Failed to fetch verbaende' });
  }
});

export default router;
