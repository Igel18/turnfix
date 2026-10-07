import prisma from '../lib/prisma';
import type { GymNetExportCompetition } from './gymnetXmlExport';

/** Load competition, participant and latest score data in GymNet export format. */
export async function loadGymNetExportPayload(
  eventId: number,
  competitionId: number | null,
): Promise<GymNetExportCompetition[]> {
  const competitionParams: any[] = [eventId];
  let competitionFilter = '';

  if (competitionId !== null) {
    competitionFilter = ' AND w.int_wettkaempfeid = $2';
    competitionParams.push(competitionId);
  }

  const competitions = await prisma.$queryRawUnsafe(`
    SELECT
      w.int_wettkaempfeid,
      COALESCE(w.var_nummer, '') AS var_nummer,
      COALESCE(w.var_name, '') AS var_name,
      w.yer_von,
      w.yer_bis,
      COALESCE(b.bol_maennlich, true) AS bol_maennlich,
      COALESCE(b.bol_weiblich, true) AS bol_weiblich
    FROM tfx_wettkaempfe w
    JOIN tfx_bereiche b ON b.int_bereicheid = w.int_bereicheid
    WHERE w.int_veranstaltungenid = $1${competitionFilter}
    ORDER BY w.int_wettkaempfeid ASC
  `, ...competitionParams) as any[];

  if (competitions.length === 0) return [];

  const competitionIds = competitions.map(row => row.int_wettkaempfeid as number);
  const [disciplineRows, participantRows, scoreRows] = await Promise.all([
    prisma.$queryRawUnsafe(`
      SELECT
        wxd.int_wettkaempfeid,
        d.int_disziplinenid,
        COALESCE(d.var_name, '') AS var_name,
        COALESCE(wxd.int_sortierung, 999) AS int_sortierung
      FROM tfx_wettkaempfe_x_disziplinen wxd
      JOIN tfx_disziplinen d ON d.int_disziplinenid = wxd.int_disziplinenid
      WHERE wxd.int_wettkaempfeid = ANY($1::int[])
      ORDER BY wxd.int_wettkaempfeid, COALESCE(wxd.int_sortierung, 999), d.int_disziplinenid
    `, competitionIds) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      SELECT
        wr.int_wettkaempfeid,
        t.int_teilnehmerid,
        COALESCE(t.var_vorname, '') AS var_vorname,
        COALESCE(t.var_nachname, '') AS var_nachname,
        t.dat_geburtstag,
        t.int_geschlecht,
        v.int_vereineid,
        COALESCE(v.var_name, '') AS club_name,
        wr.int_startnummer,
        COALESCE(wr.bol_ak, false) AS bol_ak,
        COALESCE(wr.bol_startet_nicht, false) AS bol_startet_nicht
      FROM tfx_wertungen wr
      JOIN tfx_teilnehmer t ON t.int_teilnehmerid = wr.int_teilnehmerid
      LEFT JOIN tfx_vereine v ON v.int_vereineid = t.int_vereineid
      WHERE wr.int_wettkaempfeid = ANY($1::int[])
      ORDER BY wr.int_wettkaempfeid, wr.int_startnummer NULLS LAST, t.var_nachname, t.var_vorname
    `, competitionIds) as Promise<any[]>,
    prisma.$queryRawUnsafe(`
      WITH latest_scores AS (
        SELECT
          wr.int_wettkaempfeid,
          wr.int_teilnehmerid,
          wd.int_disziplinenid,
          wd.rel_leistung,
          ROW_NUMBER() OVER (
            PARTITION BY wr.int_wettkaempfeid, wr.int_teilnehmerid, wd.int_disziplinenid
            ORDER BY COALESCE(wd.int_versuch, 0) DESC, wd.int_wertungen_detailsid DESC
          ) AS rn
        FROM tfx_wertungen_details wd
        JOIN tfx_wertungen wr ON wr.int_wertungenid = wd.int_wertungenid
        WHERE wr.int_wettkaempfeid = ANY($1::int[])
          AND COALESCE(wd.int_kp, 0) = 0
      )
      SELECT int_wettkaempfeid, int_teilnehmerid, int_disziplinenid, rel_leistung
      FROM latest_scores
      WHERE rn = 1
    `, competitionIds) as Promise<any[]>,
  ]);

  const disciplinesByCompetition = new Map<number, any[]>();
  for (const row of disciplineRows) {
    const disciplines = disciplinesByCompetition.get(row.int_wettkaempfeid) ?? [];
    disciplines.push(row);
    disciplinesByCompetition.set(row.int_wettkaempfeid, disciplines);
  }

  const scoreByParticipantAndDiscipline = new Map<string, number | null>();
  for (const row of scoreRows) {
    const key = `${row.int_wettkaempfeid}:${row.int_teilnehmerid}:${row.int_disziplinenid}`;
    scoreByParticipantAndDiscipline.set(key, row.rel_leistung ?? null);
  }

  const participantsByCompetition = new Map<number, any[]>();
  for (const row of participantRows) {
    const participants = participantsByCompetition.get(row.int_wettkaempfeid) ?? [];
    participants.push(row);
    participantsByCompetition.set(row.int_wettkaempfeid, participants);
  }

  return competitions.map(competition => {
    const disciplines = disciplinesByCompetition.get(competition.int_wettkaempfeid) ?? [];
    const participants = participantsByCompetition.get(competition.int_wettkaempfeid) ?? [];

    return {
      competitionId: competition.int_wettkaempfeid,
      competitionNumber: competition.var_nummer,
      competitionName: competition.var_name,
      genderMale: competition.bol_maennlich === true,
      genderFemale: competition.bol_weiblich === true,
      ageFrom: Number(competition.yer_von || 0),
      ageTo: competition.yer_bis !== null && competition.yer_bis !== undefined ? Number(competition.yer_bis) : null,
      participants: participants.map(participant => ({
        participantId: participant.int_teilnehmerid,
        firstName: participant.var_vorname,
        lastName: participant.var_nachname,
        birthDate: participant.dat_geburtstag,
        gender: participant.int_geschlecht,
        clubId: participant.int_vereineid,
        clubName: participant.club_name,
        startNumber: participant.int_startnummer,
        isOutOfCompetition: participant.bol_ak === true,
        isAbsent: participant.bol_startet_nicht === true,
        disciplines: disciplines.map((discipline, index) => {
          const key = `${competition.int_wettkaempfeid}:${participant.int_teilnehmerid}:${discipline.int_disziplinenid}`;
          return {
            disciplineId: discipline.int_disziplinenid,
            name: discipline.var_name,
            position: index + 1,
            score: scoreByParticipantAndDiscipline.get(key) ?? null,
          };
        }),
      })),
    } satisfies GymNetExportCompetition;
  });
}
