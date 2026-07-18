import express from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { io } from '../index'

const router = express.Router()

// Validation schemas
const getSquadDisciplinesSchema = z.object({
  eventId: z.coerce.number(),
  squadName: z.string().optional(),
  disciplineId: z.coerce.number().optional()
})

const generateSquadDisciplinesSchema = z.object({
  eventId: z.coerce.number()
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
      select: {
        int_riegen_x_disziplinenid: true,
        int_veranstaltungenid: true,
        var_riege: true,
        int_disziplinenid: true,
        int_statusid: true,
        int_runde: true,
        bol_erstes_geraet: true
      },
      orderBy: [
        { var_riege: 'asc' },
        { int_disziplinenid: 'asc' }
      ]
    })

    const statusIds = Array.from(new Set(squadDisciplines.map(sd => sd.int_statusid)))
    const disciplineIds = Array.from(new Set(squadDisciplines.map(sd => sd.int_disziplinenid)))

    const [statuses, disciplines] = await Promise.all([
      prisma.tfx_status.findMany({
        where: { int_statusid: { in: statusIds } },
        select: { int_statusid: true, var_name: true, ary_colorcode: true }
      }),
      prisma.tfx_disziplinen.findMany({
        where: { int_disziplinenid: { in: disciplineIds } },
        select: { int_disziplinenid: true, var_name: true, var_kurz1: true }
      })
    ])

    const statusById = new Map(statuses.map(s => [s.int_statusid, s]))
    const disciplineById = new Map(disciplines.map(d => [d.int_disziplinenid, d]))

    const formattedData = squadDisciplines.map(sd => ({
      id: sd.int_riegen_x_disziplinenid,
      eventId: sd.int_veranstaltungenid,
      // Backward compatibility for older clients/tests expecting squadId.
      squadId: sd.var_riege,
      squadName: sd.var_riege,
      disciplineId: sd.int_disziplinenid,
      disciplineName: disciplineById.get(sd.int_disziplinenid)?.var_name || 'Unknown',
      disciplineShort: disciplineById.get(sd.int_disziplinenid)?.var_kurz1 || null,
      statusId: sd.int_statusid,
      status: {
        id: statusById.get(sd.int_statusid)?.int_statusid ?? sd.int_statusid,
        name: statusById.get(sd.int_statusid)?.var_name || 'Unknown',
        colorCode: statusById.get(sd.int_statusid)?.ary_colorcode || '{128,128,128}'
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
      select: {
        int_riegen_x_disziplinenid: true,
        int_veranstaltungenid: true,
        var_riege: true,
        int_disziplinenid: true,
        int_statusid: true,
        int_runde: true,
        bol_erstes_geraet: true
      }
    })

    if (!squadDiscipline) {
      return res.status(404).json({ error: 'Squad-discipline combination not found' })
    }

    const [status, discipline] = await Promise.all([
      prisma.tfx_status.findUnique({
        where: { int_statusid: squadDiscipline.int_statusid },
        select: { int_statusid: true, var_name: true, ary_colorcode: true }
      }),
      prisma.tfx_disziplinen.findUnique({
        where: { int_disziplinenid: squadDiscipline.int_disziplinenid },
        select: { int_disziplinenid: true, var_name: true }
      })
    ])

    res.json({
      id: squadDiscipline.int_riegen_x_disziplinenid,
      eventId: squadDiscipline.int_veranstaltungenid,
      // Backward compatibility for older clients/tests expecting squadId.
      squadId: squadDiscipline.var_riege,
      squadName: squadDiscipline.var_riege,
      disciplineId: squadDiscipline.int_disziplinenid,
      disciplineName: discipline?.var_name || 'Unknown',
      statusId: squadDiscipline.int_statusid,
      status: {
        id: status?.int_statusid ?? squadDiscipline.int_statusid,
        name: status?.var_name || 'Unknown',
        colorCode: status?.ary_colorcode || '{128,128,128}'
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

    // Emit Socket.IO event to notify clients of status update
    const { io } = require('../index')
    io.emit('squad-status-updated', { eventId: Number(eventId), squadName, disciplineId })

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

// POST /api/squad-disciplines/generate - Auto-generate squad-discipline combinations
router.post('/generate', async (req, res) => {
  try {
    const validation = generateSquadDisciplinesSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.issues
      })
    }

    const { eventId } = validation.data

    console.log(`🔧 Generating squad-discipline combinations for event ${eventId}...`)

    // Get all squads for this event
    const squadsQuery = `
      SELECT DISTINCT w.var_riege as squad_name
      FROM tfx_wertungen w
      INNER JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1 AND w.var_riege IS NOT NULL AND w.var_riege != ''
      ORDER BY w.var_riege
    `
    
    const squads = await prisma.$queryRawUnsafe<Array<{ squad_name: string }>>(squadsQuery, eventId)
    console.log(`📋 Found ${squads.length} squads:`, squads.map(s => s.squad_name))

    if (squads.length === 0) {
      return res.status(400).json({
        error: 'No squads found for this event',
        message: 'Please create squads and assign participants first'
      })
    }

    // Get all disciplines used in competitions for this event
    const disciplinesQuery = `
      SELECT DISTINCT 
        wxd.int_disziplinenid,
        d.var_name as discipline_name
      FROM tfx_wettkaempfe wk
      INNER JOIN tfx_wettkaempfe_x_disziplinen wxd ON wk.int_wettkaempfeid = wxd.int_wettkaempfeid
      INNER JOIN tfx_disziplinen d ON wxd.int_disziplinenid = d.int_disziplinenid
      WHERE wk.int_veranstaltungenid = $1
      ORDER BY d.var_name
    `
    
    const disciplines = await prisma.$queryRawUnsafe<Array<{ int_disziplinenid: number, discipline_name: string }>>(
      disciplinesQuery,
      eventId
    )
    console.log(`🏅 Found ${disciplines.length} disciplines:`, disciplines.map(d => `${d.discipline_name} (${d.int_disziplinenid})`))

    if (disciplines.length === 0) {
      return res.status(400).json({
        error: 'No disciplines found for this event',
        message: 'Please configure competitions with disciplines first'
      })
    }

    // Get default status (usually "Nicht begonnen" or similar)
    const defaultStatus = await prisma.tfx_status.findFirst({
      orderBy: { int_statusid: 'asc' }
    })

    if (!defaultStatus) {
      return res.status(500).json({
        error: 'No status found in database',
        message: 'Please configure at least one status first'
      })
    }

    // Generate all combinations
    const combinations: Array<{
      int_veranstaltungenid: number
      var_riege: string
      int_disziplinenid: number
      int_statusid: number
      int_runde: number | null
      bol_erstes_geraet: boolean
    }> = []

    for (const squad of squads) {
      for (const discipline of disciplines) {
        combinations.push({
          int_veranstaltungenid: eventId,
          var_riege: squad.squad_name,
          int_disziplinenid: discipline.int_disziplinenid,
          int_statusid: defaultStatus.int_statusid,
          int_runde: null,
          bol_erstes_geraet: false
        })
      }
    }

    console.log(`🔨 Creating ${combinations.length} squad-discipline combinations...`)

    // Check for existing combinations to avoid duplicates
    const existing = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: {
        int_veranstaltungenid: eventId
      },
      select: {
        var_riege: true,
        int_disziplinenid: true
      }
    })

    const existingSet = new Set(
      existing.map(e => `${e.var_riege}-${e.int_disziplinenid}`)
    )

    // Filter out existing combinations
    const newCombinations = combinations.filter(
      c => !existingSet.has(`${c.var_riege}-${c.int_disziplinenid}`)
    )

    console.log(`✨ ${newCombinations.length} new combinations to create (${combinations.length - newCombinations.length} already exist)`)

    // Insert new combinations
    if (newCombinations.length > 0) {
      await prisma.tfx_riegen_x_disziplinen.createMany({
        data: newCombinations,
        skipDuplicates: true
      })
    }

    // Emit Socket.IO event to notify clients
    io.emit('squad-status-updated', { eventId: eventId })
    console.log(`📢 Socket.IO event emitted: squad-status-updated for eventId=${eventId}`)

    res.json({
      success: true,
      message: 'Squad-discipline combinations generated successfully',
      created: newCombinations.length,
      existing: combinations.length - newCombinations.length,
      total: combinations.length,
      squads: squads.length,
      disciplines: disciplines.length
    })

  } catch (error) {
    console.error('Error generating squad disciplines:', error)
    res.status(500).json({
      error: 'Failed to generate squad disciplines',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
