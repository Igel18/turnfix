import express from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const router = express.Router()
const prisma = new PrismaClient()

// Validation schemas
const getSquadDisciplinesSchema = z.object({
  eventId: z.coerce.number(),
  squadName: z.string().optional(),
  disciplineId: z.coerce.number().optional()
})

const updateStatusSchema = z.object({
  statusId: z.coerce.number()
})

// GET /api/squad-disciplines - Get squad-discipline combinations with their statuses
router.get('/', async (req, res) => {
  try {
    const validation = getSquadDisciplinesSchema.safeParse(req.query)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validation.error.issues
      })
    }

    const { eventId, squadName, disciplineId } = validation.data

    let whereCondition: any = {
      int_veranstaltungenid: eventId
    }

    if (squadName) {
      whereCondition.var_riege = squadName
    }

    if (disciplineId) {
      whereCondition.int_disziplinenid = disciplineId
    }

    const squadDisciplines = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: whereCondition,
      include: {
        tfx_status: true,
        tfx_disziplinen: true,
        tfx_veranstaltungen: true
      },
      orderBy: [
        { var_riege: 'asc' },
        { int_disziplinenid: 'asc' }
      ]
    })

    const formattedData = squadDisciplines.map(sd => ({
      id: sd.int_riegen_x_disziplinenid,
      eventId: sd.int_veranstaltungenid,
      squadName: sd.var_riege,
      disciplineId: sd.int_disziplinenid,
      disciplineName: sd.tfx_disziplinen.var_name,
      disciplineShort: sd.tfx_disziplinen.var_kurz1,
      statusId: sd.int_statusid,
      status: {
        id: sd.tfx_status.int_statusid,
        name: sd.tfx_status.var_name,
        colorCode: sd.tfx_status.ary_colorcode
      },
      round: sd.int_runde,
      isFirstApparatus: sd.bol_erstes_geraet
    }))

    res.json({
      squadDisciplines: formattedData,
      eventId,
      total: formattedData.length
    })

  } catch (error) {
    console.error('Error fetching squad disciplines:', error)
    res.status(500).json({ 
      error: 'Failed to fetch squad disciplines',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// GET /api/squad-disciplines/:squadName/:disciplineId - Get specific squad-discipline status
router.get('/:squadName/:disciplineId', async (req, res) => {
  try {
    const { squadName, disciplineId } = req.params
    const { eventId } = req.query

    if (!eventId) {
      return res.status(400).json({ error: 'eventId query parameter is required' })
    }

    const squadDiscipline = await prisma.tfx_riegen_x_disziplinen.findFirst({
      where: {
        int_veranstaltungenid: Number(eventId),
        var_riege: squadName,
        int_disziplinenid: Number(disciplineId)
      },
      include: {
        tfx_status: true,
        tfx_disziplinen: true
      }
    })

    if (!squadDiscipline) {
      return res.status(404).json({ error: 'Squad-discipline combination not found' })
    }

    res.json({
      id: squadDiscipline.int_riegen_x_disziplinenid,
      eventId: squadDiscipline.int_veranstaltungenid,
      squadName: squadDiscipline.var_riege,
      disciplineId: squadDiscipline.int_disziplinenid,
      disciplineName: squadDiscipline.tfx_disziplinen.var_name,
      statusId: squadDiscipline.int_statusid,
      status: {
        id: squadDiscipline.tfx_status.int_statusid,
        name: squadDiscipline.tfx_status.var_name,
        colorCode: squadDiscipline.tfx_status.ary_colorcode
      },
      round: squadDiscipline.int_runde,
      isFirstApparatus: squadDiscipline.bol_erstes_geraet
    })

  } catch (error) {
    console.error('Error fetching squad discipline:', error)
    res.status(500).json({ 
      error: 'Failed to fetch squad discipline',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// PUT /api/squad-disciplines/:squadName/:disciplineId/status - Update squad-discipline status
router.put('/:squadName/:disciplineId/status', async (req, res) => {
  try {
    const { squadName, disciplineId } = req.params
    const { eventId } = req.query

    if (!eventId) {
      return res.status(400).json({ error: 'eventId query parameter is required' })
    }

    const validation = updateStatusSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { statusId } = validation.data

    // Verify the status exists
    const status = await prisma.tfx_status.findUnique({
      where: { int_statusid: statusId }
    })

    if (!status) {
      return res.status(404).json({ error: 'Status not found' })
    }

    // Update the squad-discipline status
    const updatedSquadDiscipline = await prisma.tfx_riegen_x_disziplinen.updateMany({
      where: {
        int_veranstaltungenid: Number(eventId),
        var_riege: squadName,
        int_disziplinenid: Number(disciplineId)
      },
      data: {
        int_statusid: statusId
      }
    })

    if (updatedSquadDiscipline.count === 0) {
      return res.status(404).json({ error: 'Squad-discipline combination not found' })
    }

    res.json({
      success: true,
      message: 'Squad-discipline status updated successfully',
      updated: updatedSquadDiscipline.count
    })

  } catch (error) {
    console.error('Error updating squad discipline status:', error)
    res.status(500).json({ 
      error: 'Failed to update squad discipline status',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
