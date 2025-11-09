// TypeScript interfaces for Competitions

// Interface for competition display
export interface Competition {
  id: number;
  number?: string; // Competition number (waNr)
  name: string; // Competition name (waBezeichnung)
  description: string;
  date: string;
  location: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: {
    disciplineId: number;
    name: string;
    short_name: string;
    apparatus: string;
    maxScore: number;
  }[];
  registrationDeadline?: string;
  organizer?: string;
  status: 'upcoming' | 'active' | 'completed';
  participantCount: number;
  createdAt: string;
  
  // Additional competition settings
  round: number;
  track: number;
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

// Interface for form data
export interface CompetitionFormData {
  number?: string; // Competition number (waNr)
  name: string;
  description: string;
  gender: 'männlich' | 'weiblich' | 'gemischt';
  ageFrom: number;
  ageTo: number;
  disciplines: { disciplineId: number; maxScore: number }[];
  
  // Additional competition settings
  round: number;                    // int_durchgang - Competition round/session
  track: number;                    // int_bahn - Track/lane number
  startTime?: string;               // tim_startzeit - Start time (HH:MM format)
  warmupTime?: string;              // tim_einturnen - Warm-up time (HH:MM format)
  qualifiers: number;               // int_qualifikation - Number of qualifiers
  evaluations?: number;             // int_wertungen - Number of evaluations
  dropWorstScore: boolean;          // bol_streichwertung - Drop worst score
  showAgeGroup: boolean;            // bol_ak_anzeigen - Show age group
  isOptionalCompetition: boolean;   // bol_wahlwettkampf - Optional competition
  showInfo: boolean;                // bol_info_anzeigen - Show info
  useCompulsoryProgram: boolean;    // bol_kp - Use compulsory program
  sortAscending: boolean;           // bol_sortasc - Sort ascending
  manualSort: boolean;              // bol_mansort - Manual sort
  useApparatusPoints: boolean;      // bol_gerpkt - Use apparatus points
  dropCount: number;                // int_anz_streich - Number of scores to drop
}

// Interface for filter state
export interface CompetitionFilters {
  searchTerm: string;
  genderFilter: string;
  statusFilter: string;
}
