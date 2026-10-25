import { describe, it, expect } from 'vitest';
import { getRotationProgress, getNextDevice } from '../utils/rotationHelpers';
import type { RotationDevice } from '../components/JuryPortal/JuryPortal.types';

const device = (disciplineId: number, name = `D${disciplineId}`, round: number | null = disciplineId): RotationDevice => ({
  round, disciplineId, name, shortName: name.slice(0, 3), icon: null,
});

const rotation = [device(1, 'Boden'), device(2, 'Pferd'), device(3, 'Ringe'), device(4, 'Sprung')];

describe('getRotationProgress', () => {
  it('marks devices before the current one as done, the current one, the next one and the rest as upcoming', () => {
    const progress = getRotationProgress(rotation, 2);
    expect(progress.map(p => [p.device.disciplineId, p.state])).toEqual([
      [1, 'done'], [2, 'current'], [3, 'next'], [4, 'upcoming'],
    ]);
  });

  it('has no done device at the first device', () => {
    expect(getRotationProgress(rotation, 1).map(p => p.state)).toEqual(['current', 'next', 'upcoming', 'upcoming']);
  });

  it('has no next device at the last device', () => {
    expect(getRotationProgress(rotation, 4).map(p => p.state)).toEqual(['done', 'done', 'done', 'current']);
  });

  it('marks everything as upcoming when the current device is not part of the rotation', () => {
    expect(getRotationProgress(rotation, 99).map(p => p.state)).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('marks everything as upcoming without a current device', () => {
    expect(getRotationProgress(rotation, null).every(p => p.state === 'upcoming')).toBe(true);
  });

  it('returns an empty list for an empty rotation', () => {
    expect(getRotationProgress([], 1)).toEqual([]);
  });

  it('keeps the rotation order', () => {
    expect(getRotationProgress(rotation, 2).map(p => p.device.name)).toEqual(['Boden', 'Pferd', 'Ringe', 'Sprung']);
  });
});

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
