import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Check formulas
const formulas = await p.tfx_formeln.findMany();
console.log('=== FORMULAS in turnfix20260213_3 ===');
formulas.forEach(f => {
  console.log(`  id=${f.int_formelid}: ${f.var_name} = ${f.var_formel} (typ=${f.int_typ})`);
});
console.log(`Total formulas: ${formulas.length}`);

// Check some DTB disciplines
const dtbDiscs = await p.tfx_disziplinen.findMany({
  where: {
    tfx_sport: {
      var_name: { startsWith: 'Turnen DTB' }
    }
  },
  include: { tfx_sport: true },
  take: 10
});

console.log('\n=== Sample DTB Disciplines ===');
dtbDiscs.forEach(d => {
  console.log(`  ${d.var_name} | sport=${d.tfx_sport?.var_name} | formelid=${d.int_formelid} | icon=${d.var_icon} | einheit=${d.var_einheit}`);
});

// Check base Turnen disciplines
const baseDiscs = await p.tfx_disziplinen.findMany({
  where: {
    tfx_sport: {
      var_name: 'Turnen'
    }
  },
  include: { tfx_sport: true }
});

console.log('\n=== Base Turnen Disciplines ===');
baseDiscs.forEach(d => {
  console.log(`  ${d.var_name} | formelid=${d.int_formelid} | icon=${d.var_icon} | einheit=${d.var_einheit}`);
});

await p.$disconnect();
