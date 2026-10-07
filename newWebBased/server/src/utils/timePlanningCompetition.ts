export interface CompetitionScheduleEntry {
  id: number;
  name: string;
  number: string;
  round: number;
  int_bahn: number | null;
  startTime: string | null;
  startDate: string | null;
  warmupTime: string | null;
  warmupDate: string | null;
  disciplineCount: number;
  participantCount: number;
}

interface CompetitionScheduleSource {
  int_wettkaempfeid: number;
  var_name: string | null;
  var_nummer: string | null;
  int_durchgang: number | null;
  int_bahn: number | null;
  tim_startzeit: unknown;
  tim_einturnen: unknown;
  tfx_veranstaltungen?: { dat_von: Date | null } | null;
  _count: { tfx_wertungen: number };
}

function formatTimeValue(value: unknown): string | null {
  if (!value) return null;

  try {
    if (value instanceof Date) {
      const hours = String(value.getHours()).padStart(2, '0');
      const minutes = String(value.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    const timeMatch = String(value).match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;

    return `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  } catch {
    return null;
  }
}

function ensureWarmupBeforeStart(
  startTime: string | null,
  warmupTime: string | null,
): string | null {
  if (!startTime || !warmupTime) return warmupTime;

  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [warmupHour, warmupMinute] = warmupTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const warmupMinutes = warmupHour * 60 + warmupMinute;

  if (warmupMinutes < startMinutes) return warmupTime;

  const adjustedMinutes = Math.max(0, startMinutes - 30);
  const hours = Math.floor(adjustedMinutes / 60).toString().padStart(2, '0');
  const minutes = (adjustedMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function mapCompetitionToScheduleEntry(
  competition: CompetitionScheduleSource,
  disciplineCount: number,
): CompetitionScheduleEntry {
  const startTime = formatTimeValue(competition.tim_startzeit);
  const warmupTime = ensureWarmupBeforeStart(
    startTime,
    formatTimeValue(competition.tim_einturnen),
  );
  const eventDate = competition.tfx_veranstaltungen?.dat_von
    ? competition.tfx_veranstaltungen.dat_von.toISOString().split('T')[0]
    : null;

  return {
    id: competition.int_wettkaempfeid,
    name: competition.var_name || '',
    number: competition.var_nummer || '',
    round: competition.int_durchgang || 1,
    int_bahn: competition.int_bahn,
    startTime,
    startDate: eventDate,
    warmupTime,
    warmupDate: eventDate,
    disciplineCount,
    participantCount: competition._count.tfx_wertungen,
  };
}