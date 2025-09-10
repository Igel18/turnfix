// Debug script to check Score Capture API and data flow
const fetch = require('node-fetch');

const debugScoreCapture = async () => {
  console.log('=== Debugging Score Capture Data Flow ===\n');

  const baseURL = 'http://localhost:3001/api';
  
  try {
    // Test 1: Check the scores API that Score Capture uses
    console.log('🔍 Test 1: Checking scores API (what Score Capture loads)...');
    const scoresResponse = await fetch(`${baseURL}/scores?eventId=49&limit=1000`);
    
    if (!scoresResponse.ok) {
      throw new Error(`HTTP ${scoresResponse.status}: ${scoresResponse.statusText}`);
    }
    
    const scoresData = await scoresResponse.json();
    console.log(`📊 Found ${scoresData.results?.length || 0} scores from scores API`);
    
    // Look for Mirja's scores
    const mirjaScores = scoresData.results?.filter(score => score.participantId === 1007) || [];
    console.log(`🎯 Mirja Baretti has ${mirjaScores.length} scores in the scores API:`);
    mirjaScores.forEach(score => {
      console.log(`   Discipline ${score.disciplineId} (${score.discipline?.name}): ${score.score}`);
    });
    
    // Test 2: Check discipline fields API
    console.log('\n🔍 Test 2: Checking discipline fields...');
    const fieldsResponse = await fetch(`${baseURL}/discipline-fields`);
    const fieldsData = await fieldsResponse.json();
    console.log(`📊 Found ${fieldsData.length || 0} discipline fields`);
    
    // Check for Balken (discipline 73) fields
    const balkenFields = fieldsData.filter(field => field.disciplineId === 73 && field.enabled);
    console.log(`🎯 Balken (discipline 73) has ${balkenFields.length} enabled fields:`);
    balkenFields.forEach(field => {
      console.log(`   Field: ${field.name} (ID: ${field.id}, isFinalScore: ${field.isFinalScore})`);
    });
    
    // Test 3: Check if there are jury results for detailed field scores
    console.log('\n🔍 Test 3: Checking jury results for Mirja...');
    const juryResponse = await fetch(`${baseURL}/jury-results?participantId=1007&disciplineId=73&limit=10`);
    const juryData = await juryResponse.json();
    console.log(`📊 Found ${juryData.results?.length || 0} jury results for Mirja's Balken`);
    
    // Test 4: Compare data between APIs
    console.log('\n🔍 Test 4: Data comparison summary...');
    console.log('📋 Summary for Score Capture:');
    console.log(`   - Main discipline scores: ${mirjaScores.length > 0 ? '✅ Available' : '❌ Missing'}`);
    console.log(`   - Detailed field scores: ${juryData.results?.length > 0 ? '✅ Available' : '❌ Missing'}`);
    console.log(`   - Field configuration: ${balkenFields.length > 0 ? '✅ Configured' : '❌ Not configured'}`);
    
    if (mirjaScores.length > 0) {
      console.log('\n✅ RESULT: Score Capture should show Mirja\'s main discipline scores');
      console.log('💡 If scores are not visible, check the frontend score loading logic');
    } else {
      console.log('\n❌ RESULT: Main discipline scores are not accessible via scores API');
      console.log('💡 Need to investigate why scores API is not returning tfx_wertungen_details data');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
};

debugScoreCapture().catch(console.error);
