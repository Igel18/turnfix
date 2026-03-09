import { Router } from 'express'
import prisma from '../lib/prisma'

const router = Router()

// GET /api/discipline-fields/count - Get total count of discipline fields
router.get('/count', async (req, res) => {
  try {
    const count = await prisma.tfx_disziplinen_felder.count()
    res.json({ count })
  } catch (error) {
    console.error('Error counting discipline fields:', error)
    res.status(500).json({ 
      error: 'Failed to count discipline fields',
      details: process.env.DEBUG === 'true' ? error : undefined
    })
  }
})

// GET /api/discipline-fields - Get all discipline fields
router.get('/', async (req, res) => {
  try {
    const disciplineId = req.query.disciplineId ? parseInt(req.query.disciplineId as string) : undefined;

    const rows = disciplineId
      ? await prisma.$queryRawUnsafe(`
          SELECT
            df.int_disziplinen_felderid,
            df.int_disziplinenid,
            d.var_name as discipline_name,
            d.var_kurz1 as discipline_short,
            df.var_name,
            df.int_sortierung,
            df.bol_endwert,
            df.bol_ausgangswert,
            df.int_gruppe,
            df.bol_enabled
          FROM tfx_disziplinen_felder df
          LEFT JOIN tfx_disziplinen d ON d.int_disziplinenid = df.int_disziplinenid
          WHERE df.int_disziplinenid = $1
          ORDER BY df.int_disziplinenid ASC, df.int_sortierung ASC
        `, disciplineId) as any[]
      : await prisma.$queryRawUnsafe(`
          SELECT
            df.int_disziplinen_felderid,
            df.int_disziplinenid,
            d.var_name as discipline_name,
            d.var_kurz1 as discipline_short,
            df.var_name,
            df.int_sortierung,
            df.bol_endwert,
            df.bol_ausgangswert,
            df.int_gruppe,
            df.bol_enabled
          FROM tfx_disziplinen_felder df
          LEFT JOIN tfx_disziplinen d ON d.int_disziplinenid = df.int_disziplinenid
          ORDER BY df.int_disziplinenid ASC, df.int_sortierung ASC
        `) as any[]

    const formatted = rows.map((field: any) => ({
      id: field.int_disziplinen_felderid,
      disciplineId: field.int_disziplinenid,
      disciplineName: field.discipline_name || 'Unknown',
      disciplineShort: field.discipline_short || '',
      name: field.var_name,
      sortOrder: field.int_sortierung,
      isFinalScore: field.bol_endwert,
      isStartingScore: field.bol_ausgangswert,
      group: field.int_gruppe,
      enabled: field.bol_enabled ?? true
    }))

    if (process.env.DEBUG === 'true') {
      console.log('Fetched discipline fields:', formatted.length)
    }

    res.json(formatted)
  } catch (error) {
    console.error('Error fetching discipline fields:', error)
    res.status(500).json({ 
      error: 'Failed to fetch discipline fields',
      details: process.env.DEBUG === 'true' ? error : undefined
    })
  }
})

// GET /api/discipline-fields/:id - Get specific discipline field
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        df.int_disziplinen_felderid,
        df.int_disziplinenid,
        d.var_name as discipline_name,
        d.var_kurz1 as discipline_short,
        df.var_name,
        df.int_sortierung,
        df.bol_endwert,
        df.bol_ausgangswert,
        df.int_gruppe,
        df.bol_enabled
      FROM tfx_disziplinen_felder df
      LEFT JOIN tfx_disziplinen d ON d.int_disziplinenid = df.int_disziplinenid
      WHERE df.int_disziplinen_felderid = $1
      LIMIT 1
    `, id) as any[]

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Discipline field not found' })
    }

    const disciplineField = rows[0]

    const formatted = {
      id: disciplineField.int_disziplinen_felderid,
      disciplineId: disciplineField.int_disziplinenid,
      disciplineName: disciplineField.discipline_name || 'Unknown',
      disciplineShort: disciplineField.discipline_short || '',
      name: disciplineField.var_name,
      sortOrder: disciplineField.int_sortierung,
      isFinalScore: disciplineField.bol_endwert,
      isStartingScore: disciplineField.bol_ausgangswert,
      group: disciplineField.int_gruppe,
      enabled: disciplineField.bol_enabled ?? true
    }

    res.json(formatted)
  } catch (error) {
    console.error('Error fetching discipline field:', error)
    res.status(500).json({ 
      error: 'Failed to fetch discipline field',
      details: process.env.DEBUG === 'true' ? error : undefined
    })
  }
})

// POST /api/discipline-fields - Create new discipline field
router.post('/', async (req, res) => {
  try {
    const {
      disciplineId,
      name,
      sortOrder,
      isFinalScore = true,
      isStartingScore = true,
      group = 1,
      enabled = true
    } = req.body

    // Validate required fields
    if (!disciplineId || !name) {
      return res.status(400).json({ error: 'disciplineId and name are required' })
    }

    // Verify discipline exists
    const discipline = await prisma.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: disciplineId }
    })

    if (!discipline) {
      return res.status(400).json({ error: 'Invalid discipline ID' })
    }

    const disciplineField = await prisma.tfx_disziplinen_felder.create({
      data: {
        int_disziplinenid: disciplineId,
        var_name: name,
        int_sortierung: sortOrder,
        bol_endwert: isFinalScore,
        bol_ausgangswert: isStartingScore,
        int_gruppe: group,
        bol_enabled: enabled
      },
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
    })

    const formatted = {
      id: disciplineField.int_disziplinen_felderid,
      disciplineId: disciplineField.int_disziplinenid,
      disciplineName: disciplineField.tfx_disziplinen?.var_name || 'Unknown',
      disciplineShort: disciplineField.tfx_disziplinen?.var_kurz1 || '',
      name: disciplineField.var_name,
      sortOrder: disciplineField.int_sortierung,
      isFinalScore: disciplineField.bol_endwert,
      isStartingScore: disciplineField.bol_ausgangswert,
      group: disciplineField.int_gruppe,
      enabled: disciplineField.bol_enabled
    }

    if (process.env.DEBUG === 'true') {
      console.log('Created discipline field:', formatted)
    }

    res.status(201).json(formatted)
  } catch (error) {
    console.error('Error creating discipline field:', error)
    res.status(500).json({ 
      error: 'Failed to create discipline field',
      details: process.env.DEBUG === 'true' ? error : undefined
    })
  }
})

// PUT /api/discipline-fields/:id - Update discipline field
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const {
      disciplineId,
      name,
      sortOrder,
      isFinalScore,
      isStartingScore,
      group,
      enabled
    } = req.body

    // Check if discipline field exists
    const existing = await prisma.tfx_disziplinen_felder.findUnique({
      where: { int_disziplinen_felderid: id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Discipline field not found' })
    }

    // Verify discipline exists if being changed
    if (disciplineId && disciplineId !== existing.int_disziplinenid) {
      const discipline = await prisma.tfx_disziplinen.findUnique({
        where: { int_disziplinenid: disciplineId }
      })

      if (!discipline) {
        return res.status(400).json({ error: 'Invalid discipline ID' })
      }
    }

    const disciplineField = await prisma.tfx_disziplinen_felder.update({
      where: { int_disziplinen_felderid: id },
      data: {
        ...(disciplineId !== undefined && { int_disziplinenid: disciplineId }),
        ...(name !== undefined && { var_name: name }),
        ...(sortOrder !== undefined && { int_sortierung: sortOrder }),
        ...(isFinalScore !== undefined && { bol_endwert: isFinalScore }),
        ...(isStartingScore !== undefined && { bol_ausgangswert: isStartingScore }),
        ...(group !== undefined && { int_gruppe: group }),
        ...(enabled !== undefined && { bol_enabled: enabled })
      },
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
    })

    const formatted = {
      id: disciplineField.int_disziplinen_felderid,
      disciplineId: disciplineField.int_disziplinenid,
      disciplineName: disciplineField.tfx_disziplinen?.var_name || 'Unknown',
      disciplineShort: disciplineField.tfx_disziplinen?.var_kurz1 || '',
      name: disciplineField.var_name,
      sortOrder: disciplineField.int_sortierung,
      isFinalScore: disciplineField.bol_endwert,
      isStartingScore: disciplineField.bol_ausgangswert,
      group: disciplineField.int_gruppe,
      enabled: disciplineField.bol_enabled
    }

    if (process.env.DEBUG === 'true') {
      console.log('Updated discipline field:', formatted)
    }

    res.json(formatted)
  } catch (error) {
    console.error('Error updating discipline field:', error)
    res.status(500).json({ 
      error: 'Failed to update discipline field',
      details: process.env.DEBUG === 'true' ? error : undefined
    })
  }
})

// DELETE /api/discipline-fields/:id - Delete discipline field
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    // Check if discipline field exists
    const existing = await prisma.tfx_disziplinen_felder.findUnique({
      where: { int_disziplinen_felderid: id }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Discipline field not found' })
    }

    // Check for dependencies (jury results)
    const dependentResults = await prisma.tfx_jury_results.count({
      where: { int_disziplinen_felderid: id }
    })

    if (dependentResults > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete discipline field with existing jury results',
        dependentResults 
      })
    }

    await prisma.tfx_disziplinen_felder.delete({
      where: { int_disziplinen_felderid: id }
    })

    if (process.env.DEBUG === 'true') {
      console.log('Deleted discipline field:', id)
    }

    res.json({ message: 'Discipline field deleted successfully' })
  } catch (error) {
    console.error('Error deleting discipline field:', error)
    res.status(500).json({ 
      error: 'Failed to delete discipline field',
      details: process.env.DEBUG === 'true' ? error : undefined
    })
  }
})

export default router
