import type { Device, RotationDevice } from '../components/JuryPortal/JuryPortal.types';

export interface RotationSections {
  completed: RotationDevice[];
  current: RotationDevice | null;
  upcoming: RotationDevice[];
}

/** Keeps the header rotation limited to devices available in the selection step. */
export function filterRotationToAvailableDevices(
  rotation: RotationDevice[],
  availableDevices: Device[]
): RotationDevice[] {
  const availableIds = new Set(availableDevices.map(device => Number(device.disciplineId)));
  return rotation.filter(device => availableIds.has(Number(device.disciplineId)));
}

export function getRotationSections(
  rotation: RotationDevice[],
  currentDisciplineId: number | null,
  completedDisciplineIds: number[]
): RotationSections {
  const completedIds = new Set(completedDisciplineIds);
  const current = rotation.find(device => device.disciplineId === currentDisciplineId) ?? null;
  const completed = rotation.filter(device =>
    device.disciplineId !== currentDisciplineId && completedIds.has(device.disciplineId)
  );
  const upcoming = rotation.filter(device =>
    device.disciplineId !== currentDisciplineId && !completedIds.has(device.disciplineId)
  );

  return { completed, current, upcoming };
}

export function getNextDevice(rotation: RotationDevice[], disciplineId: number | null): RotationDevice | null {
  if (disciplineId === null) return null;
  const index = rotation.findIndex(d => d.disciplineId === disciplineId);
  return index === -1 ? null : rotation[index + 1] ?? null;
}
