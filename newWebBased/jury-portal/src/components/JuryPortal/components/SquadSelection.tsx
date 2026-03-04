/**
 * Squad Selection step for the Jury Portal.
 * 
 * Displays available squads (Riegen) for the selected event.
 * Shows participant count and a preview of the first 3 participants.
 */

import React from 'react';
import { Users } from 'lucide-react';
import type { Squad } from '../JuryPortal.types';

interface SquadSelectionProps {
  squads: Squad[];
  loading: boolean;
  onSquadSelect: (squad: Squad) => void;
  onBack: () => void;
}

const SquadSelection: React.FC<SquadSelectionProps> = ({
  squads,
  loading,
  onSquadSelect,
  onBack,
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
            <h1 className="text-2xl font-bold text-gray-900">Riege auswählen</h1>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Lade Riegen...</p>
              </div>
            ) : squads.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Keine Riegen gefunden für dieses Event</p>
              </div>
            ) : (
              squads.map((squad) => (
                <div
                  key={squad.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 cursor-pointer transition-colors"
                  onClick={() => onSquadSelect(squad)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">{squad.name}</h3>
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <p className="text-gray-600">{squad.participants?.length || 0} Teilnehmer</p>
                  <div className="mt-4 space-y-1">
                    {(squad.participants || []).slice(0, 3).map((participant, index) => (
                      <div key={`${participant.id}-${index}`} className="text-sm text-gray-500">
                        #{participant.startNumber || index + 1} {participant.firstName || participant.firstname} {participant.lastName || participant.lastname}
                      </div>
                    ))}
                    {(squad.participants || []).length > 3 && (
                      <div className="text-sm text-gray-400">
                        ...und {(squad.participants || []).length - 3} weitere
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SquadSelection;
