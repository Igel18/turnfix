import FormData from 'form-data';
import fs from 'fs';
import fetch from 'node-fetch';

async function testXmlImport() {
  try {
    console.log('🧪 Testing XML Import...');
    
    const form = new FormData();
    const xmlFilePath = 'c:/Users/prudlo/source/repos/turnfix/newWebBased/server/uploads/xml/gymnet-2025-08-25T08-27-01-139Z-WK-Gymnet_reduziert.xml';
    
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
      body: form,
      headers: form.getHeaders()
    });
    
    console.log('📡 Response status:', response.status);
    
    const responseText = await response.text();
    console.log('📝 Response length:', responseText.length, 'characters');
    
    if (response.ok) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Success! Response summary:');
        console.log('  - Success:', jsonResponse.success);
        console.log('  - Message:', jsonResponse.message);
        if (jsonResponse.extractedData) {
          console.log('  - Clubs:', jsonResponse.extractedData.clubs?.length || 0);
          console.log('  - Participants:', jsonResponse.extractedData.participants?.length || 0);
          console.log('  - Competitions:', jsonResponse.extractedData.competitions?.length || 0);
          console.log('  - Devices:', jsonResponse.extractedData.devices?.length || 0);
        }
        if (jsonResponse.insertionResults) {
          console.log('  - Insertion Results:', JSON.stringify(jsonResponse.insertionResults, null, 2));
        }
      } catch (e) {
        console.log('⚠️ Response is not JSON, showing first 500 chars:');
        console.log(responseText.substring(0, 500));
      }
    } else {
      console.log('❌ Request failed:', response.status);
      console.log('Error response:', responseText.substring(0, 500));
    }
    
  } catch (error) {
    console.log('💥 Error during test:', error.message);
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
  }
}

testXmlImport();
