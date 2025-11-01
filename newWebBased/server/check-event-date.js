const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEventDate() {
  try {
    const event = await prisma.tfx_veranstaltungen.findUnique({
      where: { int_veranstaltungenid: 59 },
      select: {
        int_veranstaltungenid: true,
        var_name: true,
        dat_von: true,
        dat_bis: true
      }
    });

    console.log('=== Event Details ===\n');
    console.log(`Event ${event.int_veranstaltungenid}: ${event.var_name}`);
    console.log(`Start Date (dat_von): ${event.dat_von}`);
    console.log(`End Date (dat_bis): ${event.dat_bis}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkEventDate();
