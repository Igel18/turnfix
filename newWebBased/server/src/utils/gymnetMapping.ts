/**
 * GymNet Discipline Mapping Utilities
 * 
 * Maps GymNet discipline numbers (wedDisNr) and IDs (wedDisID) to TurnFix database discipline IDs.
 * 
 * The mapping is defined ONLY by IDs in src/data/json/gymnet-mapping.<profile>.json
 * (profile via env GYMNET_MAPPING_PROFILE: "preset" = DB from the DB wizard,
 * "existing" = grown DB). No name matching. See TD-08 in Instructions2.md.
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

import fs from 'fs';
import path from 'path';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { DISCIPLINE_IDS, DISCIPLINE_NAMES } from './gymnetDisciplineIds';

// Re-export for convenience
export { DISCIPLINE_IDS, DISCIPLINE_NAMES };

// ============================================================================
// Complete wedDisNr → TurnFix discipline ID mapping table
// Every supported code is listed explicitly — no formula guessing.
// ============================================================================

// The tables live in JSON files (src/data/json/gymnet-mapping.<profile>.json) and map to
// discipline IDs only. Profile "preset" = database created by the DB wizard,
// profile "existing" = grown database with historical IDs.

interface MappingEntry { id: number; name?: string }
interface MappingFile {
  profile: string;
  byWedDisId: Record<string, MappingEntry>;
  byWedDisNr: Record<string, MappingEntry>;
}

export const GYMNET_MAPPING_PROFILES = ['preset', 'existing'] as const;
export type GymnetMappingProfile = (typeof GYMNET_MAPPING_PROFILES)[number];

function resolveMappingPath(profile: GymnetMappingProfile): string {
  const file = `gymnet-mapping.${profile}.json`;
  const candidates = [
    path.join(__dirname, '..', 'data', 'json', file),
    path.join(__dirname, '..', '..', 'src', 'data', 'json', file),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) throw new Error(`Cannot find ${file}. Tried:\n${candidates.map((c) => `  - ${c}`).join('\n')}`);
  return found;
}

export function getActiveMappingProfile(): GymnetMappingProfile {
  const value = (process.env.GYMNET_MAPPING_PROFILE || 'preset').trim().toLowerCase();
  if (!(GYMNET_MAPPING_PROFILES as readonly string[]).includes(value)) {
    throw new Error(`GYMNET_MAPPING_PROFILE must be one of ${GYMNET_MAPPING_PROFILES.join(', ')} (got "${value}")`);
  }
  return value as GymnetMappingProfile;
}

const mappingCache = new Map<GymnetMappingProfile, MappingTables>();

interface MappingTables {
  byNr: Record<number, number>;
  byId: Record<number, number>;
  names: Record<number, string>;
}

function toIdTable(entries: Record<string, MappingEntry>, names: Record<number, string>): Record<number, number> {
  const table: Record<number, number> = {};
  for (const [key, entry] of Object.entries(entries ?? {})) {
    table[Number(key)] = entry.id;
    if (entry.name) names[entry.id] = entry.name;
  }
  return table;
}

function getMappingTables(): MappingTables {
  const profile = getActiveMappingProfile();
  let tables = mappingCache.get(profile);
  if (!tables) {
    const data = JSON.parse(fs.readFileSync(resolveMappingPath(profile), 'utf-8')) as MappingFile;
    const names: Record<number, string> = {};
    tables = { byNr: toIdTable(data.byWedDisNr, names), byId: toIdTable(data.byWedDisId, names), names };
    mappingCache.set(profile, tables);
    console.log(`[GymNetMapping] Loaded profile "${profile}": ${Object.keys(tables.byNr).length} wedDisNr, ${Object.keys(tables.byId).length} wedDisID entries`);
  }
  return tables;
}

/** Forces a reload of the mapping JSON (after editing it at runtime or switching profile in tests). */
export function clearMappingCache(): void {
  mappingCache.clear();
}

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
export function wedDisNrToTurnFixId(
  wedDisNr: string | number,
  options?: { wedDisId?: string | number | null; wedDisName?: string | null }
): number | null {
  const { byId, byNr } = getMappingTables();
  const wedDisIdRaw = options?.wedDisId;
  const wedDisId = typeof wedDisIdRaw === 'string' ? parseInt(wedDisIdRaw, 10) : wedDisIdRaw;
  if (wedDisId !== undefined && wedDisId !== null && !isNaN(wedDisId)) {
    const byWedDisId = byId[wedDisId];
    if (byWedDisId !== undefined) {
      return byWedDisId;
    }
  }

  const nr = typeof wedDisNr === 'string' ? parseInt(wedDisNr, 10) : wedDisNr;
  if (isNaN(nr)) return null;

  return byNr[nr] ?? null;
}

/**
 * Returns the discipline name stored next to the ID in the mapping JSON (for logging only).
 */
export function wedDisNrToName(
  wedDisNr: string | number,
  options?: { wedDisId?: string | number | null; wedDisName?: string | null }
): string | null {
  const id = wedDisNrToTurnFixId(wedDisNr, options);
  if (id === null) return null;
  return getMappingTables().names[id] ?? DISCIPLINE_NAMES[id] ?? null;
}

/**
 * Reverse lookup used for XML export.
 *
 * If multiple wedDisNr values map to the same TurnFix discipline ID,
 * prefer the base DTB range (200-299), otherwise use the lowest code.
 */
export function turnFixIdToWedDisNr(turnFixId: number): number | null {
  const candidates = Object.entries(getMappingTables().byNr)
    .filter(([, id]) => id === turnFixId)
    .map(([wedDisNr]) => Number(wedDisNr))
    .filter((value) => !Number.isNaN(value));

  if (candidates.length === 0) {
    return null;
  }

  // Prefer canonical base DTB codes (x0 in 200-299) for GymNet XML export.
  // Example: Stufenbarren maps from both 270 (base) and 279 (P-level variant),
  // and GymNet expects 270 in standard result XML.
  const canonicalBaseCodes = candidates
    .filter((value) => value >= 200 && value < 300 && value % 10 === 0)
    .sort((a, b) => a - b);

  if (canonicalBaseCodes.length > 0) {
    return canonicalBaseCodes[0] ?? null;
  }

  const fallbackBaseCodes = candidates
    .filter((value) => value >= 200 && value < 300)
    .sort((a, b) => a - b);

  if (fallbackBaseCodes.length > 0) {
    return fallbackBaseCodes[0] ?? null;
  }

  return candidates.sort((a, b) => a - b)[0] ?? null;
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
export interface DisciplineSuggestion {
  id: number;
  name: string;
}

export async function getDisciplinesForCompetition(
  competitionName: string,
  prismaInstance: PrismaClientType,
  levelHint?: string,
  genderFilter?: 'male' | 'female' | 'mixed' | 'unknown'
): Promise<DisciplineSuggestion[]> {
  const name = competitionName.toLowerCase();
  const allDisciplines = await prismaInstance.tfx_disziplinen.findMany({
    select: { int_disziplinenid: true, var_name: true, bol_m: true, bol_w: true }
  });

  // Determine effective gender: use explicit filter or detect from name
  const detectedGender = detectGenderFromName(competitionName);
  const effectiveGender = genderFilter && genderFilter !== 'unknown' ? genderFilter : detectedGender;

  // Filter disciplines by gender (bol_m / bol_w)
  const genderFilteredDisciplines = allDisciplines.filter(d => {
    if (!d.var_name) return false;
    if (effectiveGender === 'male') return d.bol_m === true;
    if (effectiveGender === 'female') return d.bol_w === true;
    return true; // unknown/mixed — show all
  });

  const disciplineMap = new Map(genderFilteredDisciplines.map(d => [d.var_name!, d.int_disziplinenid]));
  const disciplineNames = Array.from(disciplineMap.keys());

  const gender = effectiveGender;

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
  const matched: DisciplineSuggestion[] = [];
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
        matched.push({ id: disciplineMap.get(withLevel)!, name: withLevel });
        continue;
      }
    }

    // Second try: exact name match
    const exact = disciplineNames.find(d => d === base);
    if (exact) {
      matched.push({ id: disciplineMap.get(exact)!, name: exact });
      continue;
    }

    // Third try: starts-with match (e.g. "Boden" matches "Boden m." or "Boden w.")
    const startsWith = disciplineNames.find(d => 
      d.toLowerCase().startsWith(base.toLowerCase())
    );
    if (startsWith) {
      matched.push({ id: disciplineMap.get(startsWith)!, name: startsWith });
    }
  }

  console.log(`[getDisciplinesForCompetition] "${competitionName}" → gender: ${effectiveGender}, base: [${baseApparatus.join(', ')}], level: "${levelSuffix}", matched: [${matched.map(m => m.name).join(', ')}]`);
  return matched;
}

