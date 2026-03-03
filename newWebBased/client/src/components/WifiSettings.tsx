import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  WifiIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { QRCodeSVG } from 'qrcode.react'
import { generateWifiQRString, type WifiNetwork } from './WifiQRCode'

interface WifiSettings {
  enabled: boolean
  networks: WifiNetwork[]
  description?: string
}

const DEFAULT_NETWORK: WifiNetwork = {
  ssid: '',
  password: '',
  encryption: 'WPA',
  hidden: false
}

export function WifiSettings() {
  const { t } = useTranslation()
  const [settings, setSettings] = useState<WifiSettings>({ enabled: false, networks: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/app-settings/wifi')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          enabled: data.enabled ?? false,
          networks: Array.isArray(data.networks) ? data.networks : []
        })
      }
    } catch (error) {
      console.error('Error loading WiFi settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)
    try {
      // Validate: all enabled networks must have SSID
      const invalidNetworks = settings.networks.filter(n => !n.ssid.trim())
      if (invalidNetworks.length > 0) {
        setMessage({ type: 'error', text: t('wifiSettings.errorEmptySSID') })
        setSaving(false)
        return
      }

      // Validate: encrypted networks must have password
      const missingPassword = settings.networks.filter(
        n => n.encryption !== 'nopass' && !n.password.trim()
      )
      if (missingPassword.length > 0) {
        setMessage({ type: 'error', text: t('wifiSettings.errorEmptyPassword') })
        setSaving(false)
        return
      }

      const response = await fetch('/api/app-settings/wifi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          networks: settings.networks,
          description: 'WiFi/WLAN settings for generating QR codes that judges can scan to connect to the competition network.'
        })
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setMessage({ type: 'success', text: t('wifiSettings.saveSuccess') })
      setTimeout(() => setMessage(null), 3000)
    } catch (error: any) {
      console.error('Error saving WiFi settings:', error)
      setMessage({ type: 'error', text: t('wifiSettings.saveFailed') })
    } finally {
      setSaving(false)
    }
  }

  const addNetwork = () => {
    setSettings(prev => ({
      ...prev,
      networks: [...prev.networks, { ...DEFAULT_NETWORK }]
    }))
  }

  const removeNetwork = (index: number) => {
    setSettings(prev => ({
      ...prev,
      networks: prev.networks.filter((_, i) => i !== index)
    }))
    if (previewIndex === index) setPreviewIndex(null)
    if (previewIndex !== null && previewIndex > index) {
      setPreviewIndex(previewIndex - 1)
    }
  }

  const updateNetwork = (index: number, field: keyof WifiNetwork, value: any) => {
    setSettings(prev => ({
      ...prev,
      networks: prev.networks.map((n, i) =>
        i === index ? { ...n, [field]: value } : n
      )
    }))
  }

  const moveNetwork = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= settings.networks.length) return
    setSettings(prev => {
      const networks = [...prev.networks]
      const temp = networks[index]
      networks[index] = networks[newIndex]
      networks[newIndex] = temp
      return { ...prev, networks }
    })
  }

  const togglePasswordVisibility = (index: number) => {
    setShowPasswords(prev => ({ ...prev, [index]: !prev[index] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-500">{t('wifiSettings.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <WifiIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">{t('wifiSettings.infoTitle')}</h4>
            <p className="text-sm text-blue-700 mt-1">{t('wifiSettings.infoText')}</p>
          </div>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <label className="text-sm font-medium text-gray-900">{t('wifiSettings.enableLabel')}</label>
          <p className="text-xs text-gray-500 mt-0.5">{t('wifiSettings.enableDescription')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Networks */}
      {settings.enabled && (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              {t('wifiSettings.networksTitle')} ({settings.networks.length})
            </h4>
            <button
              onClick={addNetwork}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('wifiSettings.addNetwork')}
            </button>
          </div>

          {settings.networks.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <WifiIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">{t('wifiSettings.noNetworks')}</p>
              <button
                onClick={addNetwork}
                className="mt-3 inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {t('wifiSettings.addFirstNetwork')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.networks.map((network, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  {/* Network header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-gray-900">
                        {network.ssid || t('wifiSettings.newNetwork')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Move up/down */}
                      <button
                        onClick={() => moveNetwork(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('wifiSettings.moveUp')}
                      >
                        <ArrowUpIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => moveNetwork(idx, 'down')}
                        disabled={idx === settings.networks.length - 1}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={t('wifiSettings.moveDown')}
                      >
                        <ArrowDownIcon className="h-4 w-4 text-gray-500" />
                      </button>
                      {/* Preview */}
                      <button
                        onClick={() => setPreviewIndex(previewIndex === idx ? null : idx)}
                        className={`p-1.5 rounded hover:bg-gray-100 ${previewIndex === idx ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                        title={t('wifiSettings.preview')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => removeNetwork(idx)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500 hover:text-red-600"
                        title={t('wifiSettings.removeNetwork')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Network fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SSID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('wifiSettings.ssidLabel')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={network.ssid}
                        onChange={(e) => updateNetwork(idx, 'ssid', e.target.value)}
                        placeholder={t('wifiSettings.ssidPlaceholder')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Encryption */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('wifiSettings.encryptionLabel')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={network.encryption}
                        onChange={(e) => updateNetwork(idx, 'encryption', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="WPA">WPA/WPA2/WPA3</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">{t('wifiSettings.encryptionNone')}</option>
                      </select>
                    </div>

                    {/* Password */}
                    {network.encryption !== 'nopass' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('wifiSettings.passwordLabel')} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords[idx] ? 'text' : 'password'}
                            value={network.password}
                            onChange={(e) => updateNetwork(idx, 'password', e.target.value)}
                            placeholder={t('wifiSettings.passwordPlaceholder')}
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(idx)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                          >
                            {showPasswords[idx] ? (
                              <EyeSlashIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Hidden network */}
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        checked={network.hidden || false}
                        onChange={(e) => updateNetwork(idx, 'hidden', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        id={`hidden-${idx}`}
                      />
                      <label htmlFor={`hidden-${idx}`} className="text-sm text-gray-700">
                        {t('wifiSettings.hiddenNetwork')}
                      </label>
                    </div>
                  </div>

                  {/* QR Preview */}
                  {previewIndex === idx && network.ssid && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-gray-500 mb-2">{t('wifiSettings.previewLabel')}</p>
                        <QRCodeSVG
                          value={generateWifiQRString(network)}
                          size={160}
                          level="M"
                          includeMargin={true}
                          bgColor="#FFFFFF"
                          fgColor="#1e3a5f"
                        />
                        <p className="text-xs text-gray-400 mt-2 font-mono break-all max-w-xs text-center">
                          {generateWifiQRString(network)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              {t('wifiSettings.saving')}
            </>
          ) : (
            t('wifiSettings.save')
          )}
        </button>
      </div>
    </div>
  )
}

export default WifiSettings
