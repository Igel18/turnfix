import {
  useMemo,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
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
>(({ eventId: _eventId, squads, devices, competitions, onDataChange }, ref) => {
  const [bahnen, setBahnen] = useState<Bahn[]>([]);
  const [draggedCompetition, setDraggedCompetition] = useState<{
    competitionWithSquads: CompetitionWithSquads;
    fromBahn: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<number>(1); // Currently selected Durchgang

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

  // Get competitions for the currently selected round only
  const currentRoundCompetitions = useMemo(() => {
    return competitions.filter((comp) => (comp.round || 1) === selectedRound);
  }, [competitions, selectedRound]);

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
      selectedRound,
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
    
    // Group competitions by their int_bahn
    const bahnMap = new Map<number, CompetitionWithSquads[]>();
    
    comps.forEach((comp) => {
      const bahn = comp.int_bahn || 1;
      
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
    
    // Build Bahn array
    const bahnenArr: Bahn[] = Array.from(bahnMap.entries()).map(
      ([bahnNumber, competitions]) => ({ bahnNumber, competitions }),
    );
    
    // Sort by bahnNumber
    bahnenArr.sort((a, b) => a.bahnNumber - b.bahnNumber);
    setBahnen(bahnenArr);
  }, [currentRoundCompetitions, currentRoundSquads]);

  // Add a new Bahn (just adds a new Bahn number, not persisted until a competition is assigned)
  const handleAddBahn = () => {
    setBahnen((prev) => {
      const maxBahn =
        prev.length > 0 ? Math.max(...prev.map((b) => b.bahnNumber)) : 1;
      return [...prev, { bahnNumber: maxBahn + 1, competitions: [] }];
    });
  };

  // Expose addBahn function to parent via ref - Point 121
  useImperativeHandle(ref, () => ({
    addBahn: handleAddBahn,
  }));

  // Drag handlers
  const handleDragStart = (competitionWithSquads: CompetitionWithSquads, fromBahn: number) => {
    setDraggedCompetition({ competitionWithSquads, fromBahn });
  };
  
  const handleDrop = async (toBahn: number) => {
    if (!draggedCompetition) return;
    
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
      {/* Header - Point 121: "Neue Bahn" button moved to TimePlanning.tsx header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Rotation & Bahn-Zuordnung
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Wettkämpfe per Drag & Drop zwischen Bahnen verschieben
          </p>
        </div>
      </div>

      {/* Durchgang Selection Tabs */}
      {competitionsByRound.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">
              Durchgang auswählen:
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {competitionsByRound.map(({ round, competitions: roundComps }) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRound === round
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Durchgang {round}
                <span className="ml-2 text-xs opacity-75">
                  ({roundComps.length}{" "}
                  {roundComps.length === 1 ? "Wettkampf" : "Wettkämpfe"})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-blue-600 mb-4 font-medium">💾 Speichern...</div>
      )}

      {/* Current Round Info */}
      <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-900">
            Aktiver Durchgang:
          </span>
          <span className="text-blue-700">Durchgang {selectedRound}</span>
          <span className="text-xs text-blue-600">
            ({currentRoundSquads.length}{" "}
            {currentRoundSquads.length === 1 ? "Riege" : "Riegen"})
          </span>
        </div>
      </div>

      {/* Bahnen with Drag & Drop - Competition-based */}
      <div className="flex gap-6 mb-6 overflow-x-auto pb-2">
        {bahnen.length === 0 && (
          <div className="text-gray-400 italic">
            Keine Bahnen vorhanden. Klicke "Neue Bahn" um zu starten.
          </div>
        )}
        {bahnen.map((bahn) => (
          <div
            key={bahn.bahnNumber}
            className="flex-shrink-0 w-80 bg-gray-50 border-2 border-gray-200 rounded-lg p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(bahn.bahnNumber)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-blue-700 text-lg">
                Bahn {bahn.bahnNumber}
              </span>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                {bahn.competitions.length} {bahn.competitions.length === 1 ? 'Wettkampf' : 'Wettkämpfe'}
              </span>
            </div>
            <div className="space-y-3 min-h-[60px]">
              {bahn.competitions.map((compWithSquads) => (
                <div
                  key={compWithSquads.competition.id}
                  className="bg-white border-2 border-blue-300 rounded-lg shadow-sm cursor-move hover:bg-blue-50 hover:border-blue-500 hover:shadow-md transition-all"
                  draggable
                  onDragStart={() => handleDragStart(compWithSquads, bahn.bahnNumber)}
                >
                  {/* Competition Header */}
                  <div className="bg-blue-100 px-3 py-2 rounded-t-lg border-b border-blue-200">
                    <div className="font-semibold text-blue-900 text-sm">
                      📋 {compWithSquads.competition.name}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {compWithSquads.squads.length} {compWithSquads.squads.length === 1 ? 'Riege' : 'Riegen'}
                    </div>
                  </div>
                  
                  {/* Squads List */}
                  <div className="px-3 py-2 space-y-1">
                    {compWithSquads.squads.map((squad) => (
                      <div
                        key={squad.name}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-gray-700">🏃 {squad.name}</span>
                        <span className="text-xs text-gray-500">
                          {squad.participantCount} TN
                        </span>
                      </div>
                    ))}
                    {compWithSquads.squads.length === 0 && (
                      <div className="text-xs text-gray-400 italic text-center py-1">
                        Keine Riegen zugeordnet
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {bahn.competitions.length === 0 && (
                <div className="text-xs text-gray-400 italic text-center py-4">
                  Keine Wettkämpfe
                  <br />
                  Ziehe Wettkämpfe hierher
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
