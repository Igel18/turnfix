const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCompetitionDisciplines() {
  try {
    console.log('=== DEBUG: Competition-Discipline Analysis ===\n');
    
    // 1. Check competitions for event 12
    console.log('1. Competitions for Event 12:');
    const competitions = await prisma.tfx_wettkaempfe.findMany({
      where: {
        int_veranstaltungenid: 12
      },
      include: {
        tfx_wettkaempfe_x_disziplinen: {
          include: {
            tfx_disziplinen: true
          }
        }
      }
    });
    
    competitions.forEach(comp => {
      console.log(`  - Competition ${comp.int_wettkaempfeid}: ${comp.var_name}`);
      console.log(`    Disciplines: ${comp.tfx_wettkaempfe_x_disziplinen.length}`);
      comp.tfx_wettkaempfe_x_disziplinen.forEach(wd => {
        console.log(`      * ${wd.tfx_disziplinen.var_name} (ID: ${wd.tfx_disziplinen.int_disziplinenid})`);
      });
    });
    
    console.log('\n2. All disciplines in system:');
    const allDisciplines = await prisma.tfx_disziplinen.findMany({
      orderBy: { var_name: 'asc' }
    });
    
    allDisciplines.forEach(d => {
      console.log(`  - ${d.var_name} (ID: ${d.int_disziplinenid})`);
    });
    
    console.log('\n3. Competition-Discipline relationships for Event 12:');
    const relationships = await prisma.tfx_wettkaempfe_x_disziplinen.findMany({
      where: {
        tfx_wettkaempfe: {
          int_veranstaltungenid: 12
        }
      },
      include: {
        tfx_wettkaempfe: true,
        tfx_disziplinen: true
      }
    });
    
    relationships.forEach(rel => {
      console.log(`  - Competition "${rel.tfx_wettkaempfe.var_name}" (${rel.int_wettkaempfeid}) ↔ Discipline "${rel.tfx_disziplinen.var_name}" (${rel.int_disziplinenid})`);
    });
    
    console.log('\n4. Missing disciplines analysis:');
    const expectedDisciplines = ['Boden', 'Pauschenpferd', 'Ringe', 'Sprung', 'Barren', 'Reck'];
    const foundDisciplineNames = relationships.map(r => r.tfx_disziplinen.var_name);
    
    expectedDisciplines.forEach(expectedName => {
      if (!foundDisciplineNames.includes(expectedName)) {
        console.log(`  ❌ MISSING: ${expectedName}`);
        
        // Check if discipline exists in system but not assigned
        const disciplineExists = allDisciplines.find(d => d.var_name === expectedName);
        if (disciplineExists) {
          console.log(`    ➜ Exists in system (ID: ${disciplineExists.int_disziplinenid}) but not assigned to any competition in event 12`);
        } else {
          console.log(`    ➜ Does not exist in system at all`);
        }
      } else {
        console.log(`  ✅ FOUND: ${expectedName}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCompetitionDisciplines();
