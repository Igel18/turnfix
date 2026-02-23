/**
 * Integration Test — Seed Data Verification
 *
 * Validates that the test database contains the expected seed data.
 * This is a smoke test for the globalSetup infrastructure.
 * If this test fails, no other integration test can be trusted.
 */

import { PrismaClient } from '@prisma/client';
import { TEST_IDS } from '../fixtures/seed-test-data';

describe('Test Database Seed Data', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = (global as any).prisma;
  });

  // ── Structural hierarchy ──────────────────────────────────────────────

  describe('Reference Data', () => {
    it('should have the sport "Turnen"', async () => {
      const sport = await prisma.tfx_sport.findUnique({
        where: { int_sportid: TEST_IDS.sport.turnen },
      });
      expect(sport).not.toBeNull();
      expect(sport!.var_name).toBe('Turnen');
    });

    it('should have 4 disciplines (Boden, Sprung, Reck, Barren)', async () => {
      const disciplines = await prisma.tfx_disziplinen.findMany({
        where: { int_disziplinenid: { in: Object.values(TEST_IDS.disziplinen) } },
        orderBy: { int_disziplinenid: 'asc' },
      });
      expect(disciplines).toHaveLength(4);
      expect(disciplines.map(d => d.var_name)).toEqual(['Boden', 'Sprung', 'Reck', 'Barren']);
    });

    it('should have score entry fields for each discipline', async () => {
      const fields = await prisma.tfx_disziplinen_felder.findMany({
        where: { int_disziplinen_felderid: { in: Object.values(TEST_IDS.disziplinenFelder) } },
      });
      expect(fields).toHaveLength(8); // 4 disciplines × 2 fields (Note + Abzug)
    });

    it('should have 4 statuses', async () => {
      const statuses = await prisma.tfx_status.findMany({
        where: { int_statusid: { in: Object.values(TEST_IDS.status) } },
      });
      expect(statuses).toHaveLength(4);
      expect(statuses.map(s => s.var_name).sort()).toEqual(
        ['Disqualifiziert', 'Fertig', 'Gemeldet', 'Gestartet']
      );
    });
  });

  // ── Organization hierarchy ────────────────────────────────────────────

  describe('Organization Hierarchy (Land → Verband → Gau → Verein)', () => {
    it('should have Deutschland as country', async () => {
      const land = await prisma.tfx_laender.findUnique({
        where: { int_laenderid: TEST_IDS.laender.deutschland },
      });
      expect(land!.var_name).toBe('Deutschland');
    });

    it('should have DTB as association', async () => {
      const verband = await prisma.tfx_verbaende.findUnique({
        where: { int_verbaendeid: TEST_IDS.verbaende.dtb },
      });
      expect(verband!.var_name).toBe('Deutscher Turner-Bund');
      expect(verband!.int_laenderid).toBe(TEST_IDS.laender.deutschland);
    });

    it('should have 2 regions (Berlin, Bayern)', async () => {
      const gaue = await prisma.tfx_gaue.findMany({
        where: { int_gaueid: { in: Object.values(TEST_IDS.gaue) } },
      });
      expect(gaue).toHaveLength(2);
    });

    it('should have 3 clubs', async () => {
      const vereine = await prisma.tfx_vereine.findMany({
        where: { int_vereineid: { in: Object.values(TEST_IDS.vereine) } },
      });
      expect(vereine).toHaveLength(3);
      expect(vereine.map(v => v.var_name).sort()).toEqual(
        ['SC Hamburg', 'TSV München', 'TV Berlin 1850']
      );
    });
  });

  // ── Events & Competitions ─────────────────────────────────────────────

  describe('Events & Competitions', () => {
    it('should have 2 events', async () => {
      const events = await prisma.tfx_veranstaltungen.findMany({
        where: { int_veranstaltungenid: { in: Object.values(TEST_IDS.veranstaltungen) } },
      });
      expect(events).toHaveLength(2);
    });

    it('should have 3 competitions for Stadtmeisterschaft', async () => {
      const competitions = await prisma.tfx_wettkaempfe.findMany({
        where: { int_veranstaltungenid: TEST_IDS.veranstaltungen.stadtmeisterschaft },
      });
      expect(competitions).toHaveLength(3);
    });

    it('should have 4 disciplines per competition (12 total mappings)', async () => {
      const mappings = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
        where: {
          int_wettkaempfeid: { in: Object.values(TEST_IDS.wettkaempfe) },
        },
      });
      expect(mappings).toHaveLength(12);
    });
  });

  // ── Participants & Scores ─────────────────────────────────────────────

  describe('Participants & Scores', () => {
    it('should have 6 participants', async () => {
      const participants = await prisma.tfx_teilnehmer.findMany({
        where: { int_teilnehmerid: { in: Object.values(TEST_IDS.teilnehmer) } },
      });
      expect(participants).toHaveLength(6);
    });

    it('should have 3 male and 3 female participants', async () => {
      const participants = await prisma.tfx_teilnehmer.findMany({
        where: { int_teilnehmerid: { in: Object.values(TEST_IDS.teilnehmer) } },
      });
      const male = participants.filter(p => p.int_geschlecht === 1);
      const female = participants.filter(p => p.int_geschlecht === 2);
      expect(male).toHaveLength(3);
      expect(female).toHaveLength(3);
    });

    it('should have 6 registrations (Wertungen)', async () => {
      const wertungen = await prisma.tfx_wertungen.findMany({
        where: { int_wertungenid: { in: Object.values(TEST_IDS.wertungen) } },
      });
      expect(wertungen).toHaveLength(6);
    });

    it('should have scores for 3 participants (12 details)', async () => {
      const details = await prisma.tfx_wertungen_details.findMany({
        where: {
          int_wertungenid: {
            in: [TEST_IDS.wertungen.maxEinzel, TEST_IDS.wertungen.tomEinzel, TEST_IDS.wertungen.annaEinzel],
          },
        },
      });
      expect(details).toHaveLength(12);
    });

    it('should have correct scores for Max Müller', async () => {
      const scores = await prisma.tfx_wertungen_details.findMany({
        where: { int_wertungenid: TEST_IDS.wertungen.maxEinzel },
        orderBy: { int_disziplinenid: 'asc' },
      });
      expect(scores).toHaveLength(4);
      
      // Boden: 13.5, Sprung: 14.0, Reck: 12.8, Barren: 13.2
      const scoreValues = scores.map(s => s.rel_leistung);
      expect(scoreValues).toEqual([13.5, 14.0, 12.8, 13.2]);
    });

    it('should have mixed statuses across registrations', async () => {
      const wertungen = await prisma.tfx_wertungen.findMany({
        where: { int_wertungenid: { in: Object.values(TEST_IDS.wertungen) } },
      });
      const statusIds = [...new Set(wertungen.map(w => w.int_statusid))].sort();
      // Fertig (9003), Gestartet (9002), Gemeldet (9001)
      expect(statusIds).toEqual([TEST_IDS.status.gemeldet, TEST_IDS.status.gestartet, TEST_IDS.status.fertig]);
    });
  });

  // ── Autoincrement sequences ───────────────────────────────────────────

  describe('Sequence Reset', () => {
    it('should start autoincrement at 1 (not after seed IDs)', async () => {
      // Create a new record and verify it gets a low ID (not 9xxx)
      const newVenue = await prisma.tfx_wettkampforte.create({
        data: { var_name: '__test_sequence_check__', var_ort: 'Test' },
      });
      expect(newVenue.int_wettkampforteid).toBeLessThan(9000);

      // Cleanup
      await prisma.tfx_wettkampforte.delete({
        where: { int_wettkampforteid: newVenue.int_wettkampforteid },
      });
    });
  });
});
