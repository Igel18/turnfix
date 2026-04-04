/**
 * Squad Selection step for the Jury Portal.
 *
 * Displays available squads (Riegen) for the selected event.
 * Squads that are currently active (based on time planning) are highlighted
 * in green; upcoming squads are shown with an orange indicator.
 */

import React from 'react';
import { Users, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Squad, ActiveSquadInfo } from '../JuryPortal.types';

interface SquadSelectionProps {
  squads: Squad[];
  loading: boolean;
  activeSquadInfos: ActiveSquadInfo[];
  currentTime: string;
  onSquadSelect: (squad: Squad) => void;
  onBack: () => void;
}

/** Returns the ActiveSquadInfo for the given squad name, or undefined. */
function getInfo(infos: ActiveSquadInfo[], name: string): ActiveSquadInfo | undefined {
  return infos.find(i => i.squadName === name);
}

/** Sort squads: active first, then upcoming, then unknown/past. */
function sortSquads(squads: Squad[], infos: ActiveSquadInfo[]): Squad[] {
  const order = { active: 0, upcoming: 1, unknown: 2, past: 3 };
  return [...squads].sort((a, b) => {
    const sa = getInfo(infos, a.name)?.status ?? 'unknown';
    const sb = getInfo(infos, b.name)?.status ?? 'unknown';
    return order[sa] - order[sb];
  });
}

const SquadSelection: React.FC<SquadSelectionProps> = ({
  squads,
  loading,
  activeSquadInfos,
  currentTime,
  onSquadSelect,
  onBack,
}) => {
  const hasTimePlanning = activeSquadInfos.length > 0;
  const sorted = hasTimePlanning ? sortSquads(squads, activeSquadInfos) : squads;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">

          {/* Header */}
          <div className="mb-8">
            <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mb-4">
              ← Zurück
            </button>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h1 className="text-2xl font-bold text-gray-900">Riege auswählen</h1>
              {hasTimePlanning && currentTime && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>{currentTime} Uhr</span>
                </div>
              )}
            </div>

            {/* Legend — only shown when time planning data is available */}
            {hasTimePlanning && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                  Aktuell aktiv
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-orange-400" />
                  Bald dran (≤30 min)
                </span>
              </div>
            )}
          </div>

          {/* Squad cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Lade Riegen...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Keine Riegen gefunden für dieses Event</p>
              </div>
            ) : (
              sorted.map((squad) => {
                const info = getInfo(activeSquadInfos, squad.name);
                const status = info?.status ?? 'unknown';

                // Border / background by status
                let cardClasses = 'border-2 rounded-lg p-6 cursor-pointer transition-all ';
                let badgeEl: React.ReactNode = null;
                let deviceEl: React.ReactNode = null;

                if (status === 'active') {
                  cardClasses += 'border-green-400 bg-green-50 hover:border-green-500 hover:bg-green-100 ring-2 ring-green-300';
                  badgeEl = (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Aktuell aktiv
                    </span>
                  );
                } else if (status === 'upcoming') {
                  cardClasses += 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:bg-orange-100';
                  badgeEl = (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      Bald dran
                    </span>
                  );
                } else {
                  cardClasses += 'border-gray-200 hover:border-blue-500';
                }

                // Device / time info line
                if (info && (status === 'active' || status === 'upcoming') && info.currentDeviceName) {
                  deviceEl = (
                    <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${status === 'active' ? 'text-green-700' : 'text-orange-700'}`}>
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {status === 'active' ? '' : 'Nächstes Gerät: '}
                        <strong>{info.currentDeviceName}</strong>
                        {info.timeInfo ? ` · ${info.timeInfo}` : ''}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={squad.id}
                    className={cardClasses}
                    onClick={() => onSquadSelect(squad)}
                  >
                    {/* Top row: name + icon */}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold">{squad.name}</h3>
                      <Users className={`h-6 w-6 ${status === 'active' ? 'text-green-600' : status === 'upcoming' ? 'text-orange-500' : 'text-blue-600'}`} />
                    </div>

                    {/* Status badge */}
                    {badgeEl && <div className="mb-2">{badgeEl}</div>}

                    {/* Participant count */}
                    <p className="text-gray-600">{squad.participants?.length || 0} Teilnehmer</p>

                    {/* Device / time info */}
                    {deviceEl}

                    {/* Participant preview */}
                    <div className="mt-4 space-y-1">
                      {(squad.participants || []).slice(0, 3).map((participant, index) => (
                        <div key={`${participant.id}-${index}`} className="text-sm text-gray-500">
                          #{participant.startNumber || index + 1}{' '}
                          {participant.firstName || participant.firstname}{' '}
                          {participant.lastName || participant.lastname}
                        </div>
                      ))}
                      {(squad.participants || []).length > 3 && (
                        <div className="text-sm text-gray-400">
                          ...und {(squad.participants || []).length - 3} weitere
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

export default SquadSelection;

