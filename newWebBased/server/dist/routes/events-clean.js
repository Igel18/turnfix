"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Validation schemas
const createEventSchema = zod_1.z.object({
    var_eventname: zod_1.z.string().min(1),
    dat_eventstartdate: zod_1.z.string(),
    dat_eventenddate: zod_1.z.string(),
    var_location: zod_1.z.string().min(1),
    var_description: zod_1.z.string().optional()
});
const updateEventSchema = createEventSchema.partial();
// Get all events with pagination
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search;
        // For now, return mock data since we need to set up the proper database schema
        const mockEvents = [
            {
                int_eventid: 1,
                var_eventname: 'Spring Championships 2024',
                dat_eventstartdate: '2024-04-15T00:00:00.000Z',
                dat_eventenddate: '2024-04-16T00:00:00.000Z',
                var_location: 'Gymnastics Center Berlin',
                var_description: 'Annual spring gymnastics championships',
                participant_count: 25,
                score_count: 150
            },
            {
                int_eventid: 2,
                var_eventname: 'Summer Cup 2024',
                dat_eventstartdate: '2024-07-10T00:00:00.000Z',
                dat_eventenddate: '2024-07-12T00:00:00.000Z',
                var_location: 'Olympic Sports Hall Munich',
                var_description: 'Regional summer gymnastics competition',
                participant_count: 45,
                score_count: 280
            },
            {
                int_eventid: 3,
                var_eventname: 'Youth Tournament 2024',
                dat_eventstartdate: '2024-09-05T00:00:00.000Z',
                dat_eventenddate: '2024-09-06T00:00:00.000Z',
                var_location: 'Sports Complex Hamburg',
                var_description: 'Competition for young gymnasts',
                participant_count: 30,
                score_count: 180
            }
        ];
        // Filter by search term if provided
        let filteredEvents = mockEvents;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredEvents = mockEvents.filter(event => event.var_eventname.toLowerCase().includes(searchLower) ||
                event.var_location.toLowerCase().includes(searchLower));
        }
        // Apply pagination
        const paginatedEvents = filteredEvents.slice(offset, offset + limit);
        res.json({
            events: paginatedEvents,
            pagination: {
                total: filteredEvents.length,
                limit,
                offset,
                hasMore: offset + limit < filteredEvents.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get event by ID
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        // Mock data for specific event
        const mockEvents = [
            {
                int_eventid: 1,
                var_eventname: 'Spring Championships 2024',
                dat_eventstartdate: '2024-04-15T00:00:00.000Z',
                dat_eventenddate: '2024-04-16T00:00:00.000Z',
                var_location: 'Gymnastics Center Berlin',
                var_description: 'Annual spring gymnastics championships'
            },
            {
                int_eventid: 2,
                var_eventname: 'Summer Cup 2024',
                dat_eventstartdate: '2024-07-10T00:00:00.000Z',
                dat_eventenddate: '2024-07-12T00:00:00.000Z',
                var_location: 'Olympic Sports Hall Munich',
                var_description: 'Regional summer gymnastics competition'
            },
            {
                int_eventid: 3,
                var_eventname: 'Youth Tournament 2024',
                dat_eventstartdate: '2024-09-05T00:00:00.000Z',
                dat_eventenddate: '2024-09-06T00:00:00.000Z',
                var_location: 'Sports Complex Hamburg',
                var_description: 'Competition for young gymnasts'
            }
        ];
        const event = mockEvents.find(e => e.int_eventid === eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ event });
    }
    catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create new event
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const validatedData = createEventSchema.parse(req.body);
        // Mock creation - in reality this would insert into database
        const newEvent = {
            int_eventid: Math.floor(Math.random() * 1000) + 100,
            ...validatedData,
            participant_count: 0,
            score_count: 0
        };
        res.status(201).json({ event: newEvent });
    }
    catch (error) {
        console.error('Error creating event:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Update event
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const validatedData = updateEventSchema.parse(req.body);
        // Mock update - in reality this would update the database
        const updatedEvent = {
            int_eventid: eventId,
            var_eventname: validatedData.var_eventname || 'Updated Event',
            dat_eventstartdate: validatedData.dat_eventstartdate || '2024-01-01T00:00:00.000Z',
            dat_eventenddate: validatedData.dat_eventenddate || '2024-01-01T00:00:00.000Z',
            var_location: validatedData.var_location || 'Updated Location',
            var_description: validatedData.var_description || 'Updated description',
            participant_count: 0,
            score_count: 0
        };
        res.json({ event: updatedEvent });
    }
    catch (error) {
        console.error('Error updating event:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: 'Validation error', details: error.issues });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete event
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        // Mock deletion - in reality this would delete from database
        res.json({ message: 'Event deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get participants for an event
router.get('/:id/participants', auth_1.authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        // Mock participants data
        const mockParticipants = [
            {
                int_teilnehmerid: 1,
                var_vorname: 'Emma',
                var_nachname: 'Schmidt',
                dat_geburtsdatum: '2008-03-15T00:00:00.000Z',
                var_geschlecht: 'W',
                vereins_name: 'TV Berlin'
            },
            {
                int_teilnehmerid: 2,
                var_vorname: 'Luca',
                var_nachname: 'Müller',
                dat_geburtsdatum: '2007-07-22T00:00:00.000Z',
                var_geschlecht: 'M',
                vereins_name: 'Gymnastics Munich'
            },
            {
                int_teilnehmerid: 3,
                var_vorname: 'Sophie',
                var_nachname: 'Weber',
                dat_geburtsdatum: '2009-01-10T00:00:00.000Z',
                var_geschlecht: 'W',
                vereins_name: 'Hamburg Turners'
            }
        ];
        res.json({ participants: mockParticipants });
    }
    catch (error) {
        console.error('Error fetching event participants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=events-clean.js.map