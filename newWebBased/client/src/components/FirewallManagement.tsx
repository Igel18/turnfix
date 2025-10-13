import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  ShieldCheckIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { apiGet, apiPost } from '../utils/api'

interface FirewallStatus {
  backend: boolean
  frontend: boolean
  juryPortal: boolean
  ports: {
    backend: number
    frontend: number
    juryPortal: number
  }
  hasAdminRights?: boolean
}

interface NetworkInfo {
  ipAddresses: string[]
  ports: {
    backend: number
    frontend: number
    juryPortal: number
  }
  accessUrls: {
    backend: string[]
    frontend: string[]
    juryPortal: string[]
  }
}

export const FirewallManagement: React.FC = () => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<FirewallStatus | null>(null)
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({})
  const [hasAdminRights, setHasAdminRights] = useState<boolean | null>(null)
  const [requiresAdmin, setRequiresAdmin] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  useEffect(() => {
    loadStatus()
    loadNetworkInfo()
  }, [])

  const loadStatus = async () => {
    setLoading(prev => ({ ...prev, status: true }))
    try {
      const data = await apiGet('/firewall/status')
      setStatus(data)
      setHasAdminRights(data.hasAdminRights ?? null)
      
      // If we don't have admin rights, show info message
      if (data.hasAdminRights === false) {
        setRequiresAdmin(true)
      } else {
        setRequiresAdmin(false)
      }
    } catch (error: any) {
      console.error('Error loading firewall status:', error)
      if (error.response?.data?.requiresAdmin) {
        setRequiresAdmin(true)
        setHasAdminRights(false)
      }
    } finally {
      setLoading(prev => ({ ...prev, status: false }))
    }
  }

  const loadNetworkInfo = async () => {
    try {
      const data = await apiGet('/firewall/network-info')
      setNetworkInfo(data)
    } catch (error) {
      console.error('Error loading network info:', error)
    }
  }

  const toggleFirewall = async (service: 'backend' | 'frontend' | 'juryPortal', enable: boolean) => {
    setLoading(prev => ({ ...prev, [service]: true }))
    setMessage(null)

    try {
      const endpoint = enable ? `/firewall/enable/${service}` : `/firewall/disable/${service}`
      const result = await apiPost(endpoint)

      if (result.success) {
        setMessage({
          type: 'success',
          text: enable 
            ? t('configuration.firewall.messages.enabled')
            : t('configuration.firewall.messages.disabled')
        })
        await loadStatus()
      }
    } catch (error: any) {
      console.error('Error toggling firewall:', error)
      
      if (error.response?.data?.requiresAdmin) {
        setRequiresAdmin(true)
        setMessage({
          type: 'error',
          text: t('configuration.firewall.messages.permissionDenied')
        })
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || t('configuration.firewall.messages.error')
        })
      }
    } finally {
      setLoading(prev => ({ ...prev, [service]: false }))
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({
      type: 'success',
      text: t('configuration.firewall.networkInfo.urlCopied')
    })
  }

  const services = [
    {
      key: 'backend' as const,
      title: t('configuration.firewall.backend.title'),
      description: t('configuration.firewall.backend.description'),
      port: status?.ports.backend || 3001,
      color: 'blue'
    },
    {
      key: 'frontend' as const,
      title: t('configuration.firewall.frontend.title'),
      description: t('configuration.firewall.frontend.description'),
      port: status?.ports.frontend || 5173,
      color: 'green'
    },
    {
      key: 'juryPortal' as const,
      title: t('configuration.firewall.juryPortal.title'),
      description: t('configuration.firewall.juryPortal.description'),
      port: status?.ports.juryPortal || 5174,
      color: 'purple'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
          {t('configuration.firewall.title')}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('configuration.firewall.description')}
        </p>
      </div>

      {/* Platform Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-blue-800">
              <strong>{t('configuration.firewall.platformInfo.title')}:</strong>{' '}
              {t('configuration.firewall.platformInfo.description')}
            </p>
          </div>
        </div>
      </div>

      {/* Admin Rights Status */}
      {hasAdminRights !== null && (
        <div className={`border rounded-lg p-4 ${
          hasAdminRights 
            ? 'bg-green-50 border-green-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            {hasAdminRights ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${
                hasAdminRights ? 'text-green-900' : 'text-amber-900'
              }`}>
                {hasAdminRights 
                  ? t('configuration.firewall.adminRights.available')
                  : t('configuration.firewall.requiresAdmin')
                }
              </h4>
              <p className={`text-sm mt-1 ${
                hasAdminRights ? 'text-green-700' : 'text-amber-700'
              }`}>
                {hasAdminRights 
                  ? t('configuration.firewall.adminRights.description')
                  : t('configuration.firewall.adminNote')
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admin Warning (fallback for errors) */}
      {requiresAdmin && hasAdminRights !== false && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900">
                {t('configuration.firewall.requiresAdmin')}
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                {t('configuration.firewall.adminNote')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`border rounded-lg p-4 ${
          message.type === 'success' ? 'bg-green-50 border-green-200' :
          message.type === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-800' :
            message.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Firewall Rules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">
            {t('configuration.firewall.title')}
          </h4>
          <button
            onClick={loadStatus}
            disabled={loading.status}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading.status ? 'animate-spin' : ''}`} />
            {t('configuration.firewall.buttons.refresh')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map(service => {
            const isEnabled = status?.[service.key] || false
            const isLoading = loading[service.key]

            return (
              <div
                key={service.key}
                className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900">
                      {service.title}
                    </h5>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('configuration.firewall.backend.port', { port: service.port })}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {loading.status ? (
                      <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
                    ) : isEnabled ? (
                      <CheckCircleIcon className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-4">
                  {service.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${
                    isEnabled ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {loading.status 
                      ? t('configuration.firewall.status.checking')
                      : isEnabled 
                        ? t('configuration.firewall.status.enabled')
                        : t('configuration.firewall.status.disabled')
                    }
                  </span>

                  <button
                    onClick={() => toggleFirewall(service.key, !isEnabled)}
                    disabled={isLoading || requiresAdmin}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEnabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {isLoading 
                      ? (isEnabled 
                          ? t('configuration.firewall.status.disabling')
                          : t('configuration.firewall.status.enabling')
                        )
                      : (isEnabled
                          ? t('configuration.firewall.buttons.disable')
                          : t('configuration.firewall.buttons.enable')
                        )
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Network Information */}
      {networkInfo && networkInfo.ipAddresses.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
            <InformationCircleIcon className="h-5 w-5" />
            {t('configuration.firewall.networkInfo.title')}
          </h4>
          <p className="text-sm text-blue-700 mb-4">
            {t('configuration.firewall.networkInfo.description')}
          </p>

          <div className="space-y-3">
            {networkInfo.ipAddresses.map(ip => (
              <div key={ip} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {t('configuration.firewall.networkInfo.localIp')}: {ip}
                  </span>
                </div>
                <div className="space-y-1">
                  {services.map(service => {
                    const url = `http://${ip}:${service.port}`
                    return (
                      <div key={service.key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{service.title}:</span>
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded text-gray-800">
                            {url}
                          </code>
                          <button
                            onClick={() => copyToClipboard(url)}
                            className="text-blue-600 hover:text-blue-700"
                            title={t('configuration.firewall.networkInfo.copyUrl')}
                          >
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {t('configuration.firewall.help.title')}
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          {t('configuration.firewall.help.text')}
        </p>
        <div className="space-y-2">
          <p className="text-xs text-amber-700 flex items-start gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{t('configuration.firewall.help.security')}</span>
          </p>
          <p className="text-xs text-blue-700 flex items-start gap-2">
            <InformationCircleIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{t('configuration.firewall.help.platform')}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default FirewallManagement
