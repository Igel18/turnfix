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
// Multi-apparatus competition helpers
// ============================================================================

// Standard apparatus sets
const MALE_APPARATUS = ['Boden m', 'Pauschenpferd', 'Ringe', 'Sprung m', 'Barren', 'Reck'];
const FEMALE_APPARATUS = ['Sprung w', 'Stufenbarren', 'Schwebebalken', 'Boden w'];
const ALL_APPARATUS = ['Boden', 'Sprung', 'Stufenbarren', 'Schwebebalken', 'Reck', 'Pauschenpferd', 'Ringe', 'Barren'];
// Turn10® Basisstufe apparatus (IDs 72-77)
const TURN10_APPARATUS = ['Boden Turn10', 'Balken/Bank Turn10', 'P-Barren Turn10', 'Minitrampolin Turn10', 'Reck/St-Barren Turn10', 'Sprung Turn10'];
// Standard 4-Kampf male: 4 base apparatus (without Pauschenpferd and Ringe)
const MALE_4KAMPF_APPARATUS = ['Boden m', 'Sprung m', 'Barren', 'Reck'];

// DB naming inconsistencies: base name vs level-specific name prefix.
// "Barren" (base, ID 5) → "Par.-Barren Kür/LK1/P1-P9" (all leveled variants)
// "Pauschenpferd" (base, ID 2) → "P.-Pferd Kür/LK1/LK2/LK3" (Kür/LK variants)
const APPARATUS_ALIASES: Record<string, string[]> = {
  'barren': ['par.-barren'],
  'pauschenpferd': ['p.-pferd'],
};

/**
 * Determines how many disciplines a competition should have based on its name.
 *
 * Returns 0 when the count cannot be inferred (generic/unknown name).
 *
 * Examples:
 *   "Gerätsechskampf m (17-18Jahre)" → 6
 *   "Turn10 Basisstufe Gerät 4-Kampf w (7-8Jahre)" → 4
 *   "Gerätvierkampf w (1-6Jahre)" → 4
 *   "Turn10 Basisstufe Gerät 3-Kampf m (7-8Jahre)" → 3
 *   "Unknown Competition" → 0
 */
export function getExpectedDisciplineCount(competitionName: string): number {
  const name = competitionName.toLowerCase();

  if (name.includes('sechskampf') || name.includes('6-kampf') || name.includes('6kampf')) return 6;
  if (name.includes('fünfkampf') || name.includes('5-kampf') || name.includes('5kampf')) return 5;
  if (name.includes('vierkampf') || name.includes('4-kampf') || name.includes('4kampf')) return 4;
  if (name.includes('dreikampf') || name.includes('3-kampf') || name.includes('3kampf')) return 3;
  if (name.includes('zweikampf') || name.includes('2-kampf') || name.includes('2kampf')) return 2;
  if (name.includes('mehrkampf')) return name.includes(' m') ? 6 : 4;

  return 0; // unknown — caller decides
}

/**
 * Detects the competition level (P, Kür, LK1, LK2, LK3) from XML device data.
 *
 * Checks device names (e.g. "Par.-Barren P 1 > P 9" → "P") and wedDisNr
 * codes (ones digit: 0=Kür, 1=LK1, 2=LK2, 3=LK3; x09=P).
 *
 * @returns A level suffix like "P", "Kür", "LK1" etc., or empty string.
 */
export function detectLevelFromDevices(devices: Array<{ name?: string; code?: string | number }>): string {
  for (const d of devices) {
    // --- Check device name ---
    const deviceName = (d.name || '').toLowerCase();
    if (deviceName.includes('p 1') || deviceName.includes('p1-p9') || deviceName.includes('p1>') || deviceName.includes('p1 >') || deviceName.includes('p-stufe')) return 'P';
    if (deviceName.includes('kür')) return 'Kür';
    if (deviceName.includes('lk 1') || deviceName.includes('lk1')) return 'LK1';
    if (deviceName.includes('lk 2') || deviceName.includes('lk2')) return 'LK2';
    if (deviceName.includes('lk 3') || deviceName.includes('lk3')) return 'LK3';

    // --- Check wedDisNr code pattern ---
    const code = typeof d.code === 'string' ? parseInt(d.code, 10) : d.code;
    if (code === undefined || code === null || isNaN(code)) continue;

    if (code >= 200 && code < 300) {
      // P-Übung codes end in 9 (209, 219, ..., 299)
      if (code % 10 === 9) return 'P';
      // Base DTB codes end in 0 (200, 210, ..., 290) — no level info
    } else if (code >= 100 && code < 200) {
      // New codes: ones digit = level
      const ones = code % 10;
      if (ones === 0) return 'Kür';
      if (ones === 1) return 'LK1';
      if (ones === 2) return 'LK2';
      if (ones === 3) return 'LK3';
    }
  }

  return '';
}

/**
 * Checks if a discipline name matches a specific level suffix precisely.
 * 
 * The old `includes('p')` check falsely matched 'p' in words like
 * "Sprung", "Pauschenpferd". This function uses patterns that only
 * match actual level markers like "P1-P9", "Kür", "LK1" etc.
 */
export function matchesLevel(disciplineName: string, level: string): boolean {
  const lower = disciplineName.toLowerCase();
  const lLevel = level.toLowerCase();

  if (lLevel === 'p') {
    // P-level: look for "P1", "P 1", "P1-P9", "P-Stufe" patterns
    // NOT just any 'p' in the name (which would match "Sprung", "Pauschenpferd")
    return /(?:^|[\s.])p\s*[1-9]/.test(lower) || lower.includes('p-stufe');
  }
  // For Kür, LK1, LK2, LK3 — simple includes is unambiguous
  return lower.includes(lLevel);
}

/**
 * Determines the gender context from a competition name.
 * Returns 'male', 'female', or 'unknown'.
 */
export function detectGenderFromName(competitionName: string): 'male' | 'female' | 'unknown' {
  const name = competitionName.toLowerCase();

  // Check for standalone gender markers: " m ", " m(", ends with " m"
  // Also match German gender words
  if (/ m[ (]/.test(name) || name.endsWith(' m') || name.includes('männlich') || name.includes('jungen')) return 'male';
  if (/ w[ (]/.test(name) || name.endsWith(' w') || name.includes('weiblich') || name.includes('mädchen')) return 'female';

  // Sechskampf is always male (6 apparatus is only male gymnastics)
  if (name.includes('sechskampf')) return 'male';

  return 'unknown';
}

// ============================================================================
// Name-based discipline matching (fallback when no wedDisNr available)
// ============================================================================

/**
 * Generalized discipline selection for a competition name using DB values.
 * Used as fallback when no wedDisNr data is available from the XML, or when
 * XML data is incomplete (e.g. only 1 of 6 disciplines listed).
 *
 * Searches the database for disciplines whose names START WITH a base
 * apparatus name, so it works with both legacy names ("Boden") and
 * GymNet preset names ("Boden m.", "Boden m. LK1", "Boden w. Kür").
 *
 * @param competitionName The name of the competition (e.g. "Gerätvierkampf w")
 * @param prismaInstance The Prisma client instance
 * @param levelHint Optional level detected from XML devices (e.g. "P", "Kür", "LK1")
 * @returns Array of discipline names to link
 */
export async function getDisciplinesForCompetition(
  competitionName: string,
  prismaInstance: PrismaClientType,
  levelHint?: string
): Promise<string[]> {
  const name = competitionName.toLowerCase();
  const allDisciplines = await prismaInstance.tfx_disziplinen.findMany({ select: { var_name: true } });
  const disciplineNames = allDisciplines.map(d => d.var_name).filter((n): n is string => n !== null);

  const gender = detectGenderFromName(competitionName);

  // Determine which base apparatus names to look for
  let baseApparatus: string[];
  // Flag: Turn10 disciplines don't use level suffixes (they ARE the level)
  let isTurn10 = false;

  // ── Turn10 detection (must come first!) ──
  if (name.includes('turn10') || name.includes('basisstufe')) {
    // Turn10 Basisstufe competitions use dedicated Turn10® apparatus (IDs 72-77)
    baseApparatus = TURN10_APPARATUS;
    isTurn10 = true;
  } else if (name.includes('sechskampf') || name.includes('6-kampf') || name.includes('6kampf')) {
    // Sechskampf = all 6 male apparatus
    baseApparatus = MALE_APPARATUS;
  } else if (name.includes('vierkampf') || name.includes('4-kampf') || name.includes('4kampf')) {
    if (gender === 'female') {
      baseApparatus = FEMALE_APPARATUS;
    } else if (gender === 'male') {
      // Male 4-Kampf: standard 4 apparatus (without Pauschenpferd and Ringe)
      baseApparatus = MALE_4KAMPF_APPARATUS;
    } else {
      baseApparatus = FEMALE_APPARATUS;
    }
  } else if (name.includes('3-kampf') || name.includes('3kampf') || name.includes('dreikampf')) {
    // 3-Kampf: athlete picks 3 from available set, competition has full set
    baseApparatus = gender === 'male' ? MALE_APPARATUS : FEMALE_APPARATUS;
  } else if (name.includes('5-kampf') || name.includes('5kampf') || name.includes('fünfkampf')) {
    baseApparatus = gender === 'male' ? MALE_APPARATUS : FEMALE_APPARATUS;
  } else if (name.includes('mehrkampf')) {
    baseApparatus = gender === 'male' ? MALE_APPARATUS : FEMALE_APPARATUS;
  } else if (name.includes('geräte') || name.includes('gerate') || name.includes('gerät')) {
    // Generic apparatus — gender-aware
    if (gender === 'male') {
      baseApparatus = MALE_APPARATUS;
    } else if (gender === 'female') {
      baseApparatus = FEMALE_APPARATUS;
    } else {
      baseApparatus = ALL_APPARATUS;
    }
  } else {
    // Default fallback: all base apparatus
    baseApparatus = ALL_APPARATUS;
  }

  // Try to determine competition level from name or levelHint
  // (Not used for Turn10 — Turn10 disciplines don't have level suffixes)
  let levelSuffix = '';
  if (!isTurn10) {
    levelSuffix = levelHint || '';
    if (!levelSuffix) {
      if (name.includes('lk 1') || name.includes('lk1')) levelSuffix = 'LK1';
      else if (name.includes('lk 2') || name.includes('lk2')) levelSuffix = 'LK2';
      else if (name.includes('lk 3') || name.includes('lk3')) levelSuffix = 'LK3';
      else if (name.includes('p-stufe') || name.includes('p1') || name.includes('p-wettkampf')) levelSuffix = 'P';
      else if (name.includes('kür')) levelSuffix = 'Kür';
    }
  }

  // Find matching disciplines in DB: prefer level-specific, then base name
  const matched: string[] = [];
  for (const base of baseApparatus) {
    // First try: exact match with level suffix (using precise matchesLevel)
    if (levelSuffix) {
      let withLevel = disciplineNames.find(d => 
        d.toLowerCase().startsWith(base.toLowerCase()) && 
        matchesLevel(d, levelSuffix)
      );

      // Try alternative prefixes for DB naming inconsistencies
      // e.g. "Barren" (base) → "Par.-Barren P1-P9" (P-level has different prefix)
      if (!withLevel) {
        const aliases = APPARATUS_ALIASES[base.toLowerCase()];
        if (aliases) {
          for (const alias of aliases) {
            withLevel = disciplineNames.find(d => 
              d.toLowerCase().startsWith(alias) && 
              matchesLevel(d, levelSuffix)
            );
            if (withLevel) break;
          }
        }
      }

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

