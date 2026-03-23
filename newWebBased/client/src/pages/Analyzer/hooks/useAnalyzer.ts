/**
 * useAnalyzer – Fetches analyzer results for an event, with optional polling
 * and helpers for triggering quick-actions (generate start numbers, squads).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { AnalyzerResult } from '../Analyzer.types'

interface UseAnalyzerOptions {
  eventId: number | null
  /** Auto-refresh interval in ms. 0 = disabled (default). */
  autoRefreshMs?: number
}

interface UseAnalyzerReturn {
  data: AnalyzerResult | null
  loading: boolean
  error: string | null
  refresh: () => void
  /** Trigger a quick-action and then refresh. Returns true on success. */
  triggerQuickAction: (quickActionId: string, eventId: number) => Promise<boolean>
  quickActionLoading: string | null
}

export function useAnalyzer({ eventId, autoRefreshMs = 0 }: UseAnalyzerOptions): UseAnalyzerReturn {
  const [data, setData] = useState<AnalyzerResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!eventId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analyzer/event/${eventId}`, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AnalyzerResult = await res.json()
      setData(json)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message ?? 'Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  // Initial fetch and re-fetch whenever eventId changes
  useEffect(() => {
    fetchData()
    return () => { abortRef.current?.abort() }
  }, [fetchData])

  // Optional auto-refresh
  useEffect(() => {
    if (!autoRefreshMs) return
    const id = setInterval(fetchData, autoRefreshMs)
    return () => clearInterval(id)
  }, [fetchData, autoRefreshMs])

  const triggerQuickAction = useCallback(async (quickActionId: string, eid: number): Promise<boolean> => {
    setQuickActionLoading(quickActionId)
    try {
      let res: Response
      if (quickActionId === 'generate_start_numbers') {
        res = await fetch(`/api/events/${eid}/generate-start-numbers`, { method: 'PUT' })
      } else if (quickActionId === 'generate_squad_combination') {
        res = await fetch('/api/squad-disciplines/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: eid }),
        })
      } else {
        return false
      }
      if (!res.ok) return false
      await fetchData()
      return true
    } catch {
      return false
    } finally {
      setQuickActionLoading(null)
    }
  }, [fetchData])

  return { data, loading, error, refresh: fetchData, triggerQuickAction, quickActionLoading }
}
