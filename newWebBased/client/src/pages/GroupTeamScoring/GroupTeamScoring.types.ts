export interface Group {
  int_gruppenid: number;
  int_vereineid: number;
  var_name: string;
  clubName?: string;
}

export interface Team {
  id: number;
  clubId: number;
  competitionId: number;
  number: number;
  riege: string | null;
  startNumber: number | null;
  clubName?: string;
  competitionName?: string;
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
  icon?: string;
  maleAllowed: boolean;
  femaleAllowed: boolean;
  calculationType: number;
  attempts: number;
  inputMask?: string;
}

export interface Competition {
  id: number;
  name: string;
  eventId: number;
  gender: string;
  disciplines?: Array<{
    disciplineId?: number;
    int_disziplinid?: number;
    id?: number;
  }>;
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
