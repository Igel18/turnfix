import { mapCompetitionToScheduleEntry } from '../../src/utils/timePlanningCompetition';

describe('mapCompetitionToScheduleEntry', () => {
  it('formats times and adjusts warm-up to 30 minutes before the start', () => {
    const result = mapCompetitionToScheduleEntry({
      int_wettkaempfeid: 12,
      var_name: 'Gerätturnen',
      var_nummer: 'A1',
      int_durchgang: 2,
      int_bahn: 3,
      tim_startzeit: '7:05:00',
      tim_einturnen: '08:15:00',
      tfx_veranstaltungen: { dat_von: new Date('2026-10-07T12:00:00.000Z') },
      _count: { tfx_wertungen: 8 },
    }, 4);

    expect(result).toEqual({
      id: 12,
      name: 'Gerätturnen',
      number: 'A1',
      round: 2,
      int_bahn: 3,
      startTime: '07:05',
      startDate: '2026-10-07',
      warmupTime: '06:35',
      warmupDate: '2026-10-07',
      disciplineCount: 4,
      participantCount: 8,
    });
  });

  it('keeps an earlier warm-up and uses nulls when times or event date are missing', () => {
    const withEarlierWarmup = mapCompetitionToScheduleEntry({
      int_wettkaempfeid: 5,
      var_name: null,
      var_nummer: null,
      int_durchgang: null,
      int_bahn: null,
      tim_startzeit: '09:00',
      tim_einturnen: '08:00',
      tfx_veranstaltungen: null,
      _count: { tfx_wertungen: 0 },
    }, 0);
    const withoutTimes = mapCompetitionToScheduleEntry({
      int_wettkaempfeid: 6,
      var_name: null,
      var_nummer: null,
      int_durchgang: null,
      int_bahn: null,
      tim_startzeit: null,
      tim_einturnen: 'invalid',
      tfx_veranstaltungen: null,
      _count: { tfx_wertungen: 0 },
    }, 0);

    expect(withEarlierWarmup.warmupTime).toBe('08:00');
    expect(withoutTimes.startTime).toBeNull();
    expect(withoutTimes.warmupTime).toBeNull();
    expect(withoutTimes.startDate).toBeNull();
    expect(withoutTimes.round).toBe(1);
  });
});