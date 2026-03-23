/**
 * useManagementStatistics Hook
 * Fetches counts for the DatabaseManagement section tiles.
 */

import { useState, useEffect } from 'react'
import { apiGet } from '@/utils/api'
import { INITIAL_STATISTICS, type Statistics } from '../ManagementCenter.constants'

export function useManagementStatistics(): Statistics {
  const [statistics, setStatistics] = useState<Statistics>(INITIAL_STATISTICS)

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const [eventsRes, clubsRes, participantsRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/clubs'),
          fetch('/api/participants'),
        ])

        let events: any = { events: [] }
        let clubs: any = { clubs: [] }
        let participants: any = { participants: [] }

        if (eventsRes.ok)       { try { events       = await eventsRes.json()       } catch { /* noop */ } }
        if (clubsRes.ok)        { try { clubs        = await clubsRes.json()        } catch { /* noop */ } }
        if (participantsRes.ok) { try { participants = await participantsRes.json() } catch { /* noop */ } }

        const additionalApis = [
          '/regions/count',
          '/associations/count',
          '/disciplines/count',
          '/venues/count',
          '/persons/count',
          '/sports/count',
          '/formulas/count',
          '/discipline-groups/count',
          '/discipline-fields/count',
          '/layouts/count',
          '/statuses',
          '/areas/count',
          '/documents/count',
        ]

        const additionalResults = await Promise.all(
          additionalApis.map(url => apiGet(url).catch(() => ({ pagination: { total: 0 }, count: 0 })))
        )

        const [
          regionsData, associationsData, disciplinesData, venuesData,
          personsData, sportsData, formulasData, disciplineGroupsData,
          disciplineFieldsData, layoutsData, statusesData, areasCountData, documentsCountData,
        ] = additionalResults

        setStatistics({
          activeEvents:           events.pagination?.total        || 0,
          registeredClubs:        clubs.pagination?.total         || 0,
          totalAthletes:          participants.pagination?.total  || 0,
          totalAreas:             areasCountData?.count           || 0,
          totalRegions:           regionsData?.count              || 0,
          totalAssociations:      associationsData?.count         || 0,
          totalDisciplines:       disciplinesData?.count          || 0,
          totalLocations:         venuesData?.count               || 0,
          totalPersons:           personsData?.count              || 0,
          totalSports:            sportsData?.count               || 0,
          totalFormulas:          formulasData?.count             || 0,
          totalDisciplineGroups:  disciplineGroupsData?.count     || 0,
          totalDisciplineFields:  disciplineFieldsData?.count     || 0,
          totalCertificateLayouts: layoutsData?.count             || 0,
          totalStatuses:          statusesData?.pagination?.total || 0,
          totalDocuments:         documentsCountData?.count       || 0,
          loading: false,
        })
      } catch (error) {
        console.error('Error fetching statistics:', error)
        setStatistics(prev => ({ ...prev, loading: false }))
      }
    }

    fetchStatistics()
  }, [])

  return statistics
}
