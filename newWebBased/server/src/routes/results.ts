import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createResultSchema = z.object({
  competitionId: z.number().int().positive(),
  participantId: z.number().int().positive(),
  disciplineId: z.number().int().positive(),
  score: z.number(),
  rank: z.number().int().positive().optional(),
  notes: z.string().optional()
});

const updateResultSchema = createResultSchema.partial();

// Get all results with pagination
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const competitionId = req.query.competitionId as string;
    const participantId = req.query.participantId as string;
    const disciplineId = req.query.disciplineId as string;

    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (competitionId) {
      whereConditions.push(`r.int_veranstaltungid = $${paramIndex}`);
      params.push(parseInt(competitionId));
      paramIndex++;
    }
    if (participantId) {
      whereConditions.push(`r.int_teilnehmerid = $${paramIndex}`);
      params.push(parseInt(participantId));
      paramIndex++;
    }
    if (disciplineId) {
      whereConditions.push(`r.int_disziplinid = $${paramIndex}`);
      params.push(parseInt(disciplineId));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    const query = `
      SELECT 
        r.*,
        e.var_name as competition_name,
        e.dat_start as competition_start,
        e.dat_ende as competition_end,
        t.var_vorname as participant_firstname,
        t.var_nachname as participant_lastname,
        d.var_name as discipline_name
      FROM tfx_ergebnisse r
      LEFT JOIN tfx_veranstaltungen e ON r.int_veranstaltungid = e.int_veranstaltungid
      LEFT JOIN tfx_teilnehmer t ON r.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_disziplinen d ON r.int_disziplinid = d.int_disziplinid
      ${whereClause}
      ORDER BY r.dec_note DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const results = await prisma.$queryRawUnsafe(query, ...params, limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tfx_ergebnisse r
      LEFT JOIN tfx_veranstaltungen e ON r.int_veranstaltungid = e.int_veranstaltungid
      LEFT JOIN tfx_teilnehmer t ON r.int_teilnehmerid = t.int_teilnehmerid
      LEFT JOIN tfx_disziplinen d ON r.int_disziplinid = d.int_disziplinid
      ${whereClause}
    `;

    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params.slice(0, -2));
    const totalCount = Number((countResult as any)[0]?.total || 0);

    res.json({
      results,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get result by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const resultId = parseInt(req.params.id);

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            description: true,
            startDate: true,
            endDate: true,
            location: true,
            type: true,
            status: true
          }
        },
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthDate: true,
            gender: true,
            licenseNo: true,
            nationality: true,
            club: {
              select: {
                id: true,
                name: true,
                shortName: true,
                city: true,
                country: true
              }
            }
          }
        },
        discipline: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true,
            order: true
          }
        }
      }
    });

    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json({ result });
  } catch (error) {
    console.error('Error fetching result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new result
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const validatedData = createResultSchema.parse(req.body);

    // Check if competition exists
    const competition = await prisma.competition.findUnique({
      where: { id: validatedData.competitionId }
    });

    if (!competition) {
      return res.status(400).json({ error: 'Competition not found' });
    }

    // Check if participant exists
    const participant = await prisma.participant.findUnique({
      where: { id: validatedData.participantId }
    });

    if (!participant) {
      return res.status(400).json({ error: 'Participant not found' });
    }

    // Check if discipline exists
    const discipline = await prisma.discipline.findUnique({
      where: { id: validatedData.disciplineId }
    });

    if (!discipline) {
      return res.status(400).json({ error: 'Discipline not found' });
    }

    // Check if result already exists
    const existingResult = await prisma.result.findUnique({
      where: {
        competitionId_participantId_disciplineId: {
          competitionId: validatedData.competitionId,
          participantId: validatedData.participantId,
          disciplineId: validatedData.disciplineId
        }
      }
    });

    if (existingResult) {
      return res.status(400).json({ error: 'Result for this participant and discipline already exists' });
    }

    const result = await prisma.result.create({
      data: {
        competitionId: validatedData.competitionId,
        participantId: validatedData.participantId,
        disciplineId: validatedData.disciplineId,
        score: validatedData.score,
        rank: validatedData.rank,
        notes: validatedData.notes
      },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true
          }
        },
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            licenseNo: true,
            club: {
              select: {
                id: true,
                name: true,
                shortName: true
              }
            }
          }
        },
        discipline: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true
          }
        }
      }
    });

    res.status(201).json({ result });
  } catch (error) {
    console.error('Error creating result:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update result
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const resultId = parseInt(req.params.id);
    const validatedData = updateResultSchema.parse(req.body);

    // Build update data
    const updateData: any = {};
    if (validatedData.score !== undefined) updateData.score = validatedData.score;
    if (validatedData.rank !== undefined) updateData.rank = validatedData.rank;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.competitionId) updateData.competitionId = validatedData.competitionId;
    if (validatedData.participantId) updateData.participantId = validatedData.participantId;
    if (validatedData.disciplineId) updateData.disciplineId = validatedData.disciplineId;

    const result = await prisma.result.update({
      where: { id: resultId },
      data: updateData,
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true
          }
        },
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            licenseNo: true,
            club: {
              select: {
                id: true,
                name: true,
                shortName: true
              }
            }
          }
        },
        discipline: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true
          }
        }
      }
    });

    res.json({ result });
  } catch (error) {
    console.error('Error updating result:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete result
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const resultId = parseInt(req.params.id);

    await prisma.result.delete({
      where: { id: resultId }
    });

    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Error deleting result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get results by competition with rankings
router.get('/competition/:competitionId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const competitionId = parseInt(req.params.competitionId);
    const disciplineId = req.query.disciplineId as string;

    const whereConditions: any = { competitionId };
    if (disciplineId) {
      whereConditions.disciplineId = parseInt(disciplineId);
    }

    const results = await prisma.result.findMany({
      where: whereConditions,
      include: {
        participant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            licenseNo: true,
            club: {
              select: {
                id: true,
                name: true,
                shortName: true
              }
            }
          }
        },
        discipline: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true
          }
        }
      },
      orderBy: [
        { disciplineId: 'asc' },
        { rank: 'asc' },
        { score: 'desc' }
      ]
    });

    res.json({ results });
  } catch (error) {
    console.error('Error fetching competition results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get results by participant
router.get('/participant/:participantId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const participantId = parseInt(req.params.participantId);

    const results = await prisma.result.findMany({
      where: { participantId },
      include: {
        competition: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            location: true
          }
        },
        discipline: {
          select: {
            id: true,
            name: true,
            description: true,
            maxScore: true
          }
        }
      },
      orderBy: [
        { judgedAt: 'desc' }
      ]
    });

    res.json({ results });
  } catch (error) {
    console.error('Error fetching participant results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate and update rankings for a competition/discipline
router.post('/calculate-rankings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { competitionId, disciplineId } = req.body;

    if (!competitionId || !disciplineId) {
      return res.status(400).json({ error: 'Competition ID and Discipline ID are required' });
    }

    // Get all results for the competition/discipline ordered by score
    const results = await prisma.result.findMany({
      where: {
        competitionId: parseInt(competitionId),
        disciplineId: parseInt(disciplineId)
      },
      orderBy: { score: 'desc' }
    });

    // Update rankings
    const updatePromises = results.map((result, index) => {
      return prisma.result.update({
        where: { id: result.id },
        data: { rank: index + 1 }
      });
    });

    await Promise.all(updatePromises);

    res.json({ 
      message: 'Rankings calculated and updated successfully',
      updatedCount: results.length
    });
  } catch (error) {
    console.error('Error calculating rankings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
