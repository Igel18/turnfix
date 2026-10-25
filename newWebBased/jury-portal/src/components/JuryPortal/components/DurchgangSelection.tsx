/**
 * Durchgang Selection step for the Jury Portal.
 *
 * Shown before the squad selection when an event has more than one Durchgang.
 * Looks like the squad selection: active Durchgänge are highlighted in green,
 * upcoming ones in orange (derived from the time planning of their squads).
 */

import React from 'react';
import { Layers, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ActiveSquadInfo, Durchgang } from '../JuryPortal.types';
import {
  formatDurchgangStartTime,
  getDurchgangStatus,
  getSelectableDurchgaenge,
  sortDurchgaenge,
} from '../../../utils/durchgangHelpers';

interface DurchgangSelectionProps {
  durchgaenge: Durchgang[];
  loading: boolean;
  activeSquadInfos: ActiveSquadInfo[];
  currentTime: string;
  onDurchgangSelect: (durchgang: Durchgang) => void;
  onBack: () => void;
}

const MAX_SQUAD_PREVIEW = 4;

const DurchgangSelection: React.FC<DurchgangSelectionProps> = ({
  durchgaenge,
  loading,
  activeSquadInfos,
  currentTime,
  onDurchgangSelect,
  onBack,
}) => {
  const hasTimePlanning = activeSquadInfos.length > 0;
  const sorted = sortDurchgaenge(getSelectableDurchgaenge(durchgaenge), activeSquadInfos);

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
              <h1 className="text-2xl font-bold text-gray-900">Durchgang auswählen</h1>
              {hasTimePlanning && currentTime && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                  <Clock className="h-4 w-4" />
                  <span>{currentTime} Uhr</span>
                </div>
              )}
            </div>

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

          {/* Durchgang cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Lade Durchgänge...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="col-span-2 text-center py-8">
                <p className="text-gray-500">Keine Durchgänge gefunden für dieses Event</p>
              </div>
            ) : (
              sorted.map((durchgang) => {
                const status = getDurchgangStatus(durchgang, activeSquadInfos);
                const participantCount = durchgang.squads.reduce((sum, s) => sum + s.participantCount, 0);
                const squadCount = durchgang.squads.length;
                const startTime = formatDurchgangStartTime(durchgang.startTime);

                let cardClasses = 'border-2 rounded-lg p-6 cursor-pointer transition-all ';
                let badgeEl: React.ReactNode = null;

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

                const iconColor = status === 'active' ? 'text-green-600' : status === 'upcoming' ? 'text-orange-500' : 'text-blue-600';

                return (
                  <div
                    key={durchgang.durchgang}
                    data-testid={`durchgang-card-${durchgang.durchgang}`}
                    className={cardClasses}
                    onClick={() => onDurchgangSelect(durchgang)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-semibold">Durchgang {durchgang.durchgang}</h3>
                      <Layers className={`h-6 w-6 ${iconColor}`} />
                    </div>

                    {badgeEl && <div className="mb-2">{badgeEl}</div>}

                    <p className="text-gray-600">
                      {squadCount} {squadCount === 1 ? 'Riege' : 'Riegen'} · {participantCount} Teilnehmer
                    </p>

                    {startTime && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{startTime}</span>
                      </div>
                    )}

                    {/* Competitions preview */}
                    <div className="mt-4 space-y-1">
                      {durchgang.competitions.map((competition) => (
                        <div key={competition.id} className="text-sm text-gray-500">
                          {competition.name}
                        </div>
                      ))}
                    </div>

                    {/* Squads preview */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {durchgang.squads.slice(0, MAX_SQUAD_PREVIEW).map((squad) => (
                        <span
                          key={squad.name}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {squad.name}
                        </span>
                      ))}
                      {squadCount > MAX_SQUAD_PREVIEW && (
                        <span className="text-xs text-gray-400">
                          ...und {squadCount - MAX_SQUAD_PREVIEW} weitere
                        </span>
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

export default DurchgangSelection;
