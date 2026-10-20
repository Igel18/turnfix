import type { ExtractedData } from './gymnetXmlParser';

export interface ExtractedDataSummary {
  clubsCount: number;
  competitionsCount: number;
  participantsCount: number;
  devicesCount: number;
  teamsCount: number;
}

export function mergeExtractedData(datasets: ExtractedData[]): ExtractedData {
  return {
    clubs: datasets.flatMap(dataset => dataset.clubs),
    competitions: datasets.flatMap(dataset => dataset.competitions),
    participants: datasets.flatMap(dataset => dataset.participants),
    devices: datasets.flatMap(dataset => dataset.devices),
    teams: datasets.flatMap(dataset => dataset.teams),
  };
}

export function summarizeExtractedData(data: ExtractedData): ExtractedDataSummary {
  const clubNames = new Set(
    data.clubs
      .map(club => (club.name || '').trim().toLowerCase())
      .filter(name => name.length > 0)
  );

  const participantKeys = new Set<string>();
  for (const participant of data.participants) {
    if (participant.id) {
      participantKeys.add(`id:${participant.id}`);
    } else {
      const key = `${(participant.firstName || '').trim().toLowerCase()}|${(participant.lastName || '').trim().toLowerCase()}|${participant.birthDate || ''}`;
      participantKeys.add(key);
    }
  }

  const deviceKeys = new Set<string>();
  for (const device of data.devices) {
    deviceKeys.add(`${device.code || device.name || ''}|${device.competitionWaNr || ''}`);
  }

  return {
    clubsCount: clubNames.size,
    competitionsCount: data.competitions.length,
    participantsCount: participantKeys.size,
    devicesCount: deviceKeys.size,
    teamsCount: data.teams.length,
  };
}