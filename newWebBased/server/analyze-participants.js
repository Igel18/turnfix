const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeParticipants() {
  try {
    // Get the latest event
    const latestEvent = await prisma.tfx_veranstaltungen.findFirst({
      orderBy: { int_veranstaltungenid: 'desc' }
    });
    
    // Get all participants in this event
    const participants = await prisma.$queryRawUnsafe(`
      SELECT t.int_teilnehmerid, t.var_vorname, t.var_nachname, 
             t.dat_geburtstag, t.int_geschlecht
      FROM tfx_wertungen w
      JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
      LIMIT 20
    `, latestEvent.int_veranstaltungenid);
    
    console.log('📊 Sample participant analysis:');
    console.log('Name | Age | Gender | Birth Date');
    console.log('-----|-----|--------|------------');
    
    participants.forEach(p => {
      const birthDate = new Date(p.dat_geburtstag);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const genderLabel = p.int_geschlecht === 1 ? 'Male' : p.int_geschlecht === 2 ? 'Female' : 'Unknown';
      
      console.log(`${p.var_vorname} ${p.var_nachname} | ${age} | ${genderLabel} | ${birthDate.toDateString()}`);
    });
    
    // Age distribution
    const allParticipants = await prisma.$queryRawUnsafe(`
      SELECT t.dat_geburtstag, t.int_geschlecht
      FROM tfx_wertungen w
      JOIN tfx_teilnehmer t ON w.int_teilnehmerid = t.int_teilnehmerid
      JOIN tfx_wettkaempfe wk ON w.int_wettkaempfeid = wk.int_wettkaempfeid
      WHERE wk.int_veranstaltungenid = $1
    `, latestEvent.int_veranstaltungenid);
    
    const ageDistribution = {};
    const genderDistribution = {};
    
    allParticipants.forEach(p => {
      const age = new Date().getFullYear() - new Date(p.dat_geburtstag).getFullYear();
      ageDistribution[age] = (ageDistribution[age] || 0) + 1;
      genderDistribution[p.int_geschlecht] = (genderDistribution[p.int_geschlecht] || 0) + 1;
    });
    
    console.log('\n📈 Age Distribution:');
    Object.keys(ageDistribution).sort((a, b) => parseInt(a) - parseInt(b)).forEach(age => {
      console.log(`  Age ${age}: ${ageDistribution[age]} participants`);
    });
    
    console.log('\n🚻 Gender Distribution:');
    Object.keys(genderDistribution).forEach(gender => {
      const label = gender === '1' ? 'Male' : gender === '2' ? 'Female' : `Unknown (${gender})`;
      console.log(`  ${label}: ${genderDistribution[gender]} participants`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeParticipants();
