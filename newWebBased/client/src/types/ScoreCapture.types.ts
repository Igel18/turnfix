// ScoreCapture Type Definitions

export interface Participant {
  id: number;
  firstname: string;
  lastname: string;
  club: string;
  clubId: number;
  gender: 'male' | 'female';
  age: number | null;
  birthYear: number | null;
  assignedCompetitions: number[];
  isInEvent: boolean;
  registrationDate: string;
  squad_name?: string;
  int_statusid?: number;
  startNumber?: number | null;
}

export interface Discipline {
  int_disziplinid: number;
  var_name: string;
  var_shortname?: string;
  apparatus?: string;
  attempts: number;
  inputMask?: string;
  int_berechnung?: number;
  var_maske?: string;
  maxScore?: number;
  icon?: string;
}

export interface DisciplineField {
  id: number;
  disciplineId: number;
  disciplineName: string;
  disciplineShort: string;
  name: string;
  sortOrder: number | null;
  isFinalScore: boolean;
  isStartingScore: boolean;
  group: number;
  enabled: boolean;
}

export interface Squad {
  name: string;
  participant_count: number;
}

export interface Score {
  id?: number;
  participantId: number;
  disciplineId: number;
  competitionId: number;
  score: number;
  attempt: number;
  notes?: string;
  status: 'pending' | 'completed' | 'reviewed';
}

export interface Status {
  int_statusid: number;
  var_name: string;
  ary_colorcode: string;
  bol_bogen: boolean;
  bol_karte: boolean;
}

export interface Competition {
  id: number;
  name: string;
  number?: string;
  var_name?: string;
  event_id: number;
  disciplines?: Discipline[];
}

export interface ScoreValidation {
  isValid: boolean;
  message?: string;
  maxScore?: number;
}
