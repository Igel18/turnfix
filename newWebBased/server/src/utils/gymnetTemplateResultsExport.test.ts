import { mergeGymNetTemplateWithResults } from './gymnetTemplateResultsExport';
import type { GymNetExportCompetition } from './gymnetXmlExport';

describe('gymnetTemplateResultsExport', () => {
  it('matches participants and writes scores for Mannschaft XML structure', async () => {
    const templateXml = `<?xml version="1.0" encoding="utf-8"?>
<Wettkämpfe>
  <Wettkampf>
    <waNr>0001</waNr>
    <waBezeichnung>Gerätvierkampf w (1-6Jahre)</waBezeichnung>
    <Mannschaften>
      <Mannschaft>
        <verKurzname>Dummy Club A</verKurzname>
        <Teilnehmer>
          <TN>
            <perName>Mustermann</perName>
            <perVorname>Max</perVorname>
            <perGeburt>01.01.2020</perGeburt>
          </TN>
        </Teilnehmer>
        <Disziplinen>
          <Disziplin>
            <wedDisID>1731</wedDisID>
            <wedDisNr>160</wedDisNr>
            <wedDisName>Sprung w. P1-P9</wedDisName>
            <wtdPosition>1</wtdPosition>
            <wtdPunkte/>
          </Disziplin>
          <Disziplin>
            <wedDisID>1732</wedDisID>
            <wedDisNr>170</wedDisNr>
            <wedDisName>Stu.-Barren w. P1-P9</wedDisName>
            <wtdPosition>2</wtdPosition>
            <wtdPunkte/>
          </Disziplin>
        </Disziplinen>
      </Mannschaft>
    </Mannschaften>
  </Wettkampf>
</Wettkämpfe>`;

    const exportPayload: GymNetExportCompetition[] = [
      {
        competitionId: 1,
        competitionNumber: '0001',
        competitionName: 'Gerätvierkampf w (1-6Jahre)',
        genderMale: false,
        genderFemale: true,
        ageFrom: 1,
        ageTo: 6,
        participants: [
          {
            participantId: 10,
            firstName: 'Max',
            lastName: 'Mustermann',
            birthDate: '2020-01-01',
            gender: 2,
            clubId: 20,
            clubName: 'Dummy Club A',
            startNumber: 0,
            disciplines: [
              {
                disciplineId: 67,
                name: 'Sprung w. P1-P9',
                position: 1,
                score: 12.345,
              },
              {
                disciplineId: 68,
                name: 'Stu.-Barren w. P1-P9',
                position: 2,
                score: 11.111,
              },
            ],
          },
        ],
      },
    ];

    const { xml, report } = await mergeGymNetTemplateWithResults(templateXml, exportPayload);

    expect(report.summary.competitionsMatched).toBe(1);
    expect(report.summary.participantsMatched).toBe(1);
    expect(report.summary.disciplineScoresWritten).toBe(2);
    expect(report.summary.participantsUnmatched).toBe(0);
    expect(report.summary.disciplinesUnmatched).toBe(0);

    expect(xml).toContain('<wtdPunkte>12.345</wtdPunkte>');
    expect(xml).toContain('<wtdPunkte>11.111</wtdPunkte>');
  });
});
