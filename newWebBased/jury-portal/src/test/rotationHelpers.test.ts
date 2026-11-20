import { describe, it, expect } from 'vitest';
import { filterRotationToAvailableDevices, getNextDevice } from '../utils/rotationHelpers';
import type { RotationDevice } from '../components/JuryPortal/JuryPortal.types';

const device = (disciplineId: number, name = `D${disciplineId}`, round: number | null = disciplineId): RotationDevice => ({
  round, disciplineId, name, shortName: name.slice(0, 3), icon: null,
});

const rotation = [device(1, 'Boden'), device(2, 'Pferd'), device(3, 'Ringe'), device(4, 'Sprung')];

describe('getNextDevice', () => {
  it('returns the device after the given one', () => {
    expect(getNextDevice(rotation, 1)?.name).toBe('Pferd');
    expect(getNextDevice(rotation, 3)?.name).toBe('Sprung');
  });

  it('returns null after the last device', () => {
    expect(getNextDevice(rotation, 4)).toBeNull();
  });

  it('returns null for an unknown or missing device and for an empty rotation', () => {
    expect(getNextDevice(rotation, 99)).toBeNull();
    expect(getNextDevice(rotation, null)).toBeNull();
    expect(getNextDevice([], 1)).toBeNull();
  });
});

describe('filterRotationToAvailableDevices', () => {
  it('keeps the rotation order while excluding devices unavailable in the selection step', () => {
    const available = [
      { id: 2, name: 'Pferd', disciplineId: 2, icon: '' },
      { id: 4, name: 'Sprung', disciplineId: 4, icon: '' },
    ];

    expect(filterRotationToAvailableDevices(rotation, available).map(item => item.disciplineId)).toEqual([2, 4]);
  });
});
