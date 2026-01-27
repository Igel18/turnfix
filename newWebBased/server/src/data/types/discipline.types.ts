/**
 * Discipline Type Definitions
 * 
 * Shared interfaces for all discipline data sources:
 * - Production disciplines (from existing TurnFix database)
 * - GymNet preset disciplines (templates for new database setup)
 */

export interface DisciplineField {
  name: string;
  sortierung: number;
  endwert: boolean;
  ausgangswert: boolean;
  gruppe: number;
  enabled: boolean;
}

export interface Discipline {
  name: string;
  kurzname: string;
  anzeigename: string;
  formel: string | null;
  berechnungstyp: number;
  maske: string;
  versuche: number;
  einheit: string;
  icon: string;
  kuerzel: string;
  sportart: string;
  maennlich: boolean;
  weiblich: boolean;
  bahnen: boolean;
  berechnen: boolean;
  formelName?: string;
  felder?: DisciplineField[];
}

/**
 * GymNet-specific: Device field configuration for preset import
 */
export interface GymNetDeviceField {
  var_name: string;
  int_sortierung: number;
}

export interface GymNetDevice {
  name: string;
  shortName?: string;
  fields: GymNetDeviceField[];
  formula?: string;
  gender?: 'male' | 'female' | 'both';
}
