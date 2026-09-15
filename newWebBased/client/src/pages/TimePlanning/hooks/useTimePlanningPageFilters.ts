import { useMemo, useState } from 'react'
import { useFilterPanel } from '@/hooks'
import type { Competition, SessionGroup, Squad } from '../TimePlanning.types'

export interface TimePlanningFilterState {
  searchTerm: string
  sessionFilter: string
  laneFilter: string
  squadFilter: string
  competitionFilter: string
}

interface UseTimePlanningPageFiltersProps {
  competitions: Competition[]
  squads: Squad[]
  sessionGroups: SessionGroup[]
}

interface FilterOption {
  value: string
  label: string
}

export interface FilteredTimePlanningData {
  filteredCompetitions: Competition[]
  filteredSquads: Squad[]
  filteredSessionGroups: SessionGroup[]
}

export function filterTimePlanningData(
  competitions: Competition[],
  squads: Squad[],
  sessionGroups: SessionGroup[],
  filters: TimePlanningFilterState,
): FilteredTimePlanningData {
  const normalizedSearchTerm = filters.searchTerm.trim().toLowerCase()
  const selectedSession = filters.sessionFilter ? Number(filters.sessionFilter) : null
  const selectedLane = filters.laneFilter ? Number(filters.laneFilter) : null
  const selectedCompetitionId = filters.competitionFilter ? Number(filters.competitionFilter) : null

  const selectedSquad = filters.squadFilter
    ? squads.find(squad => squad.name === filters.squadFilter) ?? null
    : null
  const selectedSquadCompetitionIds = new Set(selectedSquad?.competitionIds ?? [])

  const filteredCompetitions = competitions.filter(competition => {
    if (selectedSession !== null && competition.round !== selectedSession) {
      return false
    }

    if (selectedLane !== null && (competition.int_bahn ?? null) !== selectedLane) {
      return false
    }

    if (selectedCompetitionId !== null && competition.id !== selectedCompetitionId) {
      return false
    }

    if (selectedSquad && !selectedSquadCompetitionIds.has(competition.id)) {
      return false
    }

    if (!normalizedSearchTerm) {
      return true
    }

    const searchHaystack = `${competition.number} ${competition.name}`.toLowerCase()
    return searchHaystack.includes(normalizedSearchTerm)
  })

  const filteredCompetitionIds = new Set(filteredCompetitions.map(competition => competition.id))

  const filteredSquads = squads.filter(squad => {
    if (filters.squadFilter && squad.name !== filters.squadFilter) {
      return false
    }

    const competitionIds = squad.competitionIds ?? []

    if (selectedCompetitionId !== null && !competitionIds.includes(selectedCompetitionId)) {
      return false
    }

    if (selectedSession !== null || selectedLane !== null || selectedSquad || normalizedSearchTerm) {
      const matchesFilteredCompetition = competitionIds.some(id => filteredCompetitionIds.has(id))
      const matchesSearch = !normalizedSearchTerm || squad.name.toLowerCase().includes(normalizedSearchTerm)
      return matchesFilteredCompetition && matchesSearch
    }

    return true
  })

  const filteredSquadNames = new Set(filteredSquads.map(squad => squad.name))

  const filteredSessionGroups = sessionGroups
    .filter(group => selectedSession === null || group.session === selectedSession)
    .map(group => ({
      ...group,
      competitions: group.competitions.filter(competition => filteredCompetitionIds.has(competition.id)),
      squads: group.squads.filter(squad => filteredSquadNames.has(squad.name)),
    }))
    .filter(group => {
      if (selectedSession !== null && group.session === selectedSession) {
        return true
      }
      return group.competitions.length > 0 || group.squads.length > 0
    })

  return {
    filteredCompetitions,
    filteredSquads,
    filteredSessionGroups,
  }
}

export function useTimePlanningPageFilters({
  competitions,
  squads,
  sessionGroups,
}: UseTimePlanningPageFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sessionFilter, setSessionFilter] = useState('')
  const [laneFilter, setLaneFilter] = useState('')
  const [squadFilter, setSquadFilter] = useState('')
  const [competitionFilter, setCompetitionFilter] = useState('')

  const resetFilters = () => {
    setSearchTerm('')
    setSessionFilter('')
    setLaneFilter('')
    setSquadFilter('')
    setCompetitionFilter('')
  }

  const isAnyFilterActive =
    searchTerm !== '' ||
    sessionFilter !== '' ||
    laneFilter !== '' ||
    squadFilter !== '' ||
    competitionFilter !== ''

  const { showFilters, toggleFilters } = useFilterPanel(isAnyFilterActive, resetFilters)

  const sessionOptions = useMemo<FilterOption[]>(() => {
    return Array.from(new Set(competitions.map(competition => competition.round || 1)))
      .sort((left, right) => left - right)
      .map(session => ({ value: String(session), label: String(session) }))
  }, [competitions])

  const laneOptions = useMemo<FilterOption[]>(() => {
    return Array.from(
      new Set(
        competitions
          .map(competition => competition.int_bahn)
          .filter((lane): lane is number => typeof lane === 'number' && lane > 0),
      ),
    )
      .sort((left, right) => left - right)
      .map(lane => ({ value: String(lane), label: String(lane) }))
  }, [competitions])

  const squadOptions = useMemo<FilterOption[]>(() => {
    return squads
      .map(squad => ({ value: squad.name, label: squad.name }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }, [squads])

  const competitionOptions = useMemo<FilterOption[]>(() => {
    return competitions
      .map(competition => ({
        value: String(competition.id),
        label: competition.number ? `${competition.number} - ${competition.name}` : competition.name,
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }, [competitions])

  const filteredData = useMemo(
    () => filterTimePlanningData(competitions, squads, sessionGroups, {
      searchTerm,
      sessionFilter,
      laneFilter,
      squadFilter,
      competitionFilter,
    }),
    [competitions, squads, sessionGroups, searchTerm, sessionFilter, laneFilter, squadFilter, competitionFilter],
  )

  return {
    searchTerm,
    setSearchTerm,
    sessionFilter,
    setSessionFilter,
    laneFilter,
    setLaneFilter,
    squadFilter,
    setSquadFilter,
    competitionFilter,
    setCompetitionFilter,
    resetFilters,
    showFilters,
    toggleFilters,
    sessionOptions,
    laneOptions,
    squadOptions,
    competitionOptions,
    ...filteredData,
  }
}