const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function extractDisciplines() {
  try {
    // Get all disciplines with their related data
    const disciplines = await prisma.tfx_disziplinen.findMany({
      include: {
        tfx_sport: true,
        tfx_formeln: true,
        tfx_disziplinen_felder: {
          orderBy: { int_sortierung: 'asc' }
        }
      },
      orderBy: [
        { int_sportid: 'asc' },
        { var_name: 'asc' }
      ]
    });

    console.log(`Found ${disciplines.length} disciplines`);
    console.log(JSON.stringify(disciplines, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractDisciplines();
