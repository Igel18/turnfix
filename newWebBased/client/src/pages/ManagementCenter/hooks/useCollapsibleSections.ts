/**
 * useCollapsibleSections Hook
 * Manages the four collapsible section states, persisted in localStorage.
 */

import { useState, useEffect } from 'react'

function usePersisted(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? String(defaultValue)) } catch { return defaultValue }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(value)) }, [key, value])
  return [value, setValue] as const
}

export function useCollapsibleSections() {
  const [isDatabaseManagementCollapsed, setIsDatabaseManagementCollapsed] = usePersisted('databaseManagementCollapsed', false)
  const [isEventSetupCollapsed,         setIsEventSetupCollapsed]         = usePersisted('eventSetupCollapsed',         false)
  const [isTimePlanningCollapsed,       setIsTimePlanningCollapsed]       = usePersisted('timePlanningCollapsed',       false)
  const [isCompetitionDayCollapsed,     setIsCompetitionDayCollapsed]     = usePersisted('competitionDayCollapsed',     false)
  const [isResultsAwardsCollapsed,      setIsResultsAwardsCollapsed]      = usePersisted('resultsAwardsCollapsed',      false)

  return {
    isDatabaseManagementCollapsed,
    setIsDatabaseManagementCollapsed,
    isEventSetupCollapsed,
    setIsEventSetupCollapsed,
    isTimePlanningCollapsed,
    setIsTimePlanningCollapsed,
    isCompetitionDayCollapsed,
    setIsCompetitionDayCollapsed,
    isResultsAwardsCollapsed,
    setIsResultsAwardsCollapsed,
  }
}
