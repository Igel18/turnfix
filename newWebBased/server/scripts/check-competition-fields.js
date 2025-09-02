const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCompetitionFields() {
  try {
    const competition = await prisma.tfx_wettkaempfe.findFirst({
      where: { int_veranstaltungenid: 87 }
    });
    
    console.log('Competition fields:', Object.keys(competition));
    console.log('\nSample competition:');
    console.log(competition);
    
    // Check a few more competitions to see the data structure
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 87 },
      take: 3
    });
    
    console.log('\nFirst 3 competitions:');
    competitions.forEach((comp, index) => {
      console.log(`\n${index + 1}. ID: ${comp.int_wettkaempfeid}`);
      console.log(`   Name: ${comp.var_name}`);
      console.log(`   Other fields:`, comp);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCompetitionFields();
