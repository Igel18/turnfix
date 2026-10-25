export interface DurchgangCompetitionInput {
  id: number;
  name: string | null;
  number: string | null;
  durchgang: number | null;
  startTime: Date | string | null | undefined;
}

export interface DurchgangWertungInput {
  competitionId: number;
  squadName: string | null | undefined;
  doesNotStart?: boolean | null;
}

export interface DurchgangSummary {
  durchgang: number;
  startTime: string | null;
  competitions: { id: number; name: string | null; number: string | null }[];
  squads: { name: string; participantCount: number }[];
}

// TIME columns hold wall-clock time: read local components, never UTC.
export function formatTimeHHMM(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  let hours: number;
  let minutes: number;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    hours = value.getHours();
    minutes = value.getMinutes();
  } else {
    const match = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function buildDurchgangSummaries(
  competitions: DurchgangCompetitionInput[],
  wertungen: DurchgangWertungInput[]
): DurchgangSummary[] {
  const competitionDurchgang = new Map<number, number>();
  const byDurchgang = new Map<number, DurchgangSummary>();

  for (const competition of competitions) {
    const durchgang = competition.durchgang ?? 1;
    competitionDurchgang.set(competition.id, durchgang);

    if (!byDurchgang.has(durchgang)) {
      byDurchgang.set(durchgang, { durchgang, startTime: null, competitions: [], squads: [] });
    }
    const summary = byDurchgang.get(durchgang)!;
    summary.competitions.push({ id: competition.id, name: competition.name, number: competition.number });

    const start = formatTimeHHMM(competition.startTime);
    if (start && (summary.startTime === null || start < summary.startTime)) {
      summary.startTime = start;
    }
  }

  const squadCounts = new Map<number, Map<string, number>>();
  for (const row of wertungen) {
    const durchgang = competitionDurchgang.get(row.competitionId);
    const squadName = row.squadName?.trim();
    if (durchgang === undefined || !squadName || row.doesNotStart) continue;

    if (!squadCounts.has(durchgang)) squadCounts.set(durchgang, new Map());
    const counts = squadCounts.get(durchgang)!;
    counts.set(squadName, (counts.get(squadName) ?? 0) + 1);
  }

  for (const [durchgang, counts] of squadCounts) {
    byDurchgang.get(durchgang)!.squads = Array.from(counts.entries())
      .map(([name, participantCount]) => ({ name, participantCount }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  return Array.from(byDurchgang.values()).sort((a, b) => a.durchgang - b.durchgang);
}
