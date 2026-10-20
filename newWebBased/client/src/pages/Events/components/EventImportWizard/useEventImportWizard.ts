/**
 * useEventImportWizard
 *
 * Business logic hook for the 3-step EventImportWizard.
 * Steps:
 *   fileDetails → file selection + event metadata (name, dates, location, description)
 *   importing   → progress display (auto-triggered, auto-advances on finish)
 *   results     → success/error summary + discipline hints
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { debugLog } from '../../../../utils/debug'
import type { WizardStepDef } from '../../../../components/WizardModal'
import type { Venue, ImportEventData, ImportApiResult, DisciplineHint, GymnetStandardExportData } from '../../Events.types'
import { EMPTY_IMPORT_DATA } from '../../Events.types'

// ── Helpers ────────────────────────────────────────────────────

/** Converts a GymNet date string ("YYYY-MM-DD..." or "DD.MM.YYYY") to the format required by <input type="date">. */
function normalizeGymnetDateToInputValue(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }
  const germanMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (germanMatch) {
    const [, day, month, year] = germanMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return ''
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventImportStep = 'eventDetails' | 'fileSelection' | 'importing' | 'results'
export type ImportState = 'idle' | 'uploading' | 'completed' | 'error'

export interface UseEventImportWizardProps {
  isOpen: boolean
  venues: Venue[]
  onImportComplete: () => void
  onClose: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEventImportWizard({
  isOpen,
  venues: _venues,
  onImportComplete,
  onClose,
}: UseEventImportWizardProps) {
  const { t } = useTranslation()

  const [step, setStep] = useState<EventImportStep>('eventDetails')
  const [importFiles, setImportFiles] = useState<File[]>([])
  const [importState, setImportState] = useState<ImportState>('idle')
  const [progressText, setProgressText] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [importResult, setImportResult] = useState<ImportApiResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importEventData, setImportEventData] = useState<ImportEventData>({ ...EMPTY_IMPORT_DATA })
  const [acceptedHints, setAcceptedHints] = useState<Set<number>>(new Set())
  const [acceptingHint, setAcceptingHint] = useState<number | null>(null)
  const [standardExportData, setStandardExportData] = useState<GymnetStandardExportData | null>(null)
  const [isParsingStandardExport, setIsParsingStandardExport] = useState(false)
  const [standardExportWarning, setStandardExportWarning] = useState<string | null>(null)
  const [standardExportError, setStandardExportError] = useState<string | null>(null)

  // ── Reset when opened ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    setStep('eventDetails')
    setImportFiles([])
    setImportState('idle')
    setProgressText('')
    setProgressPercent(0)
    setImportResult(null)
    setErrorMessage(null)
    setImportEventData({ ...EMPTY_IMPORT_DATA })
    setAcceptedHints(new Set())
    setAcceptingHint(null)
    setStandardExportData(null)
    setIsParsingStandardExport(false)
    setStandardExportWarning(null)
    setStandardExportError(null)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance from 'importing' to 'results' when import finishes ────────
  useEffect(() => {
    if (step === 'importing' && (importState === 'completed' || importState === 'error')) {
      setStep('results')
    }
  }, [importState, step])

  // ── Wizard step definitions ────────────────────────────────────────────────
  const wizardSteps: WizardStepDef[] = [
    { key: 'eventDetails', label: t('events.importWizard.steps.eventDetails', 'Veranstaltungsdetails') },
    { key: 'fileSelection', label: t('events.importWizard.steps.fileSelection', 'XML auswählen') },
    { key: 'importing', label: t('events.importWizard.steps.importing') },
    { key: 'results', label: t('events.importWizard.steps.results') },
  ]

  const title = t('events.importWizard.title')

  // ── canGoNext logic for navigation buttons ──
  const canGoNextEventDetails = importEventData.eventName.trim().length > 0
  const canGoNextFileSelection = importFiles.length > 0

  // ── Accept hint ───────────────────────────────────────────────────────────
  const handleAcceptHint = async (hint: DisciplineHint) => {
    if (hint.disciplines.length === 0 || acceptedHints.has(hint.competitionId)) return
    setAcceptingHint(hint.competitionId)
    try {
      await fetch('/api/events/accept-discipline-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: hint.competitionId, disciplines: hint.disciplines })
      })
      setAcceptedHints(prev => {
        const next = new Set(prev)
        next.add(hint.competitionId)
        return next
      })
    } catch (e) {
      // Optionally handle error
    } finally {
      setAcceptingHint(null)
    }
  }

  // ── GymNet Standardexport.xls (optional) ──────────────────────────────────
  const handleStandardExportFile = async (file: File) => {
    setIsParsingStandardExport(true)
    setStandardExportError(null)
    setStandardExportWarning(null)
    try {
      const fd = new FormData()
      fd.append('xlsFile', file)
      const response = await fetch('/api/events/gymnet-standard-export/parse', {
        method: 'POST',
        body: fd,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Import fehlgeschlagen')
      }

      setStandardExportData({
        gymnetEventId: data.evId,
        evName: data.evName,
        evStart: data.evStart,
        evStop: data.evStop,
      })
      setImportEventData(prev => ({
        ...prev,
        eventName: data.evName || prev.eventName,
        startDate: normalizeGymnetDateToInputValue(data.evStart || '') || prev.startDate,
        endDate: normalizeGymnetDateToInputValue(data.evStop || '') || prev.endDate,
      }))
      setStandardExportWarning(data.warning ?? null)
    } catch (error) {
      setStandardExportError(error instanceof Error ? error.message : 'Import fehlgeschlagen')
    } finally {
      setIsParsingStandardExport(false)
    }
  }

  // ── Import logic ──────────────────────────────────────────────────────────
  const handleImportFile = async () => {
    setImportState('uploading')
    setProgressText(t('events.import.progress.uploading', 'Datei wird hochgeladen und verarbeitet...'))
    setProgressPercent(30)
    setErrorMessage(null)
    try {
      const fd = new FormData()
      importFiles.forEach((file) => fd.append('files', file))
      fd.append('eventName', importEventData.eventName.trim())
      if (importEventData.startDate) fd.append('startDate', importEventData.startDate)
      if (importEventData.endDate) fd.append('endDate', importEventData.endDate)
      if (importEventData.locationId) fd.append('locationId', importEventData.locationId)
      if (importEventData.description) fd.append('description', importEventData.description.trim())
      fd.append('scoringMode', importEventData.scoringMode)

      const response = await fetch('/api/events/import-gymnet', {
        method: 'POST',
        body: fd,
      })
      const result: ImportApiResult = await response.json()
      if (response.ok && result.success) {
        setProgressText(t('events.import.progress.completed'))
        setProgressPercent(100)
        setImportResult(result)
        setImportState('completed')

        if (standardExportData && result.createdEvent?.id) {
          // Best-effort: link the previously parsed evID to the newly created event.
          // The results export wizard can still add/fix this later, so failures here are non-fatal.
          void fetch(`/api/results/gymnet-event-id/${result.createdEvent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(standardExportData),
          }).catch(() => {})
        }
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      debugLog('EventImportWizard: import error', error)
      const msg = error instanceof Error ? error.message : 'Unknown error occurred'
      setErrorMessage(msg)
      setProgressText(t('events.import.progress.failed') + ' ' + msg)
      setProgressPercent(0)
      setImportState('error')
    }
  }

  // Navigation logic for Next/Back buttons
  const goNextFromEventDetails = () => {
    if (canGoNextEventDetails) setStep('fileSelection')
  }
  const goNextFromFileSelection = () => {
    if (canGoNextFileSelection) {
      setStep('importing')
      handleImportFile()
    }
  }
  const goBackFromFileSelection = () => setStep('eventDetails')

  // Retry logic
  const retry = () => {
    setImportState('idle')
    setErrorMessage(null)
    setProgressPercent(0)
    setProgressText('')
    setStep('fileSelection')
  }

  // Reset and close
  const resetAndClose = () => {
    setStep('eventDetails')
    setImportFiles([])
    setImportState('idle')
    setProgressText('')
    setProgressPercent(0)
    setImportResult(null)
    setErrorMessage(null)
    setImportEventData({ ...EMPTY_IMPORT_DATA })
    setAcceptedHints(new Set())
    setAcceptingHint(null)
    setStandardExportData(null)
    setIsParsingStandardExport(false)
    setStandardExportWarning(null)
    setStandardExportError(null)
    if (importState === 'completed' && importResult?.success) {
      onImportComplete()
    }
    onClose()
  }

  return {
    step,
    setStep,
    importFiles,
    setImportFiles,
    importState,
    progressText,
    progressPercent,
    importResult,
    errorMessage,
    setErrorMessage,
    importEventData,
    setImportEventData,
    acceptedHints,
    setAcceptedHints,
    acceptingHint,
    setAcceptingHint,
    standardExportData,
    isParsingStandardExport,
    standardExportWarning,
    standardExportError,
    handleStandardExportFile,
    wizardSteps,
    title,
    canGoNextEventDetails,
    canGoNextFileSelection,
    goNextFromEventDetails,
    goNextFromFileSelection,
    goBackFromFileSelection,
    retry,
    resetAndClose,
    handleAcceptHint,
  }
}
