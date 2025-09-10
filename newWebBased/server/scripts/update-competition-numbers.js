const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCompetitionNumbers() {
  try {
    console.log('🔢 Updating competition numbers...');
    
    // Get all competitions for Event 87
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 87 },
      orderBy: { int_wettkaempfeid: 'asc' }
    });
    
    console.log(`Found ${competitions.length} competitions to update`);
    
    // Assign numbers based on competition type and age groups
    let updateCount = 0;
    
    for (const comp of competitions) {
      let number;
      
      // Generate competition numbers based on name pattern
      if (comp.var_name.includes('Gerätvierkampf w (1-6Jahre)')) number = '0101';
      else if (comp.var_name.includes('Gerätvierkampf w (7-8Jahre)')) number = '0102';
      else if (comp.var_name.includes('Gerätvierkampf w (9-10Jahre)')) number = '0103';
      else if (comp.var_name.includes('Gerätvierkampf w (11-12Jahre)')) number = '0104';
      else if (comp.var_name.includes('Gerätvierkampf w (13-14Jahre)')) number = '0105';
      else if (comp.var_name.includes('Gerätvierkampf w (15-16Jahre)')) number = '0106';
      else if (comp.var_name.includes('Gerätvierkampf w (17-18Jahre)')) number = '0107';
      else if (comp.var_name.includes('Gerätsechskampf m (7-8Jahre)')) number = '0111';
      else if (comp.var_name.includes('Gerätsechskampf m (9-10Jahre)')) number = '0113'; // As per your example
      else if (comp.var_name.includes('Gerätsechskampf m (11-12Jahre)')) number = '0114';
      else if (comp.var_name.includes('Gerätsechskampf m (13-14Jahre)')) number = '0115';
      else if (comp.var_name.includes('Gerätsechskampf m (15-16Jahre)')) number = '0116';
      else if (comp.var_name.includes('Gerätsechskampf m (17-18Jahre)')) number = '0117';
      else {
        console.log(`  Skipping unknown competition: ${comp.var_name}`);
        continue;
      }
      
      // Update the competition with the number
      await prisma.tfx_wettkaempfe.update({
        where: { int_wettkaempfeid: comp.int_wettkaempfeid },
        data: { var_nummer: number }
      });
      
      console.log(`  ${comp.var_name}: Set number to ${number}`);
      updateCount++;
    }
    
    console.log(`\\n✅ Updated ${updateCount} competitions with numbers!`);
    
    // Verify the results
    console.log('\\n📊 Updated competitions:');
    const updatedComps = await prisma.tfx_wettkaempfe.findMany({
      where: { int_veranstaltungenid: 87 },
      orderBy: { var_nummer: 'asc' }
    });
    
    updatedComps.forEach(comp => {
      console.log(`  ${comp.var_nummer || 'NULL'}: ${comp.var_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCompetitionNumbers();
