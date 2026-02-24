import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas for gaue (regions/districts)
const associationBaseSchema = z.object({
  var_name: z.string().min(1).max(150),
  var_kuerzel: z.string().max(8).nullable().optional(),
  int_verbaendeid: z.number().int().default(1) // Default federation ID
});

const associationCreateSchema = associationBaseSchema.transform(data => ({
  ...data,
  var_kuerzel: data.var_kuerzel || null
}));

const associationUpdateSchema = associationBaseSchema.partial().transform(data => ({
  ...data,
  var_kuerzel: data.var_kuerzel !== undefined ? (data.var_kuerzel || null) : undefined
}));

const associationQuerySchema = z.object({
  search: z.string().optional(),
  federation_id: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(50),
  offset: z.string().transform(Number).default(0)
});

// Get associations count
router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await prisma.tfx_gaue.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting associations:', error);
    res.status(500).json({ 
      error: 'Failed to count associations',
      details: process.env.DEBUG === 'true' ? error : undefined
    });
  }
});

// Get all associations with search and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = associationQuerySchema.parse(req.query);
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (query.search) {
      whereClause += ` WHERE LOWER(g.var_name) LIKE LOWER($${paramIndex}) OR LOWER(g.var_kuerzel) LIKE LOWER($${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }
    
    if (query.federation_id) {
      whereClause += query.search ? ' AND' : ' WHERE';
      whereClause += ` g.int_verbaendeid = $${paramIndex}`;
      params.push(query.federation_id);
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
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      ${whereClause}
      ORDER BY g.var_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(query.limit, query.offset);
    const associations = await prisma.$queryRawUnsafe(dataQuery, ...params) as any[];
    
    res.json({
      associations,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching associations:', error);
    res.status(500).json({ error: 'Failed to fetch associations' });
  }
});

// Get association by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid association ID' });
    }

    const query = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;

    const associations = await prisma.$queryRawUnsafe(query, id) as any[];
    
    if (!associations || associations.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }

    res.json(associations[0]);
  } catch (error) {
    console.error('Error fetching association:', error);
    res.status(500).json({ error: 'Failed to fetch association' });
  }
});

// Create new association
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('Received association create request:', req.body);
    const data = associationCreateSchema.parse(req.body);
    console.log('Parsed association data:', data);
    
    const insertQuery = `
      INSERT INTO tfx_gaue (var_name, var_kuerzel, int_verbaendeid)
      VALUES ($1, $2, $3)
      RETURNING int_gaueid
    `;

    console.log('Executing insert query with params:', [data.var_name, data.var_kuerzel, data.int_verbaendeid]);
    const result = await prisma.$queryRawUnsafe(
      insertQuery,
      data.var_name,
      data.var_kuerzel,
      data.int_verbaendeid
    ) as any[];

    console.log('Insert result:', result);
    const associationId = result[0]?.int_gaueid;

    if (!associationId) {
      throw new Error('Failed to get association ID from insert result');
    }

    // Fetch the created association with federation data
    const fetchQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;

    const associations = await prisma.$queryRawUnsafe(fetchQuery, associationId) as any[];
    console.log('Fetched association:', associations);
    
    res.status(201).json(associations[0]);
  } catch (error) {
    console.error('Error creating association:', error);
    if (error instanceof Error) {
      console.log('Error details:', error.message);
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid association data', details: error.issues });
    }
    return res.status(500).json({ error: 'Failed to create association' });
  }
});

// Update association
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid association ID' });
    }

    const data = associationUpdateSchema.parse(req.body);
    
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
      params.push(data.int_verbaendeid);
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
      return res.status(404).json({ error: 'Association not found' });
    }

    // Fetch updated association with federation data
    const fetchQuery = `
      SELECT 
        g.int_gaueid,
        g.var_name,
        g.var_kuerzel,
        g.int_verbaendeid,
        v.var_name as federation_name,
        v.var_kuerzel as federation_kuerzel
      FROM tfx_gaue g
      LEFT JOIN tfx_verbaende v ON g.int_verbaendeid = v.int_verbaendeid
      WHERE g.int_gaueid = $1
    `;

    const associations = await prisma.$queryRawUnsafe(fetchQuery, id) as any[];
    res.json(associations[0]);
  } catch (error) {
    console.error('Error updating association:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid association data', details: error.issues });
    }
    res.status(500).json({ error: 'Failed to update association' });
  }
});// Delete association
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid association ID' });
    }

    // Check if association exists first
    const existsQuery = 'SELECT COUNT(*) as count FROM tfx_gaue WHERE int_gaueid = $1';
    const existsResult = await prisma.$queryRawUnsafe(existsQuery, id) as any[];
    const exists = Number(existsResult[0]?.count) > 0;

    if (!exists) {
      return res.status(404).json({ error: 'Association not found' });
    }

    // Check if association is being used by clubs
    const clubCheckQuery = 'SELECT COUNT(*) as count FROM tfx_vereine WHERE int_gaueid = $1';
    const clubCheck = await prisma.$queryRawUnsafe(clubCheckQuery, id) as any[];
    const clubCount = parseInt(clubCheck[0]?.count || '0');

    if (clubCount > 0) {
      return res.status(409).json({ 
        error: `Cannot delete association. It is currently assigned to ${clubCount} club(s).` 
      });
    }

    const deleteQuery = 'DELETE FROM tfx_gaue WHERE int_gaueid = $1';
    await prisma.$queryRawUnsafe(deleteQuery, id);

    res.json({ message: 'Association deleted successfully' });
  } catch (error) {
    console.error('Error deleting association:', error);
    res.status(500).json({ error: 'Failed to delete association' });
  }
});

// Get data endpoints for dropdowns
router.get('/data/verbaende', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT v.int_verbaendeid, v.var_name, v.var_kuerzel, v.int_laenderid,
             l.var_name as country_name, l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      ORDER BY v.var_name ASC
    `;
    
    const federations = await prisma.$queryRawUnsafe(query) as any[];
    res.json(federations);
  } catch (error) {
    console.error('Error fetching federations:', error);
    res.status(500).json({ error: 'Failed to fetch federations' });
  }
});

// Create a new federation (Verband)
router.post('/data/verbaende', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { var_name, var_kuerzel, int_laenderid } = req.body;
    if (!int_laenderid) {
      return res.status(400).json({ error: 'int_laenderid is required' });
    }

    const result = await prisma.$queryRawUnsafe(
      `INSERT INTO tfx_verbaende (var_name, var_kuerzel, int_laenderid)
       VALUES ($1, $2, $3)
       RETURNING int_verbaendeid, var_name, var_kuerzel, int_laenderid`,
      var_name || null,
      var_kuerzel || null,
      int_laenderid
    ) as any[];

    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating federation:', error);
    res.status(500).json({ error: 'Failed to create federation' });
  }
});

// Update a federation (Verband)
router.put('/data/verbaende/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid federation ID' });
    }

    const { var_name, var_kuerzel, int_laenderid } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (var_name !== undefined) {
      updates.push(`var_name = $${paramIndex++}`);
      params.push(var_name);
    }
    if (var_kuerzel !== undefined) {
      updates.push(`var_kuerzel = $${paramIndex++}`);
      params.push(var_kuerzel || null);
    }
    if (int_laenderid !== undefined) {
      updates.push(`int_laenderid = $${paramIndex++}`);
      params.push(int_laenderid);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updateQuery = `
      UPDATE tfx_verbaende 
      SET ${updates.join(', ')}
      WHERE int_verbaendeid = $${paramIndex}
      RETURNING int_verbaendeid, var_name, var_kuerzel, int_laenderid
    `;
    params.push(id);

    const result = await prisma.$queryRawUnsafe(updateQuery, ...params) as any[];

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Federation not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating federation:', error);
    res.status(500).json({ error: 'Failed to update federation' });
  }
});

// Delete a federation (Verband)
router.delete('/data/verbaende/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid federation ID' });
    }

    await prisma.$queryRawUnsafe(
      `DELETE FROM tfx_verbaende WHERE int_verbaendeid = $1`,
      id
    );

    res.json({ message: 'Federation deleted' });
  } catch (error) {
    console.error('Error deleting federation:', error);
    res.status(500).json({ error: 'Failed to delete federation' });
  }
});

export default router;
