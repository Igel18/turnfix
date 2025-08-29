import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const router = Router()
const prisma = new PrismaClient()

// Validation schemas
const competitionStatusQuerySchema = z.object({
  eventId: z.string().transform(val => parseInt(val, 10)),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 100),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0)
})

// Competition status aggregation type
interface CompetitionStatusData {
  id: number
  name: string
  description: string
  gender: string
  ageFrom: number
  ageTo: number
  disciplines: number[]
  participantCount: number
  totalSquadDisciplines: number
  completedSquadDisciplines: number
  inProgressSquadDisciplines: number
  notStartedSquadDisciplines: number
  overallStatus: 'not_started' | 'in_progress' | 'completed'
  statusDistribution: Array<{
    statusId: number
    statusName: string
    colorCode: string
    count: number
    percentage: number
  }>
  disciplines_detail: Array<{
    disciplineId: number
    disciplineName: string
    disciplineShort: string
    totalSquads: number
    statusDistribution: Array<{
      statusId: number
      statusName: string
      colorCode: string
      count: number
    }>
  }>
}

// Get competition status aggregated from squad-discipline statuses
router.get('/', async (req, res) => {
  try {
    const { eventId, limit, offset } = competitionStatusQuerySchema.parse(req.query)

    // Get all competitions for the event
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: {
        tfx_veranstaltungen: {
          int_veranstaltungenid: eventId
        }
      },
      include: {
        tfx_bereiche: true,
        tfx_veranstaltungen: {
          include: {
            tfx_wettkampforte: true
          }
        },
        tfx_wettkaempfe_x_disziplinen: {
          include: {
            tfx_disziplinen: true
          }
        }
      },
      skip: offset,
      take: limit
    })

    // Get all squad-discipline statuses for this event
    const squadDisciplineStatuses = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: {
        int_veranstaltungenid: eventId
      },
      include: {
        tfx_status: true,
        tfx_disziplinen: true
      }
    })

    // Get all statuses for reference
    const allStatuses = await prisma.tfx_status.findMany()

    const competitionStatusData: CompetitionStatusData[] = []

    for (const competition of competitions) {
      const competitionDisciplineIds = competition.tfx_wettkaempfe_x_disziplinen.map(
        (wd: any) => wd.tfx_disziplinen.int_disziplinenid
      )

      // Filter squad-discipline statuses for this competition's disciplines
      const relevantSquadDisciplines = squadDisciplineStatuses.filter(sd =>
        competitionDisciplineIds.includes(sd.int_disziplinenid)
      )

      const totalSquadDisciplines = relevantSquadDisciplines.length
      
      // Count status distribution
      const statusCounts = new Map<number, number>()
      relevantSquadDisciplines.forEach(sd => {
        const statusId = sd.int_statusid || 1 // Default to "kein Status"
        statusCounts.set(statusId, (statusCounts.get(statusId) || 0) + 1)
      })

      // Calculate status distribution with percentages
      const statusDistribution = Array.from(statusCounts.entries()).map(([statusId, count]) => {
        const status = allStatuses.find(s => s.int_statusid === statusId) || allStatuses[0]
        return {
          statusId,
          statusName: status.var_name || 'Unknown',
          colorCode: status.ary_colorcode || '{128,128,128}',
          count,
          percentage: totalSquadDisciplines > 0 ? (count / totalSquadDisciplines * 100) : 0
        }
      })

      // Calculate completion metrics based on specific status meanings
      let completedCount = 0
      let inProgressCount = 0
      let notStartedCount = 0

      statusCounts.forEach((count, statusId) => {
        // Define status categories based on actual data
        // Status 9 = "Leistungen erfasst" = completed
        // Status 6 = "Wettkampf gestartet" = in progress
        // Status 1 = "kein Status" = not started
        // Status 2,3,4,5,7,8,10 = various in progress states
        
        if (statusId === 9) { // Leistungen erfasst
          completedCount += count
        } else if (statusId === 1) { // kein Status
          notStartedCount += count
        } else { // All other statuses considered in progress
          inProgressCount += count
        }
      })

      // Determine overall status
      let overallStatus: 'not_started' | 'in_progress' | 'completed'
      if (completedCount === totalSquadDisciplines && totalSquadDisciplines > 0) {
        overallStatus = 'completed'
      } else if (notStartedCount === totalSquadDisciplines || totalSquadDisciplines === 0) {
        overallStatus = 'not_started'
      } else {
        overallStatus = 'in_progress'
      }

      // Calculate discipline-level details
      const disciplineDetails = competitionDisciplineIds.map((disciplineId: number) => {
        const discipline = competition.tfx_wettkaempfe_x_disziplinen.find(
          (wd: any) => wd.tfx_disziplinen.int_disziplinenid === disciplineId
        )?.tfx_disziplinen

        const disciplineSquadStatuses = relevantSquadDisciplines.filter(
          sd => sd.int_disziplinenid === disciplineId
        )

        const disciplineStatusCounts = new Map<number, number>()
        disciplineSquadStatuses.forEach(sd => {
          const statusId = sd.int_statusid || 1
          disciplineStatusCounts.set(statusId, (disciplineStatusCounts.get(statusId) || 0) + 1)
        })

        const disciplineStatusDistribution = Array.from(disciplineStatusCounts.entries()).map(([statusId, count]) => {
          const status = allStatuses.find(s => s.int_statusid === statusId) || allStatuses[0]
          return {
            statusId,
            statusName: status.var_name || 'Unknown',
            colorCode: status.ary_colorcode || '{128,128,128}',
            count
          }
        })

        return {
          disciplineId,
          disciplineName: discipline?.var_name || 'Unknown',
          disciplineShort: discipline?.var_kurz1 || 'UNK',
          totalSquads: disciplineSquadStatuses.length,
          statusDistribution: disciplineStatusDistribution
        }
      })

      // Count participants for this competition (approximate)
      const participantCount = 0 // This would need a complex query, keeping simple for now

      competitionStatusData.push({
        id: competition.int_wettkaempfeid,
        name: competition.var_name || 'Unnamed Competition',
        description: `${competition.tfx_bereiche?.var_name || ''} - Age ${competition.yer_von}${competition.yer_bis ? `-${competition.yer_bis}` : '+'}`,
        gender: competition.tfx_bereiche?.bol_maennlich && competition.tfx_bereiche?.bol_weiblich ? 'gemischt' : 
                competition.tfx_bereiche?.bol_maennlich ? 'männlich' : 'weiblich',
        ageFrom: competition.yer_von,
        ageTo: competition.yer_bis || competition.yer_von,
        disciplines: competitionDisciplineIds,
        participantCount,
        totalSquadDisciplines,
        completedSquadDisciplines: completedCount,
        inProgressSquadDisciplines: inProgressCount,
        notStartedSquadDisciplines: notStartedCount,
        overallStatus,
        statusDistribution,
        disciplines_detail: disciplineDetails
      })
    }

    const total = await prisma.tfx_wettkaempfe.count({
      where: {
        tfx_veranstaltungen: {
          int_veranstaltungenid: eventId
        }
      }
    })

    res.json({
      competitions: competitionStatusData,
      eventId,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Competition Status API Error:', error)
    res.status(500).json({
      error: 'Failed to fetch competition status data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

export default router
