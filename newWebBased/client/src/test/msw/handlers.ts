/**
 * MSW (Mock Service Worker) Handlers
 *
 * Realistic API mocks for frontend integration tests.
 * These handlers return data structures matching the real API.
 */

import { http, HttpResponse } from 'msw';

// ── Test data ──────────────────────────────────────────────────────────────

export const testEvents = [
  {
    id: 1,
    name: 'Stadtmeisterschaft Berlin 2025',
    date: '2025-06-15',
    endDate: '2025-06-16',
    registrationDeadline: '2025-05-01',
    venue: 'Sporthalle Berlin',
    venueId: 1,
    organizer: 'TV Berlin 1850',
    competitionCount: 3,
    participantCount: 45,
    status: 'upcoming',
  },
  {
    id: 2,
    name: 'Landesmeisterschaft Bayern 2025',
    date: '2025-09-20',
    endDate: '2025-09-22',
    registrationDeadline: '2025-08-01',
    venue: 'Olympia-Halle',
    venueId: 2,
    organizer: 'TSV München',
    competitionCount: 6,
    participantCount: 120,
    status: 'upcoming',
  },
];

export const testDisciplines = [
  { id: 1, name: 'Boden', kurzname: 'BO', maleAllowed: true, femaleAllowed: true, icon: null },
  { id: 2, name: 'Sprung', kurzname: 'SP', maleAllowed: true, femaleAllowed: true, icon: null },
  { id: 3, name: 'Reck', kurzname: 'RE', maleAllowed: true, femaleAllowed: false, icon: null },
  { id: 4, name: 'Barren', kurzname: 'BA', maleAllowed: true, femaleAllowed: false, icon: null },
  { id: 5, name: 'Stufenbarren', kurzname: 'ST', maleAllowed: false, femaleAllowed: true, icon: null },
  { id: 6, name: 'Schwebebalken', kurzname: 'SB', maleAllowed: false, femaleAllowed: true, icon: null },
];

export const testVenues = [
  { id: 1, name: 'Sporthalle Berlin', city: 'Berlin' },
  { id: 2, name: 'Olympia-Halle', city: 'München' },
];

export const testClubs = [
  { id: 1, name: 'TV Berlin 1850', shortName: 'TVB', regionId: 1, regionName: 'Berlin' },
  { id: 2, name: 'TSV München', shortName: 'TSM', regionId: 2, regionName: 'Bayern' },
  { id: 3, name: 'SC Hamburg', shortName: 'SCH', regionId: 1, regionName: 'Hamburg' },
];

export const testRegions = [
  { id: 1, name: 'Berlin', associationId: 1, associationName: 'DTB' },
  { id: 2, name: 'Bayern', associationId: 1, associationName: 'DTB' },
];

export const testAssociations = [
  { id: 1, name: 'Deutscher Turner-Bund', shortName: 'DTB', countryId: 1 },
];

export const testParticipants = [
  {
    id: 1, firstName: 'Max', lastName: 'Müller', gender: 'männlich',
    birthYear: 2010, startNumber: 101, clubId: 1, clubName: 'TV Berlin 1850',
  },
  {
    id: 2, firstName: 'Anna', lastName: 'Schmidt', gender: 'weiblich',
    birthYear: 2011, startNumber: 102, clubId: 2, clubName: 'TSV München',
  },
  {
    id: 3, firstName: 'Tom', lastName: 'Becker', gender: 'männlich',
    birthYear: 2009, startNumber: 103, clubId: 3, clubName: 'SC Hamburg',
  },
];

// ── Handlers ───────────────────────────────────────────────────────────────

export const handlers = [
  // Events
  http.get('/api/events', () => {
    return HttpResponse.json({
      data: testEvents,
      pagination: { total: testEvents.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  http.get('/api/events/:id', ({ params }) => {
    const event = testEvents.find(e => e.id === Number(params.id));
    if (!event) return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    return HttpResponse.json(event);
  }),

  // Disciplines
  http.get('/api/disciplines', () => {
    return HttpResponse.json({
      data: testDisciplines,
      pagination: { total: testDisciplines.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  // Venues
  http.get('/api/venues', () => {
    return HttpResponse.json({
      data: testVenues,
      pagination: { total: testVenues.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  // Clubs
  http.get('/api/clubs', () => {
    return HttpResponse.json({
      data: testClubs,
      pagination: { total: testClubs.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  // Regions (matches actual API format: { regions, pagination })
  http.get('/api/regions', () => {
    return HttpResponse.json({
      regions: testRegions.map(r => ({
        int_gaueid: r.id,
        var_name: r.name,
        var_kuerzel: r.name.substring(0, 3).toUpperCase(),
        int_verbaendeid: r.associationId,
        verband_name: r.associationName,
      })),
      pagination: { total: testRegions.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  // Regions count
  http.get('/api/regions/count', () => {
    return HttpResponse.json({ count: testRegions.length });
  }),

  // Associations (matches actual API format: { associations, pagination })
  http.get('/api/associations', () => {
    return HttpResponse.json({
      associations: testAssociations.map(a => ({
        int_verbaendeid: a.id,
        var_name: a.name,
        var_kurz: a.shortName,
      })),
      pagination: { total: testAssociations.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  // Participants
  http.get('/api/participants', () => {
    return HttpResponse.json({
      data: testParticipants,
      pagination: { total: testParticipants.length, limit: 50, offset: 0, hasMore: false },
    });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', version: '1.0.0-test' });
  }),

  // Configuration
  http.get('/api/configuration', () => {
    return HttpResponse.json({
      database: { db_host: 'localhost', db_port: 5432, db_name: 'turnfix_test' },
      application: { app_name: 'TurnFix Test', app_version: '1.0.0', debug_mode: false },
    });
  }),

  // Server version
  http.get('/api/system/version', () => {
    return HttpResponse.json({ version: '1.0.0-test', buildDate: '2025-01-01' });
  }),
];
