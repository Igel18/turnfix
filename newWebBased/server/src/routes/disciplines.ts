import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas - using database field names
const createDisciplineSchema = z.object({
  var_name: z.string().min(1, "Name is required"),
  var_kurz1: z.string().min(1, "Short name is required").max(6).optional(),
  var_kurz2: z.string().max(20).optional(),
  var_formel: z.string().max(300).optional(),
  var_maske: z.string().max(10).optional(),
  int_versuche: z.number().min(1).default(1),
  var_icon: z.string().max(50).optional(),
  var_kuerzel: z.string().max(50).optional(),
  int_berechnung: z.number().min(1).max(3).default(2),
  var_einheit: z.string().max(5).optional(),
  bol_bahnen: z.boolean().default(false),
  bol_m: z.boolean().default(true),
  bol_w: z.boolean().default(true),
  int_sportid: z.number().default(1),
  int_formelid: z.number().nullable().optional(),
  bol_berechnen: z.boolean().default(true)
});

const updateDisciplineSchema = createDisciplineSchema.partial();

// Get disciplines count
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.tfx_disziplinen.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting disciplines:', error);
    res.status(500).json({ 
      error: 'Failed to count disciplines',
      details: process.env.DEBUG === 'true' ? error : undefined
    });
  }
});

// Get all disciplines
router.get('/', async (req, res) => {
  try {
    const { gender } = req.query;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (gender) {
      if (gender === 'male') {
        whereClause = 'WHERE bol_m = true';
      } else if (gender === 'female') {
        whereClause = 'WHERE bol_w = true';
      }
    }
    
    const query = `
      SELECT 
        int_disziplinenid, 
        var_name, 
        var_kurz1,
        var_kurz2,
        var_formel,
        var_maske,
        int_versuche,
        var_icon,
        var_kuerzel,
        int_berechnung,
        var_einheit,
        bol_bahnen,
        bol_m,
        bol_w,
        int_sportid,
        int_formelid,
        bol_berechnen
      FROM tfx_disziplinen
      ${whereClause}
      ORDER BY var_name
    `;
    
    const disciplines = await prisma.$queryRawUnsafe(query, ...params);
    res.json(disciplines);
  } catch (error) {
    console.error('Error fetching disciplines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get gymnastics equipment/apparatus types
router.get('/apparatus', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        var_einheit as apparatus,
        COUNT(*)::integer as discipline_count
      FROM tfx_disziplinen
      WHERE var_einheit IS NOT NULL
      GROUP BY var_einheit
      ORDER BY var_einheit
    `;
    
    const apparatus = await prisma.$queryRawUnsafe(query);
    res.json(apparatus);
  } catch (error) {
    console.error('Error fetching apparatus:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get age groups (from gender categories since no age columns exist in disciplines)
router.get('/age-groups', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Since there are no age columns in tfx_disziplinen, return standard age groups
    // These would typically come from participant data or competition rules
    const ageGroups = [
      { value: 6, label: '6 years' },
      { value: 7, label: '7 years' },
      { value: 8, label: '8 years' },
      { value: 9, label: '9 years' },
      { value: 10, label: '10 years' },
      { value: 11, label: '11 years' },
      { value: 12, label: '12 years' },
      { value: 13, label: '13 years' },
      { value: 14, label: '14 years' },
      { value: 15, label: '15 years' },
      { value: 16, label: '16 years' },
      { value: 17, label: '17 years' },
      { value: 18, label: '18 years' },
      { value: 19, label: '19 years' },
      { value: 20, label: '20 years' },
      { value: 25, label: '25 years' },
      { value: 30, label: '30 years' },
      { value: 40, label: '40 years' },
      { value: 50, label: '50 years' },
      { value: 99, label: '99+ years' }
    ];
    
    res.json(ageGroups);
  } catch (error) {
    console.error('Error fetching age groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get discipline categories/types
router.get('/categories', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const query = `
      SELECT 
        int_bereicheid as id,
        var_name as name,
        bol_maennlich as male,
        bol_weiblich as female
      FROM tfx_bereiche
      ORDER BY var_name
    `;
    
    const categories = await prisma.$queryRawUnsafe(query);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get filtered disciplines for competition setup
router.get('/filtered', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { gender, apparatus, sportId } = req.query;
    
    let whereConditions = [];
    
    if (gender) {
      if (gender === 'male' || gender === 'männlich') {
        whereConditions.push('bol_m = true');
      } else if (gender === 'female' || gender === 'weiblich') {
        whereConditions.push('bol_w = true');
      } else if (gender === 'mixed' || gender === 'gemischt') {
        whereConditions.push('bol_m = true AND bol_w = true');
      }
    }
    
    if (apparatus) {
      whereConditions.push(`var_einheit = '${apparatus}'`);
    }
    
    if (sportId) {
      whereConditions.push(`int_sportid = ${parseInt(sportId as string)}`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        int_disziplinenid as int_disziplinid, 
        var_name as var_disziplinname, 
        var_einheit as var_disziplinkategorie,
        bol_m as male_allowed,
        bol_w as female_allowed,
        6 as altersklasse_von,
        99 as altersklasse_bis,
        var_icon,
        int_sportid
      FROM tfx_disziplinen
      ${whereClause}
      ORDER BY var_name
    `;
    
    const disciplines = await prisma.$queryRawUnsafe(query);
    res.json(disciplines);
  } catch (error) {
    console.error('Error fetching filtered disciplines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new discipline
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createDisciplineSchema.parse(req.body);
    
    const query = `
      INSERT INTO tfx_disziplinen (
        var_name, 
        var_kurz1, 
        var_kurz2, 
        var_formel,
        var_maske, 
        int_versuche,
        var_icon,
        var_kuerzel,
        int_berechnung,
        var_einheit,
        bol_bahnen,
        bol_m, 
        bol_w, 
        int_sportid,
        int_formelid,
        bol_berechnen
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING 
        int_disziplinenid,
        var_name,
        var_kurz1,
        var_kurz2,
        var_formel,
        var_maske,
        int_versuche,
        var_icon,
        var_kuerzel,
        int_berechnung,
        var_einheit,
        bol_bahnen,
        bol_m,
        bol_w,
        int_sportid,
        int_formelid,
        bol_berechnen
    `;
    
    const result = await prisma.$queryRawUnsafe(query, 
      validatedData.var_name,
      validatedData.var_kurz1 || validatedData.var_name.substring(0, 6),
      validatedData.var_kurz2 || validatedData.var_kurz1 || validatedData.var_name.substring(0, 20),
      validatedData.var_formel || null,
      validatedData.var_maske || null,
      validatedData.int_versuche,
      validatedData.var_icon || null,
      validatedData.var_kuerzel || null,
      validatedData.int_berechnung,
      validatedData.var_einheit || null,
      validatedData.bol_bahnen,
      validatedData.bol_m,
      validatedData.bol_w,
      validatedData.int_sportid,
      validatedData.int_formelid || null,
      validatedData.bol_berechnen
    );

    const createdDiscipline = Array.isArray(result) ? result[0] : result;
    res.status(201).json(createdDiscipline);
  } catch (error) {
    console.error('Error creating discipline:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get single discipline by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const disciplineId = parseInt(req.params.id);
    
    if (isNaN(disciplineId)) {
      return res.status(400).json({ error: 'Invalid discipline ID' });
    }
    
    const query = `
      SELECT 
        int_disziplinenid, 
        var_name, 
        var_kurz1,
        var_kurz2,
        var_formel,
        var_maske,
        int_versuche,
        var_icon,
        var_kuerzel,
        int_berechnung,
        var_einheit,
        bol_bahnen,
        bol_m,
        bol_w,
        int_sportid,
        int_formelid,
        bol_berechnen
      FROM tfx_disziplinen
      WHERE int_disziplinenid = $1
    `;
    
    const result = await prisma.$queryRawUnsafe(query, disciplineId);
    const discipline = Array.isArray(result) ? result[0] : result;
    
    if (!discipline) {
      return res.status(404).json({ error: 'Discipline not found' });
    }
    
    res.json(discipline);
  } catch (error) {
    console.error('Error fetching discipline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update discipline
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const disciplineId = parseInt(req.params.id);
    const validatedData = updateDisciplineSchema.parse(req.body);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCounter = 1;
    
    if (validatedData.var_name !== undefined) {
      updateFields.push(`var_name = $${paramCounter}`);
      values.push(validatedData.var_name);
      paramCounter++;
    }
    
    if (validatedData.var_kurz1 !== undefined) {
      updateFields.push(`var_kurz1 = $${paramCounter}`);
      values.push(validatedData.var_kurz1);
      paramCounter++;
    }
    
    if (validatedData.var_kurz2 !== undefined) {
      updateFields.push(`var_kurz2 = $${paramCounter}`);
      values.push(validatedData.var_kurz2);
      paramCounter++;
    }
    
    if (validatedData.var_einheit !== undefined) {
      updateFields.push(`var_einheit = $${paramCounter}`);
      values.push(validatedData.var_einheit);
      paramCounter++;
    }
    
    if (validatedData.bol_m !== undefined) {
      updateFields.push(`bol_m = $${paramCounter}`);
      values.push(validatedData.bol_m);
      paramCounter++;
    }
    
    if (validatedData.bol_w !== undefined) {
      updateFields.push(`bol_w = $${paramCounter}`);
      values.push(validatedData.bol_w);
      paramCounter++;
    }
    
    if (validatedData.var_icon !== undefined) {
      updateFields.push(`var_icon = $${paramCounter}`);
      values.push(validatedData.var_icon);
      paramCounter++;
    }
    
    if (validatedData.var_formel !== undefined) {
      updateFields.push(`var_formel = $${paramCounter}`);
      values.push(validatedData.var_formel);
      paramCounter++;
    }
    
    if (validatedData.int_sportid !== undefined) {
      updateFields.push(`int_sportid = $${paramCounter}`);
      values.push(validatedData.int_sportid);
      paramCounter++;
    }
    
    if (validatedData.var_maske !== undefined) {
      updateFields.push(`var_maske = $${paramCounter}`);
      values.push(validatedData.var_maske);
      paramCounter++;
    }
    
    if (validatedData.int_versuche !== undefined) {
      updateFields.push(`int_versuche = $${paramCounter}`);
      values.push(validatedData.int_versuche);
      paramCounter++;
    }
    
    if (validatedData.var_kuerzel !== undefined) {
      updateFields.push(`var_kuerzel = $${paramCounter}`);
      values.push(validatedData.var_kuerzel);
      paramCounter++;
    }
    
    if (validatedData.int_berechnung !== undefined) {
      updateFields.push(`int_berechnung = $${paramCounter}`);
      values.push(validatedData.int_berechnung);
      paramCounter++;
    }
    
    if (validatedData.bol_bahnen !== undefined) {
      updateFields.push(`bol_bahnen = $${paramCounter}`);
      values.push(validatedData.bol_bahnen);
      paramCounter++;
    }
    
    if (validatedData.int_formelid !== undefined && validatedData.int_formelid !== null) {
      updateFields.push(`int_formelid = $${paramCounter}`);
      values.push(validatedData.int_formelid);
      paramCounter++;
    }
    
    if (validatedData.bol_berechnen !== undefined) {
      updateFields.push(`bol_berechnen = $${paramCounter}`);
      values.push(validatedData.bol_berechnen);
      paramCounter++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(disciplineId); // Add ID as last parameter
    
    const query = `
      UPDATE tfx_disziplinen 
      SET ${updateFields.join(', ')}
      WHERE int_disziplinenid = $${paramCounter}
      RETURNING 
        int_disziplinenid,
        var_name,
        var_kurz1,
        var_kurz2,
        var_formel,
        var_maske,
        int_versuche,
        var_icon,
        var_kuerzel,
        int_berechnung,
        var_einheit,
        bol_bahnen,
        bol_m,
        bol_w,
        int_sportid,
        int_formelid,
        bol_berechnen
    `;
    
    const result = await prisma.$queryRawUnsafe(query, ...values);
    const updatedDiscipline = Array.isArray(result) ? result[0] : result;
    
    if (!updatedDiscipline) {
      return res.status(404).json({ error: 'Discipline not found' });
    }

    res.json(updatedDiscipline);
  } catch (error) {
    console.error('Error updating discipline:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.issues });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete discipline
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const disciplineId = parseInt(req.params.id);
    
    // Check if discipline is being used in any competitions
    const usageQuery = `
      SELECT COUNT(*) as count
      FROM tfx_wertungen w
      JOIN tfx_wettkaempfe_x_disziplinen wd ON w.int_wettkaempfeid = wd.int_wettkaempfeid
      WHERE wd.int_disziplinenid = $1
    `;
    
    const usageResult = await prisma.$queryRawUnsafe(usageQuery, disciplineId) as any[];
    const usageCount = usageResult[0]?.count || 0;
    
    if (usageCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete discipline', 
        message: `Discipline is being used in ${usageCount} competition entries. Remove entries first.` 
      });
    }
    
    const deleteQuery = `
      DELETE FROM tfx_disziplinen 
      WHERE int_disziplinenid = $1
      RETURNING int_disziplinenid as id
    `;
    
    const result = await prisma.$queryRawUnsafe(deleteQuery, disciplineId);
    const deletedDiscipline = Array.isArray(result) ? result[0] : result;
    
    if (!deletedDiscipline) {
      return res.status(404).json({ error: 'Discipline not found' });
    }
    
    res.json({
      success: true,
      message: 'Discipline deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting discipline:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
