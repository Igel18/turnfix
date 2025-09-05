import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createFormulaSchema = z.object({
  var_name: z.string().min(1).max(100),
  var_formel: z.string().max(200).optional(),
  int_typ: z.number().int().min(0).max(32767).default(0)
});

const updateFormulaSchema = createFormulaSchema.partial();

// Get formulas count
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.tfx_formeln.count();
    res.json({ count });
  } catch (error) {
    console.error('Error counting formulas:', error);
    res.status(500).json({ 
      error: 'Failed to count formulas',
      details: process.env.DEBUG === 'true' ? error : undefined
    });
  }
});

// Get all formulas
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const search = req.query.search as string;

    const whereConditions: any = {};
    
    if (search) {
      whereConditions.OR = [
        {
          var_name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          var_formel: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [formulas, totalCount] = await Promise.all([
      prisma.tfx_formeln.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        include: {
          tfx_disziplinen: {
            select: {
              int_disziplinenid: true,
              var_name: true
            }
          }
        },
        orderBy: { var_name: 'asc' }
      }),
      prisma.tfx_formeln.count({ where: whereConditions })
    ]);

    // Add discipline count
    const formulasWithCount = formulas.map(formula => ({
      ...formula,
      discipline_count: formula.tfx_disziplinen.length
    }));

    res.json({
      formulas: formulasWithCount,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching formulas:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get formula by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid formula ID' });
    }

    const formula = await prisma.tfx_formeln.findUnique({
      where: { int_formelid: id },
      include: {
        tfx_disziplinen: {
          select: { 
            int_disziplinenid: true, 
            var_name: true,
            var_kurz1: true,
            var_kurz2: true
          }
        }
      }
    });

    if (!formula) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    const formulaWithCount = {
      ...formula,
      discipline_count: formula.tfx_disziplinen.length
    };

    res.json(formulaWithCount);
  } catch (error) {
    console.error('Error fetching formula:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new formula
router.post('/', async (req, res) => {
  try {
    const validatedData = createFormulaSchema.parse(req.body);
    
    // Check if formula with same name already exists
    const existingFormula = await prisma.tfx_formeln.findFirst({
      where: {
        var_name: validatedData.var_name
      }
    });

    if (existingFormula) {
      return res.status(400).json({ error: 'A formula with this name already exists' });
    }

    const formula = await prisma.tfx_formeln.create({
      data: validatedData,
      include: {
        tfx_disziplinen: {
          select: {
            int_disziplinenid: true,
            var_name: true
          }
        }
      }
    });

    const formulaWithCount = {
      ...formula,
      discipline_count: formula.tfx_disziplinen.length
    };

    res.status(201).json(formulaWithCount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating formula:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update formula
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid formula ID' });
    }

    const validatedData = updateFormulaSchema.parse(req.body);
    
    // Check if formula exists
    const existingFormula = await prisma.tfx_formeln.findUnique({
      where: { int_formelid: id }
    });

    if (!existingFormula) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    // Check if another formula with same name already exists (if name is being updated)
    if (validatedData.var_name) {
      const duplicateFormula = await prisma.tfx_formeln.findFirst({
        where: {
          var_name: validatedData.var_name,
          int_formelid: { not: id }
        }
      });

      if (duplicateFormula) {
        return res.status(400).json({ error: 'A formula with this name already exists' });
      }
    }
    
    const formula = await prisma.tfx_formeln.update({
      where: { int_formelid: id },
      data: validatedData,
      include: {
        tfx_disziplinen: {
          select: {
            int_disziplinenid: true,
            var_name: true
          }
        }
      }
    });

    const formulaWithCount = {
      ...formula,
      discipline_count: formula.tfx_disziplinen.length
    };

    res.json(formulaWithCount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error updating formula:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete formula
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid formula ID' });
    }

    // Check if formula exists and has associated disciplines
    const existingFormula = await prisma.tfx_formeln.findUnique({
      where: { int_formelid: id },
      include: {
        tfx_disziplinen: true
      }
    });

    if (!existingFormula) {
      return res.status(404).json({ error: 'Formula not found' });
    }

    // Check if formula has associated disciplines
    if (existingFormula.tfx_disziplinen.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete formula with associated disciplines. Please remove all discipline associations first.' 
      });
    }

    await prisma.tfx_formeln.delete({
      where: { int_formelid: id }
    });

    res.json({ message: 'Formula deleted successfully' });
  } catch (error) {
    console.error('Error deleting formula:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
