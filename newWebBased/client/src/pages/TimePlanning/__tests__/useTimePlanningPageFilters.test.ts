import { describe, expect, it } from 'vitest'
import { filterTimePlanningData } from '../hooks/useTimePlanningPageFilters'

describe('filterTimePlanningData', () => {
  const competitions = [
    {
      id: 1,
      name: 'AK 7',
      number: 'C1',
      round: 1,
      int_bahn: 1,
      startTime: null,
      startDate: null,
      warmupTime: null,
      warmupDate: null,
      disciplineCount: 4,
      participantCount: 10,
    },
    {
      id: 2,
      name: 'LK 2',
      number: 'C2',
      round: 2,
      int_bahn: 3,
      startTime: null,
      startDate: null,
      warmupTime: null,
      warmupDate: null,
      disciplineCount: 4,
      participantCount: 8,
    },
  ]

  const squads = [
    { name: 'R1', participantCount: 10, competitions: ['AK 7'], competitionIds: [1] },
    { name: 'R2', participantCount: 8, competitions: ['LK 2'], competitionIds: [2] },
  ]

  const sessionGroups = [
    { session: 1, competitions: [competitions[0]], startTime: '09:00', startDate: null, squads: [squads[0]] },
    { session: 2, competitions: [competitions[1]], startTime: '11:00', startDate: null, squads: [squads[1]] },
  ]

  it('filters by session', () => {
    const result = filterTimePlanningData(competitions, squads, sessionGroups as any, {
      searchTerm: '',
      sessionFilter: '2',
      laneFilter: '',
      squadFilter: '',
      competitionFilter: '',
    })

    expect(result.filteredCompetitions.map(item => item.id)).toEqual([2])
    expect(result.filteredSquads.map(item => item.name)).toEqual(['R2'])
    expect(result.filteredSessionGroups.map(item => item.session)).toEqual([2])
  })

  it('filters by lane and squad together', () => {
    const result = filterTimePlanningData(competitions, squads, sessionGroups as any, {
      searchTerm: '',
      sessionFilter: '',
      laneFilter: '1',
      squadFilter: 'R1',
      competitionFilter: '',
    })

    expect(result.filteredCompetitions.map(item => item.id)).toEqual([1])
    expect(result.filteredSquads.map(item => item.name)).toEqual(['R1'])
  })

  it('filters competitions by search term', () => {
    const result = filterTimePlanningData(competitions, squads, sessionGroups as any, {
      searchTerm: 'lk',
      sessionFilter: '',
      laneFilter: '',
      squadFilter: '',
      competitionFilter: '',
    })

    expect(result.filteredCompetitions.map(item => item.id)).toEqual([2])
  })
})