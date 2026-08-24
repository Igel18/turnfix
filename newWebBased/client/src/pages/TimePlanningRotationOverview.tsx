import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildBahnenForRound, generateRoundRobinSchedule } from "./useTimePlanningRotationModel";
import type { TimePlanningRotationProps } from "./TimePlanningRotation.types";
import type { Bahn } from "./TimePlanningRotation.types";

const ROTATION_ROW_EVEN_CLASS = "bg-white";
const ROTATION_ROW_ODD_CLASS = "bg-gray-50";

type TimePlanningRotationOverviewProps = Pick<
  TimePlanningRotationProps,
  "competitions" | "devices" | "selectedRound" | "squads" | "onSelectedRoundChange"
>;

export default function TimePlanningRotationOverview({
  competitions,
  devices,
  onSelectedRoundChange,
  selectedRound,
  squads,
}: TimePlanningRotationOverviewProps) {
  const { t } = useTranslation();
  const [internalSelectedRound, setInternalSelectedRound] = useState<number>(selectedRound ?? 1);

  useEffect(() => {
    if (selectedRound !== undefined) {
      setInternalSelectedRound(selectedRound);
    }
  }, [selectedRound]);

  const activeRound = selectedRound ?? internalSelectedRound;

  const setActiveRound = (round: number) => {
    if (onSelectedRoundChange) {
      onSelectedRoundChange(round);
      return;
    }
    setInternalSelectedRound(round);
  };

  const competitionsByRound = useMemo(() => {
    const grouped = new Map<number, TimePlanningRotationProps["competitions"]>();
    competitions.forEach((comp) => {
      const round = comp.round || 1;
      if (!grouped.has(round)) {
        grouped.set(round, []);
      }
      grouped.get(round)!.push(comp);
    });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, comps]) => ({ round, competitions: comps }));
  }, [competitions]);

  useEffect(() => {
    if (competitionsByRound.length === 0) {
      return;
    }

    const hasActiveRound = competitionsByRound.some(({ round }) => round === activeRound);
    if (hasActiveRound) {
      return;
    }

    setActiveRound(competitionsByRound[0].round);
  }, [competitionsByRound, activeRound]);

  const bahnenInRound = useMemo(
    () => buildBahnenForRound(competitions, squads, activeRound),
    [competitions, squads, activeRound],
  );

  const allEventLaneNumbers = useMemo(() => {
    const lanes = Array.from(
      new Set(
        competitions
          .map((comp) => comp.int_bahn)
          .filter((lane): lane is number => typeof lane === "number" && lane > 0),
      ),
    ).sort((a, b) => a - b);

    return lanes.length > 0 ? lanes : [1];
  }, [competitions]);

  const bahnen = useMemo(() => {
    const byNumber = new Map<number, Bahn>(bahnenInRound.map((bahn) => [bahn.bahnNumber, bahn]));
    return allEventLaneNumbers.map((bahnNumber) => byNumber.get(bahnNumber) || { bahnNumber, competitions: [] });
  }, [allEventLaneNumbers, bahnenInRound]);

  return (
    <div className="space-y-4">
      {competitionsByRound.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              {t("timePlanning.session")}:
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {competitionsByRound.map(({ round, competitions: roundComps }) => (
              <button
                key={round}
                onClick={() => setActiveRound(round)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeRound === round
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {t("timePlanning.session")} {round}
                <span className="ml-2 text-xs opacity-75">
                  ({roundComps.length} {roundComps.length === 1 ? t("timePlanning.competitionSingle") : t("timePlanning.competitions")})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">
          {t("timePlanning.rotationMatrix")}
        </h3>
        <div className="text-sm text-gray-500">
          {t("timePlanning.session")} {activeRound}
        </div>
      </div>

      {bahnen.length === 0 ? (
        <div className="text-center text-gray-400 italic py-8">
          {t("timePlanning.noLanesYet")}
        </div>
      ) : (
        <div className="space-y-6">
          {bahnen.map((bahn) => {
            const allSquadsOnBahn = bahn.competitions.flatMap((compWithSquads) => compWithSquads.squads);

            if (allSquadsOnBahn.length === 0) {
              return (
                <div
                  key={bahn.bahnNumber}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-6"
                >
                  <h4 className="text-lg font-semibold text-blue-700 mb-3">
                    {t("timePlanning.laneLabel")} {bahn.bahnNumber}
                  </h4>
                  <p className="text-sm text-gray-500 italic">
                    {t("timePlanning.noCompetitionsOnLane")}
                  </p>
                </div>
              );
            }

            const schedule =
              !devices || !Array.isArray(devices) || devices.length === 0
                ? []
                : generateRoundRobinSchedule(allSquadsOnBahn, devices);

            return (
              <div
                key={bahn.bahnNumber}
                className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm"
              >
                <div className="bg-blue-600 px-4 py-3">
                  <h4 className="text-lg font-semibold text-white">
                    {t("timePlanning.laneLabel")} {bahn.bahnNumber}
                    <span className="ml-3 text-sm font-normal text-blue-100">
                      ({bahn.competitions.length} {bahn.competitions.length === 1 ? t("timePlanning.competitionSingle") : t("timePlanning.competitions")}, {allSquadsOnBahn.length} {allSquadsOnBahn.length === 1 ? t("timePlanning.squad") : t("timePlanning.squads")})
                    </span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-center">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-3 font-semibold text-gray-700">
                          {t("timePlanning.rotations")}
                        </th>
                        {allSquadsOnBahn.map((squad) => (
                          <th
                            key={squad.name}
                            className="border border-gray-300 px-4 py-3 font-semibold text-gray-700"
                          >
                            {squad.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.length === 0 ? (
                        <tr>
                          <td
                            colSpan={allSquadsOnBahn.length + 1}
                            className="border border-gray-300 px-4 py-3 text-center text-gray-500 italic"
                          >
                            {t("timePlanning.noStartDeviceSelected")}
                          </td>
                        </tr>
                      ) : (
                        schedule.map((round, idx) => (
                          <tr
                            key={idx}
                            className={idx % 2 === 0 ? ROTATION_ROW_EVEN_CLASS : ROTATION_ROW_ODD_CLASS}
                          >
                            <td className="border border-gray-300 px-4 py-3 font-semibold text-blue-700">
                              {t("timePlanning.rotationNumber")} {round[0]?.rotation}
                            </td>
                            {round.map((entry) => (
                              <td
                                key={entry.squad}
                                className="border border-gray-300 px-4 py-3 text-gray-900"
                              >
                                {entry.device}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}