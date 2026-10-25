import type { ActiveSquadInfo, Durchgang, Squad } from '../components/JuryPortal/JuryPortal.types';
import { getParticipantCompetitionIds } from './participantCompetitions';

type DurchgangStatus = ActiveSquadInfo['status'];

export function getSelectableDurchgaenge(durchgaenge: Durchgang[]): Durchgang[] {
  return durchgaenge.filter(d => d.squads.length > 0);
}

export function needsDurchgangSelection(durchgaenge: Durchgang[]): boolean {
  return getSelectableDurchgaenge(durchgaenge).length > 1;
}

export function filterSquadsByDurchgang(squads: Squad[], durchgang: Durchgang | null): Squad[] {
  if (!durchgang) return squads;
  const names = new Set(durchgang.squads.map(s => s.name));
  return squads.filter(squad => names.has(squad.name));
}

/** Restricts a squad to the participants competing in the given Durchgang. */
export function filterSquadForDurchgang(squad: Squad, durchgang: Durchgang | null): Squad {
  if (!durchgang) return squad;
  const competitionIds = new Set(durchgang.competitions.map(c => c.id));
  return {
    ...squad,
    participants: squad.participants.filter(participant => {
      const ids = getParticipantCompetitionIds(participant);
      return ids === null || ids.some(id => competitionIds.has(id));
    }),
  };
}

export function getDurchgangStatus(durchgang: Durchgang, infos: ActiveSquadInfo[]): DurchgangStatus {
  const names = new Set(durchgang.squads.map(s => s.name));
  const relevant = infos.filter(info => names.has(info.squadName));

  if (relevant.some(info => info.status === 'active')) return 'active';
  if (relevant.some(info => info.status === 'upcoming')) return 'upcoming';
  if (relevant.length === names.size && relevant.length > 0 && relevant.every(info => info.status === 'past')) {
    return 'past';
  }
  return 'unknown';
}

const STATUS_ORDER: Record<DurchgangStatus, number> = { active: 0, upcoming: 1, unknown: 2, past: 3 };

export function sortDurchgaenge(durchgaenge: Durchgang[], infos: ActiveSquadInfo[]): Durchgang[] {
  return [...durchgaenge].sort((a, b) => {
    const byStatus = STATUS_ORDER[getDurchgangStatus(a, infos)] - STATUS_ORDER[getDurchgangStatus(b, infos)];
    return byStatus !== 0 ? byStatus : a.durchgang - b.durchgang;
  });
}

export function formatDurchgangStartTime(startTime: string | null): string {
  return startTime ? `ab ${startTime} Uhr` : '';
}
