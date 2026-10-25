export interface SquadRotationRow {
  round: number | null;
  disciplineId: number;
  name: string | null;
  shortName: string | null;
  icon: string | null;
}

export interface SquadRotationDevice {
  round: number | null;
  disciplineId: number;
  name: string;
  shortName: string;
  icon: string | null;
}

// Devices of a squad in rotation order; a device counts once, at its earliest round.
export function buildSquadRotation(rows: SquadRotationRow[]): SquadRotationDevice[] {
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const roundA = a.row.round ?? Number.MAX_SAFE_INTEGER;
    const roundB = b.row.round ?? Number.MAX_SAFE_INTEGER;
    return roundA - roundB || a.index - b.index;
  });

  const seen = new Set<number>();
  const devices: SquadRotationDevice[] = [];
  for (const { row } of indexed) {
    if (seen.has(row.disciplineId)) continue;
    seen.add(row.disciplineId);
    devices.push({
      round: row.round,
      disciplineId: row.disciplineId,
      name: row.name ?? '',
      shortName: row.shortName ?? '',
      icon: row.icon,
    });
  }
  return devices;
}
