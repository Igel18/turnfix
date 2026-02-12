import { useState, useEffect } from 'react'
import { debugLog } from '../utils/debug'

export type ViewType = 'table' | 'cards'

interface UseViewToggleProps {
  key: string // Unique key for this view (e.g., 'events', 'participants', 'clubs')
  defaultView?: ViewType
}

export function useViewToggle({ key, defaultView = 'table' }: UseViewToggleProps) {
  const storageKey = `viewType_${key}`
  
  // Get saved view type from localStorage or use default
  const [viewType, setViewType] = useState<ViewType>(() => {
    try {
      const savedView = localStorage.getItem(storageKey)
      return (savedView as ViewType) || defaultView
    } catch {
      return defaultView
    }
  })

  // Save view type to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, viewType)
    } catch (error) {
      debugLog('Failed to save view preference to localStorage:', error)
    }
  }, [viewType, storageKey])

  const handleViewTypeChange = (newViewType: ViewType) => {
    setViewType(newViewType)
  }

  return {
    viewType,
    handleViewTypeChange
  }
}

export default useViewToggle
