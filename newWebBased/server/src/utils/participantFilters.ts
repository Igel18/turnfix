interface ParticipantStartFlag {
  bol_startet_nicht?: boolean | null;
}

export function isActiveStarter(participant: ParticipantStartFlag): boolean {
  return participant.bol_startet_nicht !== true;
}
