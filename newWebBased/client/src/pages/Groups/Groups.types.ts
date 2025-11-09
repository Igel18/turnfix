/**
 * TypeScript Type Definitions for Groups Feature
 * Extracted from GroupsUnified.tsx for better maintainability
 */

export interface Group {
  id: number;
  clubId: number;
  name: string;
  memberCount: number;
  clubName?: string;
  members?: GroupMember[];
}

export interface GroupMember {
  id: number;
  firstName: string;
  lastName: string;
  clubId: number;
  clubName?: string;
}

export interface Club {
  int_vereineid: number;
  var_name: string;
}

export interface GroupFormData {
  name: string;
  clubId: string;
}
