export interface Squad {
  name: string;
  participantCount: number;
  competitionId?: number;
  competitionIds?: number[];
}

export interface Device {
  name: string;
}

export interface Competition {
  id: number;
  name: string;
  round: number;
  participantCount: number;
  int_bahn?: number | null;
}

export interface RotationEntry {
  squad: string;
  device: string;
  rotation: number;
}

export interface CompetitionWithSquads {
  competition: Competition;
  squads: Squad[];
}

export interface Bahn {
  bahnNumber: number;
  competitions: CompetitionWithSquads[];
}

export interface TimePlanningRotationProps {
  eventId: string | number;
  squads: Squad[];
  devices: Device[];
  competitions: Competition[];
  onDataChange?: () => void;
  selectedRound?: number;
  onSelectedRoundChange?: (round: number) => void;
}

export interface TimePlanningRotationRef {
  addBahn: () => void;
}