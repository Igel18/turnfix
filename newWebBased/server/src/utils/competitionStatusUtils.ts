/**
 * Competition Status Utilities
 *
 * Pure helper functions for computing per-discipline completion percentages
 * in the competition-status API route.
 *
 * Fix for Issue #92 / #97: Previously the route used tfx_riegen_x_disziplinen
 * squad entries as "totalSquads" denominator, which is 0 if no squad-discipline
 * combos were generated. The denominator must be the participant count in the
 * competition, and the numerator must be distinct participants with at least
 * one score entry for that discipline.
 */

/**
 * Returns the completion percentage for a discipline.
 *
 * @param totalParticipants - Total participants in the competition (active, not bol_startet_nicht)
 * @param completedParticipants - Participants who have at least one score entry for this discipline
 * @returns Integer percentage 0–100
 */
export function calculateDisciplinePercentage(
  totalParticipants: number,
  completedParticipants: number
): number {
  if (totalParticipants <= 0) return 0;
  const raw = (Math.min(completedParticipants, totalParticipants) / totalParticipants) * 100;
  return Math.round(raw);
}

export interface DisciplineDetailEntry {
  disciplineId: number;
  disciplineName: string;
  disciplineShort: string;
  totalParticipants: number;
  completedParticipants: number;
  percentage: number;
}

/**
 * Builds the disciplines_detail array for a competition.
 *
 * @param disciplines - Array of discipline objects from the competition's
 *                      tfx_wettkaempfe_x_disziplinen join, each with
 *                      int_disziplinenid, var_name, var_kurz1.
 * @param completedByDiscipline - Map of disciplineId → count of participants
 *                                who have a score for that discipline.
 * @param totalParticipants - Total active participants in the competition.
 */
export function buildDisciplineDetails(
  disciplines: Array<{ int_disziplinenid: number; var_name?: string | null; var_kurz1?: string | null }>,
  completedByDiscipline: Map<number, number>,
  totalParticipants: number
): DisciplineDetailEntry[] {
  return disciplines.map(d => {
    const completed = completedByDiscipline.get(d.int_disziplinenid) ?? 0;
    return {
      disciplineId: d.int_disziplinenid,
      disciplineName: d.var_name ?? 'Unknown',
      disciplineShort: d.var_kurz1 ?? '?',
      totalParticipants,
      completedParticipants: completed,
      percentage: calculateDisciplinePercentage(totalParticipants, completed),
    };
  });
}
