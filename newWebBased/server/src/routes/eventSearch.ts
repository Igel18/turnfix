/**
 * Event Search Route
 *
 * GET /api/event-search/:eventId?q=<query>
 *
 * Searches within a single event for:
 *   - Participants (by name, start number, club name)
 *   - Competitions (by name, competition number)
 *   - Squads / Riegen (by squad name)
 *   - Disciplines (by name or abbreviation)
 *
 * Results are sorted by relevance:
 *   1. Start-number exact match (participant)
 *   2. Full-name exact match (participant)
 *   3. Full-name prefix match (participant)
 *   4. Competition exact/prefix match
 *   5. Squad match
 *   6. Discipline match
 *   7. Partial / club name match
 *
 * Minimum query length: 2 characters.
 * Response: { results: SearchResult[], query: string, eventId: number }
 */

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

interface SearchResult {
  type: 'participant' | 'competition' | 'squad' | 'discipline';
  id: string | number;
  title: string;
  subtitle: string;
  badge?: string;
  navigationPath: string;
  prefillSearch: string;
}

// ── Relevance scoring ──────────────────────────────────────────────────────

function scored(result: SearchResult, score: number): SearchResult & { _score: number } {
  return { ...result, _score: score };
}

// ── Route ──────────────────────────────────────────────────────────────────

router.get('/:eventId', async (req: Request, res: Response) => {
  const eventId = parseInt(req.params.eventId, 10);
  const query = (req.query.q as string | undefined)?.trim() ?? '';

  if (isNaN(eventId)) {
    return res.status(400).json({ error: 'Invalid eventId' });
  }

  if (query.length < 2) {
    return res.json({ results: [], query, eventId });
  }

  const pattern = `%${query.toLowerCase()}%`;

  try {
    // ── Parallel queries ───────────────────────────────────────────────────

    const [participants, competitions, squads, disciplines] = await Promise.all([
      // 1. Participants
      prisma.$queryRaw<any[]>`
        SELECT DISTINCT
          t.int_teilnehmerid,
          t.var_vorname,
          t.var_nachname,
          v.var_name   AS club_name,
          w.int_startnummer,
          w.var_riege,
          wk.var_name  AS competition_name,
          wk.var_nummer AS competition_number,
          wk.int_wettkaempfeid AS competition_id
        FROM tfx_teilnehmer t
        JOIN tfx_wertungen w  ON w.int_teilnehmerid  = t.int_teilnehmerid
        JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = w.int_wettkaempfeid
        LEFT JOIN tfx_vereine v ON v.int_vereineid = t.int_vereineid
        WHERE wk.int_veranstaltungenid = ${eventId}
          AND w.bol_startet_nicht IS NOT TRUE
          AND (
            LOWER(t.var_vorname)  LIKE ${pattern}
            OR LOWER(t.var_nachname) LIKE ${pattern}
            OR LOWER(CONCAT(t.var_vorname, ' ', t.var_nachname)) LIKE ${pattern}
            OR LOWER(CONCAT(t.var_nachname, ' ', t.var_vorname)) LIKE ${pattern}
            OR CAST(w.int_startnummer AS TEXT) = ${query}
            OR LOWER(v.var_name) LIKE ${pattern}
          )
        LIMIT 20
      `,

      // 2. Competitions
      prisma.$queryRaw<any[]>`
        SELECT int_wettkaempfeid, var_name, var_nummer
        FROM tfx_wettkaempfe
        WHERE int_veranstaltungenid = ${eventId}
          AND (
            LOWER(var_name)   LIKE ${pattern}
            OR LOWER(var_nummer) LIKE ${pattern}
          )
        LIMIT 8
      `,

      // 3. Squads (distinct riege names in this event)
      prisma.$queryRaw<any[]>`
        SELECT DISTINCT w.var_riege
        FROM tfx_wertungen w
        JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = w.int_wettkaempfeid
        WHERE wk.int_veranstaltungenid = ${eventId}
          AND LOWER(w.var_riege) LIKE ${pattern}
          AND w.var_riege IS NOT NULL
          AND w.var_riege <> ''
        LIMIT 6
      `,

      // 4. Disciplines linked to competitions in this event
      prisma.$queryRaw<any[]>`
        SELECT DISTINCT
          d.int_disziplinenid,
          d.var_name,
          d.var_kurz1,
          d.var_einheit
        FROM tfx_disziplinen d
        JOIN tfx_wettkaempfe_x_disziplinen wd ON wd.int_disziplinenid = d.int_disziplinenid
        JOIN tfx_wettkaempfe wk ON wk.int_wettkaempfeid = wd.int_wettkaempfeid
        WHERE wk.int_veranstaltungenid = ${eventId}
          AND (
            LOWER(d.var_name)  LIKE ${pattern}
            OR LOWER(d.var_kurz1) LIKE ${pattern}
          )
        LIMIT 6
      `,
    ]);

    // ── Map & score results ────────────────────────────────────────────────

    const queryLower = query.toLowerCase();
    const seen = new Set<string>(); // de-duplicate participants (same person, multiple comps)
    const scoredResults: Array<SearchResult & { _score: number }> = [];

    // Participants
    for (const p of participants) {
      const fullName = `${p.var_vorname} ${p.var_nachname}`;
      const fullNameRev = `${p.var_nachname} ${p.var_vorname}`;
      const startNr = p.int_startnummer != null ? String(p.int_startnummer) : '';
      const dedupeKey = `participant:${p.int_teilnehmerid}`;

      // De-duplicate (same person can appear multiple times if in multiple comps)
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const title = startNr
        ? `${fullName} (Nr. ${startNr})`
        : fullName;

      const subtitleParts: string[] = [];
      if (p.club_name) subtitleParts.push(p.club_name);
      if (p.competition_name) subtitleParts.push(p.competition_name);
      if (p.var_riege) subtitleParts.push(`Riege ${p.var_riege}`);
      const subtitle = subtitleParts.join(' · ');

      // Score by match quality
      let score = 80; // base for participants
      if (startNr === query) {
        score = 100; // exact start-number match — highest priority
      } else if (fullName.toLowerCase() === queryLower || fullNameRev.toLowerCase() === queryLower) {
        score = 95; // exact name match
      } else if (
        fullName.toLowerCase().startsWith(queryLower) ||
        p.var_nachname?.toLowerCase().startsWith(queryLower) ||
        p.var_vorname?.toLowerCase().startsWith(queryLower)
      ) {
        score = 90; // prefix match
      } else if (p.club_name?.toLowerCase().includes(queryLower)) {
        score = 70; // club name match — lower priority
      }

      scoredResults.push(scored({
        type: 'participant',
        id: p.int_teilnehmerid,
        title,
        subtitle,
        badge: startNr || undefined,
        navigationPath: '/event-participants',
        prefillSearch: fullName,
      }, score));
    }

    // Competitions
    for (const c of competitions) {
      const name = c.var_name ?? '';
      const num = c.var_nummer ?? '';
      let score = 60;
      if (name.toLowerCase() === queryLower || num.toLowerCase() === queryLower) {
        score = 75;
      } else if (name.toLowerCase().startsWith(queryLower) || num.toLowerCase().startsWith(queryLower)) {
        score = 65;
      }

      scoredResults.push(scored({
        type: 'competition',
        id: c.int_wettkaempfeid,
        title: name,
        subtitle: num ? `Nr. ${num}` : '',
        badge: num || undefined,
        navigationPath: '/competitions',
        prefillSearch: name,
      }, score));
    }

    // Squads
    for (const s of squads) {
      const riege = s.var_riege ?? '';
      scoredResults.push(scored({
        type: 'squad',
        id: riege,
        title: `Riege ${riege}`,
        subtitle: 'Riegeneinteilung',
        navigationPath: '/squads',
        prefillSearch: riege,
      }, 50));
    }

    // Disciplines
    for (const d of disciplines) {
      const name = d.var_name ?? '';
      const shortName = d.var_kurz1 ?? '';
      const unit = d.var_einheit ?? '';
      scoredResults.push(scored({
        type: 'discipline',
        id: d.int_disziplinenid,
        title: name,
        subtitle: [shortName, unit].filter(Boolean).join(' · '),
        badge: shortName || undefined,
        navigationPath: '/disciplines',
        prefillSearch: name,
      }, 40));
    }

    // Sort by score descending, then alphabetically by title
    scoredResults.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return a.title.localeCompare(b.title, 'de');
    });

    const results: SearchResult[] = scoredResults.map(({ _score, ...r }) => r);

    return res.json({ results, query, eventId });
  } catch (error) {
    console.error('[eventSearch] Error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
