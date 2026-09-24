/**
 * GymnetResultsServiceLink
 *
 * Shows the public GymNet results service link for the current event once
 * its evID has been recovered from GymNet's "Standardexport.xls", and lets
 * the user import that file when no mapping exists yet.
 */

import { useTranslation } from 'react-i18next'
import { useGymnetEventIdMapping } from '../hooks/useGymnetEventIdMapping'

const FILE_INPUT_ID = 'results-gymnet-event-id-input'
const XLS_FILE_ACCEPT = '.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

interface GymnetResultsServiceLinkProps {
  eventId?: string | null
  showUploadForm?: boolean
}

export function GymnetResultsServiceLink({ eventId, showUploadForm = true }: GymnetResultsServiceLinkProps) {
  const { t } = useTranslation()
  const { mapping, resultsServiceUrl, warning, error, isUploading, uploadStandardExport } = useGymnetEventIdMapping(eventId)

  if (!eventId) {
    return null
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="text-sm font-medium text-gray-700">{t('results.exportWizard.gymnetEventId.title')}</div>

      {mapping && resultsServiceUrl ? (
        <div className="space-y-2 text-sm">
          <div className="text-gray-600">
            {t('results.exportWizard.gymnetEventId.matched', {
              name: mapping.evName,
              start: mapping.evStart,
              stop: mapping.evStop
            })}
          </div>
          <a
            href={resultsServiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            {t('results.exportWizard.gymnetEventId.openLink')}
          </a>
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('results.exportWizard.gymnetEventId.notLinked')}</p>
      )}

      {showUploadForm && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{t('results.exportWizard.gymnetEventId.help')}</p>
          <label htmlFor={FILE_INPUT_ID} className="block text-sm font-medium text-gray-700">
            {t('results.exportWizard.gymnetEventId.uploadLabel')}
          </label>
          <input
            id={FILE_INPUT_ID}
            type="file"
            accept={XLS_FILE_ACCEPT}
            disabled={isUploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void uploadStandardExport(file)
              }
              event.target.value = ''
            }}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
          />
          {warning && <p className="text-xs text-amber-600">{warning}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
