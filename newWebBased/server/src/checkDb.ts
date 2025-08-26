import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('=== Checking database tables ===');
    
    const competitions = await prisma.competition.findMany();
    console.log(`Competitions: ${competitions.length}`);
    
    const disciplines = await prisma.discipline.findMany();
    console.log(`Disciplines: ${disciplines.length}`);
    
    if (disciplines.length > 0) {
      console.log('Sample disciplines:');
      disciplines.slice(0, 5).forEach(d => {
        console.log(` - ${d.name}: ${d.description || 'No description'}`);
      });
    }
    
    // Check participants for gender and age data
    const participants = await prisma.participant.findMany({
      take: 5,
      include: {
        club: true
      }
    });
    
    console.log(`Participants: ${participants.length}`);
    if (participants.length > 0) {
      console.log('Sample participants:');
      participants.forEach(p => {
        const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
        console.log(` - ${p.firstName} ${p.lastName}, ${p.gender}, Age: ${age}, Club: ${p.club.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
