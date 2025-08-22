// Test script to verify association creation works
const API_BASE_URL = 'http://localhost:3001/api';

async function testAssociationCreation() {
  try {
    // First, login to get a token
    const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    console.log('✅ Login successful');

    // Test creating an association
    const associationResponse = await fetch(`${API_BASE_URL}/associations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        var_name: 'Test Association',
        var_kuerzel: 'TEST',
        int_laenderid: null // Testing with null country
      }),
    });

    if (!associationResponse.ok) {
      const errorText = await associationResponse.text();
      throw new Error(`Association creation failed: ${associationResponse.status} - ${errorText}`);
    }

    const associationData = await associationResponse.json();
    console.log('✅ Association created successfully:', associationData);

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testAssociationCreation();
