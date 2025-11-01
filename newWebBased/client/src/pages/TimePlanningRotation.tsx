import React, { useMemo, useState, useEffect } from 'react';
import { apiPut } from '../utils/api';


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
  round: number; // session/durchgang
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

// Olympic apparatus order for reference
const OLYMPIC_ORDER = {
  male: [
    { name: 'Boden', icon: '🤸' },
    { name: 'Pauschenpferd', icon: '🐎' },
    { name: 'Ringe', icon: '⭕' },
    { name: 'Sprung', icon: '🏃' },
    { name: 'Barren', icon: '📏' },
    { name: 'Reck', icon: '🏗️' }
  ],
  female: [
    { name: 'Sprung', icon: '🏃' },
    { name: 'Stufenbarren', icon: '📐' },
    { name: 'Schwebebalken', icon: '⚖️' },
    { name: 'Boden', icon: '🤸' }
  ]
};





const TimePlanningRotation: React.FC<TimePlanningRotationProps> = ({ eventId: _eventId, squads, devices, competitions }) => {
  const [bahnen, setBahnen] = useState<Bahn[]>([]);
  const [draggedSquad, setDraggedSquad] = useState<{ squad: Squad; fromBahn: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOlympicOrder, setShowOlympicOrder] = useState(false);
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [selectedRound, setSelectedRound] = useState<number>(1); // Currently selected Durchgang

  // Group competitions by round (Durchgang)
  const competitionsByRound = useMemo(() => {
    const grouped = new Map<number, Competition[]>();
    competitions.forEach(comp => {
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
    return competitions.filter(comp => (comp.round || 1) === selectedRound);
  }, [competitions, selectedRound]);

  // Get squads for the currently selected round only
  const currentRoundSquads = useMemo(() => {
    const compIds = new Set(currentRoundCompetitions.map(c => c.id));
    return squads.filter(s => compIds.has(s.competitionId));
  }, [squads, currentRoundCompetitions]);

  // Map squads to their current Bahn using competitions (only for selected round)
  useEffect(() => {
    const comps = currentRoundCompetitions;
    const sqs = currentRoundSquads;
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
  }, [currentRoundCompetitions, currentRoundSquads]);

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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rotation & Bahn-Zuordnung</h2>
          <p className="text-sm text-gray-600 mt-1">Riegen per Drag & Drop zwischen Bahnen verschieben</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"
            onClick={handleAddBahn}
            title="Neue Bahn hinzufügen"
          >
            <span className="text-xl">+</span>
            Neue Bahn
          </button>
          <button
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 font-medium"
            onClick={() => setShowOlympicOrder(!showOlympicOrder)}
          >
            {showOlympicOrder ? '🔼' : '🔽'} Olympische Reihenfolge
          </button>
        </div>
      </div>

      {/* Durchgang Selection Tabs */}
      {competitionsByRound.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Durchgang auswählen:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {competitionsByRound.map(({ round, competitions: roundComps }) => (
              <button
                key={round}
                onClick={() => setSelectedRound(round)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRound === round
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Durchgang {round}
                <span className="ml-2 text-xs opacity-75">
                  ({roundComps.length} {roundComps.length === 1 ? 'Wettkampf' : 'Wettkämpfe'})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Olympic Order Reference (collapsible) */}
      {showOlympicOrder && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-blue-900">📘 Olympische Gerätereihenfolge</h3>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1 rounded ${selectedGender === 'male' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setSelectedGender('male')}
              >
                Männer
              </button>
              <button
                className={`px-3 py-1 rounded ${selectedGender === 'female' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setSelectedGender('female')}
              >
                Frauen
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {OLYMPIC_ORDER[selectedGender].map((apparatus, idx) => (
              <div key={apparatus.name} className="flex items-center gap-2">
                <span className="text-2xl">{apparatus.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{idx + 1}. {apparatus.name}</div>
                </div>
                {idx < OLYMPIC_ORDER[selectedGender].length - 1 && (
                  <span className="text-gray-400 ml-2">→</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-3">
            Diese Reihenfolge sollte bei der Planung und Durchführung von Wettkämpfen beachtet werden, um einen reibungslosen Ablauf zu gewährleisten.
          </p>
        </div>
      )}

      {loading && <div className="text-blue-600 mb-4 font-medium">💾 Speichern...</div>}
      
      {/* Current Round Info */}
      <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-900">Aktiver Durchgang:</span>
          <span className="text-blue-700">Durchgang {selectedRound}</span>
          <span className="text-xs text-blue-600">
            ({currentRoundSquads.length} {currentRoundSquads.length === 1 ? 'Riege' : 'Riegen'})
          </span>
        </div>
      </div>

      {/* Bahnen with Drag & Drop */}
      <div className="flex gap-6 mb-6 overflow-x-auto pb-2">
        {bahnen.length === 0 && <div className="text-gray-400 italic">Keine Bahnen vorhanden. Klicke "Neue Bahn" um zu starten.</div>}
        {bahnen.map(bahn => (
          <div
            key={bahn.bahnNumber}
            className="flex-shrink-0 w-64 bg-gray-50 border-2 border-gray-200 rounded-lg p-4"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(bahn.bahnNumber)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-blue-700 text-lg">Bahn {bahn.bahnNumber}</span>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">{bahn.squads.length} Riegen</span>
            </div>
            <div className="space-y-2 min-h-[60px]">
              {bahn.squads.filter(squad => squad.name !== 'Bahn').map(squad => (
                <div
                  key={squad.name}
                  className="bg-white border-2 border-gray-300 rounded-lg px-3 py-2 shadow-sm cursor-move hover:bg-blue-50 hover:border-blue-400 transition-all"
                  draggable
                  onDragStart={() => handleDragStart(squad, bahn.bahnNumber)}
                >
                  <div className="font-medium text-gray-900">{squad.name}</div>
                  <div className="text-xs text-gray-500">{squad.participantCount} Teilnehmer</div>
                </div>
              ))}
              {bahn.squads.filter(squad => squad.name !== 'Bahn').length === 0 && (
                <div className="text-xs text-gray-400 italic text-center py-4">Keine Riegen<br/>Ziehe Riegen hierher</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rotation Overview Table (Round Robin) */}
      <div className="overflow-x-auto mt-8">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">🔄 Rotation Übersicht (Round Robin)</h3>
        <table className="min-w-full border border-gray-300 text-center bg-white shadow-sm rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-3 font-semibold text-gray-700">Rotation</th>
              {squads.map((squad) => (
                <th key={squad.name} className="border border-gray-300 px-4 py-3 font-semibold text-gray-700">{squad.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {useMemo(() => generateRoundRobinSchedule(squads, devices), [squads, devices]).map((round, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-300 px-4 py-3 font-semibold text-blue-700">Rotation {round[0]?.rotation}</td>
                {round.map((entry) => (
                  <td key={entry.squad} className="border border-gray-300 px-4 py-3 text-gray-900">{entry.device}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>💡 Hinweis:</strong> Jede Riege startet an einem anderen Gerät und rotiert nach jeder Runde weiter. 
          Riegen können per Drag & Drop zwischen Bahnen verschoben werden. Änderungen werden automatisch gespeichert.
        </p>
      </div>
    </div>
  );
};

export default TimePlanningRotation;
