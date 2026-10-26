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
    expect(xml).toContain('<wtdWertung>12.345</wtdWertung>');
    expect(xml).toContain('<wtdPunkte>12.345</wtdPunkte>');
    expect(xml).toContain('<etPunkte>12.345</etPunkte>');
    expect(xml).toContain('<etPlatzierung>1</etPlatzierung>');
    expect(xml).toContain('<etErfasst>1</etErfasst>');
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

  it('computes ranking from total score when rank is not provided', () => {
    const xml = buildGymNetResultsXml([
      {
        competitionId: 2,
        competitionNumber: '102',
        competitionName: 'Rangtest',
        genderMale: true,
        genderFemale: false,
        ageFrom: 12,
        ageTo: 14,
        participants: [
          {
            participantId: 1,
            firstName: 'Max',
            lastName: 'A',
            birthDate: null,
            gender: 0,
            clubId: null,
            clubName: '',
            startNumber: null,
            disciplines: [
              { disciplineId: 1, name: 'Boden', score: 11.2, position: 1 },
              { disciplineId: 2, name: 'Sprung', score: 11.1, position: 2 },
            ],
          },
          {
            participantId: 2,
            firstName: 'Tom',
            lastName: 'B',
            birthDate: null,
            gender: 0,
            clubId: null,
            clubName: '',
            startNumber: null,
            disciplines: [
              { disciplineId: 1, name: 'Boden', score: 10.0, position: 1 },
              { disciplineId: 2, name: 'Sprung', score: 10.5, position: 2 },
            ],
          },
        ],
      },
    ]);

    expect(xml).toContain('<etPunkte>22.300</etPunkte>');
    expect(xml).toContain('<etPunkte>20.500</etPunkte>');
    expect(xml).toContain('<etPlatzierung>1</etPlatzierung>');
    expect(xml).toContain('<etPlatzierung>2</etPlatzierung>');
  });

  it('maps AK and absent participants to GymNet etErfasst semantics', () => {
    const xml = buildGymNetResultsXml([
      {
        competitionId: 3,
        competitionNumber: '103',
        competitionName: 'Status-Test',
        genderMale: false,
        genderFemale: true,
        ageFrom: 18,
        ageTo: null,
        participants: [
          {
            participantId: 1,
            firstName: 'AK',
            lastName: 'Teilnehmerin',
            birthDate: null,
            gender: 1,
            clubId: null,
            clubName: '',
            startNumber: null,
            isOutOfCompetition: true,
            disciplines: [
              { disciplineId: 68, name: 'Stufenbarren', score: 9.5, position: 1 },
            ],
          },
          {
            participantId: 2,
            firstName: 'NA',
            lastName: 'Teilnehmerin',
            birthDate: null,
            gender: 1,
            clubId: null,
            clubName: '',
            startNumber: null,
            isAbsent: true,
            disciplines: [
              { disciplineId: 68, name: 'Stufenbarren', score: null, position: 1 },
            ],
          },
        ],
      },
    ]);

    expect(xml).toContain('<etErfasst>2</etErfasst>');
    expect(xml).toContain('<etPunkte>9.500</etPunkte>');
    expect(xml).toContain('<etPlatzierung>0</etPlatzierung>');
    expect(xml).toContain('<etErfasst>3</etErfasst>');
  });

  const participantWithScores = (participantId: number, scores: number[]) => ({
    participantId,
    firstName: `P${participantId}`,
    lastName: 'T',
    birthDate: null,
    gender: 1,
    clubId: null,
    clubName: '',
    startNumber: null,
    disciplines: scores.map((score, index) => ({ disciplineId: index + 1, name: `D${index + 1}`, score, position: index + 1 })),
  });

  const competitionWith = (participants: any[], extra: object = {}) => ({
    competitionId: 4,
    competitionNumber: '104',
    competitionName: 'Gleichstand',
    genderMale: false,
    genderFemale: true,
    ageFrom: 7,
    ageTo: 8,
    participants,
    ...extra,
  });

  const placements = (xml: string) =>
    [...xml.matchAll(/<perID>(\d+)<\/perID>[\s\S]*?<etPlatzierung>(\d+)<\/etPlatzierung>/g)]
      .reduce<Record<string, string>>((acc, match) => ({ ...acc, [match[1]]: match[2] }), {});

  it('gives equal totals the same placement despite floating-point summation order', () => {
    const xml = buildGymNetResultsXml([competitionWith([
      participantWithScores(11, [13.35, 14.15, 12.1, 12.6]),
      participantWithScores(12, [14.3, 10.5, 14, 13.4]),
      participantWithScores(14, [13.05, 13.7, 10.7, 14]),
      participantWithScores(15, [14.2, 12.7, 12.7, 11.85]),
    ])]);

    expect(placements(xml)).toEqual({ 11: '1', 12: '1', 14: '3', 15: '3' });
  });

  it('applies the sort direction and the Streichwertung of the competition', () => {
    const ascending = buildGymNetResultsXml([competitionWith(
      [participantWithScores(1, [12]), participantWithScores(2, [9])],
      { sortAscending: true },
    )]);
    expect(placements(ascending)).toEqual({ 1: '2', 2: '1' });

    const dropping = buildGymNetResultsXml([competitionWith(
      [participantWithScores(1, [10, 10, 1]), participantWithScores(2, [9, 9, 9])],
      { dropWorstScore: true, dropCount: 1 },
    )]);
    expect(placements(dropping)).toEqual({ 1: '1', 2: '2' });
    expect(dropping).toContain('<etPunkte>20.000</etPunkte>');
  });
});
