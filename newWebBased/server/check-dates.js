const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDates() {
  try {
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 59 },
      select: {
        int_wettkaempfeid: true,
        var_name: true,
        tim_startzeit: true,
        tim_einturnen: true
      },
      take: 10
    });

    console.log('=== Competition Times in Database ===\n');
    
    competitions.forEach(comp => {
      console.log(`Competition ${comp.int_wettkaempfeid}: ${comp.var_name}`);
      console.log(`  Start Time: ${comp.tim_startzeit || 'NULL'}`);
      console.log(`  Warmup Time: ${comp.tim_einturnen || 'NULL'}`);
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDates();
