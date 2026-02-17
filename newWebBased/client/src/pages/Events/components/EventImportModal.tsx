/**
 * Modal for importing GymNet XML events.
 */

import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import UnifiedModal from '../../../components/UnifiedModal'
import { debugLog } from '../../../utils/debug'
import { invalidateCache } from '../../../utils/api'
import type { Venue, ImportEventData, ImportProgress } from '../Events.types'
import { EMPTY_IMPORT_DATA } from '../Events.types'

interface EventImportModalProps {
  isOpen: boolean
  onClose: () => void
  venues: Venue[]
  onImportComplete: () => void
}

const EventImportModal: React.FC<EventImportModalProps> = ({
  isOpen,
  onClose,
  venues,
  onImportComplete,
}) => {
  const { t } = useTranslation()

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importEventData, setImportEventData] = useState<ImportEventData>({ ...EMPTY_IMPORT_DATA })

  const resetAndClose = () => {
    setImportFile(null)
    setImportProgress(null)
    setImportEventData({ ...EMPTY_IMPORT_DATA })
    onClose()
  }

  const handleImportFile = async () => {
    if (!importFile) return

    if (!importEventData.eventName.trim()) {
      setImportProgress({ step: 'Error: Event name is required', progress: 0 })
      return
    }

    setImportProgress({ step: 'Parsing XML file...', progress: 10 })

    try {
      const formData = new FormData()
      formData.append('xmlFile', importFile)
      formData.append('eventName', importEventData.eventName.trim())
      if (importEventData.startDate) formData.append('startDate', importEventData.startDate)
      if (importEventData.endDate) formData.append('endDate', importEventData.endDate)
      if (importEventData.locationId) formData.append('locationId', importEventData.locationId)
      if (importEventData.description) formData.append('description', importEventData.description.trim())

      setImportProgress({ step: 'Uploading and processing...', progress: 30 })

      const response = await fetch('/api/events/import-gymnet', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setImportProgress({ step: 'Processing and inserting data into database...', progress: 70 })

        const summary = buildImportSummary(result, t)
        setImportProgress({ step: `${t('events.import.progress.completed')} ${summary}`, progress: 100 })

        setTimeout(() => {
          resetAndClose()
          invalidateCache('/events')
          onImportComplete()
        }, 8000)
      } else {
        throw new Error(result.message || 'Import failed')
      }
    } catch (error) {
      debugLog('Import error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setImportProgress({ step: `${t('events.import.progress.failed')} ${errorMessage}`, progress: 0 })
    }
  }

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={t('events.import.title')}
      size="md"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* File selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('events.import.selectFile')}
          </label>
          <input
            type="file"
            accept=".xml"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
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

        {/* Progress bar */}
        {importProgress && (
          <div className="space-y-2">
            <div className="flex justify-between items-start text-sm text-gray-700">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed max-w-md">{importProgress.step}</pre>
              <span className="ml-2">{importProgress.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  importProgress.progress === 0 ? 'bg-red-500' :
                  importProgress.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(importProgress.progress, 5)}%` }}
              />
            </div>
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
          </ul>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={resetAndClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={importProgress !== null}
          >
            {t('events.import.cancel')}
          </button>
          <button
            type="button"
            onClick={handleImportFile}
            disabled={!importFile || !importEventData.eventName.trim() || importProgress !== null}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {importProgress ? t('events.import.importing') : t('events.import.import')}
          </button>
        </div>
      </div>
    </UnifiedModal>
  )
}

// ── Helper: Build import summary string ─────────────────────────────────────

function buildImportSummary(result: any, t: (key: string, opts?: any) => string): string {
  let summary = ''

  if (result.createdEvent) {
    summary += `\n🎪 ${t('events.import.progress.eventCreated', { name: result.createdEvent.name, id: result.createdEvent.id })}`
  }

  if (result.extractedData) {
    const { clubs, competitions, participants, devices } = result.extractedData
    summary += '\n\n📊 Extracted Data Summary:\n'

    if (clubs.length > 0) {
      summary += `\n🏛️ Clubs (${clubs.length}):\n`
      clubs.slice(0, 3).forEach((club: any) => {
        summary += `  • ${club.name || 'Unnamed Club'} ${club.code ? `(${club.code})` : ''}\n`
      })
      if (clubs.length > 3) summary += `  ... and ${clubs.length - 3} more\n`
    }

    if (competitions.length > 0) {
      summary += `\n🏆 Competitions (${competitions.length}):\n`
      competitions.slice(0, 3).forEach((comp: any) => {
        summary += `  • ${comp.name || 'Unnamed Competition'} ${comp.date ? `(${comp.date})` : ''}\n`
      })
      if (competitions.length > 3) summary += `  ... and ${competitions.length - 3} more\n`
    }

    if (participants.length > 0) {
      summary += `\n👥 Participants (${participants.length}):\n`
      participants.slice(0, 3).forEach((p: any) => {
        const name = [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed Participant'
        summary += `  • ${name} ${p.gender ? `(${p.gender})` : ''}\n`
      })
      if (participants.length > 3) summary += `  ... and ${participants.length - 3} more\n`
    }

    if (devices.length > 0) {
      summary += `\n🤸 Devices/Apparatus (${devices.length}):\n`
      devices.slice(0, 3).forEach((d: any) => {
        summary += `  • ${d.name || 'Unnamed Device'} ${d.code ? `(${d.code})` : ''}\n`
      })
      if (devices.length > 3) summary += `  ... and ${devices.length - 3} more\n`
    }
  }

  if (result.insertionResults) {
    const { clubs, participants, competitions, devices } = result.insertionResults
    summary += `\n\n💾 ${t('events.import.progress.databaseResults')}\n`
    summary += `  🏛️ ${t('events.import.progress.clubs', { inserted: clubs.inserted, updated: clubs.updated, errors: clubs.errors })}\n`
    summary += `  👥 ${t('events.import.progress.participants', { inserted: participants.inserted, updated: participants.updated, errors: participants.errors })}\n`
    summary += `  🏆 ${t('events.import.progress.competitions', { inserted: competitions.inserted, updated: competitions.updated, errors: competitions.errors })}\n`
    summary += `  🤸 ${t('events.import.progress.disciplines', { inserted: devices.inserted, updated: devices.updated, errors: devices.errors })}`
  }

  return summary
}

export default EventImportModal
