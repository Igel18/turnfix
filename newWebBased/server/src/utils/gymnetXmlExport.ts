import { Builder } from 'xml2js';
import { BASE_DTB_MAPPING, turnFixIdToWedDisNr } from './gymnetMapping';

export interface GymNetExportDiscipline {
  disciplineId: number;
  name: string;
  score: number | null;
  position: number;
}

export interface GymNetExportParticipant {
  participantId: number;
  firstName: string;
  lastName: string;
  birthDate: Date | string | null;
  gender: number | null;
  clubId: number | null;
  clubName: string;
  startNumber: number | null;
  disciplines: GymNetExportDiscipline[];
}

export interface GymNetExportCompetition {
  competitionId: number;
  competitionNumber: string;
  competitionName: string;
  genderMale: boolean;
  genderFemale: boolean;
  ageFrom: number;
  ageTo: number | null;
  participants: GymNetExportParticipant[];
}

function formatBirthDate(date: Date | string | null): string {
  if (!date) return '';

  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';

  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return '';
  }

  return Number(score).toFixed(3);
}

function getCompetitionGenderValue(genderMale: boolean, genderFemale: boolean): string {
  if (genderMale && !genderFemale) return 'm';
  if (!genderMale && genderFemale) return 'w';
  return '';
}

function getParticipantGenderValue(gender: number | null): string {
  if (gender === 0) return 'm';
  if (gender === 1) return 'w';
  return '';
}

function normalizeDisciplineName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getWedDisNrByDisciplineName(name: string): number | null {
  const normalized = normalizeDisciplineName(name);
  if (!normalized) {
    return null;
  }

  for (const [code, mapping] of Object.entries(BASE_DTB_MAPPING)) {
    if (normalizeDisciplineName(mapping.name) === normalized) {
      const parsed = Number(code);
      return Number.isNaN(parsed) ? null : parsed;
    }
  }

  return null;
}

export function buildGymNetResultsXml(competitions: GymNetExportCompetition[]): string {
  const xmlObject = {
    Wettkämpfe: {
      Wettkampf: competitions.map((competition) => ({
        waID: String(competition.competitionId),
        waNr: competition.competitionNumber || '',
        waBezeichnung: competition.competitionName || '',
        waGeschlecht: getCompetitionGenderValue(competition.genderMale, competition.genderFemale),
        waAlterMin: String(competition.ageFrom || 0),
        waAlterMax: competition.ageTo !== null && competition.ageTo !== undefined ? String(competition.ageTo) : '',
        Teilnehmer: {
          TN: competition.participants.map((participant) => ({
            perID: String(participant.participantId),
            perName: participant.lastName || '',
            perVorname: participant.firstName || '',
            perGeburt: formatBirthDate(participant.birthDate),
            perGeschlecht: getParticipantGenderValue(participant.gender),
            verID: participant.clubId !== null && participant.clubId !== undefined ? String(participant.clubId) : '',
            verKurzname: participant.clubName || '',
            espStartnummer: participant.startNumber !== null && participant.startNumber !== undefined ? String(participant.startNumber) : '',
            Disziplinen: {
              Disziplin: participant.disciplines.map((discipline) => {
                const wedDisNrById = turnFixIdToWedDisNr(discipline.disciplineId);
                const wedDisNrByName = getWedDisNrByDisciplineName(discipline.name || '');
                const wedDisNr = wedDisNrByName ?? wedDisNrById;

                return {
                  wedDisID: String(discipline.disciplineId),
                  wedDisNr: wedDisNr !== null ? String(wedDisNr) : '',
                  wedDisName: discipline.name || '',
                  wtdPosition: String(discipline.position),
                  wtdPunkte: formatScore(discipline.score)
                };
              })
            }
          }))
        }
      }))
    }
  };

  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ', newline: '\n' }
  });

  return builder.buildObject(xmlObject);
}
