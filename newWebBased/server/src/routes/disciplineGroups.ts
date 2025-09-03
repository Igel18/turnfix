import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createDisciplineGroupSchema = z.object({
  var_name: z.string().min(1).max(100),
  txt_comment: z.string().optional(),
  disciplineIds: z.array(z.number()).optional()
});

const updateDisciplineGroupSchema = z.object({
  var_name: z.string().min(1).max(100).optional(),
  txt_comment: z.string().optional(),
  disciplineIds: z.array(z.number()).optional()
});

// Helper function to manage discipline assignments
const manageDisciplineAssignments = async (groupId: number, disciplineIds: number[] = []) => {
  // First, remove all existing assignments
  await prisma.tfx_disgrp_x_disziplinen.deleteMany({
    where: { int_disziplinen_gruppenid: groupId }
  });

  // Then, add new assignments with positions
  if (disciplineIds.length > 0) {
    const assignments = disciplineIds.map((disciplineId, index) => ({
      int_disziplinen_gruppenid: groupId,
      int_disziplinenid: disciplineId,
      int_pos: index + 1
    }));

    await prisma.tfx_disgrp_x_disziplinen.createMany({
      data: assignments
    });
  }
};

// Get all discipline groups
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
          txt_comment: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [disciplineGroups, totalCount] = await Promise.all([
      prisma.tfx_disziplinen_gruppen.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        include: {
          tfx_disgrp_x_disziplinen: {
            include: {
              tfx_disziplinen: {
                select: {
                  int_disziplinenid: true,
                  var_name: true,
                  var_kurz1: true,
                  var_kurz2: true
                }
              }
            },
            orderBy: {
              int_pos: 'asc'
            }
          }
        },
        orderBy: { var_name: 'asc' }
      }),
      prisma.tfx_disziplinen_gruppen.count({ where: whereConditions })
    ]);

    // Add discipline count and simplify structure
    const disciplineGroupsWithCount = disciplineGroups.map(group => ({
      ...group,
      discipline_count: group.tfx_disgrp_x_disziplinen.length,
      disciplines: group.tfx_disgrp_x_disziplinen.map(dx => ({
        ...dx.tfx_disziplinen,
        position: dx.int_pos
      }))
    }));

    res.json({
      disciplineGroups: disciplineGroupsWithCount,
      pagination: {
        total: totalCount,
        limit,
        offset,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching discipline groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get discipline group by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid discipline group ID' });
    }

    const disciplineGroup = await prisma.tfx_disziplinen_gruppen.findUnique({
      where: { int_disziplinen_gruppenid: id },
      include: {
        tfx_disgrp_x_disziplinen: {
          include: {
            tfx_disziplinen: {
              select: {
                int_disziplinenid: true,
                var_name: true,
                var_kurz1: true,
                var_kurz2: true,
                var_einheit: true
              }
            }
          },
          orderBy: {
            int_pos: 'asc'
          }
        }
      }
    });

    if (!disciplineGroup) {
      return res.status(404).json({ error: 'Discipline group not found' });
    }

    const disciplineGroupWithCount = {
      ...disciplineGroup,
      discipline_count: disciplineGroup.tfx_disgrp_x_disziplinen.length,
      disciplines: disciplineGroup.tfx_disgrp_x_disziplinen.map(dx => ({
        ...dx.tfx_disziplinen,
        position: dx.int_pos
      }))
    };

    res.json(disciplineGroupWithCount);
  } catch (error) {
    console.error('Error fetching discipline group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new discipline group
router.post('/', async (req, res) => {
  try {
    const validatedData = createDisciplineGroupSchema.parse(req.body);
    
    // Check if discipline group with same name already exists
    const existingGroup = await prisma.tfx_disziplinen_gruppen.findFirst({
      where: {
        var_name: validatedData.var_name
      }
    });

    if (existingGroup) {
      return res.status(400).json({ error: 'A discipline group with this name already exists' });
    }

    // Create the discipline group
    const disciplineGroup = await prisma.tfx_disziplinen_gruppen.create({
      data: {
        var_name: validatedData.var_name,
        txt_comment: validatedData.txt_comment
      }
    });

    // Handle discipline assignments if provided
    if (validatedData.disciplineIds && validatedData.disciplineIds.length > 0) {
      await manageDisciplineAssignments(disciplineGroup.int_disziplinen_gruppenid, validatedData.disciplineIds);
    }

    // Fetch the complete group with assignments
    const completeGroup = await prisma.tfx_disziplinen_gruppen.findUnique({
      where: { int_disziplinen_gruppenid: disciplineGroup.int_disziplinen_gruppenid },
      include: {
        tfx_disgrp_x_disziplinen: {
          include: {
            tfx_disziplinen: {
              select: {
                int_disziplinenid: true,
                var_name: true
              }
            }
          },
          orderBy: { int_pos: 'asc' }
        }
      }
    });

    const disciplineGroupWithCount = {
      ...completeGroup,
      discipline_count: completeGroup!.tfx_disgrp_x_disziplinen.length,
      disciplines: completeGroup!.tfx_disgrp_x_disziplinen.map(dx => ({
        ...dx.tfx_disziplinen,
        position: dx.int_pos
      }))
    };

    res.status(201).json(disciplineGroupWithCount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error creating discipline group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update discipline group
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid discipline group ID' });
    }

    const validatedData = updateDisciplineGroupSchema.parse(req.body);
    
    // Check if discipline group exists
    const existingGroup = await prisma.tfx_disziplinen_gruppen.findUnique({
      where: { int_disziplinen_gruppenid: id }
    });

    if (!existingGroup) {
      return res.status(404).json({ error: 'Discipline group not found' });
    }

    // Check if another discipline group with same name already exists (if name is being updated)
    if (validatedData.var_name) {
      const duplicateGroup = await prisma.tfx_disziplinen_gruppen.findFirst({
        where: {
          var_name: validatedData.var_name,
          int_disziplinen_gruppenid: { not: id }
        }
      });

      if (duplicateGroup) {
        return res.status(400).json({ error: 'A discipline group with this name already exists' });
      }
    }
    
    // Update the basic group information
    const updateData: any = {};
    if (validatedData.var_name !== undefined) updateData.var_name = validatedData.var_name;
    if (validatedData.txt_comment !== undefined) updateData.txt_comment = validatedData.txt_comment;

    if (Object.keys(updateData).length > 0) {
      await prisma.tfx_disziplinen_gruppen.update({
        where: { int_disziplinen_gruppenid: id },
        data: updateData
      });
    }

    // Handle discipline assignments if provided
    if (validatedData.disciplineIds !== undefined) {
      await manageDisciplineAssignments(id, validatedData.disciplineIds);
    }

    // Fetch the complete updated group
    const disciplineGroup = await prisma.tfx_disziplinen_gruppen.findUnique({
      where: { int_disziplinen_gruppenid: id },
      include: {
        tfx_disgrp_x_disziplinen: {
          include: {
            tfx_disziplinen: {
              select: {
                int_disziplinenid: true,
                var_name: true
              }
            }
          },
          orderBy: {
            int_pos: 'asc'
          }
        }
      }
    });

    const disciplineGroupWithCount = {
      ...disciplineGroup,
      discipline_count: disciplineGroup!.tfx_disgrp_x_disziplinen.length,
      disciplines: disciplineGroup!.tfx_disgrp_x_disziplinen.map(dx => ({
        ...dx.tfx_disziplinen,
        position: dx.int_pos
      }))
    };

    res.json(disciplineGroupWithCount);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    console.error('Error updating discipline group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete discipline group
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid discipline group ID' });
    }

    // Check if discipline group exists and has associated disciplines
    const existingGroup = await prisma.tfx_disziplinen_gruppen.findUnique({
      where: { int_disziplinen_gruppenid: id },
      include: {
        tfx_disgrp_x_disziplinen: true
      }
    });

    if (!existingGroup) {
      return res.status(404).json({ error: 'Discipline group not found' });
    }

    // Check if discipline group has associated disciplines
    if (existingGroup.tfx_disgrp_x_disziplinen.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete discipline group with associated disciplines. Please remove all discipline associations first.' 
      });
    }

    await prisma.tfx_disziplinen_gruppen.delete({
      where: { int_disziplinen_gruppenid: id }
    });

    res.json({ message: 'Discipline group deleted successfully' });
  } catch (error) {
    console.error('Error deleting discipline group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
