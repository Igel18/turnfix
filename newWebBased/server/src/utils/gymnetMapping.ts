/**
 * GymNet Discipline Mapping Utilities
 * 
 * Maps GymNet discipline numbers (wedDisNr) and base DTB codes (gymnetid)
 * to TurnFix database discipline IDs.
 * 
 * Source of truth for the base DTB mapping: TurnFixImport.exe.config
 * 
 * The wedDisNr numbering system:
 * - Tens digit identifies the apparatus (10=Boden m, 11=Pferd, ..., 19=Boden w)
 * - Ones digit identifies the competition level (0=Kür, 1=LK1, 2=LK2, 3=LK3)
 * - P-Übung codes: 209, 219, ..., 299 map to the base apparatus
 * - Special codes: 630=Minitrampolin, 915=Gerätebahn A, 916=Gerätebahn B
 */

import type { PrismaClient as PrismaClientType } from '@prisma/client';

// ============================================================================
// Base DTB mapping (from TurnFixImport.exe.config)
// gymnetid → { turnfixid, name, male, female }
// ============================================================================

export interface DisciplineMapping {
  id: number;
  name: string;
  male: boolean;
  female: boolean;
}

/**
 * Base DTB code → TurnFix discipline mapping.
 * These are the 13 standard apparatus codes used by GymNet.
 * Source: TurnFixImport.exe.config <RegisterDiciplines>
 */
export const BASE_DTB_MAPPING: Record<string, DisciplineMapping> = {
  '200': { id: 74, name: 'Boden', male: true, female: false },
  '210': { id: 31, name: 'Pferd', male: true, female: false },
  '220': { id: 50, name: 'Ringe', male: true, female: false },
  '230': { id: 71, name: 'Sprung', male: true, female: false },
  '240': { id: 72, name: 'Barren', male: true, female: false },
  '250': { id: 46, name: 'Reck', male: true, female: false },
  '260': { id: 71, name: 'Sprung', male: false, female: true },
  '270': { id: 68, name: 'Stufenbarren', male: false, female: true },
  '280': { id: 73, name: 'Schwebebalken', male: false, female: true },
  '290': { id: 74, name: 'Boden', male: false, female: true },
  '630': { id: 77, name: 'Minitrampolin', male: true, female: true },
  '915': { id: 75, name: 'Gerätebahn A', male: true, female: true },
  '916': { id: 76, name: 'Gerätebahn B', male: true, female: true },
};

// ============================================================================
// wedDisNr → TurnFix ID mapping (extended mapping for LK/P/AK variants)
// ============================================================================

/** Apparatus mapping by tens digit of the wedDisNr code */
const TENS_DIGIT_MAPPING: Record<number, number> = {
  10: 74,  // Boden (m)
  11: 31,  // Pauschenpferd
  12: 50,  // Ringe
  13: 71,  // Sprung (m)
  14: 72,  // Barren
  15: 46,  // Reck
  16: 71,  // Sprung (w)
  17: 68,  // Stufenbarren
  18: 73,  // Schwebebalken
  19: 74,  // Boden (w)
};

/** Special codes that don't follow the tens-digit pattern */
const SPECIAL_CODES: Record<number, number> = {
  630: 77,  // Minitrampolin
  915: 75,  // Gerätebahn A
  916: 76,  // Gerätebahn B
};

/** Base DTB codes (200, 210, ..., 290) for backward compatibility */
const BASE_DTB_CODES: Record<number, number> = {
  200: 74, 210: 31, 220: 50, 230: 71, 240: 72, 250: 46,
  260: 71, 270: 68, 280: 73, 290: 74,
};

/**
 * Maps a GymNet wedDisNr code to a TurnFix discipline database ID.
 * 
 * Supports:
 * - Standard variant codes: 100-199 (e.g. 161=Sprung w. LK1)
 * - P-Übung codes: 209, 219, ..., 299
 * - Base DTB codes: 200, 210, ..., 290
 * - Special codes: 630, 915, 916
 * 
 * @param wedDisNr The GymNet discipline number (e.g. 161, 171, 181, 191)
 * @returns The TurnFix discipline database ID, or null if no mapping found
 */
export function wedDisNrToTurnFixId(wedDisNr: string | number): number | null {
  const nr = typeof wedDisNr === 'string' ? parseInt(wedDisNr, 10) : wedDisNr;
  if (isNaN(nr)) return null;

  // 1. Special codes (not following the tens-digit pattern)
  if (SPECIAL_CODES[nr] !== undefined) return SPECIAL_CODES[nr];

  // 2. P-Übung codes: 209, 219, 229, 239, 249, 259, 269, 279, 289, 299
  if (nr >= 200 && nr <= 299 && nr % 10 === 9) {
    const baseTens = Math.floor((nr - 100) / 10);
    if (TENS_DIGIT_MAPPING[baseTens] !== undefined) return TENS_DIGIT_MAPPING[baseTens];
  }

  // 3. Standard variant codes: 100-199 (tens digit = apparatus)
  if (nr >= 100 && nr <= 199) {
    const tens = Math.floor(nr / 10);
    if (TENS_DIGIT_MAPPING[tens] !== undefined) return TENS_DIGIT_MAPPING[tens];
  }

  // 4. Base DTB codes (200, 210, ..., 290) for backward compatibility
  if (BASE_DTB_CODES[nr] !== undefined) return BASE_DTB_CODES[nr];

  return null;
}

// ============================================================================
// Name-based discipline matching (fallback when no wedDisNr available)
// ============================================================================

/**
 * Generalized discipline selection for a competition name using DB values.
 * Used as fallback when no wedDisNr data is available from the XML.
 * 
 * @param competitionName The name of the competition (e.g. "Gerätvierkampf w")
 * @param prismaInstance The Prisma client instance
 * @returns Array of discipline names to link
 */
export async function getDisciplinesForCompetition(
  competitionName: string,
  prismaInstance: PrismaClientType
): Promise<string[]> {
  const name = competitionName.toLowerCase();
  const allDisciplines = await prismaInstance.tfx_disziplinen.findMany({ select: { var_name: true } });
  const disciplineNames = allDisciplines.map(d => d.var_name);

  if (name.includes('vierkampf') && name.includes('w')) {
    return ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken'].filter(d => disciplineNames.includes(d));
  } else if (name.includes('sechskampf') && name.includes('m')) {
    return ['Boden', 'Pauschenpferd', 'Ringe', 'Sprung', 'Barren', 'Reck'].filter(d => disciplineNames.includes(d));
  } else if (name.includes('geräte')) {
    return ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken', 'Reck', 'Pauschenpferd', 'Ringe', 'Barren'].filter(d => disciplineNames.includes(d));
  } else {
    return ['Boden', 'Sprung'].filter(d => disciplineNames.includes(d));
  }
}

