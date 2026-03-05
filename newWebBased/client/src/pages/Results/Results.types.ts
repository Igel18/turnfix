/**
 * Results Page Types
 * Point 123: Separation of Concerns
 */

export interface JuryResult {
  id: number;
  disciplineFieldId: number;
  performance: number | null;
  attempt: number;
  kp: number;
  fieldName: string;
  fieldShortName: string;
  isFinalScore: boolean;
  isStartingScore: boolean;
  formula?: string;
}

export interface Participant {
  id: number;
  name: string;
  club: string;
  startNumber: number;
  age: number;
  gender: string;
  startet_nicht?: boolean;
  scores: { [discipline: string]: number };
  juryResults?: { [discipline: string]: JuryResult[] };
  formulas?: { [discipline: string]: string };
  totalScore: number;
  rank: number;
  competitionId?: number;
  competitionName?: string;
}

export interface DisciplineInfo {
  name: string;
  icon: string;
  iconPath?: string;
  var_kurz1?: string;
  fullData?: any;
}

export interface CompetitionGroup {
  competitionId: number;
  competitionName: string;
  participants: Participant[];
  disciplines: string[];
  disciplineInfo: DisciplineInfo[];
}

interface LayoutField {
  int_layout_felderid: number
  int_layoutid: number
  int_typ: number
  var_font: string | null
  rel_x: number
  rel_y: number
  rel_w: number
  rel_h: number
  var_value: string | null
  int_align: number
  int_layer: number
}

export interface CertificateLayout {
  int_layoutid: number
  var_name: string
  txt_comment: string | null
  fields?: LayoutField[]
}

export const PAPER_FORMATS = {
  A4: { width: 595, height: 842, name: 'A4 (210 × 297 mm)' },
  A3: { width: 842, height: 1191, name: 'A3 (297 × 420 mm)' },
  A5: { width: 420, height: 595, name: 'A5 (148 × 210 mm)' },
  Letter: { width: 612, height: 792, name: 'Letter (8.5 × 11 in)' },
  Legal: { width: 612, height: 1008, name: 'Legal (8.5 × 14 in)' },
  Tabloid: { width: 792, height: 1224, name: 'Tabloid (11 × 17 in)' }
} as const;

export type PaperFormat = keyof typeof PAPER_FORMATS;
