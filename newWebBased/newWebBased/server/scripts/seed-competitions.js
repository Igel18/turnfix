const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCompetitions() {
  try {
    console.log('Creating sample competitions...');

    // Create sample competitions
    const competitions = await prisma.competition.createMany({
      data: [
        {
          name: 'Spring Championships 2025',
          description: 'Annual spring gymnastics championships featuring all age groups',
          startDate: new Date('2025-04-15T09:00:00Z'),
          endDate: new Date('2025-04-16T18:00:00Z'),
          location: 'Gymnastics Center Berlin',
          type: 'INDIVIDUAL',
          status: 'PLANNED',
          maxParticipants: 100,
          registrationDeadline: new Date('2025-04-01T23:59:59Z'),
          isPublic: true
        },
        {
          name: 'Summer Cup 2025',
          description: 'Regional summer gymnastics competition for youth and seniors',
          startDate: new Date('2025-07-10T08:30:00Z'),
          endDate: new Date('2025-07-12T19:00:00Z'),
          location: 'Olympic Sports Hall Munich',
          type: 'MIXED',
          status: 'REGISTRATION_OPEN',
          maxParticipants: 150,
          registrationDeadline: new Date('2025-06-25T23:59:59Z'),
          isPublic: true
        },
        {
          name: 'Youth Tournament 2025',
          description: 'Competition specifically designed for young gymnasts under 16',
          startDate: new Date('2025-09-05T10:00:00Z'),
          endDate: new Date('2025-09-06T17:00:00Z'),
          location: 'Sports Complex Hamburg',
          type: 'INDIVIDUAL',
          status: 'PLANNED',
          maxParticipants: 60,
          registrationDeadline: new Date('2025-08-20T23:59:59Z'),
          isPublic: true
        },
        {
          name: 'Winter Masters 2024',
          description: 'Completed winter competition - example of finished event',
          startDate: new Date('2024-12-10T09:00:00Z'),
          endDate: new Date('2024-12-11T18:00:00Z'),
          location: 'Düsseldorf Arena',
          type: 'INDIVIDUAL',
          status: 'COMPLETED',
          maxParticipants: 80,
          registrationDeadline: new Date('2024-11-25T23:59:59Z'),
          isPublic: true
        },
        {
          name: 'Team Championship 2025',
          description: 'Team-based gymnastics competition',
          startDate: new Date('2025-06-01T09:00:00Z'),
          endDate: new Date('2025-06-02T17:00:00Z'),
          location: 'Frankfurt Convention Center',
          type: 'TEAM',
          status: 'IN_PROGRESS',
          maxParticipants: 40,
          registrationDeadline: new Date('2025-05-15T23:59:59Z'),
          isPublic: true
        }
      ]
    });

    console.log(`Created ${competitions.count} sample competitions`);
    console.log('Sample data seeded successfully!');

  } catch (error) {
    console.error('Error seeding competitions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedCompetitions();
