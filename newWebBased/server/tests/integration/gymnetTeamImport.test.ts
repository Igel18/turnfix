import request from 'supertest';
import express from 'express';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import eventsRouter from '../../src/routes/events';
import { TestUtils } from '../utils/testUtils';

const app = express();
app.use(express.json());
app.use('/api/events', eventsRouter);

/**
 * Integration tests for GymNet XML team (Mannschaft) import.
 * 
 * Tests the team creation logic in the import-gymnet endpoint:
 * - Multi-person Mannschaft → creates tfx_mannschaften + tfx_man_x_teilnehmer records
 * - Single-person Mannschaft → does NOT create a team
 * - Auto-numbering of teams per competition+club
 * - Idempotent re-import (no duplicates)
 */
describe('GymNet Team Import', () => {
  let prisma: PrismaClient;
  const teamFixturePath = path.resolve(__dirname, '../fixtures/team-import-test.xml');
  const singleFixturePath = path.resolve(__dirname, '../fixtures/single-person-mannschaft.xml');

  // Track created records for cleanup
  let createdEventId: number | null = null;
  let createdClubIds: number[] = [];
  let createdParticipantIds: number[] = [];
  let createdTeamIds: number[] = [];
  let createdCompetitionIds: number[] = [];

  beforeAll(async () => {
    prisma = TestUtils.getPrisma();
  });

  afterAll(async () => {
    await TestUtils.disconnect();
  });

  afterEach(async () => {
    // Clean up in reverse FK order
    // 1. Delete team members (cascade from tfx_mannschaften)
    if (createdTeamIds.length > 0) {
      await prisma.tfx_man_x_teilnehmer.deleteMany({
        where: { int_mannschaftenid: { in: createdTeamIds } }
      }).catch(() => {});
      
      // Clear wertungen team links
      await prisma.$queryRawUnsafe(`
        UPDATE tfx_wertungen SET int_mannschaftenid = NULL
        WHERE int_mannschaftenid = ANY($1::int[])
      `, createdTeamIds).catch(() => {});

      await prisma.tfx_mannschaften.deleteMany({
        where: { int_mannschaftenid: { in: createdTeamIds } }
      }).catch(() => {});
    }

    // 2. Delete wertungen for created competitions
    if (createdCompetitionIds.length > 0) {
      await prisma.tfx_wertungen.deleteMany({
        where: { int_wettkaempfeid: { in: createdCompetitionIds } }
      }).catch(() => {});
    }

    // 3. Delete competitions
    if (createdCompetitionIds.length > 0) {
      await prisma.tfx_wettkaempfe.deleteMany({
        where: { int_wettkaempfeid: { in: createdCompetitionIds } }
      }).catch(() => {});
    }

    // 4. Delete the event
    if (createdEventId) {
      await prisma.tfx_veranstaltungen.delete({
        where: { int_veranstaltungenid: createdEventId }
      }).catch(() => {});
    }

    // 5. Delete participants
    if (createdParticipantIds.length > 0) {
      await prisma.tfx_teilnehmer.deleteMany({
        where: { int_teilnehmerid: { in: createdParticipantIds } }
      }).catch(() => {});
    }

    // 6. Delete clubs
    if (createdClubIds.length > 0) {
      await prisma.tfx_vereine.deleteMany({
        where: { int_vereineid: { in: createdClubIds } }
      }).catch(() => {});
    }

    // Reset tracking
    createdEventId = null;
    createdClubIds = [];
    createdParticipantIds = [];
    createdTeamIds = [];
    createdCompetitionIds = [];
  });

  /**
   * Helper: get a valid venue ID for event creation
   */
  async function getVenueId(): Promise<number> {
    const venue = await prisma.tfx_wettkampforte.findFirst();
    return venue?.int_wettkampforteid ?? 1;
  }

  /**
   * Helper: import XML file and track created records for cleanup
   */
  async function importXmlAndTrack(
    xmlPath: string,
    eventName: string = 'Team Import Test Event'
  ) {
    const venueId = await getVenueId();

    const response = await request(app)
      .post('/api/events/import-gymnet')
      .field('eventName', eventName)
      .field('startDate', '2025-01-15')
      .field('endDate', '2025-01-15')
      .field('locationId', venueId.toString())
      .attach('files', xmlPath); // field name changed in issue 83 (was 'xmlFile')

    // Track created event
    if (response.body.createdEvent?.id) {
      createdEventId = response.body.createdEvent.id;

      // Find and track competitions for this event
      const competitions = await prisma.tfx_wettkaempfe.findMany({
        where: { int_veranstaltungenid: createdEventId! }
      });
      createdCompetitionIds = competitions.map(c => c.int_wettkaempfeid);

      // Find and track teams for these competitions
      if (createdCompetitionIds.length > 0) {
        const teams = await prisma.tfx_mannschaften.findMany({
          where: { int_wettkaempfeid: { in: createdCompetitionIds } }
        });
        createdTeamIds = teams.map(t => t.int_mannschaftenid);
      }
    }

    // Track created clubs (by fixture name patterns)
    const testClubNames = ['TSV Testverein Alpha', 'SV Testverein Beta', 'FC Einzelstarter'];
    for (const name of testClubNames) {
      const club = await prisma.tfx_vereine.findFirst({
        where: { var_name: name }
      });
      if (club && !createdClubIds.includes(club.int_vereineid)) {
        createdClubIds.push(club.int_vereineid);
      }
    }

    // Track created participants (by fixture name patterns)
    const testLastNames = ['Teamtesterin', 'Betaturnerin', 'Einzelturner'];
    for (const lastName of testLastNames) {
      const participants = await prisma.tfx_teilnehmer.findMany({
        where: { var_nachname: lastName }
      });
      for (const p of participants) {
        if (!createdParticipantIds.includes(p.int_teilnehmerid)) {
          createdParticipantIds.push(p.int_teilnehmerid);
        }
      }
    }

    return response;
  }

  describe('Multi-person Mannschaft creates teams', () => {
    it('should import XML and create teams from multi-person Mannschaft nodes', async () => {
      const response = await importXmlAndTrack(teamFixturePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify teams were extracted
      const teamsExtracted = response.body.extractedData?.teams;
      expect(teamsExtracted).toBeDefined();
      expect(teamsExtracted.length).toBe(2); // Alpha (3 members) + Beta (2 members)
    });

    it('should create tfx_mannschaften records for each team', async () => {
      const response = await importXmlAndTrack(teamFixturePath);
      expect(response.status).toBe(200);

      // Should have created 2 teams
      expect(response.body.insertionResults?.teams?.inserted).toBe(2);
    });

    it('should create tfx_man_x_teilnehmer records for team members', async () => {
      const response = await importXmlAndTrack(teamFixturePath);
      expect(response.status).toBe(200);

      // Should have 5 total members (3 + 2)
      expect(response.body.insertionResults?.teams?.members).toBe(5);
    });

    it('should store correct team data in the database', async () => {
      await importXmlAndTrack(teamFixturePath);

      // Verify teams exist in DB
      expect(createdTeamIds.length).toBe(2);

      // Load teams with club info
      for (const teamId of createdTeamIds) {
        const team = await prisma.tfx_mannschaften.findUnique({
          where: { int_mannschaftenid: teamId },
          include: {
            tfx_vereine: true,
            tfx_man_x_teilnehmer: true
          }
        });

        expect(team).not.toBeNull();
        expect(team!.int_wettkaempfeid).toBeDefined();
        expect(team!.int_vereineid).toBeDefined();
        expect(team!.int_nummer).toBe(1); // First team for each club

        // Check club name
        const clubName = team!.tfx_vereine.var_name;
        expect(['TSV Testverein Alpha', 'SV Testverein Beta']).toContain(clubName);

        // Check member count
        if (clubName === 'TSV Testverein Alpha') {
          expect(team!.tfx_man_x_teilnehmer.length).toBe(3);
        } else if (clubName === 'SV Testverein Beta') {
          expect(team!.tfx_man_x_teilnehmer.length).toBe(2);
        }
      }
    });

    it('should auto-number teams starting from 1', async () => {
      await importXmlAndTrack(teamFixturePath);

      for (const teamId of createdTeamIds) {
        const team = await prisma.tfx_mannschaften.findUnique({
          where: { int_mannschaftenid: teamId }
        });
        expect(team).not.toBeNull();
        expect(team!.int_nummer).toBeGreaterThanOrEqual(1);
      }
    });

    it('should report teams in summary/importLog', async () => {
      const response = await importXmlAndTrack(teamFixturePath);

      const importLog = response.body.summary?.importLog;
      expect(importLog).toBeDefined();
      
      // Check that Mannschaften are mentioned in the log
      const mannschaftenEntry = importLog.find((entry: string) =>
        entry.includes('Mannschaften')
      );
      expect(mannschaftenEntry).toBeDefined();
    });

    it('should include teams in extractedData summary', async () => {
      const response = await importXmlAndTrack(teamFixturePath);

      const summary = response.body.extractedData?.summary;
      expect(summary).toBeDefined();
      expect(summary.teamsCount).toBe(2);
    });

    it('should set competition type (int_typ) to 1 for team competitions', async () => {
      await importXmlAndTrack(teamFixturePath);

      // Find the competition created for this event
      expect(createdCompetitionIds.length).toBeGreaterThan(0);

      for (const compId of createdCompetitionIds) {
        const competition = await prisma.tfx_wettkaempfe.findUnique({
          where: { int_wettkaempfeid: compId }
        });
        expect(competition).not.toBeNull();
        // Competition with waAnzahlMax > 1 should be type 1 (Mannschaft)
        expect(competition!.int_typ).toBe(1);
      }
    });
  });

  describe('Single-person Mannschaft does NOT create a team', () => {
    it('should not create a team when Mannschaft has only one participant', async () => {
      const response = await importXmlAndTrack(singleFixturePath, 'Single Person Import Test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // No teams should be extracted for single-person Mannschaft
      const teamsExtracted = response.body.extractedData?.teams;
      expect(teamsExtracted).toBeDefined();
      expect(teamsExtracted.length).toBe(0);

      // No teams should be inserted
      expect(response.body.insertionResults?.teams?.inserted).toBe(0);
      expect(response.body.insertionResults?.teams?.members).toBe(0);
    });

    it('should still import the participant from single-person Mannschaft', async () => {
      const response = await importXmlAndTrack(singleFixturePath, 'Single Participant Import Test');

      expect(response.status).toBe(200);

      // The participant should still be imported
      const participants = response.body.extractedData?.participants;
      expect(participants).toBeDefined();
      expect(participants.length).toBeGreaterThanOrEqual(1);

      // Fritz Einzelturner should exist
      const fritz = participants.find((p: any) =>
        (p.firstName === 'Fritz' || p.perVorname === 'Fritz') &&
        (p.lastName === 'Einzelturner' || p.perName === 'Einzelturner')
      );
      expect(fritz).toBeDefined();
    });

    it('should keep competition type 0 (Einzel) for single-person competitions', async () => {
      await importXmlAndTrack(singleFixturePath, 'Single Type Check');

      // Find competition for this event
      if (createdEventId) {
        const competitions = await prisma.tfx_wettkaempfe.findMany({
          where: { int_veranstaltungenid: createdEventId }
        });
        expect(competitions.length).toBeGreaterThan(0);
        
        // waAnzahlMax=1, no multi-person teams → int_typ should be 0
        for (const comp of competitions) {
          expect(comp.int_typ).toBe(0);
        }
      }
    });
  });

  describe('Team import errors and edge cases', () => {
    it('should handle zero teams gracefully (no errors)', async () => {
      const response = await importXmlAndTrack(singleFixturePath, 'No Teams Test');

      expect(response.status).toBe(200);
      expect(response.body.insertionResults?.teams?.errors).toBe(0);
    });

    it('should report correct team extraction counts in response', async () => {
      const response = await importXmlAndTrack(teamFixturePath);

      const teams = response.body.extractedData?.teams;
      expect(teams).toBeDefined();

      // First team: Alpha with 3 members
      const alphaTeam = teams.find((t: any) => t.clubName === 'TSV Testverein Alpha');
      expect(alphaTeam).toBeDefined();
      expect(alphaTeam.participants.length).toBe(3);
      expect(alphaTeam.competitionNumber).toBe('0099');

      // Second team: Beta with 2 members
      const betaTeam = teams.find((t: any) => t.clubName === 'SV Testverein Beta');
      expect(betaTeam).toBeDefined();
      expect(betaTeam.participants.length).toBe(2);
      expect(betaTeam.competitionNumber).toBe('0099');
    });

    it('should include participant names in extracted team data', async () => {
      const response = await importXmlAndTrack(teamFixturePath);

      const teams = response.body.extractedData?.teams;
      const alphaTeam = teams.find((t: any) => t.clubName === 'TSV Testverein Alpha');

      expect(alphaTeam.participants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ firstName: 'Anna', lastName: 'Teamtesterin' }),
          expect.objectContaining({ firstName: 'Berta', lastName: 'Teamtesterin' }),
          expect.objectContaining({ firstName: 'Clara', lastName: 'Teamtesterin' }),
        ])
      );
    });
  });

  // ==========================================================================
  // Multi-file import tests (issue 83)
  // ==========================================================================
  describe('Multi-file import (issue 83)', () => {
    /**
     * Helper: import multiple XML files in one request.
     * supertest: calling .attach() multiple times with the same field name
     * sends an array of files matching multer's upload.array('files', N).
     */
    async function importMultipleXmlFiles(
      xmlPaths: string[],
      eventName: string = 'Multi-File Import Test'
    ) {
      const venueId = await getVenueId();

      let req = request(app)
        .post('/api/events/import-gymnet')
        .field('eventName', eventName)
        .field('startDate', '2025-06-01')
        .field('endDate', '2025-06-01')
        .field('locationId', venueId.toString());

      for (const xmlPath of xmlPaths) {
        req = req.attach('files', xmlPath);
      }

      const response = await req;

      // Track created records for cleanup
      if (response.body.createdEvent?.id) {
        createdEventId = response.body.createdEvent.id;

        const competitions = await prisma.tfx_wettkaempfe.findMany({
          where: { int_veranstaltungenid: createdEventId! }
        });
        createdCompetitionIds = competitions.map(c => c.int_wettkaempfeid);

        if (createdCompetitionIds.length > 0) {
          const teams = await prisma.tfx_mannschaften.findMany({
            where: { int_wettkaempfeid: { in: createdCompetitionIds } }
          });
          createdTeamIds = teams.map(t => t.int_mannschaftenid);
        }
      }

      // Track clubs and participants from both fixtures
      const testClubNames = ['TSV Testverein Alpha', 'SV Testverein Beta', 'FC Einzelstarter'];
      for (const name of testClubNames) {
        const club = await prisma.tfx_vereine.findFirst({ where: { var_name: name } });
        if (club && !createdClubIds.includes(club.int_vereineid)) {
          createdClubIds.push(club.int_vereineid);
        }
      }

      const testLastNames = ['Teamtesterin', 'Betaturnerin', 'Einzelturner'];
      for (const lastName of testLastNames) {
        const participants = await prisma.tfx_teilnehmer.findMany({
          where: { var_nachname: lastName }
        });
        for (const p of participants) {
          if (!createdParticipantIds.includes(p.int_teilnehmerid)) {
            createdParticipantIds.push(p.int_teilnehmerid);
          }
        }
      }

      return response;
    }

    it('accepts two XML files in a single request and returns 200', async () => {
      const response = await importMultipleXmlFiles(
        [teamFixturePath, singleFixturePath]
      );
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('response includes perFileSummaries with one entry per uploaded file', async () => {
      const response = await importMultipleXmlFiles(
        [teamFixturePath, singleFixturePath]
      );
      expect(response.status).toBe(200);

      const summaries = response.body.perFileSummaries;
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries).toHaveLength(2);
    });

    it('each perFileSummary entry has filename and non-negative counts', async () => {
      const response = await importMultipleXmlFiles(
        [teamFixturePath, singleFixturePath]
      );
      const summaries = response.body.perFileSummaries as any[];

      for (const s of summaries) {
        expect(typeof s.filename).toBe('string');
        expect(s.filename.length).toBeGreaterThan(0);
        expect(typeof s.clubs).toBe('number');
        expect(typeof s.competitions).toBe('number');
        expect(typeof s.participants).toBe('number');
        expect(typeof s.devices).toBe('number');
        expect(typeof s.teams).toBe('number');

        expect(s.clubs).toBeGreaterThanOrEqual(0);
        expect(s.competitions).toBeGreaterThanOrEqual(0);
        expect(s.participants).toBeGreaterThanOrEqual(0);
      }
    });

    it('team file summary has 2 teams, single-person summary has 0 teams', async () => {
      const response = await importMultipleXmlFiles(
        [teamFixturePath, singleFixturePath]
      );
      const summaries: any[] = response.body.perFileSummaries;

      const teamSummary    = summaries.find(s => s.filename.includes('team-import-test'));
      const singleSummary  = summaries.find(s => s.filename.includes('single-person-mannschaft'));

      expect(teamSummary).toBeDefined();
      expect(singleSummary).toBeDefined();

      expect(teamSummary.teams).toBe(2);
      expect(singleSummary.teams).toBe(0);
    });

    it('combined participant count equals sum of both files', async () => {
      // First import each file individually to get baseline counts
      const [r1, r2] = await Promise.all([
        request(app)
          .post('/api/events/import-gymnet')
          .field('eventName', 'Baseline Team')
          .field('startDate', '2025-07-01')
          .field('endDate', '2025-07-01')
          .field('locationId', (await getVenueId()).toString())
          .attach('files', teamFixturePath),
        request(app)
          .post('/api/events/import-gymnet')
          .field('eventName', 'Baseline Single')
          .field('startDate', '2025-07-01')
          .field('endDate', '2025-07-01')
          .field('locationId', (await getVenueId()).toString())
          .attach('files', singleFixturePath),
      ]);

      // Track those events for cleanup
      for (const r of [r1, r2]) {
        if (r.body.createdEvent?.id && !createdEventId) {
          createdEventId = r.body.createdEvent.id;
        }
        if (r.body.createdEvent?.id) {
          const comps = await prisma.tfx_wettkaempfe.findMany({
            where: { int_veranstaltungenid: r.body.createdEvent.id }
          });
          createdCompetitionIds.push(...comps.map(c => c.int_wettkaempfeid));
        }
      }

      const s1: any[] = r1.body.perFileSummaries ?? [];
      const s2: any[] = r2.body.perFileSummaries ?? [];
      const total1 = s1.reduce((sum: number, s: any) => sum + s.participants, 0);
      const total2 = s2.reduce((sum: number, s: any) => sum + s.participants, 0);

      // Import both together
      const combined = await importMultipleXmlFiles([teamFixturePath, singleFixturePath], 'Combined Import');
      const combinedSummaries: any[] = combined.body.perFileSummaries ?? [];
      const combinedTotal = combinedSummaries.reduce((sum: number, s: any) => sum + s.participants, 0);

      expect(combinedTotal).toBe(total1 + total2);
    });

    it('single file upload still returns perFileSummaries with one entry', async () => {
      const response = await importMultipleXmlFiles([teamFixturePath], 'Single File Via Wizard');
      expect(response.status).toBe(200);

      const summaries = response.body.perFileSummaries;
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries).toHaveLength(1);
    });
  });
});
