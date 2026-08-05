import { mergeGymNetTemplateWithResults } from '../../src/utils/gymnetTemplateResultsExport';
import type { GymNetExportCompetition } from '../../src/utils/gymnetXmlExport';

describe('mergeGymNetTemplateWithResults', () => {
  const templateXml = `<?xml version="1.0" encoding="UTF-8"?>
<Wettkämpfe>
  <Wettkampf>
    <waNr>101</waNr>
    <waBezeichnung>WK weiblich 11-12</waBezeichnung>
    <Teilnehmer>
      <TN>
        <perName>Muster</perName>
        <perVorname>Anna</perVorname>
        <perGeburt>14.03.2014</perGeburt>
        <verKurzname>TV Test</verKurzname>
        <Disziplinen>
          <Disziplin>
            <wedDisName>Sprung w</wedDisName>
            <wtdPunkte></wtdPunkte>
          </Disziplin>
          <Disziplin>
            <wedDisName>Boden w</wedDisName>
            <wtdPunkte></wtdPunkte>
          </Disziplin>
        </Disziplinen>
      </TN>
    </Teilnehmer>
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
});
