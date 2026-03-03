import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'
import {
  WifiIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  SignalIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline'

export interface WifiNetwork {
  ssid: string
  password: string
  encryption: 'WPA' | 'WEP' | 'nopass'
  hidden?: boolean
}

interface WifiSettings {
  enabled: boolean
  networks: WifiNetwork[]
}

interface WifiQRCodeProps {
  /** Show in compact mode (inline, smaller) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Generates a WiFi QR code string following the standard WIFI: URI scheme.
 * Format: WIFI:T:<encryption>;S:<SSID>;P:<password>;H:<hidden>;;
 */
export function generateWifiQRString(network: WifiNetwork): string {
  // Escape special characters in SSID and password
  const escapeWifiField = (value: string): string =>
    value.replace(/[\\;,":]/g, (c) => `\\${c}`)

  const parts = [
    `T:${network.encryption}`,
    `S:${escapeWifiField(network.ssid)}`,
  ]

  if (network.encryption !== 'nopass' && network.password) {
    parts.push(`P:${escapeWifiField(network.password)}`)
  }

  if (network.hidden) {
    parts.push('H:true')
  }

  return `WIFI:${parts.join(';')};;`
}

export function WifiQRCode({ compact = false, className = '' }: WifiQRCodeProps) {
  const { t } = useTranslation()
  const [wifiSettings, setWifiSettings] = useState<WifiSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const fetchWifiSettings = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/app-settings/wifi')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setWifiSettings(data)
      setSelectedIndex(0)
    } catch (err: any) {
      console.error('Failed to fetch WiFi settings:', err)
      setError(err.message || t('wifiQR.errorFetching'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWifiSettings()
  }, [])

  const handleCopyPassword = async (password: string, index: number) => {
    try {
      await navigator.clipboard.writeText(password)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = password
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">{t('wifiQR.loading')}</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span className="font-medium">{t('wifiQR.error')}</span>
        </div>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchWifiSettings}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
        >
          <ArrowPathIcon className="h-4 w-4" />
          {t('wifiQR.retry')}
        </button>
      </div>
    )
  }

  // Not enabled or no networks
  if (!wifiSettings?.enabled || !wifiSettings.networks || wifiSettings.networks.length === 0) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <WifiIcon className="h-5 w-5" />
          <span className="text-sm">{t('wifiQR.notConfigured')}</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{t('wifiQR.notConfiguredHint')}</p>
      </div>
    )
  }

  const networks = wifiSettings.networks
  const currentNetwork = networks[selectedIndex]
  const currentQRValue = generateWifiQRString(currentNetwork)

  const encryptionLabel = (enc: string) => {
    switch (enc) {
      case 'WPA': return 'WPA/WPA2'
      case 'WEP': return 'WEP'
      case 'nopass': return t('wifiQR.openNetwork')
      default: return enc
    }
  }

  const EncryptionIcon = ({ encryption }: { encryption: string }) => {
    if (encryption === 'nopass') {
      return <LockOpenIcon className="h-4 w-4 text-yellow-500" />
    }
    return <LockClosedIcon className="h-4 w-4 text-green-600" />
  }

  // Compact mode
  if (compact) {
    return (
      <div className={`bg-white rounded-xl border border-blue-200 p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <WifiIcon className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{t('wifiQR.title')}</h3>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* QR Code */}
          <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <QRCodeSVG
              value={currentQRValue}
              size={160}
              level="M"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#1e3a5f"
            />
          </div>

          {/* Network info */}
          <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 w-full">
            <SignalIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-blue-900 block truncate">
                {currentNetwork.ssid}
              </span>
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <EncryptionIcon encryption={currentNetwork.encryption} />
                {encryptionLabel(currentNetwork.encryption)}
              </span>
            </div>
            {currentNetwork.encryption !== 'nopass' && (
              <button
                onClick={() => handleCopyPassword(currentNetwork.password, selectedIndex)}
                className="flex-shrink-0 p-1 rounded hover:bg-blue-100 transition-colors"
                title={t('wifiQR.copyPassword')}
              >
                {copiedIndex === selectedIndex ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4 text-blue-600" />
                )}
              </button>
            )}
          </div>

          {/* Network selector (if multiple) */}
          {networks.length > 1 && (
            <div className="w-full">
              <label className="text-xs text-gray-500 mb-1 block">{t('wifiQR.selectNetwork')}</label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
                className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {networks.map((n, idx) => (
                  <option key={idx} value={idx}>{n.ssid}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full mode: show all networks with numbered labels
  return (
    <div className={`bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <WifiIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('wifiQR.title')}</h3>
            <p className="text-sm text-gray-500">{t('wifiQR.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={fetchWifiSettings}
          className="p-2 rounded-lg hover:bg-blue-100 transition-colors"
          title={t('wifiQR.refresh')}
        >
          <ArrowPathIcon className="h-5 w-5 text-blue-600" />
        </button>
      </div>

      {/* Hint */}
      <div className="bg-blue-100/50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <WifiIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">{t('wifiQR.scanHint')}</p>
        </div>
      </div>

      {/* Network QR codes */}
      <div className={`grid gap-4 ${networks.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {networks.map((network, idx) => {
          const qrValue = generateWifiQRString(network)
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Number badge */}
              <div className="flex items-center gap-2 mb-3 w-full">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="font-semibold text-gray-900 truncate">{network.ssid}</span>
              </div>

              {/* QR Code */}
              <div className="mb-3">
                <QRCodeSVG
                  value={qrValue}
                  size={180}
                  level="M"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#1e3a5f"
                />
              </div>

              {/* Network details */}
              <div className="w-full space-y-2">
                {/* SSID */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <SignalIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 block">{t('wifiQR.networkName')}</span>
                    <span className="text-sm font-medium text-gray-900 block truncate">{network.ssid}</span>
                  </div>
                </div>

                {/* Encryption */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <EncryptionIcon encryption={network.encryption} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-500 block">{t('wifiQR.encryptionType')}</span>
                    <span className="text-sm font-medium text-gray-900">{encryptionLabel(network.encryption)}</span>
                  </div>
                </div>

                {/* Password (if encrypted) */}
                {network.encryption !== 'nopass' && (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <LockClosedIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-500 block">{t('wifiQR.password')}</span>
                      <span className="text-sm font-mono text-gray-900 block truncate">
                        {network.password}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopyPassword(network.password, idx)}
                      className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                      title={t('wifiQR.copyPassword')}
                    >
                      {copiedIndex === idx ? (
                        <CheckIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          {t('wifiQR.configHint')}
        </p>
      </div>
    </div>
  )
}

export default WifiQRCode
