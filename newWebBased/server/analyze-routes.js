// Analysis of Prisma Models vs API Routes
console.log('🔍 Analyzing Prisma models vs API routes...\n');

// All 35 Prisma models from the introspected schema
const prismaModels = [
  'tfx_bereiche',
  'tfx_disgrp_x_disziplinen', 
  'tfx_disziplinen',
  'tfx_disziplinen_felder',
  'tfx_disziplinen_gruppen',
  'tfx_formeln',
  'tfx_gaue',
  'tfx_gruppen',
  'tfx_gruppen_x_teilnehmer',
  'tfx_jury_results',
  'tfx_konten',
  'tfx_laender',
  'tfx_layout_felder',
  'tfx_layouts',
  'tfx_man_x_man_ab',
  'tfx_man_x_teilnehmer',
  'tfx_mannschaften',
  'tfx_mannschaften_abzug',
  'tfx_personen',
  'tfx_quali_leistungen',
  'tfx_riegen_x_disziplinen',
  'tfx_sport',
  'tfx_startreihenfolge',
  'tfx_status',
  'tfx_teilnehmer',
  'tfx_veranstaltungen',
  'tfx_verbaende',
  'tfx_vereine',
  'tfx_wertungen',
  'tfx_wertungen_details',
  'tfx_wertungen_x_disziplinen',
  'tfx_wettkaempfe',
  'tfx_wettkaempfe_dispos',
  'tfx_wettkaempfe_x_disziplinen',
  'tfx_wettkampforte'
];

// Existing API routes (based on file listing)
const existingRoutes = [
  { file: 'associations.ts', likely_model: 'tfx_verbaende' },
  { file: 'auditLogs.ts', likely_model: 'audit_logs' },
  { file: 'auth.ts', likely_model: 'users/auth' },
  { file: 'clubs.ts', likely_model: 'tfx_vereine' },
  { file: 'clubsNew.ts', likely_model: 'tfx_vereine' },
  { file: 'clubs_temp.ts', likely_model: 'tfx_vereine' },
  { file: 'competitionEntries.ts', likely_model: 'competition_entries' },
  { file: 'competitions.ts', likely_model: 'tfx_veranstaltungen/tfx_wettkaempfe' },
  { file: 'disciplines.ts', likely_model: 'tfx_disziplinen' },
  { file: 'events-clean.ts', likely_model: 'tfx_veranstaltungen' },
  { file: 'events-new.ts', likely_model: 'tfx_veranstaltungen' },
  { file: 'events.ts', likely_model: 'tfx_veranstaltungen' },
  { file: 'participants.ts', likely_model: 'tfx_teilnehmer' },
  { file: 'refreshTokens.ts', likely_model: 'refresh_tokens' },
  { file: 'regions.ts', likely_model: 'tfx_gaue' },
  { file: 'results.ts', likely_model: 'tfx_wertungen' },
  { file: 'scores.ts', likely_model: 'tfx_wertungen/tfx_wertungen_details' },
  { file: 'users.ts', likely_model: 'tfx_personen' }
];

console.log(`📊 SUMMARY:`);
console.log(`Total Prisma Models: ${prismaModels.length}`);
console.log(`Total API Route Files: ${existingRoutes.length}\n`);

// Map models to likely API equivalents
const modelToApiMapping = {
  // Core entities
  'tfx_vereine': ['clubs.ts', 'clubsNew.ts', 'clubs_temp.ts'],
  'tfx_personen': ['users.ts'],
  'tfx_teilnehmer': ['participants.ts'],
  'tfx_veranstaltungen': ['events.ts', 'events-clean.ts', 'events-new.ts', 'competitions.ts'],
  'tfx_wettkaempfe': ['competitions.ts'],
  'tfx_disziplinen': ['disciplines.ts'],
  'tfx_wertungen': ['results.ts', 'scores.ts'],
  'tfx_wertungen_details': ['scores.ts'],
  'tfx_verbaende': ['associations.ts'],
  'tfx_gaue': ['regions.ts'],
  
  // Relationship tables
  'tfx_gruppen_x_teilnehmer': [],
  'tfx_man_x_teilnehmer': [],
  'tfx_wettkaempfe_x_disziplinen': [],
  'tfx_riegen_x_disziplinen': [],
  
  // Reference/lookup tables  
  'tfx_bereiche': [],
  'tfx_sport': [],
  'tfx_status': [],
  'tfx_laender': [],
  'tfx_formeln': [],
  
  // Complex/specialized tables
  'tfx_mannschaften': [],
  'tfx_jury_results': [],
  'tfx_quali_leistungen': [],
  'tfx_layout_felder': [],
  'tfx_layouts': [],
  'tfx_konten': [],
  'tfx_startreihenfolge': [],
  'tfx_wettkampforte': [],
  'tfx_wettkaempfe_dispos': [],
  'tfx_disziplinen_felder': [],
  'tfx_disziplinen_gruppen': [],
  'tfx_disgrp_x_disziplinen': [],
  'tfx_man_x_man_ab': [],
  'tfx_mannschaften_abzug': [],
  'tfx_wertungen_x_disziplinen': []
};

console.log('✅ MODELS WITH API ROUTES:');
Object.entries(modelToApiMapping).forEach(([model, routes]) => {
  if (routes.length > 0) {
    console.log(`   ${model} -> ${routes.join(', ')}`);
  }
});

console.log('\n❌ MODELS WITHOUT API ROUTES:');
Object.entries(modelToApiMapping).forEach(([model, routes]) => {
  if (routes.length === 0) {
    console.log(`   ${model} (${getModelDescription(model)})`);
  }
});

function getModelDescription(model) {
  const descriptions = {
    'tfx_gruppen_x_teilnehmer': 'Groups × Participants relationship',
    'tfx_man_x_teilnehmer': 'Teams × Participants relationship', 
    'tfx_wettkaempfe_x_disziplinen': 'Competitions × Disciplines relationship',
    'tfx_riegen_x_disziplinen': 'Rings/Groups × Disciplines relationship',
    'tfx_bereiche': 'Areas/Categories',
    'tfx_sport': 'Sports types',
    'tfx_status': 'Status lookup',
    'tfx_laender': 'Countries',
    'tfx_formeln': 'Calculation formulas',
    'tfx_mannschaften': 'Teams/Squads',
    'tfx_jury_results': 'Judge results',
    'tfx_quali_leistungen': 'Qualification performances',
    'tfx_layout_felder': 'Layout fields',
    'tfx_layouts': 'Layouts',
    'tfx_konten': 'Accounts',
    'tfx_startreihenfolge': 'Starting order',
    'tfx_wettkampforte': 'Competition venues',
    'tfx_wettkaempfe_dispos': 'Competition dispositions',
    'tfx_disziplinen_felder': 'Discipline fields',
    'tfx_disziplinen_gruppen': 'Discipline groups',
    'tfx_disgrp_x_disziplinen': 'Discipline groups × Disciplines',
    'tfx_man_x_man_ab': 'Team × Team deductions',
    'tfx_mannschaften_abzug': 'Team deductions',
    'tfx_wertungen_x_disziplinen': 'Ratings × Disciplines'
  };
  return descriptions[model] || 'Legacy table';
}

console.log('\n🎯 PRIORITY MISSING ROUTES:');
const priorityTables = [
  'tfx_bereiche',
  'tfx_sport', 
  'tfx_status',
  'tfx_laender',
  'tfx_mannschaften',
  'tfx_wettkampforte'
];

priorityTables.forEach(table => {
  console.log(`   ${table} - ${getModelDescription(table)}`);
});
