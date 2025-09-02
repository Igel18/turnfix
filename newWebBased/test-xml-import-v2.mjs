import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testXmlImport() {
  try {
    console.log('🧪 Testing XML Import...');
    
    const form = new FormData();
    const xmlFilePath = './server/uploads/xml/gymnet-2025-09-01T14-37-53-184Z-WK-Gymnet(1).xml';
    
    // Check if file exists
    if (!fs.existsSync(xmlFilePath)) {
      console.log('❌ XML file not found:', xmlFilePath);
      return;
    }
    
    console.log('📄 XML file found, size:', fs.statSync(xmlFilePath).size, 'bytes');
    
    form.append('xmlFile', fs.createReadStream(xmlFilePath));
    form.append('eventName', 'Test Import Event');
    form.append('startDate', '2025-08-25');
    form.append('endDate', '2025-08-25');
    form.append('location', 'Test Location');
    form.append('description', 'Test import from GymNet XML');
    
    console.log('🚀 Sending request to server...');
    
    const response = await fetch('http://localhost:3002/api/events/import-gymnet', {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Import successful!');
      console.log('🎯 Event ID:', result.eventId);
      console.log('👥 Participants imported:', result.participantsImported);
      console.log('🏆 Competitions imported:', result.competitionsImported);
    } else {
      console.log('❌ Import failed:', result.error);
      if (result.details) {
        console.log('🔍 Details:', result.details);
      }
    }
    
  } catch (error) {
    console.log('💥 Error during test:', error.message);
    console.log('Stack:', error.stack);
  }
}

// Run the test
testXmlImport();
