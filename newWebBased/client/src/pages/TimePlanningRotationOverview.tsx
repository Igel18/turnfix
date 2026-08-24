import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { buildBahnenForRound, generateRoundRobinSchedule } from "./useTimePlanningRotationModel";
import type { TimePlanningRotationProps } from "./TimePlanningRotation.types";

const ROTATION_ROW_EVEN_CLASS = "bg-white";
const ROTATION_ROW_ODD_CLASS = "bg-gray-50";

type TimePlanningRotationOverviewProps = Pick<
  TimePlanningRotationProps,
  "competitions" | "devices" | "selectedRound" | "squads"
>;

export default function TimePlanningRotationOverview({
  competitions,
  devices,
  selectedRound,
  squads,
}: TimePlanningRotationOverviewProps) {
  const { t } = useTranslation();
  const activeRound = selectedRound ?? 1;

  const bahnen = useMemo(
    () => buildBahnenForRound(competitions, squads, activeRound),
    [competitions, squads, activeRound],
  );

  return (
    <div className="space-y-4">
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