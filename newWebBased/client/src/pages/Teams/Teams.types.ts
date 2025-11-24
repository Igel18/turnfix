/**
 * TypeScript Type Definitions for Teams Feature
 * Extended for UnifiedAssignmentModal compatibility
 */

export interface Club {
  int_vereineid: number;
  var_name: string;
}

export interface Competition {
  id: number;
  name: string;
}

// Original Team type from database
export interface TeamDb {
  int_mannschaftenid: number;
  int_vereineid: number;
  int_wettkaempfeid: number;
  int_nummer: number;
  var_riege: string | null;
  int_startnummer: number | null;
  tfx_vereine: {
    var_name: string;
  };
  tfx_wettkaempfe: {
    var_name: string;
  };
}

// Enhanced Team type for UnifiedAssignmentModal (extends BaseMasterItem)
export interface Team {
  id: number;                      // int_mannschaftenid
  name: string;                    // Computed: "Club Name - Team Number"
  clubId: number;                  // int_vereineid
  clubName: string;                // tfx_vereine.var_name
  competitionId: number;           // int_wettkaempfeid
  competitionName: string;         // tfx_wettkaempfe.var_name
  number: number;                  // int_nummer
  riege: string | null;            // var_riege
  startNumber: number | null;      // int_startnummer
  memberCount: number;             // Count of members
  members?: TeamMember[];          // Array of team members
}

// Team member interface (participant assigned to team)
export interface TeamMember {
  id: number;
  firstName: string;
  lastName: string;
  clubId: number;
  clubName?: string;
  age?: number;
  birthdate?: string | Date;
  gender?: string; // 'male' | 'female' | 'unknown'
  startNumber?: number | string;
  bol_ak?: boolean; // Außer Konkurrenz (from tfx_wertungen)
  bol_startet_nicht?: boolean; // Startet Nicht (from tfx_wertungen)
  // For AvailableList component (uses lowercase property names)
  firstname?: string;
  lastname?: string;
}

// Participant interface for assignment (available participants pool)
export interface Participant {
  id: number;
  firstName: string;
  lastName: string;
  clubId: number;
  clubName?: string;
  birthdate?: string | Date;
  age?: number;
  gender?: string;
  startNumber?: number | string;
}

// Form data for creating/editing teams
export interface TeamFormData {
  clubId: string;
  competitionId: string;
  number: string;
  riege: string | null;
  startNumber: string;
}

export type SortField = 'club' | 'competition' | 'number' | 'startNumber';
export type SortDirection = 'asc' | 'desc';
