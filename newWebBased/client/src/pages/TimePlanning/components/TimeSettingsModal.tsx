/**
 * TimeSettingsModal Component
 * Point 124: Separation of Concerns
 * 
 * Modal for editing time planning settings:
 * - Exercise duration
 * - Rotation interval
 * - Break between devices
 * - Warmup duration
 */

import { useTranslation } from 'react-i18next';

import type { TimeSettings } from '../TimePlanning.types';
import { DEFAULT_TIME_SETTINGS } from '../TimePlanning.types';

interface TimeSettingsModalProps {
  timeSettings: TimeSettings;
  setTimeSettings: React.Dispatch<React.SetStateAction<TimeSettings>>;
  setShowTimeSettings: (show: boolean) => void;
  saveTimeSettings: () => void;
}

export function TimeSettingsModal({
  timeSettings,
  setTimeSettings,
  setShowTimeSettings,
  saveTimeSettings
}: TimeSettingsModalProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('timePlanning.timeSettings.title')}</h3>
        <button
          onClick={() => setShowTimeSettings(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.exerciseDuration')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="60"
              value={timeSettings.exerciseDurationMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                exerciseDurationMinutes: parseInt(e.target.value) || 10
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.rotationInterval')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="5"
              max="120"
              value={timeSettings.rotationIntervalMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                rotationIntervalMinutes: parseInt(e.target.value) || 20
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.breakBetweenDevices')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max="30"
              value={timeSettings.breakBetweenDevicesMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                breakBetweenDevicesMinutes: parseInt(e.target.value) || 5
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.warmupDuration')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="0"
              max="60"
              value={timeSettings.warmupDurationMinutes}
              onChange={(e) => setTimeSettings(prev => ({
                ...prev,
                warmupDurationMinutes: parseInt(e.target.value) || 15
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
        <button
          onClick={() => setTimeSettings(DEFAULT_TIME_SETTINGS)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {t('common.reset')}
        </button>
        <button
          onClick={saveTimeSettings}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
