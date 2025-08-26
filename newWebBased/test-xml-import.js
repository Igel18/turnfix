const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

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
    
    form.append('file', fs.createReadStream(xmlFilePath));
    form.append('eventName', 'Test Import Event');
    form.append('startDate', '2025-08-25');
    form.append('endDate', '2025-08-25');
    form.append('location', 'Test Location');
    form.append('description', 'Test import from GymNet XML');
    
    console.log('🚀 Sending request to server...');
    
    const response = await fetch('http://localhost:3002/api/events/import-gymnet', {
      method: 'POST',
      body: form,
      headers: {
        // Let form-data set the Content-Type header with boundary
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers.raw());
    
    const responseText = await response.text();
    console.log('📝 Response body:', responseText);
    
    if (response.ok) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('✅ Success! Parsed response:', JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('⚠️ Response is not JSON:', responseText);
      }
    } else {
      console.log('❌ Request failed:', response.status, responseText);
    }
    
  } catch (error) {
    console.log('💥 Error during test:', error.message);
    console.log('Stack:', error.stack);
  }
}

testXmlImport();
