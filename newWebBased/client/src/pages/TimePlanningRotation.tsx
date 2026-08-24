import {
  useImperativeHandle,
  forwardRef,
} from "react";
import { useTranslation } from "react-i18next";
import { squadMatchesCompetition } from "./TimePlanning/rotationUtils";
import {
  useTimePlanningRotationModel,
} from "./useTimePlanningRotationModel";
import type {
  TimePlanningRotationProps,
  TimePlanningRotationRef,
} from "./TimePlanningRotation.types";

export type { Device, TimePlanningRotationProps, TimePlanningRotationRef, Squad } from "./TimePlanningRotation.types";

const LANE_CARD_ACTIVE_CLASS = "bg-blue-50 border-blue-500";
const LANE_CARD_DEFAULT_CLASS = "bg-white hover:border-gray-300";

const TimePlanningRotation = forwardRef<
  TimePlanningRotationRef,
  TimePlanningRotationProps
>(({ eventId: _eventId, squads, devices, competitions, onDataChange, selectedRound, onSelectedRoundChange }, ref) => {
  const { t } = useTranslation();
  const {
    activeSelectedRound,
    bahnen,
    competitionsByRound,
    currentRoundSquads,
    currentRoundUnassignedCompetitions,
    handleAddBahn,
    handleDragStart,
    handleDrop,
    loading,
    selectedLane,
    selectedLaneData,
    setActiveSelectedRound,
    setSelectedLane,
  } = useTimePlanningRotationModel({
    competitions,
    devices,
    eventId: _eventId,
    onDataChange,
    onSelectedRoundChange,
    selectedRound,
    squads,
  });

  // Expose addBahn function to parent via ref - Point 121
  useImperativeHandle(ref, () => ({
    addBahn: handleAddBahn,
  }));

  // Render Bahnen with squads (drag-and-drop)
  return (
    <div className="max-w-7xl mx-auto p-6">
      {competitionsByRound.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t('timePlanning.session')}:
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {competitionsByRound.map(({ round, competitions: roundComps }) => (
              <button
                key={round}
                onClick={() => setActiveSelectedRound(round)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeSelectedRound === round
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t('timePlanning.session')} {round}
                <span className="ml-2 text-xs opacity-75">
                  ({roundComps.length} {roundComps.length === 1 ? t('timePlanning.competitionSingle') : t('timePlanning.competitions')})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-[72vh] items-stretch">
        <div className="xl:col-span-1 flex flex-col min-h-[72vh]">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            {t('timePlanning.lanesTitle')} ({bahnen.length})
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {bahnen.length === 0 && (
              <div className="text-sm text-gray-500 p-3 bg-gray-50 border border-dashed rounded-lg">
                {t('timePlanning.noLanesYet')}
              </div>
            )}
            {bahnen.map((bahn) => {
              const laneParticipants = bahn.competitions.reduce(
                (sum, compWithSquads) => sum + compWithSquads.squads.reduce((inner, s) => inner + s.participantCount, 0),
                0,
              );

              return (
                <button
                  key={bahn.bahnNumber}
                  onClick={() => setSelectedLane(bahn.bahnNumber)}
                  className={`w-full text-left border rounded-lg p-4 transition-colors ${
                    selectedLane === bahn.bahnNumber
                      ? LANE_CARD_ACTIVE_CLASS
                      : LANE_CARD_DEFAULT_CLASS
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(bahn.bahnNumber)}
                >
                  <div className="font-semibold text-blue-900">{t('timePlanning.laneLabel')} {bahn.bahnNumber}</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 rounded px-2 py-2 text-gray-700">
                      <div className="text-[11px] text-gray-500">{t('timePlanning.competitions')}</div>
                      <div className="font-semibold text-gray-900">{bahn.competitions.length}</div>
                    </div>
                    <div className="bg-gray-50 rounded px-2 py-2 text-gray-700">
                      <div className="text-[11px] text-gray-500">{t('timePlanning.participants')}</div>
                      <div className="font-semibold text-gray-900">{laneParticipants}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="xl:col-span-1 flex flex-col min-h-[72vh]">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            {t('timePlanning.unassignedCompetitions')} ({currentRoundUnassignedCompetitions.length})
          </h3>
          <div
            className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[240px] border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(null)}
          >
            {currentRoundUnassignedCompetitions.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">
                {t('timePlanning.noUnassignedCompetitions')}
              </div>
            ) : (
              currentRoundUnassignedCompetitions.map((comp) => {
                const squadsForComp = currentRoundSquads.filter((s) => squadMatchesCompetition(s, comp.id));
                return (
                  <div
                    key={comp.id}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 cursor-move hover:border-blue-300"
                    draggable
                    onDragStart={() =>
                      handleDragStart(
                        { competition: comp, squads: squadsForComp },
                        null,
                      )
                    }
                  >
                    <div className="font-semibold text-gray-900 text-sm">{comp.name}</div>
                    <div className="mt-2 text-xs text-gray-600">
                      {squadsForComp.length} {squadsForComp.length === 1 ? t('timePlanning.squad') : t('timePlanning.squads')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="xl:col-span-1 flex flex-col min-h-[72vh]">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            {selectedLane
              ? `${t('timePlanning.laneLabel')} ${selectedLane}`
              : t('timePlanning.laneDetails')}
          </h3>
          <div
            className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[240px] border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(selectedLane ?? null)}
          >
            {!selectedLane && (
              <div className="text-sm text-gray-500 p-2">
                {t('timePlanning.selectLaneFirst')}
              </div>
            )}
            {selectedLaneData && selectedLaneData.competitions.length === 0 && (
              <div className="text-sm text-gray-500 p-2">
                {t('timePlanning.noCompetitionsOnLane')}
              </div>
            )}
            {selectedLaneData && (
              (() => {
                const bahn = selectedLaneData;
                const participantsOnLane = bahn.competitions.reduce(
                  (sum, compWithSquads) =>
                    sum + compWithSquads.squads.reduce((s, squad) => s + squad.participantCount, 0),
                  0
                );

                return (
                  <div
                    key={bahn.bahnNumber}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold text-blue-700">{t('timePlanning.laneLabel')} {bahn.bahnNumber}</div>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {bahn.competitions.length} {bahn.competitions.length === 1 ? t('timePlanning.competitionSingle') : t('timePlanning.competitions')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      {t('timePlanning.participants')}: {participantsOnLane}
                    </div>
                    <div className="space-y-2 min-h-[44px]">
                      {bahn.competitions.map((compWithSquads) => (
                        <div
                          key={compWithSquads.competition.id}
                          className="bg-blue-50 border border-blue-200 rounded p-3 cursor-move"
                          draggable
                          onDragStart={() => handleDragStart(compWithSquads, bahn.bahnNumber)}
                        >
                          <div className="font-medium text-blue-900 text-sm">{compWithSquads.competition.name}</div>
                          <div className="text-xs text-blue-700 mt-1">
                            {compWithSquads.squads.length} {compWithSquads.squads.length === 1 ? t('timePlanning.squad') : t('timePlanning.squads')}
                          </div>
                          {compWithSquads.squads.length > 0 && (
                            <div className="mt-2 text-xs text-gray-600">
                              {compWithSquads.squads
                                .map((s) => `${s.name} (${s.participantCount})`)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-blue-600 mb-4 font-medium">💾 Speichern...</div>
      )}

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>💡 Hinweis:</strong> Wettkämpfe werden per Drag & Drop zwischen Bahnen verschoben. 
          Alle Riegen eines Wettkampfs werden zusammen verschoben, da die Bahn-Zuordnung pro Wettkampf gespeichert wird.
          Änderungen werden automatisch gespeichert.
        </p>
      </div>
    </div>
  );
});

TimePlanningRotation.displayName = "TimePlanningRotation";

export default TimePlanningRotation;
