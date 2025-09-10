import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@turnfix.com' },
    update: {},
    create: {
      email: 'admin@turnfix.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
    },
  });

  console.log('👤 Created admin user:', adminUser.email);

  // Create sample club
  const sampleClub = await prisma.club.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Gymnastics Club Berlin',
      shortName: 'GCB',
      address: 'Gymnastics Street 1',
      city: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
      email: 'info@gcb.de',
      createdBy: adminUser.id,
    },
  });

  console.log('🏢 Created sample club:', sampleClub.name);

  // Create sample participant
  const sampleParticipant = await prisma.participant.create({
    data: {
      firstName: 'Anna',
      lastName: 'Schmidt',
      birthDate: new Date('2010-05-15'),
      gender: 'FEMALE',
      clubId: sampleClub.id,
      licenseNo: 'GYM2024001',
      nationality: 'German',
    },
  });

  console.log('🤸‍♀️ Created sample participant:', `${sampleParticipant.firstName} ${sampleParticipant.lastName}`);

  // Create sample competition
  const sampleCompetition = await prisma.competition.create({
    data: {
      name: 'Berlin Open Championship 2024',
      description: 'Annual gymnastics competition for all age groups',
      startDate: new Date('2024-09-15T09:00:00Z'),
      endDate: new Date('2024-09-15T18:00:00Z'),
      location: 'Berlin Sports Hall',
      type: 'INDIVIDUAL',
      status: 'PLANNED',
      maxParticipants: 100,
      registrationDeadline: new Date('2024-09-01T23:59:59Z'),
    },
  });

  console.log('🏆 Created sample competition:', sampleCompetition.name);

  // Create disciplines for the competition
  const disciplines = [
    { name: 'Floor Exercise', order: 1, maxScore: 15.0 },
    { name: 'Vault', order: 2, maxScore: 15.0 },
    { name: 'Uneven Bars', order: 3, maxScore: 15.0 },
    { name: 'Balance Beam', order: 4, maxScore: 15.0 },
  ];

  for (const discipline of disciplines) {
    await prisma.discipline.create({
      data: {
        ...discipline,
        competitionId: sampleCompetition.id,
      },
    });
  }

  console.log('📋 Created sample disciplines');

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
