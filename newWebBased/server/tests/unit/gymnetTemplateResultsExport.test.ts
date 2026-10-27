import { mergeGymNetTemplateWithResults } from '../../src/utils/gymnetTemplateResultsExport';
import type { GymNetExportCompetition } from '../../src/utils/gymnetXmlExport';

describe('mergeGymNetTemplateWithResults', () => {
  const templateXml = `<?xml version="1.0" encoding="UTF-8"?>
<Wettkämpfe>
  <Wettkampf>
    <waNr>101</waNr>
    <waBezeichnung>WK weiblich 11-12</waBezeichnung>
    <Mannschaften>
      <Mannschaft>
        <etErfasst>0</etErfasst>
        <etPunkte>0,000</etPunkte>
        <etPlatzierung>0</etPlatzierung>
        <verKurzname>TV Test</verKurzname>
        <Teilnehmer>
          <TN>
            <perName>Muster</perName>
            <perVorname>Anna</perVorname>
            <perGeburt>14.03.2014</perGeburt>
            <verKurzname>TV Test</verKurzname>
          </TN>
        </Teilnehmer>
        <Disziplinen>
          <Disziplin>
            <wedDisName>Sprung w</wedDisName>
            <wtdWertung></wtdWertung>
            <wtdPunkte></wtdPunkte>
          </Disziplin>
          <Disziplin>
            <wedDisName>Boden w</wedDisName>
            <wtdWertung></wtdWertung>
            <wtdPunkte></wtdPunkte>
          </Disziplin>
        </Disziplinen>
      </Mannschaft>
    </Mannschaften>
  </Wettkampf>
</Wettkämpfe>`;

  it('writes scores into matching participant disciplines by competition number, participant, club and discipline name', async () => {
    const payload: GymNetExportCompetition[] = [
      {
        competitionId: 1,
        competitionNumber: '101',
        competitionName: 'WK weiblich 11-12',
        genderMale: false,
        genderFemale: true,
        ageFrom: 11,
        ageTo: 12,
        participants: [
          {
            participantId: 7,
            firstName: 'Anna',
            lastName: 'Muster',
            birthDate: new Date('2014-03-14'),
            gender: 1,
            clubId: 3,
            clubName: 'TV Test',
            startNumber: 12,
            disciplines: [
              { disciplineId: 1, name: 'Sprung w', score: 12.3, position: 1 },
              { disciplineId: 2, name: 'Boden w', score: 11.1119, position: 2 },
            ],
          },
        ],
      },
    ];

    const result = await mergeGymNetTemplateWithResults(templateXml, payload);

    expect(result.stats.competitionsMatched).toBe(1);
    expect(result.stats.participantsMatched).toBe(1);
    expect(result.stats.disciplineScoresWritten).toBe(2);
    expect(result.report.summary.competitionsUnmatched).toBe(0);
    expect(result.report.summary.participantsUnmatched).toBe(0);
    expect(result.report.summary.disciplinesUnmatched).toBe(0);
    expect(result.xml).toContain('<Mannschaft>');
    expect(result.xml).toContain('<etErfasst>1</etErfasst>');
    expect(result.xml).toContain('<etPunkte>23.412</etPunkte>');
    expect(result.xml).toContain('<etPlatzierung>1</etPlatzierung>');
    expect(result.xml).toContain('<wtdWertung>12.300</wtdWertung>');
    expect(result.xml).toContain('<wtdWertung>11.112</wtdWertung>');
    expect(result.xml).toContain('<wtdPunkte>12.300</wtdPunkte>');
    expect(result.xml).toContain('<wtdPunkte>11.112</wtdPunkte>');
  });

  it('keeps template unchanged for unmatched participants', async () => {
    const payload: GymNetExportCompetition[] = [
      {
        competitionId: 1,
        competitionNumber: '101',
        competitionName: 'WK weiblich 11-12',
        genderMale: false,
        genderFemale: true,
        ageFrom: 11,
        ageTo: 12,
        participants: [],
      },
    ];

    const result = await mergeGymNetTemplateWithResults(templateXml, payload);

    expect(result.stats.participantsMatched).toBe(0);
    expect(result.stats.disciplineScoresWritten).toBe(0);
    expect(result.report.summary.participantsUnmatched).toBe(1);
    expect(result.report.unmatchedParticipants[0]).toContain('101');
    expect(result.report.unmatchedParticipants[0]).toContain('Anna Muster');
    expect(result.xml).toContain('<wtdPunkte/>');
  });

  it('maps AK and absent participants to team-level etErfasst values', async () => {
    const akResult = await mergeGymNetTemplateWithResults(templateXml, [
      {
        competitionId: 1,
        competitionNumber: '101',
        competitionName: 'WK weiblich 11-12',
        genderMale: false,
        genderFemale: true,
        ageFrom: 11,
        ageTo: 12,
        participants: [
          {
            participantId: 7,
            firstName: 'Anna',
            lastName: 'Muster',
            birthDate: new Date('2014-03-14'),
            gender: 1,
            clubId: 3,
            clubName: 'TV Test',
            startNumber: 12,
            isOutOfCompetition: true,
            disciplines: [
              { disciplineId: 1, name: 'Sprung w', score: 12.3, position: 1 },
            ],
          },
        ],
      },
    ]);

    expect(akResult.xml).toContain('<etErfasst>2</etErfasst>');
    expect(akResult.xml).toContain('<etPlatzierung>0</etPlatzierung>');

    const absentResult = await mergeGymNetTemplateWithResults(templateXml, [
      {
        competitionId: 1,
        competitionNumber: '101',
        competitionName: 'WK weiblich 11-12',
        genderMale: false,
        genderFemale: true,
        ageFrom: 11,
        ageTo: 12,
        participants: [
          {
            participantId: 7,
            firstName: 'Anna',
            lastName: 'Muster',
            birthDate: new Date('2014-03-14'),
            gender: 1,
            clubId: 3,
            clubName: 'TV Test',
            startNumber: 12,
            isAbsent: true,
            disciplines: [
              { disciplineId: 1, name: 'Sprung w', score: null, position: 1 },
            ],
          },
        ],
      },
    ]);

    expect(absentResult.xml).toContain('<etErfasst>3</etErfasst>');
    expect(absentResult.xml).toContain('<etPlatzierung>0</etPlatzierung>');
  });

  describe('discipline matching', () => {
    const templateDiscipline = (id: number, nr: number, name: string, position: number) => `
      <Disziplin><wedDisID>${id}</wedDisID><wedDisNr>${nr}</wedDisNr><wedDisName>${name}</wedDisName><wtdPosition>${position}</wtdPosition><wtdWertung></wtdWertung><wtdPunkte></wtdPunkte></Disziplin>`;

    // Same order and names as the GymNet P-level export of the Bestenkämpfe event
    const template = `<?xml version="1.0" encoding="UTF-8"?>
<Wettkämpfe><Wettkampf><waNr>101</waNr><waBezeichnung>WK</waBezeichnung><Mannschaften>
  <Mannschaft><etErfasst>0</etErfasst><etPunkte></etPunkte><etPlatzierung>0</etPlatzierung>
    <Teilnehmer><TN><perName>Muster</perName><perVorname>Anna</perVorname><perGeburt>14.03.2014</perGeburt></TN></Teilnehmer>
    <Disziplinen>${templateDiscipline(1731, 160, 'Sprung w. P1-P9', 1)}${templateDiscipline(1732, 170, 'Stu.-Barren w. P1-P9', 2)}${templateDiscipline(1734, 190, 'Boden w. P1-P9', 3)}${templateDiscipline(1733, 180, 'Sch.-Balken w. P1-P9', 4)}</Disziplinen>
  </Mannschaft></Mannschaften></Wettkampf></Wettkämpfe>`;

    // TurnFix order differs from the template: Boden is the 4th device here
    const payload = (disciplines: Array<[number, string, number]>): GymNetExportCompetition[] => [{
      competitionId: 1,
      competitionNumber: '101',
      competitionName: 'WK',
      genderMale: false,
      genderFemale: true,
      ageFrom: 1,
      ageTo: 6,
      participants: [{
        participantId: 1,
        firstName: 'Anna',
        lastName: 'Muster',
        birthDate: new Date('2014-03-14'),
        gender: 1,
        clubId: 3,
        clubName: 'TV Test',
        startNumber: 1,
        disciplines: disciplines.map(([disciplineId, name, score], index) => ({ disciplineId, name, score, position: index + 1 })),
      }],
    }];

    const scoreOf = (xml: string, name: string) =>
      xml.match(new RegExp(`<wedDisName>${name.replace(/[.]/g, '\\.')}</wedDisName>[\\s\\S]*?<wtdWertung>([^<]*)</wtdWertung>`))?.[1];

    it('assigns "Sch.-Balken" to Balken instead of the device at the same position', async () => {
      const result = await mergeGymNetTemplateWithResults(template, payload([
        [71, 'Sprung', 12.95], [68, 'Stufenbarren', 12], [73, 'Balken', 10.5], [74, 'Boden', 12.3],
      ]));

      expect(scoreOf(result.xml, 'Sch.-Balken w. P1-P9')).toBe('10.500');
      expect(scoreOf(result.xml, 'Boden w. P1-P9')).toBe('12.300');
      expect(scoreOf(result.xml, 'Sprung w. P1-P9')).toBe('12.950');
      expect(scoreOf(result.xml, 'Stu.-Barren w. P1-P9')).toBe('12.000');
      expect(result.report.unmatchedDisciplines).toEqual([]);
    });

    it('assigns the apparatus by name for the other common abbreviations', async () => {
      const result = await mergeGymNetTemplateWithResults(template, payload([
        [71, 'Sprung w', 1], [68, 'Reck/StuBa.', 2], [73, 'Schwebebalken', 3], [74, 'Boden w', 4],
      ]));

      expect(scoreOf(result.xml, 'Sch.-Balken w. P1-P9')).toBe('3.000');
      expect(scoreOf(result.xml, 'Stu.-Barren w. P1-P9')).toBe('2.000');
    });

    it('does not guess when two devices have the same apparatus', async () => {
      const result = await mergeGymNetTemplateWithResults(template, payload([
        [73, 'Balken', 5], [75, 'Schwebebalken Kür', 6], [71, 'Sprung', 7], [74, 'Boden', 8],
      ]));

      expect(scoreOf(result.xml, 'Sch.-Balken w. P1-P9')).not.toBe('8.000');
    });
  });

  describe('placements', () => {
    const turner = (id: number, firstName: string, scores: number[]) => ({
      participantId: id,
      firstName,
      lastName: 'Muster',
      birthDate: new Date('2014-03-14'),
      gender: 1,
      clubId: 3,
      clubName: 'TV Test',
      startNumber: id,
      disciplines: scores.map((score, index) => ({ disciplineId: index + 1, name: `Gerät ${index + 1}`, score, position: index + 1 })),
    });

    const templateFor = (names: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<Wettkämpfe><Wettkampf><waNr>101</waNr><waBezeichnung>WK</waBezeichnung><Mannschaften>${names.map(name => `
  <Mannschaft><etErfasst>0</etErfasst><etPunkte>0,000</etPunkte><etPlatzierung>0</etPlatzierung><verKurzname>TV Test</verKurzname>
    <Teilnehmer><TN><perName>Muster</perName><perVorname>${name}</perVorname><perGeburt>14.03.2014</perGeburt><verKurzname>TV Test</verKurzname></TN></Teilnehmer>
    <Disziplinen/>
  </Mannschaft>`).join('')}</Mannschaften></Wettkampf></Wettkämpfe>`;

    const competition = (participants: any[], extra: object = {}): GymNetExportCompetition => ({
      competitionId: 1,
      competitionNumber: '101',
      competitionName: 'WK',
      genderMale: false,
      genderFemale: true,
      ageFrom: 11,
      ageTo: 12,
      participants,
      ...extra,
    });

    const placementsByName = (xml: string) =>
      [...xml.matchAll(/<etPlatzierung>(\d+)<\/etPlatzierung>[\s\S]*?<perVorname>(\w+)<\/perVorname>/g)]
        .reduce<Record<string, string>>((acc, match) => ({ ...acc, [match[2]]: match[1] }), {});

    it('gives equal totals the same placement despite floating-point summation order', async () => {
      const result = await mergeGymNetTemplateWithResults(templateFor(['Anna', 'Berta', 'Clara']), [competition([
        turner(1, 'Anna', [13.35, 14.15, 12.1, 12.6]),
        turner(2, 'Berta', [14.3, 10.5, 14, 13.4]),
        turner(3, 'Clara', [5, 5, 5, 5]),
      ])]);

      expect(placementsByName(result.xml)).toEqual({ Anna: '1', Berta: '1', Clara: '3' });
    });

    it('applies the sort direction and the Streichwertung of the competition', async () => {
      const ascending = await mergeGymNetTemplateWithResults(templateFor(['Anna', 'Berta']), [competition(
        [turner(1, 'Anna', [12]), turner(2, 'Berta', [9])],
        { sortAscending: true },
      )]);
      expect(placementsByName(ascending.xml)).toEqual({ Anna: '2', Berta: '1' });

      const dropping = await mergeGymNetTemplateWithResults(templateFor(['Anna', 'Berta']), [competition(
        [turner(1, 'Anna', [10, 10, 1]), turner(2, 'Berta', [9, 9, 9])],
        { dropWorstScore: true, dropCount: 1 },
      )]);
      expect(placementsByName(dropping.xml)).toEqual({ Anna: '1', Berta: '2' });
      expect(dropping.xml).toContain('<etPunkte>20.000</etPunkte>');
    });

    it('writes the raw score as Wertung and the effective points as Punkte', async () => {
      const withPoints = (id: number, firstName: string, raw: number, points: number) => ({
        ...turner(id, firstName, [raw]),
        disciplines: [{ disciplineId: 1, name: 'Gerät 1', score: raw, points, position: 1 }],
      });
      const template = templateFor(['Anna', 'Berta']).replace(/<Disziplinen\/>/g, '<Disziplinen><Disziplin><wedDisName>Gerät 1</wedDisName><wtdWertung></wtdWertung><wtdPunkte></wtdPunkte></Disziplin></Disziplinen>');
      const result = await mergeGymNetTemplateWithResults(template, [competition([withPoints(1, 'Anna', 6, 14), withPoints(2, 'Berta', 9, 11)])]);

      expect(result.xml).toContain('<wtdWertung>6.000</wtdWertung>');
      expect(result.xml).toContain('<wtdPunkte>14.000</wtdPunkte>');
      expect(result.xml).toContain('<etPunkte>14.000</etPunkte>');
      expect(placementsByName(result.xml)).toEqual({ Anna: '1', Berta: '2' });
    });
  });
});
