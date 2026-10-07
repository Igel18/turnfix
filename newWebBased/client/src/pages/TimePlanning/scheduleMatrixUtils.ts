import type { Competition, MatrixDiscipline, SessionGroup, Squad } from './TimePlanning.types';
import type { AnyColumn } from './matrixColumnHelpers';

/** Add minutes to a HH:MM time string. Wraps at 24 h. */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

export function calculateRoundTime(baseTime: string, round: number, intervalMinutes: number): string {
  return addMinutesToTime(baseTime, (round - 1) * intervalMinutes);
}

export function buildRoundTimeMap(
  totalRounds: number,
  sessionGroups: Pick<SessionGroup, 'session' | 'startTime' | 'squads'>[],
  exerciseDurationMinutes: number,
  fallbackIntervalMinutes: number
): Map<number, string> {
  const result = new Map<number, string>();
  const sorted = [...sessionGroups]
    .filter(session => session.startTime)
    .sort((left, right) => (left.startTime! < right.startTime! ? -1 : 1));

  if (sorted.length === 0) return result;

  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  let currentRound = 1;
  for (let sessionIndex = 0; sessionIndex < sorted.length; sessionIndex++) {
    const session = sorted[sessionIndex];
    const maxParticipants = session.squads.length > 0
      ? Math.max(...session.squads.map(squad => squad.participantCount || 1))
      : 1;
    const interval = Math.max(
      1,
      maxParticipants > 0 ? maxParticipants * exerciseDurationMinutes : fallbackIntervalMinutes
    );
    const start = session.startTime!;

    const roundsInSession = sessionIndex < sorted.length - 1
      ? Math.max(1, Math.floor((toMinutes(sorted[sessionIndex + 1].startTime!) - toMinutes(start)) / interval))
      : totalRounds - currentRound + 1;

    for (let index = 0; index < roundsInSession && currentRound <= totalRounds; index++, currentRound++) {
      result.set(currentRound, addMinutesToTime(start, index * interval));
    }
  }

  return result;
}

export function buildConflictCells(
  assignments: { disciplineId: number; round: number; squadName: string }[]
): Set<string> {
  const result = new Set<string>();
  const assignmentsByRound = new Map<number, Map<string, number[]>>();

  for (const assignment of assignments) {
    if (!assignment.squadName) continue;
    if (!assignmentsByRound.has(assignment.round)) {
      assignmentsByRound.set(assignment.round, new Map());
    }
    const assignmentsBySquad = assignmentsByRound.get(assignment.round)!;
    if (!assignmentsBySquad.has(assignment.squadName)) {
      assignmentsBySquad.set(assignment.squadName, []);
    }
    assignmentsBySquad.get(assignment.squadName)!.push(assignment.disciplineId);
  }

  for (const [round, assignmentsBySquad] of assignmentsByRound) {
    for (const disciplineIds of assignmentsBySquad.values()) {
      if (disciplineIds.length > 1) {
        for (const disciplineId of disciplineIds) {
          result.add(`${disciplineId}_${round}`);
        }
      }
    }
  }

  return result;
}

export function getSessionSquads(
  sessionNumber: number | null,
  sessionGroups: Pick<SessionGroup, 'session' | 'squads'>[] | undefined,
  fallbackSquads: string[]
): string[] {
  if (sessionNumber === null || !sessionGroups || sessionGroups.length === 0) {
    return fallbackSquads;
  }

  const sessionGroup = sessionGroups.find(group => group.session === sessionNumber);
  return sessionGroup?.squads.map(squad => squad.name) ?? fallbackSquads;
}

export function getSessionVisibleColumns(
  columns: AnyColumn[],
  sessionDisciplineIds: Record<string, number[]> | undefined,
  sessionNumber: number | null
): AnyColumn[] {
  if (sessionNumber === null || !sessionDisciplineIds) return columns;

  const allowedDisciplineIds = sessionDisciplineIds[String(sessionNumber)];
  if (!allowedDisciplineIds || allowedDisciplineIds.length === 0) return columns;

  const allowed = new Set(allowedDisciplineIds);
  return columns.filter(column => column.kind === 'pause' || allowed.has(column.id));
}

export function getAvailableSessions(
  sessionGroups: Pick<SessionGroup, 'session'>[] | undefined,
  sessionDisciplineIds: Record<string, number[]> | undefined,
): number[] {
  const sessions = new Set<number>();
  for (const group of sessionGroups ?? []) sessions.add(group.session);

  for (const key of Object.keys(sessionDisciplineIds ?? {})) {
    const session = Number(key);
    if (!Number.isNaN(session)) sessions.add(session);
  }

  return Array.from(sessions).sort((left, right) => left - right);
}

export function buildDisciplineLaneMap(
  sessionLaneDisciplineIds: Record<string, Record<string, number[]>> | undefined,
  selectedSession: number | null,
): Map<number, number[]> {
  const lanesByDiscipline = new Map<number, Set<number>>();
  const sessionEntries = selectedSession === null
    ? Object.entries(sessionLaneDisciplineIds ?? {})
    : [[String(selectedSession), sessionLaneDisciplineIds?.[String(selectedSession)] ?? {}] as const];

  for (const [, lanes] of sessionEntries) {
    for (const [laneKey, disciplineIds] of Object.entries(lanes ?? {})) {
      const lane = Number(laneKey);
      if (Number.isNaN(lane)) continue;

      for (const disciplineId of disciplineIds) {
        if (!lanesByDiscipline.has(disciplineId)) lanesByDiscipline.set(disciplineId, new Set());
        lanesByDiscipline.get(disciplineId)!.add(lane);
      }
    }
  }

  return new Map(Array.from(lanesByDiscipline, ([disciplineId, lanes]) => [
    disciplineId,
    Array.from(lanes).sort((left, right) => left - right),
  ]));
}

export function buildSquadDisciplineOptions(
  squads: Pick<Squad, 'name' | 'competitionIds'>[],
  competitions: Pick<Competition, 'id' | 'round'>[],
  selectedSession: number | null,
  disciplineCache: Record<number, any[]>,
  fallbackDisciplines: MatrixDiscipline[],
): Record<string, MatrixDiscipline[]> {
  const result: Record<string, MatrixDiscipline[]> = {};
  const competitionMap = new Map(competitions.map(competition => [competition.id, competition]));

  for (const squad of squads) {
    const optionMap = new Map<number, MatrixDiscipline>();
    for (const competitionId of squad.competitionIds ?? []) {
      const competition = competitionMap.get(competitionId);
      if (!competition || (selectedSession !== null && competition.round !== selectedSession)) continue;

      for (const discipline of disciplineCache[competitionId] ?? []) {
        const id = Number(discipline.int_disziplinenid ?? discipline.id);
        if (!id || Number.isNaN(id) || optionMap.has(id)) continue;
        optionMap.set(id, {
          id,
          name: String(discipline.var_name ?? discipline.name ?? ''),
          shortName: String(discipline.var_kurz1 ?? discipline.shortName ?? ''),
        });
      }
    }

    const options = Array.from(optionMap.values()).sort((left, right) =>
      (left.shortName || left.name).localeCompare(right.shortName || right.name),
    );
    result[squad.name] = options.length > 0 ? options : fallbackDisciplines;
  }

  return result;
}