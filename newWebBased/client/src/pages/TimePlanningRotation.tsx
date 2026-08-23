import {
  useMemo,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useTranslation } from "react-i18next";
import { apiPut, invalidateCache } from "../utils/api";
import { squadBelongsToRound, squadMatchesCompetition } from "./TimePlanning/rotationUtils";

export interface Squad {
  name: string;
  participantCount: number;
  competitionId?: number;
  competitionIds?: number[];
}

export interface Device {
  name: string;
}

interface RotationEntry {
  squad: string;
  device: string;
  rotation: number;
}

interface CompetitionWithSquads {
  competition: Competition;
  squads: Squad[];
}

function generateRoundRobinSchedule(
  squads: Squad[],
  devices: Device[],
): RotationEntry[][] {
  // Safety checks
  if (!squads || !Array.isArray(squads) || squads.length === 0) {
    console.warn('[generateRoundRobinSchedule] Invalid squads:', squads);
    return [];
  }
  if (!devices || !Array.isArray(devices) || devices.length === 0) {
    console.warn('[generateRoundRobinSchedule] Invalid devices:', devices);
    return [];
  }

  const numSquads = squads.length;
  const numDevices = devices.length;
  const rotations = numDevices;
  const schedule: RotationEntry[][] = [];

  for (let rotation = 0; rotation < rotations; rotation++) {
    const round: RotationEntry[] = [];
    for (let squadIdx = 0; squadIdx < numSquads; squadIdx++) {
      const deviceIdx = (squadIdx + rotation) % numDevices;
      round.push({
        squad: squads[squadIdx].name,
        device: devices[deviceIdx].name,
        rotation: rotation + 1,
      });
    }
    schedule.push(round);
  }
  return schedule;
}

interface Competition {
  id: number;
  name: string;
  round: number; // session/durchgang
  participantCount: number;
  int_bahn?: number | null;
}

interface TimePlanningRotationProps {
  eventId: string | number;
  squads: Squad[];
  devices: Device[];
  competitions: Competition[];
  onDataChange?: () => void; // Callback to refetch data after Bahn assignment
  selectedRound?: number;
  onSelectedRoundChange?: (round: number) => void;
}

interface Bahn {
  bahnNumber: number;
  competitions: CompetitionWithSquads[]; // Changed from squads to competitions with their squads
}

// Ref interface for parent component to call functions
export interface TimePlanningRotationRef {
  addBahn: () => void;
}

const TimePlanningRotation = forwardRef<
  TimePlanningRotationRef,
  TimePlanningRotationProps
>(({ eventId: _eventId, squads, devices, competitions, onDataChange, selectedRound, onSelectedRoundChange }, ref) => {
  const { t } = useTranslation();
  const [bahnen, setBahnen] = useState<Bahn[]>([]);
  const [manualBahnenByRound, setManualBahnenByRound] = useState<Record<number, number[]>>({});
  const [selectedLane, setSelectedLane] = useState<number | null>(null);
  const [draggedCompetition, setDraggedCompetition] = useState<{
    competitionWithSquads: CompetitionWithSquads;
    fromBahn: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalSelectedRound, setInternalSelectedRound] = useState<number>(1);

  const activeSelectedRound = selectedRound ?? internalSelectedRound;

  const setActiveSelectedRound = (round: number) => {
    if (onSelectedRoundChange) {
      onSelectedRoundChange(round);
      return;
    }
    setInternalSelectedRound(round);
  };

  // Group competitions by round (Durchgang)
  const competitionsByRound = useMemo(() => {
    const grouped = new Map<number, Competition[]>();
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

  // Keep selected round stable and valid after data reloads.
  useEffect(() => {
    if (competitionsByRound.length === 0) {
      return;
    }

    const hasActiveRound = competitionsByRound.some(({ round }) => round === activeSelectedRound);
    if (hasActiveRound) {
      return;
    }

    const fallbackRound = competitionsByRound[0].round;
    setActiveSelectedRound(fallbackRound);
  }, [competitionsByRound, activeSelectedRound]);

  // Get competitions for the currently selected round only
  const currentRoundCompetitions = useMemo(() => {
    return competitions.filter((comp) => (comp.round || 1) === activeSelectedRound);
  }, [competitions, activeSelectedRound]);

  const currentRoundUnassignedCompetitions = useMemo(() => {
    return currentRoundCompetitions.filter((comp) => !comp.int_bahn || comp.int_bahn <= 0);
  }, [currentRoundCompetitions]);

  // Get squads for the currently selected round
  // A squad belongs to a round if its competition belongs to that round
  const currentRoundSquads = useMemo(() => {
    const compIds = new Set(currentRoundCompetitions.map((c) => c.id));
    // Include squads that have a competition in this round
    return squads.filter((s) => squadBelongsToRound(s, compIds));
  }, [squads, currentRoundCompetitions]);

  // Map competitions to their current Bahn (only for selected round)
  useEffect(() => {
    const comps = currentRoundCompetitions;
    const sqs = currentRoundSquads;
    
    console.log('🔍 TimePlanningRotation DEBUG:', {
      selectedRound: activeSelectedRound,
      totalCompetitions: competitions.length,
      currentRoundCompetitions: comps.length,
      totalSquads: squads.length,
      currentRoundSquads: sqs.length,
      competitionsWithBahn: comps.filter(c => c.int_bahn).length,
      squadsWithCompetition: sqs.filter(s => (s.competitionId && s.competitionId > 0) || (Array.isArray(s.competitionIds) && s.competitionIds.length > 0)).length,
      squadsWithValidCompetition: sqs.filter(s => (s.competitionId && s.competitionId > 0) || (Array.isArray(s.competitionIds) && s.competitionIds.some(id => id > 0))).length,
      squadsWithNoCompetition: sqs.filter(s => (!s.competitionId || s.competitionId <= 0) && (!Array.isArray(s.competitionIds) || s.competitionIds.length === 0)).length,
      squadNames: sqs.map(s => s.name),
      competitionNames: comps.map(c => c.name),
      squadCompetitionMapping: sqs.map(s => ({ squad: s.name, competitionId: s.competitionId, competitionIds: s.competitionIds, participants: s.participantCount }))
    });
    
    if (!comps.length) {
      setBahnen([]);
      return;
    }
    
    // Group competitions by their int_bahn. Unassigned competitions are shown in dedicated middle column.
    const bahnMap = new Map<number, CompetitionWithSquads[]>();
    
    comps.forEach((comp) => {
      const bahn = comp.int_bahn;
      if (!bahn || bahn <= 0) {
        return;
      }
      
      // Find ALL squads for this competition
      const squadsForComp = sqs.filter((s) => squadMatchesCompetition(s, comp.id));
      
      console.log(`🔍 Competition ${comp.id} "${comp.name}":`, {
        bahn,
        squadsFound: squadsForComp.length,
        squads: squadsForComp.map(s => ({ name: s.name, participants: s.participantCount, competitionId: s.competitionId, competitionIds: s.competitionIds }))
      });
      
      const competitionWithSquads: CompetitionWithSquads = {
        competition: comp,
        squads: squadsForComp
      };
      
      if (!bahnMap.has(bahn)) {
        bahnMap.set(bahn, []);
      }
      bahnMap.get(bahn)!.push(competitionWithSquads);
    });
    
    const manualBahnen = manualBahnenByRound[activeSelectedRound] || [];

    // Build Bahn array and keep manually added (empty) lanes visible.
    const computedLaneNumbers = new Set<number>([
      ...Array.from(bahnMap.keys()),
      ...manualBahnen,
    ]);
    if (computedLaneNumbers.size === 0) {
      computedLaneNumbers.add(1);
    }

    const bahnenArr: Bahn[] = Array.from(computedLaneNumbers).map((bahnNumber) => ({
      bahnNumber,
      competitions: bahnMap.get(bahnNumber) || [],
    }));
    
    // Sort by bahnNumber
    bahnenArr.sort((a, b) => a.bahnNumber - b.bahnNumber);
    setBahnen(bahnenArr);
  }, [currentRoundCompetitions, currentRoundSquads, manualBahnenByRound, activeSelectedRound]);

  useEffect(() => {
    if (bahnen.length === 0) {
      setSelectedLane(null);
      return;
    }

    if (selectedLane === null || !bahnen.some((b) => b.bahnNumber === selectedLane)) {
      setSelectedLane(bahnen[0].bahnNumber);
    }
  }, [bahnen, selectedLane]);

  // Add a new Bahn (just adds a new Bahn number, not persisted until a competition is assigned)
  const handleAddBahn = () => {
    const currentMaxBahn =
      bahnen.length > 0 ? Math.max(...bahnen.map((b) => b.bahnNumber)) : 1;
    const nextBahn = currentMaxBahn + 1;
    setManualBahnenByRound((prev) => {
      const roundLanes = prev[activeSelectedRound] || [];
      if (roundLanes.includes(nextBahn)) {
        return prev;
      }
      return {
        ...prev,
        [activeSelectedRound]: [...roundLanes, nextBahn],
      };
    });
    setSelectedLane(nextBahn);
  };

  // Expose addBahn function to parent via ref - Point 121
  useImperativeHandle(ref, () => ({
    addBahn: handleAddBahn,
  }));

  // Drag handlers
  const handleDragStart = (competitionWithSquads: CompetitionWithSquads, fromBahn: number | null) => {
    setDraggedCompetition({ competitionWithSquads, fromBahn });
  };
  
  const handleDrop = async (toBahn: number | null) => {
    if (!draggedCompetition) return;

    const roundBeforeDrop = activeSelectedRound;
    
    setLoading(true);
    try {
      const comp = draggedCompetition.competitionWithSquads.competition;
      
      console.log(
        "[Bahn-Assignment] Assigning competition",
        comp.name,
        "with",
        draggedCompetition.competitionWithSquads.squads.length,
        "squads to Bahn",
        toBahn
      );

      const currentLane = comp.int_bahn ?? null;
      if (currentLane === toBahn) {
        setDraggedCompetition(null);
        return;
      }
      
      await apiPut(`/time-planning/competition/${comp.id}/bahn`, {
        bahn: toBahn,
      });
      
      console.log('✅ Bahn assignment saved successfully');
      
      // Invalidate cache to force fresh data load
      invalidateCache('/time-planning');
      
      // Trigger data reload in parent component
      // The useEffect will then rebuild bahnen based on fresh data
      if (onDataChange) {
        await onDataChange(); // Wait for data to reload
        // Keep the currently active Durchgang stable even if parent data refresh causes remount/reset.
        setActiveSelectedRound(roundBeforeDrop);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[Bahn-Assignment] Error during API call:", e);
      alert("Fehler beim Speichern der Bahn-Zuordnung!");
    } finally {
      setDraggedCompetition(null);
      setLoading(false);
    }
  };

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
                      ? "bg-blue-50 border-blue-500"
                      : "bg-white hover:border-gray-300"
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
            onDrop={() => handleDrop(selectedLane)}
          >
            {!selectedLane && (
              <div className="text-sm text-gray-500 p-2">
                {t('timePlanning.selectLaneFirst')}
              </div>
            )}
            {selectedLane && bahnen.find((b) => b.bahnNumber === selectedLane)?.competitions.length === 0 && (
              <div className="text-sm text-gray-500 p-2">
                {t('timePlanning.noCompetitionsOnLane')}
              </div>
            )}
            {bahnen
              .filter((b) => b.bahnNumber === selectedLane)
              .map((bahn) => {
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
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-blue-600 mb-4 font-medium">💾 Speichern...</div>
      )}

      {/* Rotation Overview Tables - Point 121: One table per Bahn */}
      <div className="space-y-8 mt-8">
        <h3 className="text-xl font-semibold text-gray-900">
          🔄 Rotation Übersicht (Round Robin)
        </h3>

        {bahnen.length === 0 ? (
          <div className="text-center text-gray-400 italic py-8">
            Keine Bahnen vorhanden. Klicke "Neue Bahn" im Header um zu starten.
          </div>
        ) : (
          bahnen.map((bahn) => {
            // Collect all squads from all competitions on this Bahn
            const allSquadsOnBahn: Squad[] = [];
            bahn.competitions.forEach((compWithSquads) => {
              allSquadsOnBahn.push(...compWithSquads.squads);
            });

            if (allSquadsOnBahn.length === 0) {
              return (
                <div
                  key={bahn.bahnNumber}
                  className="bg-gray-50 border border-gray-200 rounded-lg p-6"
                >
                  <h4 className="text-lg font-semibold text-blue-700 mb-3">
                    Bahn {bahn.bahnNumber}
                  </h4>
                  <p className="text-sm text-gray-500 italic">
                    Keine Wettkämpfe zugeordnet. Ziehe Wettkämpfe per Drag & Drop auf
                    diese Bahn.
                  </p>
                </div>
              );
            }

            // Generate schedule outside of JSX to avoid hooks issues
            const schedule = (!devices || !Array.isArray(devices) || devices.length === 0)
              ? []
              : generateRoundRobinSchedule(allSquadsOnBahn, devices);

            return (
              <div
                key={bahn.bahnNumber}
                className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm"
              >
                <div className="bg-blue-600 px-4 py-3">
                  <h4 className="text-lg font-semibold text-white">
                    Bahn {bahn.bahnNumber}
                    <span className="ml-3 text-sm font-normal text-blue-100">
                      ({bahn.competitions.length}{" "}
                      {bahn.competitions.length === 1 ? "Wettkampf" : "Wettkämpfe"},{" "}
                      {allSquadsOnBahn.length}{" "}
                      {allSquadsOnBahn.length === 1 ? "Riege" : "Riegen"})
                    </span>
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-center">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border border-gray-300 px-4 py-3 font-semibold text-gray-700">
                          Rotation
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
                            Keine Geräte verfügbar. Bitte wähle einen
                            Wettkampf mit Disziplinen aus.
                          </td>
                        </tr>
                      ) : (
                        schedule.map((round, idx) => (
                          <tr
                            key={idx}
                            className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <td className="border border-gray-300 px-4 py-3 font-semibold text-blue-700">
                              Rotation {round[0]?.rotation}
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
          })
        )}
      </div>

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
