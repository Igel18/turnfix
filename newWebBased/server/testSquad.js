const axios = require('axios');

async function testSquadAssignment() {
  try {
    console.log('Testing Squad Assignment...');
    
    // First create a squad
    console.log('1️⃣ Creating squad...');
    const createResponse = await axios.post('http://localhost:3001/api/squad-management/create', {
      eventId: 9025,
      name: 'TestSquad' + Date.now()
    }, {
      headers: { 'Authorization': 'Bearer test-token' },
      timeout: 5000
    });
    console.log('✅ Squad created:', createResponse.data);

    // Then assign participant 808 (Johanna Rehklau)
    console.log('2️⃣ Assigning participant 808 (Johanna Rehklau)...');
    const assignResponse = await axios.post('http://localhost:3001/api/squad-management/assign', {
      participantId: 808,
      squadName: createResponse.data.squad.name,
      eventId: 9025
    }, {
      headers: { 'Authorization': 'Bearer test-token' },
      timeout: 5000
    });
    console.log('✅ Assignment result:', assignResponse.data);

    // Check squads
    console.log('3️⃣ Checking squads...');
    const squadsResponse = await axios.get('http://localhost:3001/api/squad-management?eventId=9025', {
      headers: { 'Authorization': 'Bearer test-token' },
      timeout: 5000
    });
    console.log('✅ Current squads count:', squadsResponse.data.squads.length);
    if (squadsResponse.data.squads.length > 0) {
      console.log('First squad:', squadsResponse.data.squads[0]);
    }

  } catch (error) {
    console.error('❌ Error details:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Request:', error.request._options || error.config);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

testSquadAssignment();
