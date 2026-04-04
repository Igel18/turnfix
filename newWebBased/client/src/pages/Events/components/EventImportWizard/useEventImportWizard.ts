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
import type { Venue, ImportEventData, ImportApiResult, DisciplineHint } from '../../Events.types'
import { EMPTY_IMPORT_DATA } from '../../Events.types'

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

  // ── Reset when opened ──────────────────────────────────────────────────────
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
      setAcceptedHints(new Set([...acceptedHints, hint.competitionId]))
    } catch (e) {
      // Optionally handle error
    } finally {
      setAcceptingHint(null)
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
