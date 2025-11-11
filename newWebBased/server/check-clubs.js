const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Checking which clubs have participants...\n');
    
    const result = await prisma.$queryRaw`
      SELECT int_vereineid, COUNT(*) as count 
      FROM tfx_teilnehmer 
      GROUP BY int_vereineid 
      ORDER BY int_vereineid
    `;
    
    console.log('Teilnehmer pro Verein:');
    console.table(result.map(r => ({ 
      clubId: Number(r.int_vereineid), 
      count: Number(r.count) 
    })));
    
    // Check what club the group belongs to
    const group = await prisma.tfx_gruppen.findUnique({
      where: { int_gruppenid: 7 },
      include: { tfx_vereine: true }
    });
    
    console.log('\nGruppe "hirdlprmpf" (ID 7):');
    console.log({
      clubId: group.int_vereineid,
      clubName: group.tfx_vereine?.var_name || 'Unknown'
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
