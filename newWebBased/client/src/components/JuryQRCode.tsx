import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  QrCodeIcon,
  GlobeAltIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

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

interface JuryQRCodeProps {
  /** Show in compact mode (single QR code with IP selector) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

export function JuryQRCode({ compact = false, className = '' }: JuryQRCodeProps) {
  const { t } = useTranslation()
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIpIndex, setSelectedIpIndex] = useState(0)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const fetchNetworkInfo = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/firewall/network-info')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: NetworkInfo = await response.json()
      setNetworkInfo(data)
      setSelectedIpIndex(0)
    } catch (err: any) {
      console.error('Failed to fetch network info:', err)
      setError(err.message || t('juryQR.errorFetching'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNetworkInfo()
  }, [])

  const getJuryUrl = (ip: string): string => {
    const port = networkInfo?.ports?.juryPortal || 3002
    return `http://${ip}:${port}/jury`
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedUrl(url)
      setTimeout(() => setCopiedUrl(null), 2000)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <ArrowPathIcon className="h-6 w-6 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-500">{t('juryQR.loading')}</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span className="font-medium">{t('juryQR.error')}</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchNetworkInfo}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {t('juryQR.retry')}
        </button>
      </div>
    )
  }

  // No IPs available
  if (!networkInfo || networkInfo.ipAddresses.length === 0) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span className="font-medium">{t('juryQR.noNetwork')}</span>
        </div>
        <p className="text-sm text-yellow-600 mt-1">{t('juryQR.noNetworkHint')}</p>
      </div>
    )
  }

  const currentIp = networkInfo.ipAddresses[selectedIpIndex]
  const currentUrl = getJuryUrl(currentIp)

  // Compact mode: single QR code with selector
  if (compact) {
    return (
      <div className={`bg-white rounded-xl border border-purple-200 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <QrCodeIcon className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">{t('juryQR.title')}</h3>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* QR Code */}
          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <QRCodeSVG
              value={currentUrl}
              size={160}
              level="M"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#1e1b4b"
            />
          </div>

          {/* URL display */}
          <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-3 py-2 w-full">
            <GlobeAltIcon className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <code className="text-sm text-purple-800 font-mono truncate flex-1">{currentUrl}</code>
            <button
              onClick={() => handleCopyUrl(currentUrl)}
              className="flex-shrink-0 p-1 rounded hover:bg-purple-100 transition-colors"
              title={t('juryQR.copyUrl')}
            >
              {copiedUrl === currentUrl ? (
                <CheckIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ClipboardDocumentIcon className="h-4 w-4 text-purple-600" />
              )}
            </button>
          </div>

          {/* IP selector (if multiple) */}
          {networkInfo.ipAddresses.length > 1 && (
            <div className="w-full">
              <label className="text-xs text-gray-500 mb-1 block">{t('juryQR.selectNetwork')}</label>
              <select
                value={selectedIpIndex}
                onChange={(e) => setSelectedIpIndex(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {networkInfo.ipAddresses.map((ip, idx) => (
                  <option key={ip} value={idx}>{ip}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full mode: detailed view with all IPs
  return (
    <div className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <QrCodeIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('juryQR.title')}</h3>
            <p className="text-sm text-gray-500">{t('juryQR.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={fetchNetworkInfo}
          className="p-2 rounded-lg hover:bg-purple-100 transition-colors"
          title={t('juryQR.refresh')}
        >
          <ArrowPathIcon className="h-5 w-5 text-purple-600" />
        </button>
      </div>

      {/* Info hint */}
      <div className="bg-purple-100/50 border border-purple-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <WifiIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-purple-800">{t('juryQR.networkHint')}</p>
        </div>
      </div>

      {/* QR Codes for each IP */}
      <div className={`grid gap-4 ${networkInfo.ipAddresses.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {networkInfo.ipAddresses.map((ip) => {
          const url = getJuryUrl(ip)
          return (
            <div
              key={ip}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow"
            >
              {/* QR Code */}
              <div className="mb-3">
                <QRCodeSVG
                  value={url}
                  size={180}
                  level="M"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#1e1b4b"
                />
              </div>

              {/* IP Address */}
              <div className="flex items-center gap-1.5 mb-2">
                <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                <span className="font-mono text-sm font-medium text-gray-900">{ip}</span>
              </div>

              {/* Full URL */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 w-full">
                <code className="text-xs text-gray-600 font-mono truncate flex-1">{url}</code>
                <button
                  onClick={() => handleCopyUrl(url)}
                  className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                  title={t('juryQR.copyUrl')}
                >
                  {copiedUrl === url ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Open link */}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-purple-600 hover:text-purple-800 hover:underline"
              >
                {t('juryQR.openInBrowser')}
              </a>
            </div>
          )
        })}
      </div>

      {/* Port info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {t('juryQR.portInfo', { port: networkInfo.ports.juryPortal })}
        </p>
      </div>
    </div>
  )
}

export default JuryQRCode
