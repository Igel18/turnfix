import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const associationBaseSchema = z.object({
  var_name: z.string().min(1).max(150),
  var_kuerzel: z.string().max(8).nullable().optional(),
  int_laenderid: z.number().int().nullable().optional()
});

const associationCreateSchema = associationBaseSchema.transform(data => ({
  ...data,
  var_kuerzel: data.var_kuerzel || null,
  int_laenderid: data.int_laenderid || null
}));

const associationUpdateSchema = associationBaseSchema.partial().transform(data => ({
  ...data,
  var_kuerzel: data.var_kuerzel !== undefined ? (data.var_kuerzel || null) : undefined,
  int_laenderid: data.int_laenderid !== undefined ? (data.int_laenderid || null) : undefined
}));

const associationQuerySchema = z.object({
  search: z.string().optional(),
  country_id: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).default(50),
  offset: z.string().transform(Number).default(0)
});

// Get associations count
router.get('/count', async (req: Request, res: Response) => {
  try {
    const count = await prisma.tfx_verbaende.count();
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
      whereClause += ` WHERE LOWER(v.var_name) LIKE LOWER($${paramIndex}) OR LOWER(v.var_kuerzel) LIKE LOWER($${paramIndex})`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }
    
    if (query.country_id) {
      whereClause += query.search ? ' AND' : ' WHERE';
      whereClause += ` v.int_laenderid = $${paramIndex}`;
      params.push(query.country_id);
      paramIndex++;
    }
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      ${whereClause}
    `;
    
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params) as any[];
    const total = parseInt(countResult[0]?.total || '0');
    
    const dataQuery = `
      SELECT 
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      ${whereClause}
      ORDER BY v.var_name ASC
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
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      WHERE v.int_verbaendeid = $1
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
    
    // Use default country (Deutschland = 1) if no country is selected
    // This handles the NOT NULL constraint on int_laenderid
    const countryId = data.int_laenderid || 1;
    
    const insertQuery = `
      INSERT INTO tfx_verbaende (var_name, var_kuerzel, int_laenderid)
      VALUES ($1, $2, $3)
      RETURNING int_verbaendeid
    `;

    console.log('Executing insert query with params:', [data.var_name, data.var_kuerzel, countryId]);
    const result = await prisma.$queryRawUnsafe(
      insertQuery,
      data.var_name,
      data.var_kuerzel,
      countryId
    ) as any[];

    console.log('Insert result:', result);
    const associationId = result[0]?.int_verbaendeid;

    if (!associationId) {
      throw new Error('Failed to get association ID from insert result');
    }

    // Fetch the created association with country data
    const fetchQuery = `
      SELECT 
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      WHERE v.int_verbaendeid = $1
    `;

    const associations = await prisma.$queryRawUnsafe(fetchQuery, associationId) as any[];
    console.log('Fetched association:', associations);
    
    res.status(201).json(associations[0]);
  } catch (error) {
    console.error('Error creating association:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    if (error instanceof z.ZodError) {
      console.log('Validation error details:', JSON.stringify(error.issues, null, 2));
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Failed to create association' });
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
    if (data.int_laenderid !== undefined) {
      updates.push(`int_laenderid = $${paramIndex++}`);
      params.push(data.int_laenderid || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updateQuery = `
      UPDATE tfx_verbaende 
      SET ${updates.join(', ')}
      WHERE int_verbaendeid = $${paramIndex}
      RETURNING int_verbaendeid
    `;
    params.push(id);

    const result = await prisma.$queryRawUnsafe(updateQuery, ...params) as any[];
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }

    // Fetch updated association with country data
    const fetchQuery = `
      SELECT 
        v.int_verbaendeid,
        v.var_name,
        v.var_kuerzel,
        v.int_laenderid,
        l.var_name as country_name,
        l.var_kuerzel as country_kuerzel
      FROM tfx_verbaende v
      LEFT JOIN tfx_laender l ON v.int_laenderid = l.int_laenderid
      WHERE v.int_verbaendeid = $1
    `;

    const associations = await prisma.$queryRawUnsafe(fetchQuery, id) as any[];
    res.json(associations[0]);
  } catch (error) {
    console.error('Error updating association:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    res.status(500).json({ error: 'Failed to update association' });
  }
});

// Delete association
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid association ID' });
    }

    // Check if association is being used by regions
    const regionCheckQuery = 'SELECT COUNT(*) as count FROM tfx_gaue WHERE int_verbaendeid = $1';
    const regionCheck = await prisma.$queryRawUnsafe(regionCheckQuery, id) as any[];
    const regionCount = parseInt(regionCheck[0]?.count || '0');

    if (regionCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete association. It is currently assigned to ${regionCount} region(s).` 
      });
    }

    const deleteQuery = 'DELETE FROM tfx_verbaende WHERE int_verbaendeid = $1 RETURNING int_verbaendeid';
    const result = await prisma.$queryRawUnsafe(deleteQuery, id) as any[];
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Association not found' });
    }

    res.json({ message: 'Association deleted successfully' });
  } catch (error) {
    console.error('Error deleting association:', error);
    res.status(500).json({ error: 'Failed to delete association' });
  }
});

// Get data endpoints for dropdowns
router.get('/data/laender', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT int_laenderid, var_name, var_kuerzel
      FROM tfx_laender
      ORDER BY var_name ASC
    `;
    
    const countries = await prisma.$queryRawUnsafe(query) as any[];
    res.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

export default router;
