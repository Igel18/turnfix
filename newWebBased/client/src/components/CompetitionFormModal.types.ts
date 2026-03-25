/** Shared types for CompetitionFormModalNew and its sub-components / hooks. */

export interface Discipline {
  id: number;
  name: string;
  short_name: string;
  display_name: string;
  male_allowed: boolean;
  female_allowed: boolean;
  icon: string;
}

export interface Area {
  int_bereicheid: number;
  var_name: string | null;
  bol_maennlich: boolean | null;
  bol_weiblich: boolean | null;
}

export interface DisciplineGroup {
  int_disziplinen_gruppenid: number;
  var_name: string;
  disciplines: Array<{ int_disziplinenid: number; position: number }>;
}

export interface CompetitionFormData {
  number?: string;
  name: string;
  description: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  areaId: number | null;
  ageFrom: number;
  ageTo: number;
  disciplines: { disciplineId: number; maxScore: number }[];

  // Additional competition settings
  round: number;                    // int_durchgang
  track: number;                    // int_bahn
  competitionType: number;          // int_typ (0=Individual, 1=Team, 2=Group)
  startTime?: string;               // tim_startzeit (HH:MM)
  warmupTime?: string;              // tim_einturnen (HH:MM)
  qualifiers: number;               // int_qualifikation
  evaluations?: number;             // int_wertungen
  dropWorstScore: boolean;          // bol_streichwertung
  showAgeGroup: boolean;            // bol_ak_anzeigen
  isOptionalCompetition: boolean;   // bol_wahlwettkampf
  showInfo: boolean;                // bol_info_anzeigen
  useCompulsoryProgram: boolean;    // bol_kp
  sortAscending: boolean;           // bol_sortasc
  manualSort: boolean;              // bol_mansort
  useApparatusPoints: boolean;      // bol_gerpkt
  dropCount: number;                // int_anz_streich
}

export interface Competition {
  id: number;
  number?: string;
  name: string;
  description: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  areaId?: number | null;
  areaName?: string | null;
  ageFrom: number;
  ageTo: number;
  disciplines: { disciplineId: number; name: string; maxScore: number }[];

  round: number;
  track: number;
  competitionType: number;
  startTime?: string;
  warmupTime?: string;
  qualifiers: number;
  evaluations?: number;
  dropWorstScore: boolean;
  showAgeGroup: boolean;
  isOptionalCompetition: boolean;
  showInfo: boolean;
  useCompulsoryProgram: boolean;
  sortAscending: boolean;
  manualSort: boolean;
  useApparatusPoints: boolean;
  dropCount: number;
}

export interface CompetitionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCompetition: Competition | null;
  formData: CompetitionFormData;
  setFormData: React.Dispatch<React.SetStateAction<CompetitionFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  bulkMaxScore: string;
  setBulkMaxScore: React.Dispatch<React.SetStateAction<string>>;
  handleBulkMaxScore: () => void;
}
