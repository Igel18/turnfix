const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1) Check what IDs 71, 68, 73, 74 correspond to (these are returned by wedDisNrToTurnFixId for 161,171,181,191)
  console.log('=== IDs returned by wedDisNrToTurnFixId for LK1 w. ===');
  console.log('  wedDisNr 161 -> ID 71, wedDisNr 171 -> ID 68, wedDisNr 181 -> ID 73, wedDisNr 191 -> ID 74');
  console.log('');
  const ids = [71, 68, 73, 74];
  for (const id of ids) {
    const d = await p.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: id },
      select: { int_disziplinenid: true, var_name: true, bol_m: true, bol_w: true }
    });
    if (d) {
      console.log('  ID ' + id + ': ' + d.var_name + ' (m=' + d.bol_m + ', w=' + d.bol_w + ')');
    } else {
      console.log('  ID ' + id + ': NOT FOUND');
    }
  }

  // 2) List ALL LK disciplines  
  console.log('');
  console.log('=== ALL LK Disciplines in Database ===');
  const lk = await p.tfx_disziplinen.findMany({
    where: { var_name: { contains: 'LK' } },
    select: { int_disziplinenid: true, var_name: true, bol_m: true, bol_w: true },
    orderBy: { int_disziplinenid: 'asc' }
  });
  for (const d of lk) {
    console.log('  ID ' + d.int_disziplinenid + ': ' + d.var_name + ' (m=' + d.bol_m + ', w=' + d.bol_w + ')');
  }

  // 3) Base DTB disciplines (from TurnFixImport.exe.config)
  console.log('');
  console.log('=== Base DTB Disciplines ===');
  const baseIds = [74, 31, 50, 71, 72, 46, 68, 73, 77, 75, 76];
  for (const id of baseIds) {
    const d = await p.tfx_disziplinen.findUnique({
      where: { int_disziplinenid: id },
      select: { int_disziplinenid: true, var_name: true, bol_m: true, bol_w: true }
    });
    if (d) {
      console.log('  ID ' + id + ': ' + d.var_name + ' (m=' + d.bol_m + ', w=' + d.bol_w + ')');
    } else {
      console.log('  ID ' + id + ': NOT FOUND');
    }
  }

  // 4) ALL disciplines for full overview
  console.log('');
  console.log('=== ALL Disciplines (full list) ===');
  const all = await p.tfx_disziplinen.findMany({
    select: { int_disziplinenid: true, var_name: true, bol_m: true, bol_w: true },
    orderBy: { int_disziplinenid: 'asc' }
  });
  for (const d of all) {
    console.log('  ID ' + d.int_disziplinenid + ': ' + d.var_name + ' (m=' + d.bol_m + ', w=' + d.bol_w + ')');
  }

  await p.$disconnect();
}

main().catch(function(e) { console.error(e); process.exit(1); });
