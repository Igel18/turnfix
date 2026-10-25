import type { RotationDevice } from '../components/JuryPortal/JuryPortal.types';

export type RotationState = 'done' | 'current' | 'next' | 'upcoming';

export interface RotationProgressItem {
  device: RotationDevice;
  state: RotationState;
}

/** Marks each device of the squad's rotation as done, current, next or upcoming. */
export function getRotationProgress(
  rotation: RotationDevice[],
  currentDisciplineId: number | null
): RotationProgressItem[] {
  const currentIndex = currentDisciplineId === null
    ? -1
    : rotation.findIndex(d => d.disciplineId === currentDisciplineId);

  return rotation.map((device, index) => {
    let state: RotationState = 'upcoming';
    if (currentIndex !== -1) {
      if (index < currentIndex) state = 'done';
      else if (index === currentIndex) state = 'current';
      else if (index === currentIndex + 1) state = 'next';
    }
    return { device, state };
  });
}

export function getNextDevice(rotation: RotationDevice[], disciplineId: number | null): RotationDevice | null {
  if (disciplineId === null) return null;
  const index = rotation.findIndex(d => d.disciplineId === disciplineId);
  return index === -1 ? null : rotation[index + 1] ?? null;
}
