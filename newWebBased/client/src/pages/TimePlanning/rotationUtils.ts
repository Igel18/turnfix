export interface RotationSquadLike {
  competitionId?: number;
  competitionIds?: number[];
}

export const getSquadCompetitionIds = (squad: RotationSquadLike): number[] => {
  const ids = new Set<number>();

  if (Array.isArray(squad.competitionIds)) {
    squad.competitionIds.forEach((id) => {
      if (Number.isFinite(id) && id > 0) {
        ids.add(id);
      }
    });
  }

  if (Number.isFinite(squad.competitionId) && (squad.competitionId as number) > 0) {
    ids.add(squad.competitionId as number);
  }

  return Array.from(ids);
};

export const squadBelongsToRound = (
  squad: RotationSquadLike,
  roundCompetitionIds: Set<number>
): boolean => {
  const squadCompetitionIds = getSquadCompetitionIds(squad);
  return squadCompetitionIds.some((id) => roundCompetitionIds.has(id));
};

export const squadMatchesCompetition = (
  squad: RotationSquadLike,
  competitionId: number
): boolean => {
  return getSquadCompetitionIds(squad).includes(competitionId);
};