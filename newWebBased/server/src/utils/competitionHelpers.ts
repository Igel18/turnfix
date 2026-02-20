/**
 * Competition Helpers — Shared transformation and utility functions for competitions.
 *
 * Extracted from competitions.ts (1186 lines → SoC refactoring).
 * Eliminates duplication of:
 *   - Status calculation (was 3×)
 *   - Gender ↔ Bereich mapping (was 3×)
 *   - Time field formatting (was 4×)
 *   - Age ↔ birth-year conversion (was 3×)
 *   - Competition DB→client transformation (was 3×)
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface BereichInfo {
  int_bereicheid: number;
  var_name: string;
  bol_maennlich: boolean;
  bol_weiblich: boolean;
}

export interface DisciplineLink {
  tfx_disziplinen: {
    int_disziplinenid: number;
    var_name: string;
    var_kurz1: string | null;
    var_kurz2: string | null;
    var_einheit: string | null;
    var_icon: string | null;
    bol_m: boolean;
    bol_w: boolean;
  };
  rel_max: number | null;
}

/** Minimal competition shape from Prisma includes */
export interface CompetitionRecord {
  int_wettkaempfeid: number;
  var_nummer: string | null;
  var_name: string;
  int_bereicheid: number;
  yer_von: number;
  yer_bis: number | null;
  int_typ: number | null;
  int_durchgang: number | null;
  int_bahn: number | null;
  int_qualifikation: number | null;
  int_wertungen: number | null;
  bol_streichwertung: boolean | null;
  bol_ak_anzeigen: boolean | null;
  bol_wahlwettkampf: boolean | null;
  bol_info_anzeigen: boolean | null;
  bol_kp: boolean | null;
  bol_sortasc: boolean | null;
  bol_mansort: boolean | null;
  bol_gerpkt: boolean | null;
  int_anz_streich: number | null;
  tim_startzeit: Date | null;
  tim_einturnen: Date | null;
  tfx_veranstaltungen: {
    dat_von: Date;
    dat_bis?: Date | null;
    dat_meldeschluss?: Date | null;
    var_veranstalter?: string | null;
    tfx_wettkampforte?: { var_name: string } | null;
  };
  tfx_wettkaempfe_x_disziplinen: DisciplineLink[];
  tfx_wertungen: any[];
}

// ============================================================================
// Status Calculation
// ============================================================================

/**
 * Determine competition status based on event date.
 * Returns 'active' (today), 'upcoming' (future), or 'completed' (past).
 */
export function getCompetitionStatus(eventDate: Date | null): string {
  if (!eventDate) return 'completed';

  const compDate = new Date(eventDate);
  const today = new Date();

  // Compare at day level
  today.setHours(0, 0, 0, 0);
  compDate.setHours(0, 0, 0, 0);

  if (compDate.getTime() === today.getTime()) return 'active';
  if (compDate > today) return 'upcoming';
  return 'completed';
}

// ============================================================================
// Gender ↔ Bereich Mapping
// ============================================================================

/** Derive client-facing gender string from bereich flags */
export function getGenderFromBereich(bereich: BereichInfo | null): string {
  if (!bereich) return 'gemischt';
  if (bereich.bol_maennlich && bereich.bol_weiblich) return 'gemischt';
  if (bereich.bol_maennlich) return 'männlich';
  if (bereich.bol_weiblich) return 'weiblich';
  return 'gemischt';
}

/** Resolve gender flags from client-facing gender string */
export function getGenderFlags(gender: string): { male: boolean; female: boolean; name: string } {
  if (gender === 'männlich' || gender === 'male') {
    return { male: true, female: false, name: 'Männlich' };
  }
  if (gender === 'weiblich' || gender === 'female') {
    return { male: false, female: true, name: 'Weiblich' };
  }
  return { male: true, female: true, name: 'Gemischt' };
}

/**
 * Resolve bereich by direct ID or gender string.
 * Creates a new bereich if none matches the gender flags.
 */
export async function resolveBereich(
  prisma: PrismaClient,
  options: { areaId?: number | null; gender?: string }
): Promise<BereichInfo> {
  // 1. Direct ID lookup
  if (options.areaId) {
    const bereich = await prisma.tfx_bereiche.findUnique({
      where: { int_bereicheid: options.areaId }
    });
    if (bereich) return bereich as BereichInfo;
    throw new Error(`Bereich with ID ${options.areaId} not found`);
  }

  // 2. Find or create by gender flags
  const flags = getGenderFlags(options.gender || 'gemischt');

  let bereich = await prisma.tfx_bereiche.findFirst({
    where: { bol_maennlich: flags.male, bol_weiblich: flags.female }
  });

  if (!bereich) {
    bereich = await prisma.tfx_bereiche.create({
      data: { var_name: flags.name, bol_maennlich: flags.male, bol_weiblich: flags.female }
    });
    console.log(`📍 Created new bereich: ${flags.name} (ID: ${bereich.int_bereicheid})`);
  }

  return bereich as BereichInfo;
}

// ============================================================================
// Time Formatting (local timezone — never UTC!)
// ============================================================================

/** Format a Date field to "HH:MM" string using local time, or null */
export function formatTime(time: Date | null): string | null {
  if (!time) return null;
  return `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
}

/** Format a Date field to "YYYY-MM-DD" string, or null */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/** Parse "HH:MM" + optional "YYYY-MM-DD" into a Date, using local time */
export function parseTimeInput(time: string | undefined, date?: string): Date | null {
  if (!time) return null;
  const [hours, minutes] = time.split(':');
  if (date) {
    const d = new Date(date);
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return d;
  }
  // TIME-only (PostgreSQL TIME column) — use epoch date with local hours
  return new Date(1970, 0, 1, parseInt(hours), parseInt(minutes), 0, 0);
}

// ============================================================================
// Age ↔ Birth-Year Conversion
// ============================================================================

/** Convert age to birth year based on event year */
export function ageToBirthYear(eventYear: number, age: number): number {
  return eventYear - age;
}

/** Convert birth year to age based on event year, with fallback */
export function birthYearToAge(eventYear: number, birthYear: number | null, fallback: number): number {
  return birthYear ? eventYear - birthYear : fallback;
}

// ============================================================================
// Competition Transformation (DB → Client)
// ============================================================================

/** Transform a competition list item for the GET / response */
export function transformCompetitionListItem(comp: CompetitionRecord, bereich: BereichInfo | null) {
  const eventDate = comp.tfx_veranstaltungen.dat_von || new Date();
  const eventYear = eventDate.getFullYear();

  const ageFrom = birthYearToAge(eventYear, comp.yer_von, 6);
  const ageTo = birthYearToAge(eventYear, comp.yer_bis, ageFrom + 10);

  return {
    id: comp.int_wettkaempfeid,
    number: comp.var_nummer || null,
    name: comp.var_name || 'Unnamed Competition',
    description: `${bereich?.var_name || ''} - Age ${Math.min(ageFrom, ageTo)}-${Math.max(ageFrom, ageTo)}`,
    date: formatDate(eventDate) || new Date().toISOString().split('T')[0],
    location: comp.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
    gender: getGenderFromBereich(bereich),
    areaId: bereich?.int_bereicheid || null,
    areaName: bereich?.var_name || null,
    ageFrom: Math.min(ageFrom, ageTo),
    ageTo: Math.max(ageFrom, ageTo),
    disciplines: comp.tfx_wettkaempfe_x_disziplinen.map((wd) => ({
      disciplineId: wd.tfx_disziplinen.int_disziplinenid,
      name: wd.tfx_disziplinen.var_name,
      short_name: wd.tfx_disziplinen.var_kurz1,
      apparatus: wd.tfx_disziplinen.var_einheit,
      maxScore: wd.rel_max || 0
    })),
    registrationDeadline: formatDate(comp.tfx_veranstaltungen.dat_meldeschluss || null),
    organizer: comp.tfx_veranstaltungen.var_veranstalter || 'TBD',

    // Competition settings
    round: comp.int_durchgang || 1,
    track: comp.int_bahn || 1,
    competitionType: comp.int_typ ?? 0,
    startTime: formatTime(comp.tim_startzeit),
    startDate: formatDate(comp.tim_startzeit),
    warmupTime: formatTime(comp.tim_einturnen),
    warmupDate: formatDate(comp.tim_einturnen),
    qualifiers: comp.int_qualifikation || 0,
    evaluations: comp.int_wertungen || 1,
    dropWorstScore: comp.bol_streichwertung || false,
    showAgeGroup: comp.bol_ak_anzeigen || false,
    isOptionalCompetition: comp.bol_wahlwettkampf || false,
    showInfo: comp.bol_info_anzeigen || false,
    useCompulsoryProgram: comp.bol_kp || false,
    sortAscending: comp.bol_sortasc || false,
    manualSort: comp.bol_mansort || false,
    useApparatusPoints: comp.bol_gerpkt || false,
    dropCount: comp.int_anz_streich || 0,

    status: getCompetitionStatus(eventDate),
    participantCount: comp.tfx_wertungen.length,
    createdAt: new Date().toISOString()
  };
}

/** Transform a single competition detail for the GET /:id response */
export function transformCompetitionDetail(comp: CompetitionRecord, bereich: BereichInfo | null) {
  const eventDate = comp.tfx_veranstaltungen.dat_von || new Date();
  const eventYear = eventDate.getFullYear();

  const ageFrom = birthYearToAge(eventYear, comp.yer_von, 6);
  const ageTo = birthYearToAge(eventYear, comp.yer_bis ?? comp.yer_von, ageFrom);

  return {
    id: comp.int_wettkaempfeid,
    number: comp.var_nummer || null,
    name: comp.var_name || 'Unnamed Competition',
    description: `${comp.var_name} - ${bereich?.var_name || ''}`,
    date: formatDate(eventDate),
    location: comp.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
    gender: getGenderFromBereich(bereich),
    areaId: bereich?.int_bereicheid || null,
    areaName: bereich?.var_name || null,
    ageFrom: Math.min(ageFrom, ageTo),
    ageTo: Math.max(ageFrom, ageTo),
    disciplines: comp.tfx_wettkaempfe_x_disziplinen.map((wd) => ({
      id: wd.tfx_disziplinen.int_disziplinenid,
      name: wd.tfx_disziplinen.var_name,
      short_name: wd.tfx_disziplinen.var_kurz1,
      apparatus: wd.tfx_disziplinen.var_einheit,
      male_allowed: wd.tfx_disziplinen.bol_m,
      female_allowed: wd.tfx_disziplinen.bol_w,
      icon: wd.tfx_disziplinen.var_icon,
      maxScore: wd.rel_max || 0
    })),
    startTime: formatTime(comp.tim_startzeit),
    startDate: formatDate(comp.tim_startzeit),
    warmupTime: formatTime(comp.tim_einturnen),
    warmupDate: formatDate(comp.tim_einturnen),
    maxParticipants: null,
    registrationDeadline: formatDate(comp.tfx_veranstaltungen.dat_meldeschluss || null),
    organizer: comp.tfx_veranstaltungen.var_veranstalter || 'TBD',

    // Competition settings
    round: comp.int_durchgang || 1,
    track: comp.int_bahn || 1,
    competitionType: comp.int_typ ?? 0,
    qualifiers: comp.int_qualifikation || 0,
    evaluations: comp.int_wertungen || 1,
    dropWorstScore: comp.bol_streichwertung || false,
    showAgeGroup: comp.bol_ak_anzeigen || false,
    isOptionalCompetition: comp.bol_wahlwettkampf || false,
    showInfo: comp.bol_info_anzeigen || false,
    useCompulsoryProgram: comp.bol_kp || false,
    sortAscending: comp.bol_sortasc || false,
    manualSort: comp.bol_mansort || false,
    useApparatusPoints: comp.bol_gerpkt || false,
    dropCount: comp.int_anz_streich || 0,

    status: getCompetitionStatus(eventDate),
    participantCount: comp.tfx_wertungen.length,
    createdAt: new Date().toISOString()
  };
}

/** Transform a filter-search result (lighter format) */
export function transformCompetitionFilter(comp: CompetitionRecord, bereich: BereichInfo | null) {
  const eventDate = comp.tfx_veranstaltungen.dat_von || new Date();

  const ageFrom = comp.yer_von;
  const ageTo = comp.yer_bis || comp.yer_von;

  return {
    id: comp.int_wettkaempfeid,
    name: comp.var_name || 'Unnamed Competition',
    description: `${comp.var_name} - ${bereich?.var_name || ''}`,
    date: formatDate(eventDate),
    location: comp.tfx_veranstaltungen.tfx_wettkampforte?.var_name || 'TBD',
    gender: getGenderFromBereich(bereich),
    areaId: bereich?.int_bereicheid || null,
    areaName: bereich?.var_name || null,
    ageFrom: Math.min(ageFrom, ageTo),
    ageTo: Math.max(ageFrom, ageTo),
    disciplines: comp.tfx_wettkaempfe_x_disziplinen.map((wd) => wd.tfx_disziplinen.int_disziplinenid),
    status: getCompetitionStatus(eventDate),
    participantCount: comp.tfx_wertungen.length
  };
}

/**
 * Build the update-data object from validated partial input.
 * Maps camelCase client fields → snake_case DB columns.
 */
export function buildUpdateData(
  validatedData: any,
  eventYear: number
): Record<string, any> {
  const updateData: Record<string, any> = {};

  if (validatedData.number !== undefined) updateData.var_nummer = validatedData.number || null;
  if (validatedData.name) updateData.var_name = validatedData.name;
  if (validatedData.round !== undefined) updateData.int_durchgang = validatedData.round;
  if (validatedData.track !== undefined) updateData.int_bahn = validatedData.track;
  if (validatedData.competitionType !== undefined) updateData.int_typ = validatedData.competitionType;

  // Time fields — local timezone only
  if (validatedData.startTime !== undefined) {
    updateData.tim_startzeit = parseTimeInput(validatedData.startTime || undefined);
  }
  if (validatedData.warmupTime !== undefined) {
    updateData.tim_einturnen = parseTimeInput(validatedData.warmupTime || undefined);
  }

  if (validatedData.qualifiers !== undefined) updateData.int_qualifikation = validatedData.qualifiers;
  if (validatedData.evaluations !== undefined) updateData.int_wertungen = validatedData.evaluations;
  if (validatedData.dropWorstScore !== undefined) updateData.bol_streichwertung = validatedData.dropWorstScore;
  if (validatedData.showAgeGroup !== undefined) updateData.bol_ak_anzeigen = validatedData.showAgeGroup;
  if (validatedData.isOptionalCompetition !== undefined) updateData.bol_wahlwettkampf = validatedData.isOptionalCompetition;
  if (validatedData.showInfo !== undefined) updateData.bol_info_anzeigen = validatedData.showInfo;
  if (validatedData.useCompulsoryProgram !== undefined) updateData.bol_kp = validatedData.useCompulsoryProgram;
  if (validatedData.sortAscending !== undefined) updateData.bol_sortasc = validatedData.sortAscending;
  if (validatedData.manualSort !== undefined) updateData.bol_mansort = validatedData.manualSort;
  if (validatedData.useApparatusPoints !== undefined) updateData.bol_gerpkt = validatedData.useApparatusPoints;
  if (validatedData.dropCount !== undefined) updateData.int_anz_streich = validatedData.dropCount;

  // Age → birth-year
  if (validatedData.ageFrom !== undefined) {
    updateData.yer_von = ageToBirthYear(eventYear, validatedData.ageFrom);
  }
  if (validatedData.ageTo !== undefined) {
    updateData.yer_bis = ageToBirthYear(eventYear, validatedData.ageTo);
  }

  return updateData;
}

/**
 * Build the response object after a PUT update.
 * Merges validated input with persisted DB values.
 */
export function buildUpdateResponse(
  id: number,
  validatedData: any,
  updatedCompetition: any,
  participantCount: number
): Record<string, any> {
  return {
    id,
    number: validatedData.number !== undefined ? validatedData.number : updatedCompetition.var_nummer || null,
    name: validatedData.name || updatedCompetition.var_name,
    description: validatedData.description || 'Updated competition',
    location: validatedData.location || 'Updated location',
    gender: validatedData.gender || 'gemischt',
    ageFrom: validatedData.ageFrom || 6,
    ageTo: validatedData.ageTo || 18,
    disciplines: validatedData.disciplines || [],
    registrationDeadline: validatedData.registrationDeadline || null,
    organizer: validatedData.organizer || 'Updated organizer',

    round: validatedData.round ?? updatedCompetition.int_durchgang ?? 1,
    track: validatedData.track ?? updatedCompetition.int_bahn ?? 1,
    competitionType: validatedData.competitionType ?? updatedCompetition.int_typ ?? 0,
    startTime: validatedData.startTime !== undefined
      ? validatedData.startTime
      : formatTime(updatedCompetition.tim_startzeit),
    startDate: null,
    warmupTime: validatedData.warmupTime !== undefined
      ? validatedData.warmupTime
      : formatTime(updatedCompetition.tim_einturnen),
    warmupDate: null,
    qualifiers: validatedData.qualifiers ?? updatedCompetition.int_qualifikation ?? 0,
    evaluations: validatedData.evaluations ?? updatedCompetition.int_wertungen ?? 1,
    dropWorstScore: validatedData.dropWorstScore ?? updatedCompetition.bol_streichwertung ?? false,
    showAgeGroup: validatedData.showAgeGroup ?? updatedCompetition.bol_ak_anzeigen ?? false,
    isOptionalCompetition: validatedData.isOptionalCompetition ?? updatedCompetition.bol_wahlwettkampf ?? false,
    showInfo: validatedData.showInfo ?? updatedCompetition.bol_info_anzeigen ?? false,
    useCompulsoryProgram: validatedData.useCompulsoryProgram ?? updatedCompetition.bol_kp ?? false,
    sortAscending: validatedData.sortAscending ?? updatedCompetition.bol_sortasc ?? false,
    manualSort: validatedData.manualSort ?? updatedCompetition.bol_mansort ?? false,
    useApparatusPoints: validatedData.useApparatusPoints ?? updatedCompetition.bol_gerpkt ?? false,
    dropCount: validatedData.dropCount ?? updatedCompetition.int_anz_streich ?? 0,

    status: 'upcoming',
    participantCount,
    updatedAt: new Date().toISOString()
  };
}
