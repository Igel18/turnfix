// Field values and discipline scores share one matrix; field keys carry a marker so ids from different tables cannot collide.
export const scoreKey = (participantId: number | string, disciplineId: number | string): string =>
  `${participantId}-${disciplineId}`;

export const fieldScoreKey = (participantId: number | string, fieldId: number | string): string =>
  `${participantId}-field-${fieldId}`;
