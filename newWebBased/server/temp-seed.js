const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    const count = await prisma.competition.count();
    console.log('Current competitions in database:', count);
    
    if (count === 0) {
      console.log('Adding sample data...');
      const result = await prisma.competition.createMany({
        data: [
          {
            name: 'Spring Championships 2025',
            description: 'Annual spring gymnastics championships',
            startDate: new Date('2025-04-15'),
            endDate: new Date('2025-04-16'),
            location: 'Gymnastics Center Berlin',
            type: 'INDIVIDUAL',
            status: 'PLANNED',
            maxParticipants: 100,
            isPublic: true
          },
          {
            name: 'Summer Cup 2025',
            description: 'Regional summer competition',
            startDate: new Date('2025-07-10'),
            endDate: new Date('2025-07-12'),
            location: 'Olympic Sports Hall Munich',
            type: 'MIXED',
            status: 'REGISTRATION_OPEN',
            maxParticipants: 150,
            isPublic: true
          }
        ]
      });
      console.log(`Created ${result.count} sample competitions`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
