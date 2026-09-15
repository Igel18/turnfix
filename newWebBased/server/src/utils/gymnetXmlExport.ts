import { Builder } from 'xml2js';
import { BASE_DTB_MAPPING, turnFixIdToWedDisNr } from './gymnetMapping';

export interface GymNetExportDiscipline {
  disciplineId: number;
  name: string;
  score: number | null;
  position: number;
}

export type GymNetCapturedValue = 0 | 1 | 2 | 3;

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
  totalScore?: number | null;
  rank?: number | null;
  captured?: GymNetCapturedValue | null;
  isOutOfCompetition?: boolean | null;
  isAbsent?: boolean | null;
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

function sumDisciplineScores(participant: GymNetExportParticipant): number | null {
  const values = participant.disciplines
    .map((discipline) => discipline.score)
    .filter((score): score is number => score !== null && score !== undefined && !Number.isNaN(score));

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function buildRankMap(participants: GymNetExportParticipant[]): Map<number, number> {
  const scored = participants.reduce<Array<{
    participantId: number;
    total: number;
    captured: GymNetCapturedValue | null | undefined;
    isOutOfCompetition: boolean | null | undefined;
    isAbsent: boolean | null | undefined;
  }>>((entries, participant) => {
    const total = participant.totalScore ?? sumDisciplineScores(participant);
    if (total === null) {
      return entries;
    }

    entries.push({
      participantId: participant.participantId,
      total,
      captured: participant.captured,
      isOutOfCompetition: participant.isOutOfCompetition,
      isAbsent: participant.isAbsent,
    });
    return entries;
  }, [])
    .filter((entry) => entry.isOutOfCompetition !== true && entry.isAbsent !== true && entry.captured !== 2 && entry.captured !== 3)
    .sort((a, b) => b.total - a.total);

  const rankMap = new Map<number, number>();
  let currentRank = 0;
  let lastTotal: number | null = null;

  scored.forEach((entry, index) => {
    if (lastTotal === null || entry.total < lastTotal) {
      currentRank = index + 1;
      lastTotal = entry.total;
    }
    rankMap.set(entry.participantId, currentRank);
  });

  return rankMap;
}

function resolveCapturedValue(participant: GymNetExportParticipant, hasAnyScore: boolean): GymNetCapturedValue {
  if (participant.isAbsent === true) {
    return 3;
  }

  if (participant.isOutOfCompetition === true) {
    return 2;
  }

  if (participant.captured === 0 || participant.captured === 1 || participant.captured === 2 || participant.captured === 3) {
    return participant.captured;
  }

  // Exported result rows should be marked as captured for GymNet import.
  return hasAnyScore ? 1 : 1;
}

function resolvePlacement(participant: GymNetExportParticipant, rankMap: Map<number, number>, captured: GymNetCapturedValue): number {
  if (captured === 2 || captured === 3) {
    return 0;
  }

  return participant.rank ?? rankMap.get(participant.participantId) ?? 0;
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
      Wettkampf: competitions.map((competition) => {
        const rankMap = buildRankMap(competition.participants);

        return {
          waID: String(competition.competitionId),
          waNr: competition.competitionNumber || '',
          waBezeichnung: competition.competitionName || '',
          waGeschlecht: getCompetitionGenderValue(competition.genderMale, competition.genderFemale),
          waAlterMin: String(competition.ageFrom || 0),
          waAlterMax: competition.ageTo !== null && competition.ageTo !== undefined ? String(competition.ageTo) : '',
          Teilnehmer: {
            TN: competition.participants.map((participant) => {
              const resolvedTotal = participant.totalScore ?? sumDisciplineScores(participant);
              const hasAnyScore = resolvedTotal !== null;
              const captured = resolveCapturedValue(participant, hasAnyScore);

              return {
                perID: String(participant.participantId),
                perName: participant.lastName || '',
                perVorname: participant.firstName || '',
                perGeburt: formatBirthDate(participant.birthDate),
                perGeschlecht: getParticipantGenderValue(participant.gender),
                verID: participant.clubId !== null && participant.clubId !== undefined ? String(participant.clubId) : '',
                verKurzname: participant.clubName || '',
                espStartnummer: participant.startNumber !== null && participant.startNumber !== undefined ? String(participant.startNumber) : '',
                etPunkte: captured === 3 ? '' : formatScore(resolvedTotal),
                etPlatzierung: String(resolvePlacement(participant, rankMap, captured)),
                etErfasst: String(captured),
                Disziplinen: {
                  Disziplin: participant.disciplines.map((discipline) => {
                    const wedDisNrById = turnFixIdToWedDisNr(discipline.disciplineId);
                    const wedDisNrByName = getWedDisNrByDisciplineName(discipline.name || '');
                    const wedDisNr = wedDisNrByName ?? wedDisNrById;
                    const formattedScore = formatScore(discipline.score);

                    return {
                      wedDisID: String(discipline.disciplineId),
                      wedDisNr: wedDisNr !== null ? String(wedDisNr) : '',
                      wedDisName: discipline.name || '',
                      wtdPosition: String(discipline.position),
                      wtdWertung: formattedScore,
                      wtdPunkte: formattedScore
                    };
                  })
                }
              };
            })
          }
        };
      })
    }
  };

  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ', newline: '\n' }
  });

  return builder.buildObject(xmlObject);
}
