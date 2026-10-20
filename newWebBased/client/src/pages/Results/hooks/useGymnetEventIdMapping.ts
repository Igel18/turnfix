/**
 * useGymnetEventIdMapping
 *
 * Loads and updates the GymNet evID stored for a TurnFix event (see
 * server/src/utils/gymnetEventIdStore.ts). The evID is recovered by
 * importing GymNet's "Standardexport.xls" and is used to build the
 * public results service link.
 */

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/utils/api'

export interface GymnetEventIdMapping {
  gymnetEventId: string
  evName: string
  evStart: string
  evStop: string
  updatedAt: string
}

export function useGymnetEventIdMapping(eventId: string | null | undefined) {
  const [mapping, setMapping] = useState<GymnetEventIdMapping | null>(null)
  const [resultsServiceUrl, setResultsServiceUrl] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const loadMapping = useCallback(async () => {
    if (!eventId) {
      return
    }
    try {
      const data = await apiGet(`/results/gymnet-event-id/${eventId}`)
      setMapping(data.mapping)
      setResultsServiceUrl(data.resultsServiceUrl)
    } catch {
      setMapping(null)
      setResultsServiceUrl(null)
    }
  }, [eventId])

  useEffect(() => {
    setMapping(null)
    setResultsServiceUrl(null)
    setWarning(null)
    setError(null)
    void loadMapping()
  }, [loadMapping])

  const uploadStandardExport = useCallback(async (file: File) => {
    if (!eventId) {
      return
    }
    setIsUploading(true)
    setError(null)
    setWarning(null)
    try {
      const formData = new FormData()
      formData.append('xlsFile', file)

      const response = await fetch(`/api/results/gymnet-event-id/${eventId}`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import fehlgeschlagen')
      }

      setMapping(data.mapping)
      setResultsServiceUrl(data.resultsServiceUrl)
      setWarning(data.warning ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen')
    } finally {
      setIsUploading(false)
    }
  }, [eventId])

  return { mapping, resultsServiceUrl, warning, error, isUploading, uploadStandardExport }
}
