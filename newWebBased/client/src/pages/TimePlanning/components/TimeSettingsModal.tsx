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

import LocalizedNumberInput from '@/components/ui/LocalizedNumberInput';
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
  const isValid = timeSettings.exerciseDurationMinutes >= 1 && timeSettings.exerciseDurationMinutes <= 60
    && timeSettings.rotationIntervalMinutes >= 5 && timeSettings.rotationIntervalMinutes <= 120
    && timeSettings.breakBetweenDevicesMinutes >= 0 && timeSettings.breakBetweenDevicesMinutes <= 30
    && timeSettings.warmupDurationMinutes >= 0 && timeSettings.warmupDurationMinutes <= 60;

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
            <LocalizedNumberInput
              id="time-settings-exercise-duration"
              required
              min={1}
              max={60}
              value={timeSettings.exerciseDurationMinutes}
              onValueChange={(value) => setTimeSettings(prev => ({
                ...prev,
                exerciseDurationMinutes: value
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.rotationInterval')}
          </label>
            <LocalizedNumberInput
              id="time-settings-rotation-interval"
              required
              min={5}
              max={120}
              value={timeSettings.rotationIntervalMinutes}
              onValueChange={(value) => setTimeSettings(prev => ({
                ...prev,
                rotationIntervalMinutes: value
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.breakBetweenDevices')}
          </label>
            <LocalizedNumberInput
              id="time-settings-break-between-devices"
              required
              min={0}
              max={30}
              value={timeSettings.breakBetweenDevicesMinutes}
              onValueChange={(value) => setTimeSettings(prev => ({
                ...prev,
                breakBetweenDevicesMinutes: value
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('timePlanning.timeSettings.warmupDuration')}
          </label>
            <LocalizedNumberInput
              id="time-settings-warmup-duration"
              required
              min={0}
              max={60}
              value={timeSettings.warmupDurationMinutes}
              onValueChange={(value) => setTimeSettings(prev => ({
                ...prev,
                warmupDurationMinutes: value
              }))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 invalid:border-red-500 invalid:ring-red-500"
            />
            <span className="text-sm text-gray-600">{t('timePlanning.minutes')}</span>
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
          disabled={!isValid}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
