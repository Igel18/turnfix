import React, { useMemo, useState } from 'react';


export interface Squad {
  name: string;
  participantCount: number;
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


interface TimePlanningRotationProps {
  squads: Squad[];
  devices: Device[];
}


interface Bahn {
  id: number;
  name: string;
  squads: Squad[];
}

let bahnIdCounter = 1;

const TimePlanningRotation: React.FC<TimePlanningRotationProps> = ({ squads, devices }) => {
  // Bahnen state: each Bahn has a name and a list of squads
  const [bahnen, setBahnen] = useState<Bahn[]>([
    { id: bahnIdCounter++, name: 'Bahn 1', squads: squads }
  ]);
  const [draggedSquad, setDraggedSquad] = useState<{ squad: Squad; fromBahnId: number } | null>(null);

  // Add a new Bahn
  const handleAddBahn = () => {
    setBahnen(prev => ([...prev, { id: bahnIdCounter++, name: `Bahn ${prev.length + 1}`, squads: [] }]));
  };

  // Drag handlers
  const handleDragStart = (squad: Squad, fromBahnId: number) => {
    setDraggedSquad({ squad, fromBahnId });
  };
  const handleDrop = (toBahnId: number) => {
    if (!draggedSquad) return;
    setBahnen(prev => prev.map(bahn => {
      // Remove from old Bahn
      if (bahn.id === draggedSquad.fromBahnId) {
        return { ...bahn, squads: bahn.squads.filter(s => s.name !== draggedSquad.squad.name) };
      }
      // Add to new Bahn
      if (bahn.id === toBahnId) {
        // Prevent duplicates
        if (!bahn.squads.some(s => s.name === draggedSquad.squad.name)) {
          return { ...bahn, squads: [...bahn.squads, draggedSquad.squad] };
        }
      }
      return bahn;
    }));
    setDraggedSquad(null);
  };

  // Render Bahnen with squads (drag-and-drop)
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Rotation & Bahn-Zuordnung</h2>
      <div className="flex gap-6 mb-6">
        {bahnen.map(bahn => (
          <div
            key={bahn.id}
            className="flex-1 bg-gray-50 border rounded-lg p-4 min-w-[220px]"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(bahn.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-blue-700">{bahn.name}</span>
              <span className="text-xs text-gray-400">{bahn.squads.length} Riegen</span>
            </div>
            <div className="space-y-2 min-h-[40px]">
              {bahn.squads.map(squad => (
                <div
                  key={squad.name}
                  className="bg-white border rounded px-3 py-2 shadow-sm cursor-move hover:bg-blue-50"
                  draggable
                  onDragStart={() => handleDragStart(squad, bahn.id)}
                >
                  {squad.name} <span className="text-xs text-gray-500">({squad.participantCount} TN)</span>
                </div>
              ))}
              {bahn.squads.length === 0 && (
                <div className="text-xs text-gray-400 italic">Keine Riegen</div>
              )}
            </div>
          </div>
        ))}
        <button
          className="h-12 w-12 flex items-center justify-center bg-blue-100 border-2 border-blue-400 rounded-lg text-blue-700 text-2xl font-bold hover:bg-blue-200"
          onClick={handleAddBahn}
          title="Neue Bahn hinzufügen"
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
