import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

/**
 * POST /api/scores/group
 * Create or update group score with components (D/E/A notes)
 */
router.post('/group', async (req: Request, res: Response) => {
  try {
    const {
      groupId,
      competitionId,
      disciplineId,
      attemptNumber = 1,
      squadName,
      components = [], // [{ fieldId: 1, value: 8.5 }, ...]
      finalScore,
      statusId = 1,
      startNumber,
      comment
    } = req.body;

    // Validation
    if (!groupId || !competitionId || !disciplineId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: groupId, competitionId, disciplineId'
      });
    }

    // Get group info for start number (if not provided)
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: parseInt(groupId) }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: `Group with ID ${groupId} not found`
      });
    }

    const actualStartNumber = startNumber || group.int_startnummer || null;

    // Check if score already exists for this group/competition/discipline/attempt
    const existingScore = await prisma.tfx_wertungen.findFirst({
      where: {
        int_gruppenid: parseInt(groupId),
        int_wettkaempfeid: parseInt(competitionId),
        int_runde: attemptNumber
      }
    });

    let score;
    
    if (existingScore) {
      // Update existing score
      score = await prisma.tfx_wertungen.update({
        where: { int_wertungenid: existingScore.int_wertungenid },
        data: {
          int_statusid: statusId,
          int_startnummer: actualStartNumber,
          var_riege: squadName || null,
          var_comment: comment || null
        }
      });

      // Delete existing detail scores for this discipline/attempt
      await prisma.tfx_wertungen_details.deleteMany({
        where: {
          int_wertungenid: score.int_wertungenid,
          int_disziplinenid: parseInt(disciplineId),
          int_versuch: attemptNumber
        }
      });
    } else {
      // Create new score record
      score = await prisma.tfx_wertungen.create({
        data: {
          int_wettkaempfeid: parseInt(competitionId),
          int_gruppenid: parseInt(groupId),
          int_teilnehmerid: null, // NULL for groups
          int_mannschaftenid: null,
          int_statusid: statusId,
          int_runde: attemptNumber,
          int_startnummer: actualStartNumber,
          var_riege: squadName || null,
          var_comment: comment || null,
          bol_ak: false,
          bol_startet_nicht: false
        }
      });
    }

    // Store component scores (D, E, A, etc.)
    const createdComponents = [];
    
    for (const component of components) {
      if (!component.fieldId || component.value === null || component.value === undefined) {
        continue;
      }

      const detail = await prisma.tfx_wertungen_details.create({
        data: {
          int_wertungenid: score.int_wertungenid,
          int_disziplinenid: parseInt(disciplineId),
          int_versuch: attemptNumber,
          rel_leistung: parseFloat(component.value),
          int_kp: component.fieldId // References tfx_disziplinen_felder.int_disziplinen_felderid
        }
      });

      createdComponents.push({
        id: detail.int_wertungen_detailsid,
        fieldId: component.fieldId,
        value: parseFloat(component.value)
      });
    }

    // Store final score (if provided)
    if (finalScore !== null && finalScore !== undefined) {
      // Get the field ID for the final score (bol_endwert = true)
      const finalScoreField = await prisma.tfx_disziplinen_felder.findFirst({
        where: {
          int_disziplinenid: parseInt(disciplineId),
          bol_endwert: true,
          bol_enabled: true
        },
        orderBy: { int_reihenfolge: 'asc' }
      });

      if (finalScoreField) {
        const finalDetail = await prisma.tfx_wertungen_details.create({
          data: {
            int_wertungenid: score.int_wertungenid,
            int_disziplinenid: parseInt(disciplineId),
            int_versuch: attemptNumber,
            rel_leistung: parseFloat(finalScore),
            int_kp: finalScoreField.int_disziplinen_felderid
          }
        });

        createdComponents.push({
          id: finalDetail.int_wertungen_detailsid,
          fieldId: finalScoreField.int_disziplinen_felderid,
          value: parseFloat(finalScore),
          isFinal: true
        });
      }
    }

    res.json({
      success: true,
      scoreId: score.int_wertungenid,
      components: createdComponents,
      message: existingScore ? 'Score updated successfully' : 'Score created successfully'
    });

  } catch (error) {
    console.error('Error saving group score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save group score',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/scores/group/:groupId
 * Retrieve all scores for a group
 */
router.get('/group/:groupId', async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;
    const {
      competitionId,
      disciplineId,
      includeComponents = 'true'
    } = req.query;

    // Get group info
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: parseInt(groupId) },
      select: {
        int_gruppenid: true,
        var_name: true,
        int_startnummer: true
      }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: `Group with ID ${groupId} not found`
      });
    }

    // Build where clause
    const whereClause: any = {
      int_gruppenid: parseInt(groupId)
    };

    if (competitionId) {
      whereClause.int_wettkaempfeid = parseInt(competitionId as string);
    }

    // Get scores
    const scores = await prisma.tfx_wertungen.findMany({
      where: whereClause,
      include: {
        tfx_wertungen_details: includeComponents === 'true' ? {
          include: {
            tfx_disziplinen: {
              select: {
                int_disziplinenid: true,
                var_name: true,
                var_shortname: true
              }
            }
          }
        } : false,
        tfx_wettkaempfe: {
          select: {
            int_wettkaempfeid: true,
            var_name: true
          }
        },
        tfx_status: {
          select: {
            int_statusid: true,
            var_name: true,
            ary_colorcode: true
          }
        }
      },
      orderBy: [
        { int_wettkaempfeid: 'asc' },
        { int_runde: 'asc' }
      ]
    });

    // Filter by discipline if specified
    let filteredScores = scores;
    if (disciplineId && includeComponents === 'true') {
      filteredScores = scores.filter(score => 
        score.tfx_wertungen_details.some(detail => 
          detail.int_disziplinenid === parseInt(disciplineId as string)
        )
      );
    }

    // Transform scores to response format
    const transformedScores = await Promise.all(filteredScores.map(async score => {
      // Get discipline fields info if components are included
      let components: any[] = [];
      
      if (includeComponents === 'true' && score.tfx_wertungen_details) {
        // Group details by discipline
        const detailsByDiscipline = score.tfx_wertungen_details.reduce((acc: any, detail) => {
          const discId = detail.int_disziplinenid;
          if (!acc[discId]) {
            acc[discId] = [];
          }
          acc[discId].push(detail);
          return acc;
        }, {});

        // Get field info for each component
        for (const [discId, details] of Object.entries(detailsByDiscipline)) {
          const fields = await prisma.tfx_disziplinen_felder.findMany({
            where: {
              int_disziplinenid: parseInt(discId),
              int_disziplinen_felderid: {
                in: (details as any[]).map(d => d.int_kp)
              }
            }
          });

          const fieldMap = new Map(fields.map(f => [f.int_disziplinen_felderid, f]));

          for (const detail of details as any[]) {
            const field = fieldMap.get(detail.int_kp);
            components.push({
              fieldId: detail.int_kp,
              fieldName: field?.var_name || 'Unknown',
              fieldShortName: field?.var_kurzname || '',
              value: detail.rel_leistung,
              isFinal: field?.bol_endwert || false,
              disciplineId: detail.int_disziplinenid,
              disciplineName: detail.tfx_disziplinen?.var_name || '',
              attempt: detail.int_versuch
            });
          }
        }
      }

      // Get final score (field with bol_endwert = true)
      const finalScoreComponent = components.find(c => c.isFinal);

      return {
        id: score.int_wertungenid,
        competitionId: score.int_wettkaempfeid,
        competitionName: score.tfx_wettkaempfe?.var_name || '',
        attemptNumber: score.int_runde,
        squadName: score.var_riege,
        startNumber: score.int_startnummer,
        finalScore: finalScoreComponent?.value || null,
        statusId: score.int_statusid,
        statusName: score.tfx_status?.var_name || '',
        statusColor: score.tfx_status?.ary_colorcode || '',
        comment: score.var_comment,
        outOfCompetition: score.bol_ak,
        didNotStart: score.bol_startet_nicht,
        components: includeComponents === 'true' ? components : undefined
      };
    }));

    res.json({
      success: true,
      group: {
        id: group.int_gruppenid,
        name: group.var_name,
        startNumber: group.int_startnummer
      },
      scores: transformedScores
    });

  } catch (error) {
    console.error('Error retrieving group scores:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve group scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/scores/group/:scoreId
 * Delete a group score and all its components
 */
router.delete('/group/:scoreId', async (req: Request, res: Response) => {
  try {
    const { scoreId } = req.params;

    // Verify score exists and belongs to a group
    const score = await prisma.tfx_wertungen.findUnique({
      where: { int_wertungenid: parseInt(scoreId) }
    });

    if (!score) {
      return res.status(404).json({
        success: false,
        error: `Score with ID ${scoreId} not found`
      });
    }

    if (!score.int_gruppenid) {
      return res.status(400).json({
        success: false,
        error: 'This score does not belong to a group'
      });
    }

    // Delete score (cascade will delete tfx_wertungen_details)
    await prisma.tfx_wertungen.delete({
      where: { int_wertungenid: parseInt(scoreId) }
    });

    res.json({
      success: true,
      message: 'Group score deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting group score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group score',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
