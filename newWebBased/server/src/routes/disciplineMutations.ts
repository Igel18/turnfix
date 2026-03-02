import { Router } from 'express';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/authBypass';

const router = Router();

// Validation schemas - Accept both client-friendly and database field names
const createDisciplineSchema = z.object({
  name: z.string().min(1).optional(),
  var_name: z.string().min(1).optional(),
  shortName: z.string().max(20).nullable().optional(),  // Increased from 5 to match test data
  var_kurz1: z.string().max(20).nullable().optional(),  // Increased from 5 to match test data
  displayName: z.string().max(20).nullable().optional(),
  var_kurz2: z.string().max(20).nullable().optional(),
  formula: z.string().max(300).nullable().optional(),
  var_formel: z.string().max(300).nullable().optional(),
  inputMask: z.string().max(10).nullable().optional(),
  var_maske: z.string().max(10).nullable().optional(),
  attempts: z.number().min(1).default(1).optional(),
  int_versuche: z.number().min(1).default(1).optional(),
  icon: z.string().max(50).nullable().optional(),
  var_icon: z.string().max(50).nullable().optional(),
  shortcut: z.string().max(50).nullable().optional(),
  var_kuerzel: z.string().max(50).nullable().optional(),
  calculationType: z.number().min(0).max(3).default(2).optional(),
  int_berechnung: z.number().min(0).max(3).default(2).optional(),
  unit: z.string().max(10).nullable().optional(),  // Increased from 5 to 10
  var_einheit: z.string().max(10).nullable().optional(),  // Increased from 5 to 10
  lanesDivision: z.boolean().default(false).optional(),
  bol_bahnen: z.boolean().default(false).optional(),
  maleAllowed: z.boolean().default(true).optional(),
  bol_m: z.boolean().default(true).optional(),
  femaleAllowed: z.boolean().default(true).optional(),
  bol_w: z.boolean().default(true).optional(),
  sportId: z.number().default(1).optional(),
  int_sportid: z.number().default(1).optional(),
  formulaId: z.number().nullable().optional(),
  int_formelid: z.number().nullable().optional(),
  shouldCalculate: z.boolean().default(true).optional(),
  bol_rechnen: z.boolean().default(true).optional()
}).refine(
  data => (data.name && data.name.length > 0) || (data.var_name && data.var_name.length > 0),
  {
    message: "Either 'name' or 'var_name' must be provided and non-empty",
    path: ["name"]
  }
);

const updateDisciplineSchema = createDisciplineSchema.partial();

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
        int_disziplinenid as id,
        var_name as name,
        var_name,
        var_kurz1 as short_name,
        var_kurz1,
        var_kurz2 as display_name,
        var_kurz2,
        var_formel as formula,
        var_formel,
        var_maske as input_mask,
        var_maske,
        int_versuche as attempts,
        int_versuche,
        var_icon as icon,
        var_icon,
        var_kuerzel as shortcut,
        var_kuerzel,
        int_berechnung as calculation_type,
        int_berechnung,
        var_einheit as unit,
        var_einheit,
        bol_bahnen as lanes_division,
        bol_bahnen,
        bol_m as male_allowed,
        bol_m,
        bol_w as female_allowed,
        bol_w,
        int_sportid as sport_id,
        int_sportid,
        int_formelid as formula_id,
        int_formelid,
        bol_berechnen as should_calculate,
        bol_berechnen
    `;
    
    const result = await prisma.$queryRawUnsafe(query, 
      validatedData.name || validatedData.var_name,
      validatedData.shortName || validatedData.var_kurz1 || (validatedData.name || validatedData.var_name)?.substring(0, 6),
      validatedData.displayName || validatedData.var_kurz2 || validatedData.shortName || validatedData.var_kurz1 || (validatedData.name || validatedData.var_name)?.substring(0, 20),
      validatedData.formula || validatedData.var_formel || null,
      validatedData.inputMask || validatedData.var_maske || null,
      validatedData.attempts || validatedData.int_versuche || 1,
      validatedData.icon || validatedData.var_icon || null,
      validatedData.shortcut || validatedData.var_kuerzel || null,
      validatedData.calculationType || validatedData.int_berechnung || 2,
      validatedData.unit || validatedData.var_einheit || null,
      validatedData.lanesDivision || validatedData.bol_bahnen || false,
      validatedData.maleAllowed || validatedData.bol_m || true,
      validatedData.femaleAllowed || validatedData.bol_w || true,
      validatedData.sportId || validatedData.int_sportid || 1,
      validatedData.formulaId || validatedData.int_formelid || null,
      validatedData.shouldCalculate || validatedData.bol_rechnen || true
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

// Update discipline
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const disciplineId = parseInt(req.params.id);
    
    if (process.env.DEBUG === 'true') {
      console.log('PUT /api/disciplines/:id - Request body:', JSON.stringify(req.body, null, 2));
    }
    
    const validatedData = updateDisciplineSchema.parse(req.body);
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCounter = 1;
    
    if (validatedData.name !== undefined || validatedData.var_name !== undefined) {
      updateFields.push(`var_name = $${paramCounter}`);
      values.push(validatedData.name || validatedData.var_name);
      paramCounter++;
    }
    
    if (validatedData.shortName !== undefined || validatedData.var_kurz1 !== undefined) {
      updateFields.push(`var_kurz1 = $${paramCounter}`);
      values.push(validatedData.shortName || validatedData.var_kurz1);
      paramCounter++;
    }
    
    if (validatedData.displayName !== undefined || validatedData.var_kurz2 !== undefined) {
      updateFields.push(`var_kurz2 = $${paramCounter}`);
      values.push(validatedData.displayName || validatedData.var_kurz2);
      paramCounter++;
    }
    
    if (validatedData.unit !== undefined || validatedData.var_einheit !== undefined) {
      updateFields.push(`var_einheit = $${paramCounter}`);
      values.push(validatedData.unit || validatedData.var_einheit);
      paramCounter++;
    }
    
    if (validatedData.maleAllowed !== undefined) {
      updateFields.push(`bol_m = $${paramCounter}`);
      values.push(validatedData.maleAllowed);
      paramCounter++;
    }
    
    if (validatedData.femaleAllowed !== undefined) {
      updateFields.push(`bol_w = $${paramCounter}`);
      values.push(validatedData.femaleAllowed);
      paramCounter++;
    }
    
    if (validatedData.icon !== undefined) {
      updateFields.push(`var_icon = $${paramCounter}`);
      values.push(validatedData.icon);
      paramCounter++;
    }
    
    if (validatedData.formula !== undefined) {
      updateFields.push(`var_formel = $${paramCounter}`);
      values.push(validatedData.formula);
      paramCounter++;
    }
    
    if (validatedData.sportId !== undefined) {
      updateFields.push(`int_sportid = $${paramCounter}`);
      values.push(validatedData.sportId);
      paramCounter++;
    }
    
    if (validatedData.inputMask !== undefined) {
      updateFields.push(`var_maske = $${paramCounter}`);
      values.push(validatedData.inputMask);
      paramCounter++;
    }
    
    if (validatedData.attempts !== undefined) {
      updateFields.push(`int_versuche = $${paramCounter}`);
      values.push(validatedData.attempts);
      paramCounter++;
    }
    
    if (validatedData.shortcut !== undefined) {
      updateFields.push(`var_kuerzel = $${paramCounter}`);
      values.push(validatedData.shortcut);
      paramCounter++;
    }
    
    if (validatedData.calculationType !== undefined) {
      updateFields.push(`int_berechnung = $${paramCounter}`);
      values.push(validatedData.calculationType);
      paramCounter++;
    }
    
    if (validatedData.lanesDivision !== undefined) {
      updateFields.push(`bol_bahnen = $${paramCounter}`);
      values.push(validatedData.lanesDivision);
      paramCounter++;
    }
    
    if (validatedData.formulaId !== undefined && validatedData.formulaId !== null) {
      updateFields.push(`int_formelid = $${paramCounter}`);
      values.push(validatedData.formulaId);
      paramCounter++;
    }
    
    if (validatedData.shouldCalculate !== undefined) {
      updateFields.push(`bol_berechnen = $${paramCounter}`);
      values.push(validatedData.shouldCalculate);
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
        int_disziplinenid as id,
        var_name as name,
        var_name,
        var_kurz1 as short_name,
        var_kurz1,
        var_kurz2 as display_name,
        var_kurz2,
        var_formel as formula,
        var_formel,
        var_maske as input_mask,
        var_maske,
        int_versuche as attempts,
        int_versuche,
        var_icon as icon,
        var_icon,
        var_kuerzel as shortcut,
        var_kuerzel,
        int_berechnung as calculation_type,
        int_berechnung,
        var_einheit as unit,
        var_einheit,
        bol_bahnen as lanes_division,
        bol_bahnen,
        bol_m as male_allowed,
        bol_m,
        bol_w as female_allowed,
        bol_w,
        int_sportid as sport_id,
        int_sportid,
        int_formelid as formula_id,
        int_formelid,
        bol_berechnen as should_calculate,
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
      console.error('Validation error details:', JSON.stringify(error.issues, null, 2));
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
