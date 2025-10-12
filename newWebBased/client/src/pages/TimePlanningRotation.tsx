import React, { useMemo, useState, useEffect } from 'react';
import { apiGet, apiPut } from '../utils/api';


export interface Squad {
  name: string;
  participantCount: number;
  competitionId: number;
}


export interface Device {
  name: string;
}

interface RotationEntry {
  squad: string;
  device: string;
  rotation: number;
}

function generateRoundRobinSchedule(squads: Squad[], devices: Device[]): RotationEntry[][] {
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
  round: number;
  participantCount: number;
  int_bahn?: number | null;
}

interface TimePlanningRotationProps {
  eventId: string | number;
  squads: Squad[];
  devices: Device[];
  competitions: Competition[];
}



interface Bahn {
  bahnNumber: number;
  squads: Squad[];
}





const TimePlanningRotation: React.FC<TimePlanningRotationProps> = ({ eventId, squads, devices, competitions }) => {
  const [bahnen, setBahnen] = useState<Bahn[]>([]);
  const [draggedSquad, setDraggedSquad] = useState<{ squad: Squad; fromBahn: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Map squads to their current Bahn using competitions
  useEffect(() => {
    const comps = Array.isArray(competitions) ? competitions : [];
    const sqs = Array.isArray(squads) ? squads : [];
    if (!comps.length && !sqs.length) {
      setBahnen([]);
      return;
    }
    // Group squads by their competition's int_bahn using competitionId
    const bahnMap = new Map<number, Squad[]>();
    comps.forEach(comp => {
      const bahn = comp.int_bahn || 1;
      const squad = sqs.find(s => s.competitionId === comp.id);
      if (squad) {
        if (!bahnMap.has(bahn)) bahnMap.set(bahn, []);
        bahnMap.get(bahn)!.push(squad);
      }
    });
    // If a squad is not assigned, put it in Bahn 1 by default
    sqs.forEach(squad => {
      const assigned = Array.from(bahnMap.values()).some(list => list.some(s => s.competitionId === squad.competitionId));
      if (!assigned) {
        if (!bahnMap.has(1)) bahnMap.set(1, []);
        bahnMap.get(1)!.push(squad);
      }
    });
    // Build Bahn array
    const bahnenArr: Bahn[] = Array.from(bahnMap.entries()).map(([bahnNumber, squads]) => ({ bahnNumber, squads }));
    // Sort by bahnNumber
    bahnenArr.sort((a, b) => a.bahnNumber - b.bahnNumber);
    setBahnen(bahnenArr);
  }, [competitions, squads]);

  // Add a new Bahn (just adds a new Bahn number, not persisted until a squad is assigned)
  const handleAddBahn = () => {
    setBahnen(prev => {
      const maxBahn = prev.length > 0 ? Math.max(...prev.map(b => b.bahnNumber)) : 1;
      return [...prev, { bahnNumber: maxBahn + 1, squads: [] }];
    });
  };

  // Drag handlers
  const handleDragStart = (squad: Squad, fromBahn: number) => {
    setDraggedSquad({ squad, fromBahn });
  };
  const handleDrop = async (toBahn: number) => {
    if (!draggedSquad) return;
    if (!Array.isArray(competitions)) {
      // eslint-disable-next-line no-console
      console.error('[Bahn-Assignment] competitions is undefined or not an array:', competitions);
      alert('Fehler: Wettbewerbsdaten (competitions) fehlen!');
      setDraggedSquad(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
  // Find the competition for this squad using competitionId
  const comp = competitions.find(c => c.id === draggedSquad.squad.competitionId);
      if (!comp) {
        // Debug log if not found
        // eslint-disable-next-line no-console
        console.error('[Bahn-Assignment] No competition found for squad', draggedSquad.squad.name, {
          squad: draggedSquad.squad,
          squadCompetitionId: draggedSquad.squad.competitionId,
          allCompetitionIds: competitions.map(c => c.id),
          allCompetitionNames: competitions.map(c => c.name)
        });
        alert('Keine Competition für diese Riege gefunden!');
        return;
      }
      // Debug log API payload
      // eslint-disable-next-line no-console
      console.log('[Bahn-Assignment] Assigning squad', draggedSquad.squad.name, 'to Bahn', toBahn, 'for competition', comp);
      await apiPut(`/time-planning/competition/${comp.id}/bahn`, { bahn: toBahn });
      // Update UI state optimistically
      setBahnen(prev => prev.map(bahn => {
        // Remove from old Bahn
        if (bahn.bahnNumber === draggedSquad.fromBahn) {
          return { ...bahn, squads: bahn.squads.filter(s => s.name !== draggedSquad.squad.name) };
        }
        // Add to new Bahn
        if (bahn.bahnNumber === toBahn) {
          if (!bahn.squads.some(s => s.name === draggedSquad.squad.name)) {
            return { ...bahn, squads: [...bahn.squads, draggedSquad.squad] };
          }
        }
        return bahn;
      }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Bahn-Assignment] Error during API call:', e);
      alert('Fehler beim Speichern der Bahn-Zuordnung!');
    } finally {
      setDraggedSquad(null);
      setLoading(false);
    }
  };


  // Render Bahnen with squads (drag-and-drop)
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Rotation & Bahn-Zuordnung</h2>
      {loading && <div className="text-blue-600 mb-2">Speichern...</div>}
      <div className="flex gap-6 mb-6">
  {bahnen.length === 0 && <div className="text-gray-400 italic">Keine Bahnen vorhanden.</div>}
  {bahnen.map(bahn => (
          <div
            key={bahn.bahnNumber}
            className="flex-1 bg-gray-50 border rounded-lg p-4 min-w-[220px]"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(bahn.bahnNumber)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-700">Bahn {bahn.bahnNumber}</span>
              <span className="text-xs text-gray-400">{bahn.squads.length} Riegen</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {bahn.squads.filter(squad => squad.name !== 'Bahn').map(squad => (
                <div
                  key={squad.name}
                  className="bg-white border rounded px-3 py-2 shadow-sm cursor-move hover:bg-blue-50"
                  draggable
                  onDragStart={() => handleDragStart(squad, bahn.bahnNumber)}
                >
                  {squad.name} <span className="text-xs text-gray-500">({squad.participantCount} TN)</span>
                </div>
              ))}
              {bahn.squads.filter(squad => squad.name !== 'Bahn').length === 0 && (
                <div className="text-xs text-gray-400 italic">Keine Riegen</div>
              )}
            </div>
          </div>
        ))}
        <button
          className="h-12 w-12 flex items-center justify-center bg-blue-100 border-2 border-blue-400 rounded-lg text-blue-700 text-2xl font-bold hover:bg-blue-200"
          onClick={handleAddBahn}
          title="Neue Bahn hinzufügen"
          draggable={false}
          onDragStart={e => e.preventDefault()}
          onDrop={e => e.preventDefault()}
        >
          +
        </button>
      </div>

      <div className="overflow-x-auto mt-8">
        <h3 className="text-lg font-semibold mb-2">Rotation Übersicht (Round Robin)</h3>
        <table className="min-w-full border text-center">
          <thead>
            <tr>
              <th className="border px-4 py-2">Rotation</th>
              {squads.map((squad) => (
                <th key={squad.name} className="border px-4 py-2">{squad.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {useMemo(() => generateRoundRobinSchedule(squads, devices), [squads, devices]).map((round, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2 font-semibold">{round[0]?.rotation}</td>
                {round.map((entry) => (
                  <td key={entry.squad} className="border px-4 py-2">{entry.device}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-gray-500 text-sm">
        <p>Jede Riege startet an einem anderen Gerät und rotiert nach jeder Runde weiter. Riegen können per Drag & Drop zwischen Bahnen verschoben werden.</p>
      </div>
    </div>
  );
};

export default TimePlanningRotation;
