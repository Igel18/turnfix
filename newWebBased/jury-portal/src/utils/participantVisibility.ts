interface ParticipantWithStartetNicht {
  startet_nicht?: boolean;
}

/**
 * Non-starters are managed only in event participants and must not appear in jury scoring flows.
 */
export function excludeNonStartingParticipants<T extends ParticipantWithStartetNicht>(participants: T[]): T[] {
  return participants.filter(participant => !participant.startet_nicht);
}
