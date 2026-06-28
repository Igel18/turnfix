/**
 * EventImportWizard
 *
 * 3-step wizard for importing GymNet XML files:
 *   Step 1 (fileDetails)  – file selection + event metadata
 *   Step 2 (importing)    – progress indicator (auto-advanced)
 *   Step 3 (results)      – success/error summary + discipline hints
 */

import React from 'react'
import { useTranslation } from 'react-i18next'
import WizardModal from '../../../../components/WizardModal'
import { useEventImportWizard } from './useEventImportWizard'
import type { Venue, DisciplineHint } from '../../Events.types'

// StepProps type for all step and navbar components
type StepProps = { wizard: ReturnType<typeof useEventImportWizard> }

// ── Props ─────────────────────────────────────────────────────────────────────

interface EventImportWizardProps {
  isOpen: boolean
  onClose: () => void
  venues: Venue[]
  onImportComplete: () => void
}

// ── Main Component ────────────────────────────────────────────────────────────

const EventImportWizard: React.FC<EventImportWizardProps> = ({
  isOpen,
  onClose,
  venues,
  onImportComplete,
}) => {
  const wizard = useEventImportWizard({ isOpen, venues, onImportComplete, onClose })

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={wizard.importState === 'uploading' ? () => {} : wizard.resetAndClose}
      title={wizard.title}
      steps={wizard.wizardSteps}
      currentStep={wizard.step}
      size={wizard.step === 'results' ? 'lg' : 'md'}
    >
      {wizard.step === 'eventDetails' && (
        <>
          <StepEventDetails wizard={wizard} venues={venues} />
          <NavBarEventDetails wizard={wizard} />
        </>
      )}
      {wizard.step === 'fileSelection' && (
        <>
          <StepFileSelection wizard={wizard} />
          <NavBarFileSelection wizard={wizard} />
        </>
      )}
      {wizard.step === 'importing' && <StepImporting wizard={wizard} />}
      {wizard.step === 'results' && (
        <>
          <StepResults wizard={wizard} />
          <NavBarResults wizard={wizard} />
        </>
      )}
    </WizardModal>
  )
}

export default EventImportWizard

// ── Step 1: Event Details ─────────────────────────────────────────────
const StepEventDetails: React.FC<StepProps & { venues: Venue[] }> = ({ wizard, venues }) => {
  const { t } = useTranslation()
  const { importEventData, setImportEventData, errorMessage } = wizard
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-blue-800">{t('events.import.eventDetails', 'Veranstaltungsdetails')}</h4>
        <div>
          <label className="block text-xs font-medium text-blue-800 mb-1">
            {t('events.import.eventName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={importEventData.eventName}
            onChange={(e) => setImportEventData({ ...importEventData, eventName: e.target.value })}
            placeholder={t('events.import.eventNamePlaceholder')}
            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            {venues.map((venue: Venue) => (
              <option key={venue.int_wettkampforteid} value={venue.int_wettkampforteid}>
                {venue.var_name}
                {venue.var_ort ? ` (${venue.var_ort})` : ''}
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
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">❌ {errorMessage}</p>
        </div>
      )}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">{t('events.import.information.title')}</h4>
        <p className="text-xs text-yellow-800">{t('events.import.information.text')}</p>
      </div>
    </div>
  )
}

// ── Step 2: File Selection ─────────────────────────────────────────────
const StepFileSelection: React.FC<StepProps> = ({ wizard }) => {
  const { t } = useTranslation()
  const { importFiles, setImportFiles, errorMessage, setErrorMessage } = wizard

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files ? Array.from(e.target.files) : []
    // Merge with existing, avoid duplicates by name
    const existing = importFiles
    const merged = [...existing]
    for (const f of newFiles) {
      if (!merged.some(x => x.name === f.name)) merged.push(f)
    }
    setImportFiles(merged)
    setErrorMessage(null)
    e.target.value = ''
  }

  const removeFile = (name: string) => {
    setImportFiles(importFiles.filter(f => f.name !== name))
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          💡 {t('events.importWizard.fileSelection.multiHint', 'Einzelwettkämpfe und Mannschaftswettkämpfe können in separaten GymNet-XML-Dateien vorliegen. Wähle alle relevanten Dateien aus – sie werden gemeinsam in eine Veranstaltung importiert.')}
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('events.import.selectFile')} <span className="text-red-500">*</span>
        </label>
        <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors w-full">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm text-blue-700">{t('events.importWizard.fileSelection.addFiles', 'XML-Datei(en) hinzufügen')}</span>
          <input
            type="file"
            accept=".xml"
            multiple
            onChange={handleFilesChange}
            className="sr-only"
          />
        </label>
      </div>
      {importFiles.length > 0 && (
        <ul className="space-y-1">
          {importFiles.map((f: File) => (
            <li key={f.name} className="flex items-center justify-between bg-green-50 border border-green-200 rounded px-3 py-1.5 text-xs text-green-700">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                </svg>
                {f.name} <span className="text-green-500">({(f.size / 1024).toFixed(1)} KB)</span>
              </span>
              <button
                type="button"
                onClick={() => removeFile(f.name)}
                className="ml-2 text-green-500 hover:text-red-500 transition-colors"
                aria-label={t('common.remove', 'Entfernen')}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">❌ {errorMessage}</p>
        </div>
      )}
    </div>
  )
}

// ── Navigation bars for new steps ─────────────────────────────────────
const NavBarEventDetails: React.FC<StepProps> = ({ wizard }) => {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end mt-6 pt-4 border-t">
      <button
        onClick={wizard.goNextFromEventDetails}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700"
        disabled={!wizard.canGoNextEventDetails}
      >
        {t('events.importWizard.next', 'Weiter')}
      </button>
    </div>
  )
}

const NavBarFileSelection: React.FC<StepProps> = ({ wizard }) => {
  const { t } = useTranslation()
  return (
    <div className="flex justify-between mt-6 pt-4 border-t">
      <button
        onClick={wizard.goBackFromFileSelection}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        {t('common.back', 'Zurück')}
      </button>
      <button
        onClick={wizard.goNextFromFileSelection}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700"
        disabled={!wizard.canGoNextFileSelection}
      >
        {t('events.importWizard.next', 'Weiter')}
      </button>
    </div>
  )
}


// ── Step 2: Importing (progress) ──────────────────────────────────────────────

const StepImporting: React.FC<StepProps> = ({ wizard }) => {
  const { t } = useTranslation()
  const { progressText, progressPercent } = wizard

  return (
    <div className="space-y-4 py-4">
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
}

// ── Step 3: Results ───────────────────────────────────────────────────────────

const StepResults: React.FC<StepProps> = ({ wizard }) => {
  const { t } = useTranslation()
  const { importResult, errorMessage, importState, acceptedHints, acceptingHint, handleAcceptHint } = wizard

  // Error state
  if (importState === 'error' || !importResult) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-600 text-xl">❌</span>
          <h3 className="text-sm font-semibold text-red-800">
            {t('events.import.progress.failed')}
          </h3>
        </div>
        <p className="text-sm text-red-700 mt-2">{errorMessage}</p>
      </div>
    )
  }

  const { insertionResults, warnings, hints, createdEvent, extractedData, perFileSummaries } = importResult
  const hasWarnings = warnings && warnings.length > 0
  const hasHints = hints && hints.length > 0
  const hasErrors =
    insertionResults.clubs.errors > 0 ||
    insertionResults.participants.errors > 0 ||
    insertionResults.competitions.errors > 0 ||
    insertionResults.devices.errors > 0 ||
    insertionResults.teams.errors > 0

  return (
    <div className="space-y-4 max-h-[52vh] overflow-y-auto pr-1">
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

      {/* Per-file summary if multiple files */}
      {perFileSummaries && perFileSummaries.length > 1 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            📂 {t('events.importWizard.results.perFileSummary', 'Extrahiert pro Datei')}
          </h4>
          <div className="space-y-1">
            {perFileSummaries.map((fs) => (
              <div key={fs.filename} className="flex items-center justify-between text-xs text-gray-600 py-0.5">
                <span className="font-medium truncate max-w-[55%]">{fs.filename}</span>
                <span className="text-gray-500 flex gap-2">
                  <span>🏛️{fs.clubs}</span>
                  <span>🏆{fs.competitions}</span>
                  <span>👥{fs.participants}</span>
                  <span>🤸{fs.devices}</span>
                  {fs.teams > 0 && <span>🏅{fs.teams}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {t('events.import.results.hintsDescription', 'Für folgende Wettkämpfe konnten keine Disziplinen aus der XML-Datei zugeordnet werden.')}
          </p>
          <div className="space-y-2">
            {hints.map((hint, idx) => (
              <HintItem
                key={idx}
                hint={hint}
                accepted={acceptedHints.has(hint.competitionId)}
                accepting={acceptingHint === hint.competitionId}
                onAccept={() => handleAcceptHint(hint)}
              />
            ))}
          </div>
          {hints.some(h => h.type === 'suggestion' && h.disciplines.length > 0 && !acceptedHints.has(h.competitionId)) && (
            <div className="mt-3 pt-2 border-t border-amber-200">
              <button
                type="button"
                onClick={async () => {
                  const pendingHints = hints.filter(
                    hint => hint.type === 'suggestion' && hint.disciplines.length > 0 && !acceptedHints.has(hint.competitionId)
                  )
                  for (const hint of pendingHints) {
                    await handleAcceptHint(hint)
                  }
                }}
                disabled={acceptingHint !== null}
                className="w-full px-3 py-1.5 bg-amber-600 text-white text-xs rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {t('events.import.results.acceptAll', 'Alle Vorschläge übernehmen')}
              </button>
            </div>
          )}
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

      {/* Errors */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-1">
            ❌ {t('events.import.results.errorsTitle', 'Fehler beim Import')}
          </h4>
          <p className="text-xs text-red-700">
            {t('events.import.results.errorsDescription', 'Einige Datensätze konnten nicht importiert werden.')}
          </p>
        </div>
      )}
    </div>
  )
}

// ── NavBars ───────────────────────────────────────────────────────────────────

const NavBarResults: React.FC<StepProps> = ({ wizard }) => {
  const { t } = useTranslation()
  return (
    <div className="flex justify-between pt-3 border-t mt-4">
      {wizard.importState === 'error' && (
        <button
          type="button"
          onClick={wizard.retry}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
        >
          {t('events.import.results.tryAgain', 'Erneut versuchen')}
        </button>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={wizard.resetAndClose}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        {t('events.importWizard.close')}
      </button>
    </div>
  )
}

// ── Sub-components (same as original modal) ───────────────────────────────────

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
  accepted: boolean
  accepting: boolean
  onAccept: () => void
}

const HintItem: React.FC<HintItemProps> = ({ hint, accepted, accepting, onAccept }) => {
  const { t } = useTranslation()
  return (
    <div className={`rounded border p-2 ${accepted ? 'bg-green-50 border-green-200' : 'bg-white border-amber-100'}`}>
      <div className="flex items-start space-x-2">
        <span className="mt-0.5">
          {accepted ? '✅' : hint.type === 'suggestion' ? '💡' : hint.type === 'linked' ? '✅' : '❓'}
        </span>
        <div className="flex-1">
          <p className={`text-xs font-medium ${accepted ? 'text-green-900' : 'text-amber-900'}`}>
            {hint.competition}
          </p>
          {hint.disciplines.length > 0 ? (
            <div className="mt-1">
              <p className={`text-xs mb-1 ${accepted ? 'text-green-700' : 'text-amber-700'}`}>
                {accepted
                  ? t('events.import.results.acceptedDisciplines', 'Zugewiesene Disziplinen:')
                  : t('events.import.results.suggestedDisciplines', 'Mögliche Disziplinen:')}
              </p>
              <div className="flex flex-wrap gap-1">
                {hint.disciplines.map((d, i) => (
                  <span key={i} className={`px-1.5 py-0.5 rounded text-xs ${accepted ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">{hint.message}</p>
          )}
        </div>
        {hint.type === 'suggestion' && hint.disciplines.length > 0 && !accepted && (
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting}
            className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {accepting ? '...' : t('events.import.results.accept', 'Übernehmen')}
          </button>
        )}
      </div>
    </div>
  )
}

interface WarningItemProps {
  warning: { type: string; category: string; message: string; details?: string }
}

const WarningItem: React.FC<WarningItemProps> = ({ warning }) => (
  <div className={`text-xs p-1.5 rounded ${warning.type === 'error' ? 'bg-red-50 text-red-700' : warning.type === 'warning' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
    <span className="font-medium">[{warning.category}]</span> {warning.message}
    {warning.details && <div className="text-gray-500 mt-0.5">{warning.details}</div>}
  </div>
)
