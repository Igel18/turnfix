import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { buildDisciplineDetails } from '../utils/competitionStatusUtils'

const router = Router()

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
  number: string
  round: number
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
    /** @deprecated use totalParticipants / completedParticipants / percentage instead */
    totalSquads: number
    totalParticipants: number
    completedParticipants: number
    percentage: number
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
        },
        tfx_wertungen: {
          where: {
            int_teilnehmerid: {
              not: null
            }
          }
        }
      },
      skip: offset,
      take: limit
    })

    // Pre-compute participant counts per competition (distinct participants)
    // WICHTIG: Nur Teilnehmer zählen, die auch wirklich starten (bol_startet_nicht IS NULL OR bol_startet_nicht = false)
    const competitionIds = competitions.map(c => c.int_wettkaempfeid)
    let participantCountByCompetition = new Map<number, number>()
    let completedParticipantDisciplineByCompetition = new Map<number, number>()
    // Key: "${wettkaempfeid}:${disziplinenid}" → count of distinct participants with a score
    const perDisciplineCompletedMap = new Map<string, number>()

    if (competitionIds.length > 0) {
      const participantCounts = await prisma.$queryRawUnsafe(
        `
        SELECT
          int_wettkaempfeid,
          COUNT(DISTINCT int_teilnehmerid) AS count
        FROM tfx_wertungen
        WHERE int_wettkaempfeid = ANY($1)
          AND int_teilnehmerid IS NOT NULL
          AND (bol_startet_nicht IS NULL OR bol_startet_nicht = false)
        GROUP BY int_wettkaempfeid
        `,
        competitionIds
      ) as Array<{ int_wettkaempfeid: number; count: bigint | number }>
      participantCountByCompetition = new Map(
        participantCounts.map(row => [row.int_wettkaempfeid, Number(row.count)])
      )

      // Completed participant×discipline entries: total distinct (participant, discipline) pairs
      const completedPairs = await prisma.$queryRawUnsafe(
        `
        SELECT 
          w.int_wettkaempfeid,
          COUNT(DISTINCT (w.int_teilnehmerid, wd.int_disziplinenid)) AS completed_count
        FROM tfx_wertungen w
        JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
        WHERE w.int_wettkaempfeid = ANY($1)
          AND w.int_teilnehmerid IS NOT NULL
          AND wd.int_disziplinenid IS NOT NULL
          AND (w.bol_startet_nicht IS NULL OR w.bol_startet_nicht = false)
        GROUP BY w.int_wettkaempfeid
        `,
        competitionIds
      ) as Array<{ int_wettkaempfeid: number; completed_count: bigint | number }>
      completedParticipantDisciplineByCompetition = new Map(
        completedPairs.map(row => [row.int_wettkaempfeid, Number(row.completed_count)])
      )

      // Per-discipline completion: distinct participants with at least one score for each discipline
      const perDisciplineRows = await prisma.$queryRawUnsafe(
        `
        SELECT
          w.int_wettkaempfeid,
          wd.int_disziplinenid,
          COUNT(DISTINCT w.int_teilnehmerid) AS completed_count
        FROM tfx_wertungen w
        JOIN tfx_wertungen_details wd ON w.int_wertungenid = wd.int_wertungenid
        WHERE w.int_wettkaempfeid = ANY($1)
          AND w.int_teilnehmerid IS NOT NULL
          AND wd.int_disziplinenid IS NOT NULL
          AND (w.bol_startet_nicht IS NULL OR w.bol_startet_nicht = false)
        GROUP BY w.int_wettkaempfeid, wd.int_disziplinenid
        `,
        competitionIds
      ) as Array<{ int_wettkaempfeid: number; int_disziplinenid: number; completed_count: bigint | number }>

      for (const row of perDisciplineRows) {
        const key = `${row.int_wettkaempfeid}:${row.int_disziplinenid}`
        perDisciplineCompletedMap.set(key, Number(row.completed_count))
      }
    }

    // Get all squad-discipline statuses for this event
    const squadDisciplineStatuses = await prisma.tfx_riegen_x_disziplinen.findMany({
      where: {
        int_veranstaltungenid: eventId
      },
      select: {
        int_disziplinenid: true,
        int_statusid: true
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
        const status = allStatuses.find(s => s.int_statusid === statusId)
        return {
          statusId,
          statusName: status?.var_name || 'Unknown',
          colorCode: status?.ary_colorcode || '{128,128,128}',
          count,
          percentage: totalSquadDisciplines > 0 ? (count / totalSquadDisciplines * 100) : 0
        }
      })

      // Calculate participant×discipline progress metrics
      const participantCount = participantCountByCompetition.get(competition.int_wettkaempfeid) || 0
      const disciplineCount = competitionDisciplineIds.length
      const totalParticipantDisciplines = participantCount * disciplineCount
      const completedCount = Math.min(
        completedParticipantDisciplineByCompetition.get(competition.int_wettkaempfeid) || 0,
        totalParticipantDisciplines
      )
      const inProgressCount = 0 // Not tracked per participant×discipline without additional state
      const notStartedCount = Math.max(0, totalParticipantDisciplines - completedCount)

  // Determine overall status based on participant×discipline completion
      let overallStatus: 'not_started' | 'in_progress' | 'completed'
  if (completedCount === totalParticipantDisciplines && totalParticipantDisciplines > 0) {
        overallStatus = 'completed'
  } else if (notStartedCount === totalParticipantDisciplines || totalParticipantDisciplines === 0) {
        overallStatus = 'not_started'
      } else {
        overallStatus = 'in_progress'
      }

      // Calculate discipline-level details using participant completion from scores
      const disciplineObjects = competitionDisciplineIds.map((disciplineId: number) =>
        competition.tfx_wettkaempfe_x_disziplinen.find(
          (wd: any) => wd.tfx_disziplinen.int_disziplinenid === disciplineId
        )?.tfx_disziplinen
      ).filter((d): d is NonNullable<typeof d> => d != null)

      const completedByDiscipline = new Map<number, number>()
      for (const disciplineId of competitionDisciplineIds) {
        const key = `${competition.int_wettkaempfeid}:${disciplineId}`
        completedByDiscipline.set(disciplineId, perDisciplineCompletedMap.get(key) ?? 0)
      }

      const disciplineDetails = buildDisciplineDetails(
        disciplineObjects,
        completedByDiscipline,
        participantCount
      ).map(detail => {
        // Also include legacy squad-status distribution for backwards compatibility
        const disciplineSquadStatuses = relevantSquadDisciplines.filter(
          sd => sd.int_disziplinenid === detail.disciplineId
        )
        const disciplineStatusCounts = new Map<number, number>()
        disciplineSquadStatuses.forEach(sd => {
          const statusId = sd.int_statusid || 1
          disciplineStatusCounts.set(statusId, (disciplineStatusCounts.get(statusId) || 0) + 1)
        })
        const disciplineStatusDistribution = Array.from(disciplineStatusCounts.entries()).map(([statusId, count]) => {
          const status = allStatuses.find(s => s.int_statusid === statusId)
          return {
            statusId,
            statusName: status?.var_name || 'Unknown',
            colorCode: status?.ary_colorcode || '{128,128,128}',
            count
          }
        })
        return {
          ...detail,
          totalSquads: disciplineSquadStatuses.length, // legacy
          statusDistribution: disciplineStatusDistribution
        }
      })

  // Participants per competition (distinct by participant ID) already computed

      competitionStatusData.push({
        id: competition.int_wettkaempfeid,
        name: competition.var_name || 'Unnamed Competition',
        number: competition.var_nummer || '',
        round: 1, // Default to round 1, could be enhanced later with actual round data
        description: `${competition.tfx_bereiche?.var_name || ''} - Age ${competition.yer_von}${competition.yer_bis ? `-${competition.yer_bis}` : '+'}`,
        gender: competition.tfx_bereiche?.bol_maennlich && competition.tfx_bereiche?.bol_weiblich ? 'gemischt' : 
                competition.tfx_bereiche?.bol_maennlich ? 'männlich' : 'weiblich',
        ageFrom: competition.yer_von || 6,
        ageTo: competition.yer_bis || competition.yer_von || 18,
        disciplines: competitionDisciplineIds,
        participantCount,
  totalSquadDisciplines: totalParticipantDisciplines,
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
