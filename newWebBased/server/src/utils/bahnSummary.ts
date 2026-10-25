export interface BahnCompetitionInput {
  id: number;
  name: string | null;
  number: string | null;
  durchgang: number | null;
  bahn: number | null;
  disciplineIds: number[];
}

export interface BahnWertungInput {
  competitionId: number;
  squadName: string | null | undefined;
  doesNotStart?: boolean | null;
}

export interface BahnSummary {
  durchgang: number;
  bahn: number;
  competitions: { id: number; name: string | null; number: string | null; disciplineIds: number[] }[];
  squads: { name: string; participantCount: number }[];
}

// A Bahn (lane) lives inside a Durchgang: key = durchgang/bahn.
export function buildBahnSummaries(
  competitions: BahnCompetitionInput[],
  wertungen: BahnWertungInput[]
): BahnSummary[] {
  const bahnKeyByCompetition = new Map<number, string>();
  const byKey = new Map<string, BahnSummary>();

  for (const competition of competitions) {
    const durchgang = competition.durchgang ?? 1;
    const bahn = competition.bahn ?? 1;
    const key = `${durchgang}/${bahn}`;
    bahnKeyByCompetition.set(competition.id, key);

    if (!byKey.has(key)) byKey.set(key, { durchgang, bahn, competitions: [], squads: [] });
    byKey.get(key)!.competitions.push({
      id: competition.id,
      name: competition.name,
      number: competition.number,
      disciplineIds: competition.disciplineIds,
    });
  }

  const squadCounts = new Map<string, Map<string, number>>();
  for (const row of wertungen) {
    const key = bahnKeyByCompetition.get(row.competitionId);
    const squadName = row.squadName?.trim();
    if (key === undefined || !squadName || row.doesNotStart) continue;

    if (!squadCounts.has(key)) squadCounts.set(key, new Map());
    const counts = squadCounts.get(key)!;
    counts.set(squadName, (counts.get(squadName) ?? 0) + 1);
  }

  for (const [key, counts] of squadCounts) {
    byKey.get(key)!.squads = Array.from(counts.entries())
      .map(([name, participantCount]) => ({ name, participantCount }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  return Array.from(byKey.values()).sort((a, b) => a.durchgang - b.durchgang || a.bahn - b.bahn);
}
