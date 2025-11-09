/**
 * TypeScript Type Definitions for Teams Feature
 * Extracted from TeamsUnified.tsx for better maintainability
 */

export interface Club {
  int_vereineid: number;
  var_name: string;
}

export interface Competition {
  id: number;
  name: string;
}

export interface Team {
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

export type SortField = 'club' | 'competition' | 'number' | 'startNumber';
export type SortDirection = 'asc' | 'desc';
