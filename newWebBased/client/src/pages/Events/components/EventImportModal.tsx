/**
 * Modal for importing GymNet XML events.
 * 
 * Shows detailed structured results after import:
 * - Summary of extracted and inserted data
 * - Warnings and errors
 * - Discipline hints/suggestions (NOT auto-linked)
 * 
 * The modal stays open after import until the user clicks "Close".
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import UnifiedModal from '../../../components/UnifiedModal'
import { debugLog } from '../../../utils/debug'
import { invalidateCache } from '../../../utils/api'
import type { Venue, ImportEventData, ImportApiResult, ImportWarning, DisciplineHint } from '../Events.types'
import { EMPTY_IMPORT_DATA } from '../Events.types'

interface EventImportModalProps {
  isOpen: boolean
  onClose: () => void
  venues: Venue[]
  onImportComplete: () => void
}

type ImportState = 'idle' | 'uploading' | 'completed' | 'error'

const EventImportModal: React.FC<EventImportModalProps> = ({
  isOpen,
  onClose,
  venues,
  onImportComplete,
}) => {
  const { t } = useTranslation()

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importState, setImportState] = useState<ImportState>('idle')
  const [progressText, setProgressText] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [importResult, setImportResult] = useState<ImportApiResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [importEventData, setImportEventData] = useState<ImportEventData>({ ...EMPTY_IMPORT_DATA })

  const resetAndClose = () => {
    // Only invalidate cache and notify parent if import was successful
    if (importState === 'completed' && importResult?.success) {
      invalidateCache('/events')
      onImportComplete()
    }

    setImportFile(null)
    setImportState('idle')
    setProgressText('')
    setProgressPercent(0)
    setImportResult(null)
    setErrorMessage(null)
    setImportEventData({ ...EMPTY_IMPORT_DATA })
    onClose()
  }

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
      const formData = new FormData()
      formData.append('xmlFile', importFile)
      formData.append('eventName', importEventData.eventName.trim())
      if (importEventData.startDate) formData.append('startDate', importEventData.startDate)
      if (importEventData.endDate) formData.append('endDate', importEventData.endDate)
      if (importEventData.locationId) formData.append('locationId', importEventData.locationId)
      if (importEventData.description) formData.append('description', importEventData.description.trim())

      setProgressText(t('events.import.progress.uploading', 'Datei wird hochgeladen und verarbeitet...'))
      setProgressPercent(30)

      const response = await fetch('/api/events/import-gymnet', {
        method: 'POST',
        body: formData,
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
      debugLog('Import error:', error)
      const msg = error instanceof Error ? error.message : 'Unknown error occurred'
      setErrorMessage(msg)
      setProgressText(t('events.import.progress.failed') + ' ' + msg)
      setProgressPercent(0)
      setImportState('error')
    }
  }

  // ── Render: Import Form (before import) ─────────────────────────
  const renderImportForm = () => (
    <div className="space-y-4">
      {/* File selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('events.import.selectFile')}
        </label>
        <input
          type="file"
          accept=".xml"
          onChange={(e) => {
            setImportFile(e.target.files?.[0] || null)
            setErrorMessage(null)
          }}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('events.import.fileHint')}
        </p>
      </div>

      {/* Event details */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-3">{t('events.import.eventInfo')}</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-blue-800 mb-1">
              {t('events.import.eventName')} *
            </label>
            <input
              type="text"
              value={importEventData.eventName}
              onChange={(e) => setImportEventData({ ...importEventData, eventName: e.target.value })}
              placeholder={t('events.import.eventNamePlaceholder')}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">
                {t('events.import.startDate')}
              </label>
              <input
                type="date"
                value={importEventData.startDate}
                onChange={(e) => setImportEventData({ ...importEventData, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-800 mb-1">
                {t('events.import.endDate')}
              </label>
              <input
                type="date"
                value={importEventData.endDate}
                onChange={(e) => setImportEventData({ ...importEventData, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-800 mb-1">
              {t('events.import.location')}
            </label>
            <select
              value={importEventData.locationId}
              onChange={(e) => setImportEventData({ ...importEventData, locationId: e.target.value })}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">{t('events.import.locationPlaceholder')}</option>
              {venues.map((venue) => (
                <option key={venue.int_wettkampforteid} value={venue.int_wettkampforteid}>
                  {venue.var_name}
                  {venue.var_ort && ` (${venue.var_ort})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-blue-800 mb-1">
              {t('events.import.description')}
            </label>
            <textarea
              value={importEventData.description}
              onChange={(e) => setImportEventData({ ...importEventData, description: e.target.value })}
              placeholder={t('events.import.descriptionPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">❌ {errorMessage}</p>
        </div>
      )}

      {/* Info box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">{t('events.import.information.title')}</h4>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• {t('events.import.information.eventInfo')}</li>
          <li>• {t('events.import.information.competitions')}</li>
          <li>• {t('events.import.information.participants')}</li>
          <li>• {t('events.import.information.clubsUpdate')}</li>
          <li>• {t('events.import.information.participantsUpdate')}</li>
          <li>• {t('events.import.information.noDisciplineGuessing', 'Disziplinen werden nur zugewiesen, wenn sie explizit in der XML-Datei enthalten sind. Andernfalls werden Vorschläge angezeigt.')}</li>
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={resetAndClose}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {t('events.import.cancel')}
        </button>
        <button
          type="button"
          onClick={handleImportFile}
          disabled={!importFile || !importEventData.eventName.trim()}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {t('events.import.import')}
        </button>
      </div>
    </div>
  )

  // ── Render: Progress (during import) ─────────────────────────
  const renderProgress = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span className="text-sm text-gray-700">{progressText}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${Math.max(progressPercent, 5)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-center">{t('events.import.importing')}</p>
    </div>
  )

  // ── Render: Results (after import) ─────────────────────────
  const renderResults = () => {
    if (!importResult) return null

    const { insertionResults, warnings, hints, createdEvent, extractedData } = importResult
    const hasWarnings = warnings && warnings.length > 0
    const hasHints = hints && hints.length > 0
    const hasErrors =
      insertionResults.clubs.errors > 0 ||
      insertionResults.participants.errors > 0 ||
      insertionResults.competitions.errors > 0 ||
      insertionResults.devices.errors > 0 ||
      insertionResults.teams.errors > 0

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {/* Success header */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 text-xl">✅</span>
            <h3 className="text-sm font-semibold text-green-800">
              {t('events.import.progress.completed')}
            </h3>
          </div>
          {createdEvent && (
            <p className="text-sm text-green-700 mt-1">
              🎪 {t('events.import.results.eventCreated', {
                name: createdEvent.name,
                id: createdEvent.id,
                defaultValue: `Veranstaltung "${createdEvent.name}" erstellt (ID: ${createdEvent.id})`
              })}
            </p>
          )}
        </div>

        {/* Extracted data summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            📊 {t('events.import.results.extractedData', 'Extrahierte Daten aus XML')}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
            <div className="flex justify-between">
              <span>🏛️ {t('events.import.results.clubsLabel', 'Vereine')}:</span>
              <span className="font-medium">{extractedData.summary.clubsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>🏆 {t('events.import.results.competitionsLabel', 'Wettkämpfe')}:</span>
              <span className="font-medium">{extractedData.summary.competitionsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>👥 {t('events.import.results.participantsLabel', 'Teilnehmer')}:</span>
              <span className="font-medium">{extractedData.summary.participantsCount}</span>
            </div>
            <div className="flex justify-between">
              <span>🤸 {t('events.import.results.disciplinesLabel', 'Disziplinen')}:</span>
              <span className="font-medium">{extractedData.summary.devicesCount}</span>
            </div>
            {extractedData.summary.teamsCount > 0 && (
              <div className="flex justify-between">
                <span>🏅 {t('events.import.results.teamsLabel', 'Mannschaften')}:</span>
                <span className="font-medium">{extractedData.summary.teamsCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Database insertion results */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-2">
            💾 {t('events.import.results.databaseResults', 'Datenbank-Import')}
          </h4>
          <div className="space-y-2">
            <ResultRow
              icon="🏛️"
              label={t('events.import.results.clubsLabel', 'Vereine')}
              result={insertionResults.clubs}
            />
            <ResultRow
              icon="👥"
              label={t('events.import.results.participantsLabel', 'Teilnehmer')}
              result={insertionResults.participants}
            />
            <ResultRow
              icon="🏆"
              label={t('events.import.results.competitionsLabel', 'Wettkämpfe')}
              result={insertionResults.competitions}
            />
            <ResultRow
              icon="🤸"
              label={t('events.import.results.disciplinesLabel', 'Disziplinen')}
              result={insertionResults.devices}
            />
            {(insertionResults.teams.inserted > 0 || insertionResults.teams.members > 0) && (
              <div className="flex items-center justify-between text-xs">
                <span>🏅 {t('events.import.results.teamsLabel', 'Mannschaften')}</span>
                <span className="text-gray-600">
                  {insertionResults.teams.inserted} {t('events.import.results.created', 'erstellt')}, {insertionResults.teams.members} {t('events.import.results.membersLabel', 'Mitglieder')}
                  {insertionResults.teams.errors > 0 && (
                    <span className="text-red-600 ml-1">· {insertionResults.teams.errors} {t('events.import.results.errorsCount', 'Fehler')}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Discipline hints / suggestions */}
        {hasHints && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-amber-800 mb-2">
              💡 {t('events.import.results.hintsTitle', 'Hinweise & Vorschläge')}
            </h4>
            <p className="text-xs text-amber-700 mb-3">
              {t('events.import.results.hintsDescription', 'Für folgende Wettkämpfe konnten keine Disziplinen aus der XML-Datei zugeordnet werden. Bitte manuell in der Wettkampfverwaltung zuweisen.')}
            </p>
            <div className="space-y-2">
              {hints.map((hint, idx) => (
                <HintItem key={idx} hint={hint} />
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-orange-800 mb-2">
              ⚠️ {t('events.import.results.warningsTitle', 'Warnungen')}
            </h4>
            <div className="space-y-1">
              {warnings.map((w, idx) => (
                <WarningItem key={idx} warning={w} />
              ))}
            </div>
          </div>
        )}

        {/* Errors summary */}
        {hasErrors && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-800 mb-1">
              ❌ {t('events.import.results.errorsTitle', 'Fehler beim Import')}
            </h4>
            <p className="text-xs text-red-700">
              {t('events.import.results.errorsDescription', 'Einige Datensätze konnten nicht importiert werden. Überprüfen Sie die Daten und versuchen Sie es ggf. manuell.')}
            </p>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-2 border-t sticky bottom-0 bg-white pb-1">
          <button
            type="button"
            onClick={resetAndClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('events.import.results.close', 'Schließen')}
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Error State ─────────────────────────
  const renderError = () => (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-600 text-xl">❌</span>
          <h3 className="text-sm font-semibold text-red-800">
            {t('events.import.progress.failed')}
          </h3>
        </div>
        <p className="text-sm text-red-700 mt-2">{errorMessage}</p>
      </div>
      <div className="flex space-x-3">
        <button
          type="button"
          onClick={() => {
            setImportState('idle')
            setErrorMessage(null)
            setProgressPercent(0)
            setProgressText('')
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          {t('events.import.results.tryAgain', 'Erneut versuchen')}
        </button>
        <button
          type="button"
          onClick={resetAndClose}
          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          {t('events.import.results.close', 'Schließen')}
        </button>
      </div>
    </div>
  )

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={importState === 'uploading' ? () => {} : resetAndClose}
      title={t('events.import.title')}
      size={importState === 'completed' ? 'lg' : 'md'}
      showFooter={false}
    >
      {importState === 'idle' && renderImportForm()}
      {importState === 'uploading' && renderProgress()}
      {importState === 'completed' && renderResults()}
      {importState === 'error' && renderError()}
    </UnifiedModal>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

interface ResultRowProps {
  icon: string
  label: string
  result: { inserted: number; updated: number; errors: number }
}

const ResultRow: React.FC<ResultRowProps> = ({ icon, label, result }) => {
  const { t } = useTranslation()
  const total = result.inserted + result.updated
  return (
    <div className="flex items-center justify-between text-xs">
      <span>{icon} {label}</span>
      <span className="text-gray-600">
        {result.inserted > 0 && (
          <span className="text-green-700">{result.inserted} {t('events.import.results.new', 'neu')}</span>
        )}
        {result.inserted > 0 && result.updated > 0 && <span className="mx-1">·</span>}
        {result.updated > 0 && (
          <span className="text-blue-700">{result.updated} {t('events.import.results.updated', 'aktualisiert')}</span>
        )}
        {total === 0 && result.errors === 0 && (
          <span className="text-gray-400">{t('events.import.results.none', 'keine')}</span>
        )}
        {result.errors > 0 && (
          <span className="text-red-600 ml-1">· {result.errors} {t('events.import.results.errorsCount', 'Fehler')}</span>
        )}
      </span>
    </div>
  )
}

interface HintItemProps {
  hint: DisciplineHint
}

const HintItem: React.FC<HintItemProps> = ({ hint }) => {
  const { t } = useTranslation()
  return (
    <div className="bg-white rounded border border-amber-100 p-2">
      <div className="flex items-start space-x-2">
        <span className="text-amber-500 mt-0.5">
          {hint.type === 'suggestion' ? '💡' : hint.type === 'linked' ? '✅' : '❓'}
        </span>
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-900">
            {hint.competition}
          </p>
          {hint.disciplines.length > 0 ? (
            <div className="mt-1">
              <p className="text-xs text-amber-700 mb-1">
                {t('events.import.results.suggestedDisciplines', 'Mögliche Disziplinen:')}
              </p>
              <div className="flex flex-wrap gap-1">
                {hint.disciplines.map((d, i) => (
                  <span key={i} className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-600 mt-1">
              {t('events.import.results.noSuggestions', 'Keine Vorschläge möglich — bitte manuell zuweisen.')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface WarningItemProps {
  warning: ImportWarning
}

const WarningItem: React.FC<WarningItemProps> = ({ warning }) => {
  const iconMap = { info: 'ℹ️', warning: '⚠️', error: '❌' }
  return (
    <div className="text-xs text-orange-700 flex items-start space-x-1">
      <span>{iconMap[warning.type] || '⚠️'}</span>
      <div>
        <span>{warning.message}</span>
        {warning.details && (
          <span className="block text-orange-500 mt-0.5">{warning.details}</span>
        )}
      </div>
    </div>
  )
}

export default EventImportModal
