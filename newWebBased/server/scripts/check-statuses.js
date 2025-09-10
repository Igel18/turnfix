const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatuses() {
  try {
    const statuses = await prisma.tfx_status.findMany();
    console.log('Available statuses:');
    statuses.forEach(s => {
      console.log(`ID: ${s.int_statusid}, Name: ${s.var_name}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStatuses();
