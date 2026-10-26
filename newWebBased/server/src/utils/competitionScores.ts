interface DisciplineDetail {
  int_wertungen_detailsid: number;
  int_disziplinenid: number;
  int_versuch: number | null;
  rel_leistung: number | null;
  int_kp: number | null;
}

/** One score per discipline: the latest attempt, Kampfpunkte rows excluded. */
export function latestDisciplineScores(details: DisciplineDetail[]): Array<number | null> {
  const latest = new Map<number, DisciplineDetail>();

  for (const detail of details) {
    if ((detail.int_kp ?? 0) !== 0) continue;
    const current = latest.get(detail.int_disziplinenid);
    const isNewer = !current
      || (detail.int_versuch ?? 0) > (current.int_versuch ?? 0)
      || ((detail.int_versuch ?? 0) === (current.int_versuch ?? 0)
        && detail.int_wertungen_detailsid > current.int_wertungen_detailsid);
    if (isNewer) latest.set(detail.int_disziplinenid, detail);
  }

  return [...latest.values()].map(detail => detail.rel_leistung ?? null);
}
