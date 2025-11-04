/**
 * ScoreCapture Component Types
 * Point 123: Separation of Concerns
 * 
 * Props and interfaces for ScoreCapture components
 */

import type {
  Participant,
  Discipline,
  DisciplineField,
  Squad,
  Status
} from '@/types/ScoreCapture.types';

export interface ScoreFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showJuryScores: boolean;
  onShowJuryScoresChange: (checked: boolean) => void;
}

export interface SquadStatusSelectorProps {
  activeSquad: string;
  activeDiscipline: number | string | '';
  squads: Squad[];
  disciplines: Discipline[];
  statuses: Status[];
  squadStatus: number | null;
  onSquadChange: (squadName: string) => void;
  onDisciplineChange: (disciplineValue: number | string) => void;
  onStatusChange: (statusId: string) => void;
  getStatusColor: (statusId: number) => string;
  getFilteredSquads: () => Squad[];
  getFilteredDisciplines: () => Discipline[];
}

export interface ParticipantRowProps {
  participant: Participant;
  disciplines: Discipline[];
  disciplineFields: DisciplineField[];
  scoreMatrix: {[key: string]: string};
  showJuryScores: boolean;
  getDisciplineFields: (disciplineId: number | string) => DisciplineField[];
  getScoreValidation: (disciplineId: number | string, scoreValue: string) => { isValid: boolean; message?: string };
  handleScoreChange: (participantId: number, disciplineId: number | string, value: string) => void;
  handleFieldScoreChange: (participantId: number, fieldId: number, value: string) => void;
  saveScore: (participantId: number, disciplineId: number | string) => Promise<void>;
  saveFieldScore: (participantId: number, field: DisciplineField) => Promise<void>;
  parseFormulaDisplay: (formula: string, fields: DisciplineField[], finalFieldName: string) => string | null;
}

export interface ScoreTableProps {
  filteredParticipants: Participant[];
  displayDisciplines: Discipline[];
  disciplineFields: DisciplineField[];
  scoreMatrix: {[key: string]: string};
  showJuryScores: boolean;
  getDisciplineFields: (disciplineId: number | string) => DisciplineField[];
  getScoreValidation: (disciplineId: number | string, scoreValue: string) => { isValid: boolean; message?: string };
  getParticipantCompetitions: (participant: Participant) => string[];
  handleScoreChange: (participantId: number, disciplineId: number | string, value: string) => void;
  handleFieldScoreChange: (participantId: number, fieldId: number, value: string) => void;
  saveScore: (participantId: number, disciplineId: number | string) => Promise<void>;
  saveFieldScore: (participantId: number, field: DisciplineField) => Promise<void>;
  parseFormulaDisplay: (formula: string, fields: DisciplineField[], finalFieldName: string) => string | null;
}

export interface HelpPanelProps {
  showJuryScores: boolean;
}
