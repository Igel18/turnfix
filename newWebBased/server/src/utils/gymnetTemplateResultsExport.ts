import { Builder } from 'xml2js';
import { parseXmlAsync } from './gymnetXmlParser';
import type { GymNetExportCompetition, GymNetExportParticipant } from './gymnetXmlExport';

interface MergeStats {
  competitionsMatched: number;
  participantsMatched: number;
  disciplineScoresWritten: number;
}

export interface GymNetMatchReport {
  summary: MergeStats & {
    competitionsUnmatched: number;
    participantsUnmatched: number;
    disciplinesUnmatched: number;
  };
  unmatchedCompetitions: string[];
  unmatchedParticipants: string[];
  unmatchedDisciplines: string[];
}

const MAX_REPORT_ITEMS = 100;

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDateKey(value: unknown): string {
  const input = String(value || '').trim();
  if (!input) return '';

  const dmyMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return '';
}

function formatScore(score: number | null): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return '';
  }

  return Number(score).toFixed(3);
}

function findCompetitionNode(parsed: any): any[] {
  return toArray(parsed?.Wettkämpfe?.Wettkampf);
}

function findParticipantMatch(
  candidates: GymNetExportParticipant[],
  templateParticipant: any
): GymNetExportParticipant | null {
  const templateLastName = normalizeText(templateParticipant?.perName);
  const templateFirstName = normalizeText(templateParticipant?.perVorname);
  const templateClub = normalizeText(templateParticipant?.verKurzname || templateParticipant?.verName);
  const templateBirthDate = normalizeDateKey(templateParticipant?.perGeburt);

  const nameMatches = candidates.filter(candidate =>
    normalizeText(candidate.lastName) === templateLastName &&
    normalizeText(candidate.firstName) === templateFirstName
  );

  if (nameMatches.length === 0) {
    return null;
  }

  const clubMatches = templateClub
    ? nameMatches.filter(candidate => normalizeText(candidate.clubName) === templateClub)
    : nameMatches;

  if (clubMatches.length === 1) {
    return clubMatches[0];
  }

  if (clubMatches.length > 1 && templateBirthDate) {
    const withBirthDate = clubMatches.filter(candidate =>
      normalizeDateKey(candidate.birthDate) === templateBirthDate
    );
    if (withBirthDate.length > 0) {
      return withBirthDate[0];
    }
  }

  if (clubMatches.length > 0) {
    return clubMatches[0];
  }

  if (templateBirthDate) {
    const withBirthDate = nameMatches.filter(candidate =>
      normalizeDateKey(candidate.birthDate) === templateBirthDate
    );
    if (withBirthDate.length > 0) {
      return withBirthDate[0];
    }
  }

  return nameMatches[0];
}

function findCompetitionMatch(
  exportCompetitions: GymNetExportCompetition[],
  templateCompetition: any
): GymNetExportCompetition | null {
  const templateWaNr = normalizeText(templateCompetition?.waNr);
  const templateName = normalizeText(templateCompetition?.waBezeichnung || templateCompetition?.waName);

  if (templateWaNr) {
    const byNumber = exportCompetitions.find(comp => normalizeText(comp.competitionNumber) === templateWaNr);
    if (byNumber) {
      return byNumber;
    }
  }

  if (templateName) {
    const byName = exportCompetitions.find(comp => normalizeText(comp.competitionName) === templateName);
    if (byName) {
      return byName;
    }
  }

  return null;
}

export async function mergeGymNetTemplateWithResults(
  templateXml: string,
  exportCompetitions: GymNetExportCompetition[]
): Promise<{ xml: string; stats: MergeStats; report: GymNetMatchReport }> {
  const parsed = await parseXmlAsync(templateXml, {
    explicitArray: false,
    ignoreAttrs: false,
    mergeAttrs: true,
  });

  const competitionNodes = findCompetitionNode(parsed);
  const stats: MergeStats = {
    competitionsMatched: 0,
    participantsMatched: 0,
    disciplineScoresWritten: 0,
  };

  const unmatchedCompetitions: string[] = [];
  const unmatchedParticipants: string[] = [];
  const unmatchedDisciplines: string[] = [];

  const pushReportItem = (target: string[], value: string) => {
    if (target.length < MAX_REPORT_ITEMS) {
      target.push(value);
    }
  };

  competitionNodes.forEach((competitionNode) => {
    const matchedCompetition = findCompetitionMatch(exportCompetitions, competitionNode);
    if (!matchedCompetition) {
      const fallbackCompetition = String(competitionNode?.waNr || competitionNode?.waBezeichnung || competitionNode?.waName || 'Unknown competition');
      pushReportItem(unmatchedCompetitions, fallbackCompetition);
      return;
    }

    stats.competitionsMatched += 1;

    const participantNodes = toArray(competitionNode?.Teilnehmer?.TN);
    participantNodes.forEach((participantNode) => {
      const matchedParticipant = findParticipantMatch(matchedCompetition.participants, participantNode);
      if (!matchedParticipant) {
        const participantLabel = `${String(participantNode?.perVorname || '').trim()} ${String(participantNode?.perName || '').trim()}`.trim();
        const competitionLabel = String(competitionNode?.waNr || competitionNode?.waBezeichnung || competitionNode?.waName || 'Unknown competition');
        pushReportItem(unmatchedParticipants, `${competitionLabel}: ${participantLabel || 'Unknown participant'}`);
        return;
      }

      stats.participantsMatched += 1;

      const disciplineNodes = toArray(participantNode?.Disziplinen?.Disziplin);
      disciplineNodes.forEach((disciplineNode) => {
        const templateDisciplineName = normalizeText(disciplineNode?.wedDisName || disciplineNode?.wedDisNr);
        if (!templateDisciplineName) {
          return;
        }

        const matchedDiscipline = matchedParticipant.disciplines.find(discipline =>
          normalizeText(discipline.name) === templateDisciplineName
        );

        if (!matchedDiscipline) {
          const disciplineLabel = String(disciplineNode?.wedDisName || disciplineNode?.wedDisNr || 'Unknown discipline');
          const participantLabel = `${matchedParticipant.firstName} ${matchedParticipant.lastName}`.trim();
          const competitionLabel = String(competitionNode?.waNr || competitionNode?.waBezeichnung || competitionNode?.waName || 'Unknown competition');
          pushReportItem(unmatchedDisciplines, `${competitionLabel} | ${participantLabel || 'Unknown participant'} | ${disciplineLabel}`);
          return;
        }

        disciplineNode.wtdPunkte = formatScore(matchedDiscipline.score);
        stats.disciplineScoresWritten += 1;
      });
    });
  });

  const builder = new Builder({
    xmldec: { version: '1.0', encoding: 'UTF-8' },
    renderOpts: { pretty: true, indent: '  ', newline: '\n' },
  });

  return {
    xml: builder.buildObject(parsed),
    stats,
    report: {
      summary: {
        ...stats,
        competitionsUnmatched: unmatchedCompetitions.length,
        participantsUnmatched: unmatchedParticipants.length,
        disciplinesUnmatched: unmatchedDisciplines.length,
      },
      unmatchedCompetitions,
      unmatchedParticipants,
      unmatchedDisciplines,
    },
  };
}
