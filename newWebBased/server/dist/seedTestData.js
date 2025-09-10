"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seedTestData() {
    try {
        console.log('🌱 Seeding test data...');
        // First, add some basic verbaende (federations) if they don't exist
        await prisma.$executeRaw `
      INSERT INTO tfx_verbaende (int_verbaendeid, var_name) VALUES 
      (1, 'Deutscher Turner-Bund')
      ON CONFLICT (int_verbaendeid) DO NOTHING
    `;
        // Add test gaue (regions) - now only one to keep it simple
        await prisma.$executeRaw `
      INSERT INTO tfx_gaue (int_gaueid, int_verbaendeid, var_name, var_kuerzel) VALUES 
      (1, 1, 'Baden-Württemberg', 'BaWü')
      ON CONFLICT (int_gaueid) DO NOTHING
    `;
        console.log('✅ Added regions (gaue)');
        // Add test clubs - only use existing gaue id
        await prisma.$executeRaw `
      INSERT INTO tfx_vereine (var_name, var_website, int_gaueid, int_start_ort) VALUES 
      ('Turnverein Stuttgart', 'https://www.tv-stuttgart.de', 1, 0),
      ('Gymnastikverein München', 'https://www.gv-muenchen.de', 1, 0),
      ('Turnclub Berlin', 'https://www.tc-berlin.de', 1, 0),
      ('Sportverein Hamburg', 'https://www.sv-hamburg.de', 1, 0),
      ('Turngemeinschaft Köln', 'https://www.tg-koeln.de', 1, 0)
      ON CONFLICT DO NOTHING
    `;
        console.log('✅ Added clubs');
        // Get some club IDs for participants
        const clubIds = await prisma.$queryRaw `
      SELECT int_vereineid FROM tfx_vereine LIMIT 5
    `;
        if (clubIds.length > 0) {
            // Add test participants
            await prisma.$executeRaw `
        INSERT INTO tfx_teilnehmer (var_nachname, var_vorname, dat_geburtsdatum, var_geschlecht, int_vereineid, int_jahrgangmin, int_jahrgangmax) VALUES 
        ('Müller', 'Anna', '2010-05-15', 'W', ${clubIds[0].int_vereineid}, 2009, 2011),
        ('Schmidt', 'Max', '2008-08-22', 'M', ${clubIds[1]?.int_vereineid || clubIds[0].int_vereineid}, 2007, 2009),
        ('Weber', 'Lisa', '2012-03-10', 'W', ${clubIds[0].int_vereineid}, 2011, 2013),
        ('Fischer', 'Tom', '2009-11-05', 'M', ${clubIds[2]?.int_vereineid || clubIds[0].int_vereineid}, 2008, 2010),
        ('Wagner', 'Emma', '2011-07-18', 'W', ${clubIds[3]?.int_vereineid || clubIds[0].int_vereineid}, 2010, 2012),
        ('Becker', 'Paul', '2007-12-03', 'M', ${clubIds[4]?.int_vereineid || clubIds[0].int_vereineid}, 2006, 2008)
        ON CONFLICT DO NOTHING
      `;
            console.log('✅ Added participants');
        }
        // Check if we have data
        const clubCount = await prisma.$queryRaw `SELECT COUNT(*) as count FROM tfx_vereine`;
        const participantCount = await prisma.$queryRaw `SELECT COUNT(*) as count FROM tfx_teilnehmer`;
        console.log(`📊 Database now has:`);
        console.log(`   - ${clubCount[0]?.count || 0} clubs`);
        console.log(`   - ${participantCount[0]?.count || 0} participants`);
        console.log('🎉 Seed data added successfully!');
    }
    catch (error) {
        console.error('❌ Error seeding test data:', error);
        if (error instanceof Error) {
            console.error('Error message:', error.message);
        }
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run if called directly
if (require.main === module) {
    seedTestData();
}
exports.default = seedTestData;
//# sourceMappingURL=seedTestData.js.map