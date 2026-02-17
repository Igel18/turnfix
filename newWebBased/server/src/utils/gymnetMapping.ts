/**
 * GymNet Discipline Mapping Utilities
 * 
 * Maps GymNet discipline numbers (wedDisNr) to TurnFix database discipline IDs.
 * 
 * Uses FIXED discipline IDs from gymnetDisciplineIds.ts, which are explicitly
 * assigned by the DB Wizard (gymnetPreset.ts) when creating a new database.
 * 
 * The wedDisNr numbering system:
 *   Tens digit = apparatus:
 *     10=Boden m, 11=Pferd, 12=Ringe, 13=Sprung m, 14=Barren, 15=Reck
 *     16=Sprung w, 17=Stufenbarren, 18=Schwebebalken, 19=Boden w
 *   Ones digit = competition level:
 *     0=Kür, 1=LK1, 2=LK2, 3=LK3
 *   P-Übung codes: x09 (209, 219, ..., 299)
 *   Special codes: 630=Minitrampolin, 915=Gerätebahn A, 916=Gerätebahn B
 *   Base DTB codes: 200, 210, ..., 290 (backward compat with TurnFixImport.exe)
 */

import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { DISCIPLINE_IDS, DISCIPLINE_NAMES } from './gymnetDisciplineIds';

// Re-export for convenience
export { DISCIPLINE_IDS, DISCIPLINE_NAMES };

// ============================================================================
// Complete wedDisNr → TurnFix discipline ID mapping table
// Every supported code is listed explicitly — no formula guessing.
// ============================================================================

const WEDDISNR_TO_DISCIPLINE_ID: Record<number, number> = {
  // ----- Male Kür (tens 10-15, ones 0) -----
  100: DISCIPLINE_IDS.BODEN_M_KUER,       // Boden m. Kür
  110: DISCIPLINE_IDS.P_PFERD_KUER,        // P.-Pferd Kür
  120: DISCIPLINE_IDS.RINGE_M,             // Ringe m.
  130: DISCIPLINE_IDS.SPRUNG_M_KUER,       // Sprung m. Kür
  140: DISCIPLINE_IDS.PAR_BARREN_KUER,     // Par.-Barren Kür
  150: DISCIPLINE_IDS.RECK_M_KUER,         // Reck m. Kür

  // ----- Female Kür (tens 16-19, ones 0) -----
  160: DISCIPLINE_IDS.SPRUNG_W_KUER,       // Sprung w. Kür
  170: DISCIPLINE_IDS.STUFENBARREN,        // Stufenbarren (base = Kür)
  180: DISCIPLINE_IDS.SCHWEBEBALKEN,       // Schwebebalken (base = Kür)
  190: DISCIPLINE_IDS.BODEN_W_KUER,        // Boden w. Kür

  // ----- Male LK1 (tens 10-15, ones 1) -----
  101: DISCIPLINE_IDS.BODEN_M_LK1,        // Boden m. LK1
  111: DISCIPLINE_IDS.P_PFERD_LK1,         // P.-Pferd LK1
  121: DISCIPLINE_IDS.RINGE_LK1,           // Ringe LK1
  131: DISCIPLINE_IDS.SPRUNG_M_LK1,        // Sprung m. LK1
  141: DISCIPLINE_IDS.PAR_BARREN_LK1,      // Par.-Barren LK1
  151: DISCIPLINE_IDS.RECK_M_LK1,          // Reck m. LK1

  // ----- Female LK1 (tens 16-19, ones 1) -----
  161: DISCIPLINE_IDS.SPRUNG_W_LK1,        // Sprung w. LK1
  171: DISCIPLINE_IDS.STUFENBARREN_LK1,    // Stufenbarren LK1
  181: DISCIPLINE_IDS.SCHWEBEBALKEN_LK1,   // Schwebebalken LK1
  191: DISCIPLINE_IDS.BODEN_W_LK1,         // Boden w. LK1

  // ----- Male LK2 (tens 10-15, ones 2) -----
  102: DISCIPLINE_IDS.BODEN_M_LK2,        // Boden m. LK2
  112: DISCIPLINE_IDS.P_PFERD_LK2,         // P.-Pferd LK2
  122: DISCIPLINE_IDS.RINGE_LK2,           // Ringe LK2
  132: DISCIPLINE_IDS.SPRUNG_M_LK2,        // Sprung m. LK2
  142: DISCIPLINE_IDS.PAR_BARREN_LK2,      // Par.-Barren LK2
  152: DISCIPLINE_IDS.RECK_M_LK2,          // Reck m. LK2

  // ----- Female LK2 (tens 16-19, ones 2) -----
  162: DISCIPLINE_IDS.SPRUNG_W_LK2,        // Sprung w. LK2
  172: DISCIPLINE_IDS.STUFENBARREN_LK2,    // Stufenbarren LK2
  182: DISCIPLINE_IDS.SCHWEBEBALKEN_LK2,   // Schwebebalken LK2
  192: DISCIPLINE_IDS.BODEN_W_LK2,         // Boden w. LK2

  // ----- Male LK3 (tens 10-15, ones 3) -----
  103: DISCIPLINE_IDS.BODEN_M_LK3,        // Boden m. LK3
  113: DISCIPLINE_IDS.P_PFERD_LK3,         // P.-Pferd LK3
  123: DISCIPLINE_IDS.RINGE_LK3,           // Ringe LK3
  133: DISCIPLINE_IDS.SPRUNG_M_LK3,        // Sprung m. LK3
  143: DISCIPLINE_IDS.PAR_BARREN_LK3,      // Par.-Barren LK3
  153: DISCIPLINE_IDS.RECK_M_LK3,          // Reck m. LK3

  // ----- Female LK3 (tens 16-19, ones 3) -----
  163: DISCIPLINE_IDS.SPRUNG_W_LK3,        // Sprung w. LK3
  173: DISCIPLINE_IDS.STUFENBARREN_LK3,    // Stufenbarren LK3
  183: DISCIPLINE_IDS.SCHWEBEBALKEN_LK3,   // Schwebebalken LK3
  193: DISCIPLINE_IDS.BODEN_W_LK3,         // Boden w. LK3

  // ----- Male P-Übung (x09, tens 10-15 → 209-259) -----
  209: DISCIPLINE_IDS.BODEN_M_P,           // Boden m. P1-P9
  219: DISCIPLINE_IDS.PAUSCHENPFERD_P,     // Pauschenpferd P1-P9
  229: DISCIPLINE_IDS.RINGE_P,             // Ringe P1-P9
  239: DISCIPLINE_IDS.SPRUNG_M_P,          // Sprung m. P1-P9
  249: DISCIPLINE_IDS.PAR_BARREN_P,        // Par.-Barren P1-P9
  259: DISCIPLINE_IDS.RECK_M_P,            // Reck m. P1-P9

  // ----- Female P-Übung (x09, tens 16-19 → 269-299) -----
  269: DISCIPLINE_IDS.SPRUNG_W_P,          // Sprung w. P1-P9
  279: DISCIPLINE_IDS.RECK_STUBA_P,        // Reck/StuBa. P1-P9
  289: DISCIPLINE_IDS.SCHWEBEBALKEN_P,     // Schwebebalken P1-P9
  299: DISCIPLINE_IDS.BODEN_W_P,           // Boden w. P1-P9

  // ----- Base DTB codes (200-290) -----
  // These are the original GymNet codes from TurnFixImport.exe.config.
  // They map to the generic base apparatus (no level distinction).
  200: DISCIPLINE_IDS.BODEN,               // Boden (generic)
  210: DISCIPLINE_IDS.PAUSCHENPFERD,       // Pauschenpferd
  220: DISCIPLINE_IDS.RINGE,               // Ringe
  230: DISCIPLINE_IDS.SPRUNG,              // Sprung (generic)
  240: DISCIPLINE_IDS.BARREN,              // Barren
  250: DISCIPLINE_IDS.RECK,                // Reck
  260: DISCIPLINE_IDS.SPRUNG_W,            // Sprung w
  270: DISCIPLINE_IDS.STUFENBARREN,        // Stufenbarren
  280: DISCIPLINE_IDS.SCHWEBEBALKEN,       // Schwebebalken
  290: DISCIPLINE_IDS.BODEN_W,             // Boden w

  // ----- Special codes -----
  630: DISCIPLINE_IDS.MINITRAMPOLIN,       // Minitrampolin
  915: DISCIPLINE_IDS.GERAETEBAHN_A,       // Gerätebahn A
  916: DISCIPLINE_IDS.GERAETEBAHN_B,       // Gerätebahn B
};

// ============================================================================
// Legacy BASE_DTB_MAPPING (for backward compatibility with existing code)
// ============================================================================

export interface DisciplineMapping {
  id: number;
  name: string;
  male: boolean;
  female: boolean;
}

export const BASE_DTB_MAPPING: Record<string, DisciplineMapping> = {
  '200': { id: DISCIPLINE_IDS.BODEN,          name: 'Boden',          male: true,  female: false },
  '210': { id: DISCIPLINE_IDS.PAUSCHENPFERD,   name: 'Pauschenpferd',  male: true,  female: false },
  '220': { id: DISCIPLINE_IDS.RINGE,           name: 'Ringe',          male: true,  female: false },
  '230': { id: DISCIPLINE_IDS.SPRUNG,          name: 'Sprung',         male: true,  female: false },
  '240': { id: DISCIPLINE_IDS.BARREN,          name: 'Barren',         male: true,  female: false },
  '250': { id: DISCIPLINE_IDS.RECK,            name: 'Reck',           male: true,  female: false },
  '260': { id: DISCIPLINE_IDS.SPRUNG_W,        name: 'Sprung w',       male: false, female: true },
  '270': { id: DISCIPLINE_IDS.STUFENBARREN,    name: 'Stufenbarren',   male: false, female: true },
  '280': { id: DISCIPLINE_IDS.SCHWEBEBALKEN,   name: 'Schwebebalken',  male: false, female: true },
  '290': { id: DISCIPLINE_IDS.BODEN_W,         name: 'Boden w',        male: false, female: true },
  '630': { id: DISCIPLINE_IDS.MINITRAMPOLIN,   name: 'Minitrampolin',  male: true,  female: true },
  '915': { id: DISCIPLINE_IDS.GERAETEBAHN_A,   name: 'Gerätebahn A',   male: true,  female: true },
  '916': { id: DISCIPLINE_IDS.GERAETEBAHN_B,   name: 'Gerätebahn B',   male: true,  female: true },
};

// ============================================================================
// Main mapping function
// ============================================================================

/**
 * Maps a GymNet wedDisNr code to a TurnFix discipline database ID.
 * 
 * Uses an explicit lookup table — every supported code has a deterministic
 * mapping to a fixed discipline ID assigned by the DB Wizard.
 * 
 * Supports:
 * - Kür codes: 100-150 (m), 160-190 (w)
 * - LK1 codes: 101-151 (m), 161-191 (w)
 * - LK2 codes: 102-152 (m), 162-192 (w)
 * - LK3 codes: 103-153 (m), 163-193 (w)
 * - P-Übung codes: 209-259 (m), 269-299 (w)
 * - Base DTB codes: 200-290
 * - Special codes: 630, 915, 916
 * 
 * @param wedDisNr The GymNet discipline number (e.g. 161, 171, 181, 191)
 * @returns The TurnFix discipline database ID, or null if no mapping found
 */
export function wedDisNrToTurnFixId(wedDisNr: string | number): number | null {
  const nr = typeof wedDisNr === 'string' ? parseInt(wedDisNr, 10) : wedDisNr;
  if (isNaN(nr)) return null;

  return WEDDISNR_TO_DISCIPLINE_ID[nr] ?? null;
}

/**
 * Returns the discipline name for a wedDisNr code (for logging/debugging).
 */
export function wedDisNrToName(wedDisNr: string | number): string | null {
  const id = wedDisNrToTurnFixId(wedDisNr);
  if (id === null) return null;
  return DISCIPLINE_NAMES[id] ?? null;
}

// ============================================================================
// Name-based discipline matching (fallback when no wedDisNr available)
// ============================================================================

/**
 * Generalized discipline selection for a competition name using DB values.
 * Used as fallback when no wedDisNr data is available from the XML.
 * 
 * Searches the database for disciplines whose names START WITH a base
 * apparatus name, so it works with both legacy names ("Boden") and
 * GymNet preset names ("Boden m.", "Boden m. LK1", "Boden w. Kür").
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
  const disciplineNames = allDisciplines.map(d => d.var_name).filter((n): n is string => n !== null);

  // Determine which base apparatus names to look for
  let baseApparatus: string[];

  if (name.includes('vierkampf') && name.includes('w')) {
    // Female four-apparatus competition
    baseApparatus = ['Sprung w', 'Stufenbarren', 'Schwebebalken', 'Boden w'];
  } else if (name.includes('vierkampf') && name.includes('m')) {
    // Male four-apparatus — pick 4 from 6 (use the most common default set)
    baseApparatus = ['Boden m', 'Sprung m', 'Barren', 'Reck'];
  } else if (name.includes('sechskampf') || (name.includes('mehrkampf') && name.includes('m'))) {
    // Male six-apparatus competition
    baseApparatus = ['Boden m', 'Pauschenpferd', 'Ringe', 'Sprung m', 'Barren', 'Reck'];
  } else if (name.includes('mehrkampf') && name.includes('w')) {
    // Female multi-apparatus
    baseApparatus = ['Sprung w', 'Stufenbarren', 'Schwebebalken', 'Boden w'];
  } else if (name.includes('geräte') || name.includes('gerate')) {
    // Generic apparatus → all 10
    baseApparatus = ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken', 'Reck', 'Pauschenpferd', 'Ringe', 'Barren'];
  } else {
    // Default fallback: all 10 base apparatus
    baseApparatus = ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken', 'Reck', 'Pauschenpferd', 'Ringe', 'Barren'];
  }

  // Try to determine competition level from name (LK1, LK2, LK3, P, Kür, AK, Turn10)
  let levelSuffix = '';
  if (name.includes('lk 1') || name.includes('lk1')) levelSuffix = 'LK1';
  else if (name.includes('lk 2') || name.includes('lk2')) levelSuffix = 'LK2';
  else if (name.includes('lk 3') || name.includes('lk3')) levelSuffix = 'LK3';
  else if (name.includes('p-stufe') || name.includes('p1') || name.includes('p-wettkampf')) levelSuffix = 'P';
  else if (name.includes('kür')) levelSuffix = 'Kür';

  // Find matching disciplines in DB: prefer level-specific, then base name
  const matched: string[] = [];
  for (const base of baseApparatus) {
    // First try: exact match with level suffix
    if (levelSuffix) {
      const withLevel = disciplineNames.find(d => 
        d.toLowerCase().startsWith(base.toLowerCase()) && 
        d.toLowerCase().includes(levelSuffix.toLowerCase())
      );
      if (withLevel) {
        matched.push(withLevel);
        continue;
      }
    }

    // Second try: exact name match
    const exact = disciplineNames.find(d => d === base);
    if (exact) {
      matched.push(exact);
      continue;
    }

    // Third try: starts-with match (e.g. "Boden" matches "Boden m." or "Boden w.")
    const startsWith = disciplineNames.find(d => 
      d.toLowerCase().startsWith(base.toLowerCase())
    );
    if (startsWith) {
      matched.push(startsWith);
    }
  }

  console.log(`[getDisciplinesForCompetition] "${competitionName}" → base: [${baseApparatus.join(', ')}], level: "${levelSuffix}", matched: [${matched.join(', ')}]`);
  return matched;
}

