import { buildSquadRotation } from '../../src/utils/squadRotation';

const row = (round: number | null, disciplineId: number, name = `D${disciplineId}`, extra: any = {}) => ({
  round,
  disciplineId,
  name,
  shortName: name.slice(0, 3),
  icon: null,
  ...extra,
});

describe('buildSquadRotation', () => {
  it('returns an empty list without rows', () => {
    expect(buildSquadRotation([])).toEqual([]);
  });

  it('orders the devices by rotation round', () => {
    const result = buildSquadRotation([row(3, 30), row(1, 10), row(2, 20)]);
    expect(result.map(d => d.disciplineId)).toEqual([10, 20, 30]);
    expect(result.map(d => d.round)).toEqual([1, 2, 3]);
  });

  it('keeps the first round of a device that appears more than once', () => {
    const result = buildSquadRotation([row(2, 10), row(1, 10), row(3, 20)]);
    expect(result.map(d => [d.round, d.disciplineId])).toEqual([[1, 10], [3, 20]]);
  });

  it('puts rows without a round last and keeps their given order', () => {
    const result = buildSquadRotation([row(null, 40), row(1, 10), row(null, 30)]);
    expect(result.map(d => d.disciplineId)).toEqual([10, 40, 30]);
  });

  it('exposes name, short name and icon', () => {
    const [device] = buildSquadRotation([row(1, 10, 'Boden', { shortName: 'BOD', icon: ':/icons/boden.png' })]);
    expect(device).toEqual({
      round: 1,
      disciplineId: 10,
      name: 'Boden',
      shortName: 'BOD',
      icon: ':/icons/boden.png',
    });
  });

  it('falls back to empty strings for missing names', () => {
    const [device] = buildSquadRotation([{ round: 1, disciplineId: 5, name: null, shortName: null, icon: null }]);
    expect(device.name).toBe('');
    expect(device.shortName).toBe('');
    expect(device.icon).toBeNull();
  });
});
