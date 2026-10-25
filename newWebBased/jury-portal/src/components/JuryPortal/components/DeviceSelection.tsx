/**
 * Device (Discipline) Selection step for the Jury Portal.
 * 
 * Displays available devices/disciplines for the selected squad.
 * Shows discipline icons from the database or missing-icon placeholder.
 */

import React from 'react';
import { MISSING_ICON_EMOJI, getMissingIconUrl } from '../../../utils/iconUtils';
import type { Device, Squad } from '../JuryPortal.types';

interface DeviceSelectionProps {
  devices: Device[];
  selectedSquad: Squad | null;
  loading: boolean;
  onDeviceSelect: (device: Device) => void;
  onBack: () => void;
  /** Device the squad does next according to its rotation (suggestion only) */
  nextDeviceId?: number | null;
}

const DeviceSelection: React.FC<DeviceSelectionProps> = ({
  devices,
  selectedSquad,
  loading,
  onDeviceSelect,
  onBack,
  nextDeviceId = null,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 mb-4"
            >
              ← Zurück
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerät auswählen</h1>
              <p className="text-gray-600">{selectedSquad?.name}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-4 text-center py-8">
                <p className="text-gray-500">Lade Geräte...</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="col-span-4 text-center py-8">
                <p className="text-gray-500">Keine Geräte gefunden</p>
              </div>
            ) : (
              devices.map((device) => {
                const isNext = nextDeviceId !== null && device.disciplineId === nextDeviceId;
                return (
                <div
                  key={device.id}
                  {...(isNext ? { 'data-next': 'true' } : {})}
                  className={`border-2 rounded-lg p-8 cursor-pointer transition-colors text-center ${
                    isNext ? 'border-orange-400 bg-orange-50 hover:border-orange-500' : 'border-gray-200 hover:border-blue-500'
                  }`}
                  onClick={() => onDeviceSelect(device)}
                >
                  {isNext && (
                    <span className="inline-block mb-2 text-xs font-semibold text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                      Als Nächstes
                    </span>
                  )}
                  <div className="flex justify-center mb-4">
                    {device.iconPath ? (
                      <img
                        src={device.iconPath}
                        alt={`${device.name} icon`}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          const missingUrl = getMissingIconUrl();
                          if (e.currentTarget.src !== missingUrl) {
                            e.currentTarget.src = missingUrl;
                          } else {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="text-4xl">${MISSING_ICON_EMOJI}</div>`;
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="text-4xl">{MISSING_ICON_EMOJI}</div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold">{device.name}</h3>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceSelection;
