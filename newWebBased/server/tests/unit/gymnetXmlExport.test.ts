import { buildGymNetResultsXml } from '../../src/utils/gymnetXmlExport';

describe('gymnetXmlExport', () => {
  it('builds GymNet XML with competitions, participants and discipline scores', () => {
    const xml = buildGymNetResultsXml([
      {
        competitionId: 12,
        competitionNumber: '101',
        competitionName: 'Gerätvierkampf w',
        genderMale: false,
        genderFemale: true,
        ageFrom: 10,
        ageTo: 12,
        participants: [
          {
            participantId: 77,
            firstName: 'Anna',
            lastName: 'Mustermann',
            birthDate: new Date('2014-04-30'),
            gender: 1,
            clubId: 9,
            clubName: 'TV Test',
            startNumber: 5,
            disciplines: [
              {
                disciplineId: 68,
                name: 'Stufenbarren',
                score: 12.345,
                position: 1
              }
            ]
          }
        ]
      }
    ]);

    expect(xml).toContain('<Wettkämpfe>');
    expect(xml).toContain('<waID>12</waID>');
    expect(xml).toContain('<waNr>101</waNr>');
    expect(xml).toContain('<perName>Mustermann</perName>');
    expect(xml).toContain('<perVorname>Anna</perVorname>');
    expect(xml).toContain('<perGeburt>30.04.2014</perGeburt>');
    expect(xml).toContain('<wedDisName>Stufenbarren</wedDisName>');
    expect(xml).toContain('<wedDisNr>270</wedDisNr>');
    expect(xml).toContain('<wtdPunkte>12.345</wtdPunkte>');
  });

  it('prefers base wedDisNr from discipline name when discipline ID differs across databases', () => {
    const xml = buildGymNetResultsXml([
      {
        competitionId: 1,
        competitionNumber: '1',
        competitionName: 'Test',
        genderMale: false,
        genderFemale: true,
        ageFrom: 0,
        ageTo: null,
        participants: [
          {
            participantId: 1,
            firstName: 'A',
            lastName: 'B',
            birthDate: null,
            gender: 1,
            clubId: null,
            clubName: '',
            startNumber: null,
            disciplines: [
              {
                disciplineId: 68,
                name: 'Stufenbarren',
                score: 10,
                position: 1
              }
            ]
          }
        ]
      }
    ]);

    expect(xml).toContain('<wedDisName>Stufenbarren</wedDisName>');
    expect(xml).toContain('<wedDisNr>270</wedDisNr>');
  });
});
