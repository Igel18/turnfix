/**
 * GymNet XML Parser — Extracts structured data from DTB GymNet XML files.
 *
 * Responsible for:
 *   - Parsing raw XML into JavaScript objects
 *   - Walking the XML tree to find competitions, clubs, participants, devices, teams
 *   - Mapping GymNet-specific field names (waID, perVorname, etc.) to internal structures
 *
 * This module is pure data extraction — no database operations.
 *
 * Extracted from events.ts as part of SoC refactoring.
 */

import { parseString } from 'xml2js';

// ============================================================================
// Types
// ============================================================================

export interface TeamData {
  clubName: string;
  competitionNumber: string | null;
  participants: { firstName: string; lastName: string; birthDate?: string }[];
}

export interface ExtractedData {
  clubs: any[];
  competitions: any[];
  participants: any[];
  devices: any[];
  teams: TeamData[];
}

export interface CompetitionContext {
  waID: string;
  waNr: string;
  name: string;
  path: string;
}

// ============================================================================
// XML Parsing
// ============================================================================

/**
 * Parse an XML string into a JavaScript object using xml2js.
 */
export function parseXmlAsync(xml: string, options?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// ============================================================================
// Debug / Analysis Helpers
// ============================================================================

/**
 * Deep analysis of an XML object structure for debugging.
 */
export function analyzeObject(obj: any, path: string = '', depth: number = 0): any {
  const analysis: any = {};

  if (depth > 5) return '... (max depth reached)';

  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      analysis.type = 'array';
      analysis.length = obj.length;
      if (obj.length > 0) {
        analysis.firstElement = analyzeObject(obj[0], `${path}[0]`, depth + 1);
      }
    } else {
      analysis.type = 'object';
      analysis.keys = Object.keys(obj);
      analysis.properties = {};

      Object.keys(obj).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;
        analysis.properties[key] = analyzeObject(obj[key], currentPath, depth + 1);
      });
    }
  } else {
    analysis.type = typeof obj;
    analysis.value = String(obj).substring(0, 100);
  }

  return analysis;
}

/**
 * Search for keys by name in a parsed XML object.
 */
export function findInObject(obj: any, searchKeys: string[]): any {
  const results: any = {};

  const search = (current: any, path: string = '') => {
    if (typeof current === 'object' && current !== null) {
      Object.keys(current).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;

        searchKeys.forEach(searchKey => {
          if (key.toLowerCase().includes(searchKey.toLowerCase()) ||
            searchKey.toLowerCase().includes(key.toLowerCase())) {
            if (!results[searchKey]) results[searchKey] = [];
            results[searchKey].push({
              path: currentPath,
              value: current[key],
              type: Array.isArray(current[key]) ? 'array' : typeof current[key]
            });
          }
        });

        if (Array.isArray(current[key])) {
          current[key].forEach((item: any, index: number) => {
            search(item, `${currentPath}[${index}]`);
          });
        } else if (typeof current[key] === 'object') {
          search(current[key], currentPath);
        }
      });
    }
  };

  search(obj);
  return results;
}

// ============================================================================
// Data Extraction — Sub-Functions
// ============================================================================

/**
 * Extract team data from a Mannschaft (team) XML node.
 */
function extractTeamFromMannschaft(
  team: any,
  competitionCtx: CompetitionContext | null,
  teams: TeamData[]
): void {
  let teamClubName: string | null = null;
  if (team.verKurzname) teamClubName = team.verKurzname;
  else if (team.verName) teamClubName = team.verName;
  else if (team.var_name) teamClubName = team.var_name;

  if (!teamClubName || !team.Teilnehmer) return;

  const teilnehmerData = team.Teilnehmer;
  if (!teilnehmerData.TN) return;

  const participants = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
  // Only create a team if there are multiple participants (team competition)
  if (participants.length > 1) {
    const teamEntry: TeamData = {
      clubName: teamClubName,
      competitionNumber: competitionCtx?.waNr || null,
      participants: participants.map((p: any) => ({
        firstName: p.perVorname?.trim() || '',
        lastName: p.perName?.trim() || '',
        birthDate: p.perGeburt || undefined
      }))
    };
    teams.push(teamEntry);
    console.log(`  🏅 Team detected: ${teamClubName} with ${participants.length} members (competition: ${competitionCtx?.waNr || 'unknown'})`);
  }
}

/**
 * Extract clubs/vereins from XML data.
 */
function extractClubs(data: any, currentPath: string, clubs: any[]): void {
  const items = Array.isArray(data) ? data : [data];
  items.forEach((item, index) => {
    if (item && typeof item === 'object') {
      const club: any = {};
      Object.keys(item).forEach(key => {
        if (key.toLowerCase().includes('name') ||
          key.toLowerCase().includes('verein') ||
          key.toLowerCase().includes('club') ||
          key.toLowerCase().includes('kurzname') ||
          key.toLowerCase().includes('team')) {
          club.name = item[key];
        }
        if (key.toLowerCase().includes('id') ||
          key.toLowerCase().includes('verid')) {
          club.id = item[key];
        }
        if (key.toLowerCase().includes('code') ||
          key.toLowerCase().includes('abbreviation') ||
          key.toLowerCase().includes('kennung') ||
          key.toLowerCase().includes('dtbkennung')) {
          club.code = item[key];
        }
      });
      if (Object.keys(club).length > 0) {
        club._source = Array.isArray(data) ? `${currentPath}[${index}]` : currentPath;
        clubs.push(club);
      }
    }
  });
}

/**
 * Extract competition fields from a single competition object.
 * Handles DTB GymNet specific and generic field mappings.
 */
function extractCompetitionFields(item: any): any {
  const competition: any = {};
  Object.keys(item).forEach(key => {
    // DTB GymNet specific field mappings (prioritize these)
    if (key === 'waName') {
      competition.name = item[key];
    } else if (key === 'waID') {
      competition.id = item[key];
    } else if (key === 'waNr') {
      competition.waNr = item[key];
      competition.number = item[key];
    } else if (key === 'waGeschlecht') {
      const genderValue = String(item[key]);
      if (genderValue === '1') competition.gender = 'männlich';
      else if (genderValue === '2') competition.gender = 'weiblich';
      else competition.gender = 'mixed';
    } else if (key === 'waAlterMin') {
      if (!competition.ageInfo) competition.ageInfo = {};
      competition.ageInfo.min = parseInt(item[key]) || 0;
    } else if (key === 'waAlterMax') {
      if (!competition.ageInfo) competition.ageInfo = {};
      competition.ageInfo.max = parseInt(item[key]) || 0;
    } else if (key === 'waAnzahlMin') {
      if (!competition.teamInfo) competition.teamInfo = {};
      competition.teamInfo.min = parseInt(item[key]) || 0;
    } else if (key === 'waAnzahlMax') {
      if (!competition.teamInfo) competition.teamInfo = {};
      competition.teamInfo.max = parseInt(item[key]) || 0;
    }
    // Generic field mappings (fallback)
    else if (key.toLowerCase().includes('name') ||
      key.toLowerCase().includes('title') ||
      key.toLowerCase().includes('bezeichnung') ||
      key.toLowerCase().includes('wettkampf')) {
      if (!competition.name) competition.name = item[key];
    } else if (key.toLowerCase().includes('id')) {
      if (!competition.id) competition.id = item[key];
    }
    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('datum')) {
      competition.date = item[key];
    }
    if (key.toLowerCase().includes('category') || key.toLowerCase().includes('kategorie')) {
      competition.category = item[key];
    }
    // Extract competition number/waNr (generic)
    if (!competition.waNr && (key.toLowerCase().includes('wanr') ||
      key.toLowerCase().includes('wageschlechtnr') ||
      key.toLowerCase().includes('competitionnumber') ||
      key.toLowerCase().includes('wettbewerbnr') ||
      key.toLowerCase().includes('number'))) {
      competition.waNr = item[key];
      competition.number = item[key];
    }
    // Fallback gender
    if (!competition.gender && (key.toLowerCase().includes('geschlecht') ||
      key.toLowerCase().includes('gender') || key.toLowerCase().includes('sex'))) {
      competition.gender = item[key];
    }
    // Fallback age
    if (key.toLowerCase().includes('alter') && key !== 'waAlterMin' && key !== 'waAlterMax') {
      if (!competition.ageInfo) competition.ageInfo = {};
      if (key.toLowerCase().includes('min') || key.toLowerCase().includes('von')) {
        competition.ageInfo.min = parseInt(item[key]) || 0;
      } else if (key.toLowerCase().includes('max') || key.toLowerCase().includes('bis')) {
        competition.ageInfo.max = parseInt(item[key]) || 0;
      } else {
        const ageStr = String(item[key]);
        const ageMatch = ageStr.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (ageMatch) {
          competition.ageInfo.min = parseInt(ageMatch[1]);
          competition.ageInfo.max = parseInt(ageMatch[2]);
        }
      }
    }
  });
  return competition;
}

/**
 * Extract competitions from XML data.
 */
function extractCompetitions(data: any, currentPath: string, competitions: any[]): void {
  const items = Array.isArray(data) ? data : [data];
  items.forEach((item, index) => {
    if (item && typeof item === 'object') {
      const competition = extractCompetitionFields(item);
      if (Object.keys(competition).length > 0) {
        competition._source = Array.isArray(data) ? `${currentPath}[${index}]` : currentPath;
        competitions.push(competition);
      }
    }
  });
}

/**
 * Extract participant fields from a single participant object.
 */
function extractParticipantFields(item: any): any {
  const participant: any = {};
  Object.keys(item).forEach(key => {
    // DTB GymNet specific
    if (key === 'perVorname') participant.firstName = item[key];
    else if (key === 'perName') participant.lastName = item[key];
    else if (key === 'perGeburt') participant.birthDate = item[key];
    else if (key === 'perGeschlecht') participant.gender = item[key];
    else if (key === 'perID') participant.id = item[key];
    // Generic fallback
    else if (key.toLowerCase().includes('firstname') || key.toLowerCase().includes('vorname')) {
      if (!participant.firstName) participant.firstName = item[key];
    } else if ((key.toLowerCase().includes('name') || key.toLowerCase().includes('nachname') ||
      key.toLowerCase().includes('lastname')) &&
      !key.toLowerCase().includes('vorname') && !key.toLowerCase().includes('firstname')) {
      if (!participant.lastName) participant.lastName = item[key];
    }
    if (key.toLowerCase().includes('id') || key.toLowerCase().includes('tnid') ||
      key.toLowerCase().includes('perid')) {
      if (!participant.id) participant.id = item[key];
    }
    if (key.toLowerCase().includes('birth') || key.toLowerCase().includes('geburt') ||
      key.toLowerCase().includes('geburts')) {
      if (!participant.birthDate) participant.birthDate = item[key];
    }
    if (key.toLowerCase().includes('sex') || key.toLowerCase().includes('gender') ||
      key.toLowerCase().includes('geschlecht')) {
      if (!participant.gender) participant.gender = item[key];
    }
    if (key.toLowerCase().includes('club') || key.toLowerCase().includes('verein') ||
      key.toLowerCase().includes('team') || key.toLowerCase().includes('organization') ||
      key.toLowerCase().includes('organisation')) {
      participant.club = item[key];
    }
    if (key.toLowerCase().includes('wanr') || key.toLowerCase().includes('wageschlechtnr') ||
      key.toLowerCase().includes('competitionnumber') || key.toLowerCase().includes('wettbewerbnr') ||
      key.toLowerCase().includes('competition')) {
      participant.competitionNumber = item[key];
    }
  });
  return participant;
}

/**
 * Extract participants from XML data.
 */
function extractParticipants(data: any, currentPath: string, participants: any[]): void {
  const items = Array.isArray(data) ? data : [data];
  items.forEach((item, index) => {
    if (item && typeof item === 'object') {
      const participant = extractParticipantFields(item);
      if (Object.keys(participant).length > 0) {
        participant._source = Array.isArray(data) ? `${currentPath}[${index}]` : currentPath;
        participants.push(participant);
      }
    }
  });
}

/**
 * Extract devices/apparatus/disciplines from XML data.
 */
function extractDevices(
  data: any,
  currentPath: string,
  devices: any[],
  competitionCtx?: CompetitionContext | null
): void {
  const items = Array.isArray(data) ? data : [data];
  items.forEach((item, index) => {
    if (Array.isArray(item)) {
      // Nested array – flatten and recurse
      extractDevices(item, `${currentPath}[${index}]`, devices, competitionCtx);
      return;
    }
    if (item && typeof item === 'object') {
      const device: any = {};
      Object.keys(item).forEach(key => {
        if (key.toLowerCase().includes('name') || key.toLowerCase().includes('gerät') ||
          key.toLowerCase().includes('apparatus') || key.toLowerCase().includes('discipline') ||
          key.toLowerCase().includes('disziplin') || key.toLowerCase().includes('bezeichnung') ||
          key.toLowerCase().includes('weddisname')) {
          device.name = item[key];
        }
        if (key.toLowerCase().includes('disid') || key.toLowerCase().includes('gerid') ||
          key.toLowerCase().includes('weddisid')) {
          device.id = item[key];
        }
        if (key.toLowerCase().includes('code') || key.toLowerCase().includes('abbreviation') ||
          key.toLowerCase().includes('kuerzel') || key.toLowerCase().includes('kurz') ||
          key.toLowerCase().includes('weddisnr')) {
          device.code = item[key];
        }
        if (key.toLowerCase().includes('reihenfolge') || key.toLowerCase().includes('order') ||
          key.toLowerCase().includes('folge') || key.toLowerCase().includes('position')) {
          device.order = item[key];
        }
      });
      if (Object.keys(device).length > 0) {
        device._source = Array.isArray(data) ? `${currentPath}[${index}]` : currentPath;
        if (competitionCtx) {
          device.competitionWaNr = competitionCtx.waNr;
          device.competitionName = competitionCtx.name;
        }
        devices.push(device);
      }
    }
  });
}

// ============================================================================
// Mannschaft Participant Processing Helper
// ============================================================================

/**
 * Process Teilnehmer within a Mannschaft node: assign club & competition context.
 */
function processMannschaftParticipants(
  team: any,
  teamClubName: string | null,
  competitionCtx: CompetitionContext | null,
  participants: any[],
  currentPath: string
): void {
  if (!team.Teilnehmer) return;
  const teilnehmerData = team.Teilnehmer;
  if (!teilnehmerData.TN) return;

  const pList = Array.isArray(teilnehmerData.TN) ? teilnehmerData.TN : [teilnehmerData.TN];
  pList.forEach((participant: any) => {
    if (teamClubName && !participant.club) participant.club = teamClubName;
    if (competitionCtx) {
      participant.competitionNumber = competitionCtx.waNr;
      participant.competitionID = competitionCtx.waID;
      participant._competitionContext = competitionCtx;
      console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${competitionCtx.waNr}, club: ${teamClubName || 'unknown'}`);
    }
    extractParticipants([participant], currentPath, participants);
  });
}

/**
 * Get the club name from a Mannschaft node.
 */
function getMannschaftClubName(team: any): string | null {
  if (team.verKurzname) return team.verKurzname;
  if (team.verName) return team.verName;
  if (team.var_name) return team.var_name;
  return null;
}

/**
 * Process a single Mannschaft node: extract team, club, participants.
 */
function processSingleMannschaft(
  team: any,
  competitionCtx: CompetitionContext | null,
  result: ExtractedData,
  currentPath: string,
  processNode: (node: any, path: string, ctx: CompetitionContext | null) => void
): void {
  extractTeamFromMannschaft(team, competitionCtx, result.teams);
  const teamClubName = getMannschaftClubName(team);
  processMannschaftParticipants(team, teamClubName, competitionCtx, result.participants, currentPath);
  processNode(team, currentPath, competitionCtx);
}

// ============================================================================
// Main Recursive XML Tree Walker
// ============================================================================

/**
 * Recursively walk the XML tree and extract all data.
 */
function processNode(
  node: any,
  path: string,
  competitionContext: CompetitionContext | null,
  result: ExtractedData
): void {
  if (!node || typeof node !== 'object') return;

  Object.keys(node).forEach(key => {
    const value = node[key];
    const currentPath = path ? `${path}.${key}` : key;

    // Check if we're entering a competition context (DTB GymNet structure)
    let currentCompetitionContext = competitionContext;
    if (node.waID && node.waNr) {
      currentCompetitionContext = {
        waID: node.waID,
        waNr: node.waNr,
        name: node.waBezeichnung || node.waName || node.Name || '',
        path: currentPath
      };
      console.log(`🏆 Processing competition: ${currentCompetitionContext.name} (waNr: ${currentCompetitionContext.waNr})`);
      extractCompetitions([node], currentPath, result.competitions);
    }

    // Handle DTB GymNet specific structures
    if (key.toLowerCase() === 'wettkampf' || key.toLowerCase() === 'wettkämpfe') {
      if (Array.isArray(value)) {
        value.forEach((comp: any, index: number) => {
          processNode(comp, `${currentPath}[${index}]`, null, result);
        });
      } else if (value && typeof value === 'object' && value.Wettkampf) {
        const wks = Array.isArray(value.Wettkampf) ? value.Wettkampf : [value.Wettkampf];
        wks.forEach((comp: any, index: number) => {
          processNode(comp, `${currentPath}.Wettkampf[${index}]`, null, result);
        });
      } else {
        processNode(value, currentPath, null, result);
      }
    }

    else if (key.toLowerCase() === 'mannschaft' || key.toLowerCase() === 'mannschaften') {
      const processTeams = (teams: any[], basePath: string) => {
        extractClubs(teams, basePath, result.clubs);
        teams.forEach((team: any, index: number) => {
          processSingleMannschaft(
            team, currentCompetitionContext, result,
            `${basePath}[${index}]`,
            (n, p, ctx) => processNode(n, p, ctx, result)
          );
        });
      };

      if (Array.isArray(value)) {
        processTeams(value, currentPath);
      } else if (value && typeof value === 'object' && value.Mannschaft) {
        const teams = Array.isArray(value.Mannschaft) ? value.Mannschaft : [value.Mannschaft];
        processTeams(teams, `${currentPath}.Mannschaft`);
      } else {
        // Single Mannschaft object (not wrapped in array/container)
        extractClubs([value], currentPath, result.clubs);
        processSingleMannschaft(
          value, currentCompetitionContext, result, currentPath,
          (n, p, ctx) => processNode(n, p, ctx, result)
        );
      }
    }

    else if (key.toLowerCase() === 'teilnehmer') {
      if (value && typeof value === 'object' && value.TN) {
        const pList = Array.isArray(value.TN) ? value.TN : [value.TN];
        pList.forEach((participant: any) => {
          if (currentCompetitionContext) {
            participant.competitionNumber = currentCompetitionContext.waNr;
            participant.competitionID = currentCompetitionContext.waID;
            participant._competitionContext = currentCompetitionContext;
            console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}`);
          }
          extractParticipants([participant], currentPath, result.participants);
        });
      }
    }

    else if (key.toLowerCase() === 'tn') {
      const participant = { ...value };
      if (currentCompetitionContext) {
        participant.competitionNumber = currentCompetitionContext.waNr;
        participant.competitionID = currentCompetitionContext.waID;
        participant._competitionContext = currentCompetitionContext;
        console.log(`  👤 Found participant ${participant.perVorname} ${participant.perName} in competition ${currentCompetitionContext.waNr}`);
      }
      extractParticipants([participant], currentPath, result.participants);
    }

    else if (key.toLowerCase() === 'disziplin') {
      const items = Array.isArray(value) ? value : [value];
      extractDevices(items, currentPath, result.devices, currentCompetitionContext);
    }

    else if (key.toLowerCase() === 'disziplinen') {
      if (value && typeof value === 'object') {
        if (value.Disziplin) {
          const disziplinen = Array.isArray(value.Disziplin) ? value.Disziplin : [value.Disziplin];
          extractDevices(disziplinen, `${currentPath}.Disziplin`, result.devices, currentCompetitionContext);
        } else {
          processNode(value, currentPath, currentCompetitionContext, result);
        }
      }
    }

    // Continue recursive processing
    else if (Array.isArray(value)) {
      value.forEach((item: any, index: number) => {
        if (typeof item === 'object') {
          processNode(item, `${currentPath}[${index}]`, currentCompetitionContext, result);
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      processNode(value, currentPath, currentCompetitionContext, result);
    }
  });
}

// ============================================================================
// Aggressive Device Search (fallback when normal extraction finds nothing)
// ============================================================================

/**
 * Aggressive fallback search for device/discipline data in the XML tree.
 */
export function searchForDevicesAggressively(obj: any, path: string = ''): any[] {
  const foundDevices: any[] = [];
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const keyLower = key.toLowerCase();
      if (keyLower.includes('gerät') || keyLower.includes('apparatus') ||
        keyLower.includes('disziplin') || keyLower.includes('discipline') ||
        keyLower.includes('device') || keyLower.includes('sport')) {
        console.log(`  🎯 Found potential device key: "${key}" at path: ${path}.${key}`);
        if (obj[key]) {
          foundDevices.push({ key, value: obj[key], path: `${path}.${key}` });
        }
      }
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any, index: number) => {
          foundDevices.push(...searchForDevicesAggressively(item, `${path}.${key}[${index}]`));
        });
      } else if (obj[key] && typeof obj[key] === 'object') {
        foundDevices.push(...searchForDevicesAggressively(obj[key], `${path}.${key}`));
      }
    });
  }
  return foundDevices;
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Extract all structured data from a parsed GymNet XML object.
 *
 * @param parsedXml The XML object parsed by xml2js
 * @returns ExtractedData with clubs, competitions, participants, devices, teams
 */
export function extractAllData(parsedXml: any): ExtractedData {
  const result: ExtractedData = {
    clubs: [],
    competitions: [],
    participants: [],
    devices: [],
    teams: []
  };

  processNode(parsedXml, '', null, result);
  return result;
}
