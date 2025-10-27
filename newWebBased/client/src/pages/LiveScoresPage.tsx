import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { TrophyIcon } from '@heroicons/react/24/outline'
import UnifiedPageHeader from '@/components/UnifiedPageHeader'
import LiveScoreUpdates from '@/components/LiveScoreUpdates'
import { useEvent } from '@/contexts/EventContext'

const LiveScoresPage = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const eventIdParam = searchParams.get('eventId')
  const { selectedEvent } = useEvent()
  
  // Settings
  const [maxEntries, setMaxEntries] = useState<number>(() => {
    const saved = localStorage.getItem('liveScores.maxEntries')
    return saved ? parseInt(saved) : 20
  })
  
  const [showSquad, setShowSquad] = useState<boolean>(() => {
    const saved = localStorage.getItem('liveScores.showSquad')
    return saved ? saved === 'true' : true
  })

  const selectedEventId = eventIdParam ? parseInt(eventIdParam) : selectedEvent?.int_eventid

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('liveScores.maxEntries', maxEntries.toString())
  }, [maxEntries])

  useEffect(() => {
    localStorage.setItem('liveScores.showSquad', showSquad.toString())
  }, [showSquad])

  if (!selectedEventId) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            {t('common.pleaseSelectEvent')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <UnifiedPageHeader
        title={t('liveScores.title')}
        subtitle={selectedEvent?.var_eventname || ''}
        icon={TrophyIcon}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Live Scores Widget */}
        <div className="lg:col-span-2">
          <LiveScoreUpdates 
            eventId={selectedEventId}
            maxEntries={maxEntries}
            showSquad={showSquad}
          />
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('liveScores.settings.title')}
            </h3>

            <div className="space-y-6">
              {/* Max Entries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('liveScores.settings.maxEntries')}
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={maxEntries}
                  onChange={(e) => setMaxEntries(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('liveScores.settings.maxEntriesHelp')}
                </p>
              </div>

              {/* Show Squad */}
              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSquad}
                    onChange={(e) => setShowSquad(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {t('liveScores.settings.showSquad')}
                  </span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">
                  {t('liveScores.settings.showSquadHelp')}
                </p>
              </div>

              {/* Auto Refresh Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{t('liveScores.settings.autoRefresh')}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('liveScores.settings.autoRefreshHelp')}
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              ℹ️ Information
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Wertungen werden automatisch via Socket.IO aktualisiert</li>
              <li>• Die neuesten Wertungen erscheinen oben in der Liste</li>
              <li>• Farben kennzeichnen die Punktehöhe</li>
              <li>• Einstellungen werden automatisch gespeichert</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveScoresPage
