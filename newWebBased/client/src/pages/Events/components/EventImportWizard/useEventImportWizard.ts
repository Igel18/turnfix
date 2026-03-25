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
import { invalidateCache } from '../../../../utils/api'
import type { WizardStepDef } from '../../../../components/WizardModal'
import type { Venue, ImportEventData, ImportApiResult, DisciplineHint } from '../../Events.types'
import { EMPTY_IMPORT_DATA } from '../../Events.types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventImportStep = 'fileDetails' | 'importing' | 'results'
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

  const [step, setStep] = useState<EventImportStep>('fileDetails')
  const [importFile, setImportFile] = useState<File | null>(null)
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
    setStep('fileDetails')
    setImportFile(null)
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
    { key: 'fileDetails', label: t('events.importWizard.steps.fileDetails') },
    { key: 'importing',   label: t('events.importWizard.steps.importing') },
    { key: 'results',     label: t('events.importWizard.steps.results') },
  ]

  const title = t('events.importWizard.title')

  // ── canGoNext logic ────────────────────────────────────────────────────────
  const canGoNext = step === 'fileDetails'
    ? importFile !== null && importEventData.eventName.trim().length > 0
    : false // importing and results have no "Next" button

  // ── Accept hint ───────────────────────────────────────────────────────────
  const handleAcceptHint = async (hint: DisciplineHint) => {
    if (hint.disciplines.length === 0 || acceptedHints.has(hint.competitionId)) return

    setAcceptingHint(hint.competitionId)
    try {
      const response = await fetch('/api/events/accept-discipline-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: hint.competitionId,
          disciplines: hint.disciplines,
        }),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setAcceptedHints(prev => new Set([...prev, hint.competitionId]))
        debugLog('EventImportWizard: accepted hint', result)
      } else {
        debugLog('EventImportWizard: failed to accept hint', result)
      }
    } catch (error) {
      debugLog('EventImportWizard: error accepting hint', error)
    } finally {
      setAcceptingHint(null)
    }
  }

  // ── Start import (triggered by "Next" on fileDetails step) ────────────────
  const handleImportFile = async () => {
    if (!importFile) return
    if (!importEventData.eventName.trim()) {
      setErrorMessage(t('events.import.eventNameRequired'))
      return
    }

    setImportState('uploading')
    setErrorMessage(null)
    setProgressText(t('events.import.progress.parsing', 'XML-Datei wird geparst...'))
    setProgressPercent(10)

    try {
      const fd = new FormData()
      fd.append('xmlFile', importFile)
      fd.append('eventName', importEventData.eventName.trim())
      if (importEventData.startDate) fd.append('startDate', importEventData.startDate)
      if (importEventData.endDate) fd.append('endDate', importEventData.endDate)
      if (importEventData.locationId) fd.append('locationId', importEventData.locationId)
      if (importEventData.description) fd.append('description', importEventData.description.trim())

      setProgressText(t('events.import.progress.uploading', 'Datei wird hochgeladen und verarbeitet...'))
      setProgressPercent(30)

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

  // ── "Next" from fileDetails: advance to importing AND kick off the upload ──
  const goNext = () => {
    if (step === 'fileDetails' && canGoNext) {
      setStep('importing')
      handleImportFile()
    }
  }

  // ── Retry: go back to fileDetails from error ──────────────────────────────
  const retry = () => {
    setImportState('idle')
    setErrorMessage(null)
    setProgressPercent(0)
    setProgressText('')
    setStep('fileDetails')
  }

  // ── Close / reset ─────────────────────────────────────────────────────────
  const resetAndClose = () => {
    if (importState === 'completed' && importResult?.success) {
      invalidateCache('/events')
      onImportComplete()
    }
    onClose()
  }

  return {
    // step control
    step,
    wizardSteps,
    title,
    canGoNext,
    goNext,
    retry,
    resetAndClose,
    // import state
    importFile,
    setImportFile,
    importState,
    progressText,
    progressPercent,
    importResult,
    errorMessage,
    setErrorMessage,
    // event metadata form
    importEventData,
    setImportEventData,
    // hints
    acceptedHints,
    acceptingHint,
    handleAcceptHint,
  }
}
