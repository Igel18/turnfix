export interface Group {
  int_gruppenid: number;
  int_vereineid: number;
  var_name: string;
  clubName?: string;
}

export interface Team {
  int_mannschaftenid: number;
  int_wettkaempfeid: number;
  int_vereineid: number;
  int_nummer: number;
  var_riege: string;
  int_startnummer: number | null;
  clubName?: string;
}

export interface DisciplineField {
  id: number;
  disciplineId: number;
  name: string;
  sortOrder: number | null;
  group: number;
  isFinalScore: boolean;
  isStartingScore: boolean;
  enabled: boolean;
}

export interface Discipline {
  id: number;
  name: string;
  shortName: string;
  maleAllowed: boolean;
  femaleAllowed: boolean;
  calculationType: number;
  attempts: number;
}

export interface Competition {
  id: number;
  name: string;
  eventId: number;
  gender: string;
}

export interface Status {
  id: number;
  name: string;
  shortName: string;
}

export interface ScoreComponent {
  fieldId: number;
  fieldName: string;
  value: number | null;
}

export interface ScoreData {
  id?: number;
  groupId?: number;
  teamId?: number;
  competitionId: number;
  disciplineId: number;
  statusId: number;
  attempt: number;
  startNumber?: number;
  components: ScoreComponent[];
  finalScore: number | null;
  riege?: string;
  comment?: string;
}

export interface GroupTeamScoringProps {
  eventId: number;
  competitionId: number;
  entityType: 'group' | 'team';
}
