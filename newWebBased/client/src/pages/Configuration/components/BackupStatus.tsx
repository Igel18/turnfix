import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { apiGet, invalidateCache } from '@/utils/api'

interface BackupStatusData {
  running: boolean
  lastSuccess: string | null
  lastPath: string | null
  error: string | null
}

const STATUS_ENDPOINT = '/configuration/backup/status'
const STATUS_KEY = 'configuration.sections.backup.status'
const SPINNING_ICON_CLASS = 'animate-spin'

const BackupStatus = () => {
  const { t, i18n } = useTranslation()
  const [status, setStatus] = useState<BackupStatusData | null>(null)
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const mounted = useRef(false)

  const refresh = async () => {
    setLoading(true)
    setRequestError(null)
    invalidateCache(STATUS_ENDPOINT)
    try {
      const result: BackupStatusData = await apiGet(STATUS_ENDPOINT)
      if (mounted.current) setStatus(result)
    } catch (error) {
      if (mounted.current) setRequestError(error instanceof Error ? error.message : t(`${STATUS_KEY}.loadError`))
    } finally {
      if (mounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => { mounted.current = false }
  }, [])

  const lastSuccessDate = status?.lastSuccess ? new Date(status.lastSuccess) : null
  const lastSuccess = lastSuccessDate && !Number.isNaN(lastSuccessDate.getTime())
    ? lastSuccessDate.toLocaleString(i18n?.resolvedLanguage)
    : status?.lastSuccess
  const stateLabel = status?.running ? t(`${STATUS_KEY}.running`) : t(`${STATUS_KEY}.idle`)

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-label={t(`${STATUS_KEY}.title`)}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-900">{t(`${STATUS_KEY}.title`)}</h4>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          title={t(`${STATUS_KEY}.refresh`)}
          aria-label={t(`${STATUS_KEY}.refresh`)}
          className="inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-white disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? SPINNING_ICON_CLASS : ''}`} />
        </button>
      </div>
      {loading && <p role="status" className="mt-2 text-sm text-gray-600">{t(`${STATUS_KEY}.loading`)}</p>}
      {status && (
        <dl className="mt-3 space-y-2 text-sm">
          <div><dt className="font-medium text-gray-700">{t(`${STATUS_KEY}.state`)}</dt><dd>{stateLabel}</dd></div>
          <div><dt className="font-medium text-gray-700">{t(`${STATUS_KEY}.lastSuccess`)}</dt><dd>{lastSuccess || t(`${STATUS_KEY}.notAvailable`)}</dd></div>
          <div><dt className="font-medium text-gray-700">{t(`${STATUS_KEY}.lastPath`)}</dt><dd className="break-all">{status.lastPath || t(`${STATUS_KEY}.notAvailable`)}</dd></div>
          {status.error && <div><dt className="font-medium text-red-800">{t(`${STATUS_KEY}.error`)}</dt><dd className="break-words text-red-700" role="alert">{status.error}</dd></div>}
        </dl>
      )}
      {requestError && <p className="mt-3 break-words text-sm text-red-700" role="alert">{t(`${STATUS_KEY}.loadError`)}: {requestError}</p>}
    </section>
  )
}

export default BackupStatus