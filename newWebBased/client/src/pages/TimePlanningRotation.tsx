import React from 'react';

interface Squad {
  name: string;
  participantCount: number;
}

interface Device {
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

// Example data (replace with real data from props or API)
const exampleSquads: Squad[] = [
  { name: 'RiegeRot', participantCount: 6 },
  { name: 'RiegeGelb', participantCount: 6 },
  { name: 'RiegeBlau', participantCount: 6 },
];
const exampleDevices: Device[] = [
  { name: 'Boden' },
  { name: 'Sprung' },
  { name: 'Barren' },
];

const rotationSchedule = generateRoundRobinSchedule(exampleSquads, exampleDevices);

const TimePlanningRotation: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-xl font-bold mb-4">Rotation Übersicht (Round Robin)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border text-center">
          <thead>
            <tr>
              <th className="border px-4 py-2">Rotation</th>
              {exampleSquads.map((squad) => (
                <th key={squad.name} className="border px-4 py-2">{squad.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rotationSchedule.map((round, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2 font-semibold">{round[0].rotation}</td>
                {round.map((entry) => (
                  <td key={entry.squad} className="border px-4 py-2">{entry.device}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-gray-500 text-sm">
        <p>Jede Riege startet an einem anderen Gerät und rotiert nach jeder Runde weiter.</p>
      </div>
    </div>
  );
};

export default TimePlanningRotation;
