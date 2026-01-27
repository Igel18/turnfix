const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function extractStatus() {
  try {
    const statuses = await prisma.tfx_status.findMany({
      orderBy: { var_name: 'asc' }
    });

    console.log(`Found ${statuses.length} status entries`);
    console.log(JSON.stringify(statuses, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractStatus();
