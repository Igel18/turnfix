"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all events
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const competitions = await prisma.competition.findMany({
            include: {
                _count: {
                    select: {
                        entries: true,
                        results: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        const events = competitions.map(comp => ({
            id: comp.id,
            name: comp.name,
            description: comp.description,
            startDate: comp.startDate.toISOString(),
            endDate: comp.endDate.toISOString(),
            location: comp.location,
            type: comp.type,
            status: comp.status,
            participantCount: comp._count.entries,
            resultCount: comp._count.results
        }));
        res.json({ events });
    }
    catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=clubs_temp.js.map