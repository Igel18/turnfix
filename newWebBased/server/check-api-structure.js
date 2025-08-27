const http = require('http');

http.get('http://localhost:3001/api/regions', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('Regions API Response Structure:');
    console.log('Sample region object:', JSON.stringify(json.regions[0], null, 2));
    console.log('All fields:', Object.keys(json.regions[0]));
  });
}).on('error', console.error);
