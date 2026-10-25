/**
 * Bahn Selection step for the Jury Portal.
 *
 * Shown after the discipline when the squad competes on more than one Bahn
 * (lane) of the chosen discipline. Same look as the squad selection.
 */

import React from 'react';
import { Columns } from 'lucide-react';
import type { BahnOption, Squad } from '../JuryPortal.types';
import { filterParticipantsForBahn } from '../../../utils/bahnHelpers';

interface BahnSelectionProps {
  options: BahnOption[];
  squad: Squad | null;
  deviceName: string;
  loading: boolean;
  onBahnSelect: (option: BahnOption) => void;
  onBack: () => void;
}

const MAX_PARTICIPANT_PREVIEW = 3;

const BahnSelection: React.FC<BahnSelectionProps> = ({
  options,
  squad,
  deviceName,
  loading,
  onBahnSelect,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">

          {/* Header */}
          <div className="mb-8">
            <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-4">
              ← Zurück
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Bahn auswählen</h1>
            <p className="text-gray-600">{[squad?.name, deviceName].filter(Boolean).join(' · ')}</p>
          </div>

          {/* Bahn cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Lade Bahnen...</p>
              </div>
            ) : options.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Keine Bahnen gefunden für diese Riege und dieses Gerät</p>
              </div>
            ) : (
              options.map((option) => {
                const participants = filterParticipantsForBahn(squad?.participants ?? [], option);

                return (
                  <div
                    key={`${option.durchgang}-${option.bahn}`}
                    data-testid={`bahn-card-${option.bahn}`}
                    className="border-2 border-gray-200 hover:border-blue-500 rounded-lg p-6 cursor-pointer transition-all"
                    onClick={() => onBahnSelect(option)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold">Bahn {option.bahn}</h3>
                      <Columns className="h-6 w-6 text-blue-600" />
                    </div>

                    <p className="text-gray-600">{option.participantCount} Teilnehmer</p>

                    <div className="mt-4 space-y-1">
                      {option.competitions.map((competition) => (
                        <div key={competition.id} className="text-sm text-gray-500">
                          {competition.name}
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 space-y-1">
                      {participants.slice(0, MAX_PARTICIPANT_PREVIEW).map((participant, index) => (
                        <div key={`${participant.id}-${index}`} className="text-sm text-gray-500">
                          #{participant.startNumber || index + 1}{' '}
                          {participant.firstName || participant.firstname}{' '}
                          {participant.lastName || participant.lastname}
                        </div>
                      ))}
                      {participants.length > MAX_PARTICIPANT_PREVIEW && (
                        <div className="text-sm text-gray-400">
                          ...und {participants.length - MAX_PARTICIPANT_PREVIEW} weitere
                        </div>
                      )}
                    </div>
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

export default BahnSelection;
